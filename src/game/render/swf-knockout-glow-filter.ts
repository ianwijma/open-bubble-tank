import {
  Filter,
  GlProgram,
  Texture,
  TexturePool,
  type FilterSystem,
  type RenderSurface,
} from 'pixi.js';

// Pixi's filter quad coordinates use logical frame dimensions and pooled texture UVs.
const vertex = `
in vec2 aPosition;
out vec2 vTextureCoord;
uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform vec4 uOutputTexture;
void main() {
    vec2 p = aPosition * uOutputFrame.zw + uOutputFrame.xy;
    gl_Position = vec4(
        p.x * 2.0 / uOutputTexture.x - 1.0,
        p.y * 2.0 * uOutputTexture.z / uOutputTexture.y - uOutputTexture.z,
        0.0, 1.0);
    vTextureCoord = aPosition * uOutputFrame.zw * uInputSize.zw;
}`;

const boxFragment = `
in vec2 vTextureCoord;
out vec4 finalColor;
uniform sampler2D uTexture;
uniform vec4 uInputPixel;
uniform vec4 uInputClamp;
uniform vec2 uAxis;
float alphaAt(vec2 uv) {
    if (any(lessThan(uv, uInputClamp.xy)) || any(greaterThan(uv, uInputClamp.zw))) return 0.0;
    return texture(uTexture, uv).a;
}
void main() {
    vec2 stepUV = uAxis * uInputPixel.zw;
    float total = 0.0;
    for (int i = -5; i <= 5; i++) {
        float weight = (i == -5 || i == 5) ? 127.0 / 255.0 : 1.0;
        total += alphaAt(vTextureCoord + stepUV * float(i)) * weight;
    }
    float alpha = floor((total / 10.0) * 255.0) / 255.0;
    finalColor = vec4(0.0, 0.0, 0.0, alpha);
}`;

const knockoutFragment = `
in vec2 vTextureCoord;
out vec4 finalColor;
uniform sampler2D uTexture;
uniform sampler2D uOriginal;
uniform vec4 uInputPixel;
uniform vec2 uOriginalInverseSize;
void main() {
    // Sample texel centers: the glow composition uses nearest sampling, not a second blur.
    vec2 pixel = floor(vTextureCoord * uInputPixel.xy) + 0.5;
    float blurred = texture(uTexture, pixel * uInputPixel.zw).a;
    float original = texture(uOriginal, pixel * uOriginalInverseSize).a;
    float alpha = clamp(blurred, 0.0, 1.0) * (1.0 - original);
    finalColor = vec4(alpha, 0.0, 0.0, alpha);
}`;

function boxPass(axis: [number, number]) {
  return new Filter({
    glProgram: GlProgram.from({
      vertex,
      fragment: boxFragment,
      name: 'swf-knockout-box',
      preferredFragmentPrecision: 'highp',
    }),
    resolution: 1,
    blendMode: 'normal',
    resources: {
      boxUniforms: { uAxis: { value: new Float32Array(axis), type: 'vec2<f32>' } },
    },
  });
}

/**
 * WebGL implementation of the exact filter on Apocalypse sprite2069's child2068:
 * red, blur10x10, strength1, outer knockout, one pass. This is not a general GlowFilter.
 *
 * Pinned reference algorithm (Ruffle v0.7.1):
 * https://github.com/ruffle-rs/ruffle/blob/v0.7.1/render/wgpu/src/filters/blur.rs#L195-L270
 * https://github.com/ruffle-rs/ruffle/blob/v0.7.1/render/wgpu/shaders/filter/blur.wgsl#L43-L72
 * https://github.com/ruffle-rs/ruffle/blob/v0.7.1/render/wgpu/shaders/filter/glow.wgsl#L39-L75
 * https://github.com/ruffle-rs/ruffle/blob/v0.7.1/swf/src/types/blur_filter.rs#L34-L49
 *
 * The width 10 kernel has nine unit weights and two 127/255 edge weights, divided
 * by 10. H and V each floor to 8 bits; knockout then uses B*(1-A), without adding A.
 * Alpha-only scratch textures suffice because the final glow ignores blurred RGB.
 * At resolution 1 the kernel/padding stay in logical stage pixels, independent of
 * field/parent scale. Full Stage/DPR scaling and Adobe pixel equivalence are not claimed.
 *
 * Integration must capture source content with normal blending. Set this.blendMode
 * to 'erase' for the final composite into the containing isolated Flash LAYER;
 * inheriting ERASE while capturing the source would erase an empty input texture.
 */
export class SwfKnockoutGlowFilter extends Filter {
  private readonly horizontal = boxPass([1, 0]);
  private readonly vertical = boxPass([0, 1]);

  constructor() {
    super({
      glProgram: GlProgram.from({
        vertex,
        fragment: knockoutFragment,
        name: 'swf-knockout-glow',
        preferredFragmentPrecision: 'highp',
      }),
      resolution: 1,
      padding: 10,
      antialias: 'off',
      clipToViewport: false,
      resources: {
        uOriginal: Texture.EMPTY.source,
        glowUniforms: {
          uOriginalInverseSize: { value: new Float32Array([1, 1]), type: 'vec2<f32>' },
        },
      },
    });
  }

  override apply(manager: FilterSystem, input: Texture, output: RenderSurface, clear: boolean) {
    let horizontal: Texture | undefined;
    let vertical: Texture | undefined;
    try {
      const request = {
        width: input.frame.width,
        height: input.frame.height,
        resolution: 1,
        antialias: false,
        format: 'rgba8unorm' as const,
        scaleMode: 'nearest' as const,
      };
      horizontal = TexturePool.getOptimalTexture(request);
      vertical = TexturePool.getOptimalTexture(request);
      this.horizontal.apply(manager, input, horizontal, true);
      this.vertical.apply(manager, horizontal, vertical, true);
      this.resources.uOriginal = input.source;
      const inverseSize = this.resources.glowUniforms.uniforms.uOriginalInverseSize as Float32Array;
      inverseSize[0] = 1 / input.source.pixelWidth;
      inverseSize[1] = 1 / input.source.pixelHeight;
      this.resources.glowUniforms.update();
      manager.applyFilter(this, vertical, output, clear);
    } finally {
      this.resources.uOriginal = Texture.EMPTY.source;
      if (vertical) TexturePool.returnTexture(vertical);
      if (horizontal) TexturePool.returnTexture(horizontal);
    }
  }

  override destroy() {
    this.horizontal.destroy();
    this.vertical.destroy();
    super.destroy();
  }
}
