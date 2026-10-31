import { Filter, GlProgram } from 'pixi.js';
import type { SwfColorTransform } from '../assets/swf-color-transform';
import { filterVertex } from './swf-filter-shaders';

/** Bitmap CT: unpremultiply, transform, saturate, then premultiply. Transparent pixels stay empty. */
export class SwfColorFilter extends Filter {
  constructor(color: SwfColorTransform) {
    super({
      glProgram: GlProgram.from({
        vertex: filterVertex,
        name: 'swf-color-transform',
        preferredFragmentPrecision: 'highp',
        fragment: `
in vec2 vTextureCoord;
out vec4 finalColor;
uniform sampler2D uTexture;
uniform vec4 uMult;
uniform vec4 uAdd;
void main() {
    vec4 color = texture(uTexture, vTextureCoord);
    if (color.a > 0.0) {
        color = vec4(color.rgb / color.a, color.a);
        color = clamp(color * uMult + uAdd, 0.0, 1.0);
        color.rgb *= color.a;
    }
    finalColor = color;
}`,
      }),
      resources: {
        colorUniforms: {
          uMult: { value: new Float32Array(color.mult), type: 'vec4<f32>' },
          uAdd: { value: new Float32Array(color.add.map((a) => a / 255)), type: 'vec4<f32>' },
        },
      },
    });
  }
}
