import {
  Filter,
  GlProgram,
  Texture,
  TexturePool,
  type FilterSystem,
  type RenderSurface,
} from 'pixi.js';
import type { SwfGlowFilter as GlowOptions } from '../assets/asset-pack';
import { glowKernel, glowPadding, type BoxKernel } from '../assets/glow-kernel';

import { filterVertex as vertex } from './swf-filter-shaders';

const boxFragment = `
in vec2 vTextureCoord;
out vec4 finalColor;
uniform sampler2D uTexture;
uniform vec4 uInputPixel;
uniform vec4 uInputClamp;
uniform vec2 uAxis;
uniform vec3 uKernel;
float alphaAt(vec2 uv) {
    if (any(lessThan(uv, uInputClamp.xy)) || any(greaterThan(uv, uInputClamp.zw))) return 0.0;
    return texture(uTexture, uv).a;
}
void main() {
    vec2 stepUV = uAxis * uInputPixel.zw;
    float total = alphaAt(vTextureCoord);
    for (int i = 1; i <= 127; i++) {
        if (float(i) > uKernel.y) break;
        float weight = float(i) == uKernel.y ? uKernel.z : 1.0;
        vec2 offset = stepUV * float(i);
        total += (alphaAt(vTextureCoord + offset) + alphaAt(vTextureCoord - offset)) * weight;
    }
    float alpha = floor((total / uKernel.x) * 255.0) / 255.0;
    finalColor = vec4(0.0, 0.0, 0.0, alpha);
}`;

const glowFragment = `
in vec2 vTextureCoord;
out vec4 finalColor;
uniform sampler2D uTexture;
uniform sampler2D uOriginal;
uniform vec4 uInputPixel;
uniform vec2 uOriginalInverseSize;
uniform vec4 uColor;
uniform vec4 uMode;
void main() {
    vec2 pixel = floor(vTextureCoord * uInputPixel.xy) + 0.5;
    float blurred = texture(uTexture, pixel * uInputPixel.zw).a;
    vec4 original = texture(uOriginal, pixel * uOriginalInverseSize);
    bool inner = uMode.y > 0.0;
    bool knockout = uMode.z > 0.0;
    bool compositeSource = uMode.w > 0.0;
    float alpha = uColor.a * clamp((inner ? 1.0 - blurred : blurred) * uMode.x, 0.0, 1.0);
    vec4 glow = vec4(uColor.rgb, 1.0) * alpha;
    if (inner) {
        finalColor = glow * original.a;
        if (!knockout && compositeSource) finalColor += original * (1.0 - alpha);
    } else if (knockout) {
        finalColor = glow * (1.0 - original.a);
    } else if (compositeSource) {
        finalColor = glow * (1.0 - original.a) + original;
    } else {
        finalColor = glow;
    }
}`;

function boxPass(axis: [number, number]) {
  return new Filter({
    glProgram: GlProgram.from({
      vertex,
      fragment: boxFragment,
      name: 'swf-glow-box',
      preferredFragmentPrecision: 'highp',
    }),
    resolution: 1,
    blendMode: 'normal',
    resources: {
      boxUniforms: {
        uAxis: { value: new Float32Array(axis), type: 'vec2<f32>' },
        uKernel: { value: new Float32Array(3), type: 'vec3<f32>' },
      },
    },
  });
}

/**
 * Authored Flash GlowFilter composition, using the pinned Ruffle v0.7.1 WGPU algorithm.
 * https://github.com/ruffle-rs/ruffle/blob/v0.7.1/render/wgpu/src/filters/blur.rs#L183-L270
 * https://github.com/ruffle-rs/ruffle/blob/v0.7.1/render/wgpu/shaders/filter/glow.wgsl#L39-L75
 *
 * H→V repeats once per authored pass, with an 8-bit floor after each axis. The final
 * premultiplied composition supports inner/outer, knockout, hidden source, strength
 * and RGBA. Alpha-only blur scratch surfaces suffice; final RGB comes from the source
 * and glow color. Pooled textures and programs are shared; animated parameters update
 * uniforms without allocating/recompiling filters. Source capture must render normally;
 * this.blendMode applies only when the final filtered quad is composited.
 *
 * Logical stage resolution is1: parent/field transforms do not scale the kernel.
 * Exact Stage/DPR scaling and Adobe antialiasing equivalence remain unverified.
 */
