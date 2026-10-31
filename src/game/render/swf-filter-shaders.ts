// Pixi's filter quad coordinates use logical frame dimensions and pooled texture UVs.
export const filterVertex = `
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