export class SwfGlowFilter extends Filter {
  private readonly horizontal = boxPass([1, 0]);
  private readonly vertical = boxPass([0, 1]);
  private xKernel?: BoxKernel;
  private yKernel?: BoxKernel;
  private passes = 0;

  constructor(options: GlowOptions) {
    super({
      glProgram: GlProgram.from({
        vertex,
        fragment: glowFragment,
        name: 'swf-glow',
        preferredFragmentPrecision: 'highp',
      }),
      resolution: 1,
      antialias: 'off',
      clipToViewport: false,
      resources: {
        uOriginal: Texture.EMPTY.source,
        glowUniforms: {
          uOriginalInverseSize: { value: new Float32Array([1, 1]), type: 'vec2<f32>' },
          uColor: { value: new Float32Array(4), type: 'vec4<f32>' },
          uMode: { value: new Float32Array(4), type: 'vec4<f32>' },
        },
      },
    });
    this.setOptions(options);
  }
  setOptions(options: GlowOptions) {
    this.xKernel = glowKernel(options.blurX);
    this.yKernel = glowKernel(options.blurY);
    this.passes = options.passes;
    this.padding = glowPadding(options);
    for (const [filter, kernel] of [
      [this.horizontal, this.xKernel],
      [this.vertical, this.yKernel],
    ] as const) {
      if (!kernel) continue;
      (filter.resources.boxUniforms.uniforms.uKernel as Float32Array).set([
        kernel.size,
        kernel.extent,
        kernel.edge,
      ]);
      filter.resources.boxUniforms.update();
    }
    const uniforms = this.resources.glowUniforms.uniforms;
    (uniforms.uColor as Float32Array).set(options.color.map((c) => c / 255));
    (uniforms.uMode as Float32Array).set([
      options.strength,
      +options.inner,
      +options.knockout,
      +options.compositeSource,
    ]);
    this.resources.glowUniforms.update();
  }
  override apply(manager: FilterSystem, input: Texture, output: RenderSurface, clear: boolean) {
    const scratch: Texture[] = [];
    try {
      let source = input;
      if (this.passes && (this.xKernel || this.yKernel)) {
        for (let i = 0; i < 2; i++)
          scratch.push(
            TexturePool.getOptimalTexture({
              width: input.frame.width,
              height: input.frame.height,
              resolution: 1,
              antialias: false,
              format: 'rgba8unorm',
              scaleMode: 'nearest',
            }),
          );
        let index = 0;
        for (let pass = 0; pass < this.passes; pass++) {
          for (const [filter, kernel] of [
            [this.horizontal, this.xKernel],
            [this.vertical, this.yKernel],
          ] as const) {
            if (!kernel) continue;
            const destination = scratch[index];
            filter.apply(manager, source, destination, true);
            source = destination;
            index = 1 - index;
          }
        }
      }
      this.resources.uOriginal = input.source;
      (this.resources.glowUniforms.uniforms.uOriginalInverseSize as Float32Array).set([
        1 / input.source.pixelWidth,
        1 / input.source.pixelHeight,
      ]);
      this.resources.glowUniforms.update();
      manager.applyFilter(this, source, output, clear);
    } finally {
      this.resources.uOriginal = Texture.EMPTY.source;
      for (const texture of scratch) TexturePool.returnTexture(texture);
    }
  }
  override destroy() {
    this.horizontal.destroy();
    this.vertical.destroy();
    super.destroy();
  }
}
