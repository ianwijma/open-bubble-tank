/** BitmapData stores premultiplied8-bit channels; browser ImageData uses straight RGBA. */
export function premultiplyBitmap(rgba: Uint8ClampedArray) {
  const pixels = new Uint8ClampedArray(rgba.length);
  for (let i = 0; i < rgba.length; i += 4) {
    const alpha = rgba[i + 3];
    for (let c = 0; c < 3; c++) pixels[i + c] = Math.floor((rgba[i + c] * alpha + 127) / 255);
    pixels[i + 3] = alpha;
  }
  return pixels;
}

export function straightBitmap(
  pixels: Uint8ClampedArray,
  output: Uint8ClampedArray = new Uint8ClampedArray(pixels.length),
) {
  for (let i = 0; i < pixels.length; i += 4) {
    const alpha = pixels[i + 3];
    for (let c = 0; c < 3; c++)
      output[i + c] = alpha ? Math.round((pixels[i + c] * 255) / alpha) : 0;
    output[i + 3] = alpha;
  }
  return output;
}

/** _-US.SetBlur(): BlurFilter(2,2,2), fractional box H→V twice, floor after each axis.
 * Border samples clamp to the edge.127/255 is the pinned runtime's fractional weight.
 */
export function blurPauseBitmap(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  scratch: Uint8ClampedArray = new Uint8ClampedArray(pixels.length),
) {
  let source = pixels,
    destination = scratch;
  for (let pass = 0; pass < 4; pass++) {
    const horizontal = pass % 2 === 0;
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const a = horizontal
          ? (y * width + Math.max(0, x - 1)) * 4
          : (Math.max(0, y - 1) * width + x) * 4;
        const b = horizontal
          ? (y * width + Math.min(width - 1, x + 1)) * 4
          : (Math.min(height - 1, y + 1) * width + x) * 4;
        for (let c = 0; c < 4; c++)
          destination[i + c] = Math.floor(
            (source[i + c] * 255 + (source[a + c] + source[b + c]) * 127) / 510,
          );
      }
    [source, destination] = [destination, source];
  }
  return pixels;
}

/** Normal premultiplied source-over, as used when BitmapData.draw overlays a saved frame. */
export function drawBitmapOver(destination: Uint8ClampedArray, source: Uint8ClampedArray) {
  for (let i = 0; i < destination.length; i += 4) {
    const inverse = 255 - source[i + 3];
    for (let c = 0; c < 4; c++)
      destination[i + c] = source[i + c] + Math.round((destination[i + c] * inverse) / 255);
  }
}

/** PauseMenu's capture-before-blur stack, including its unused first reversal slot. */
export class PauseBitmapHistory {
  pixels: Uint8ClampedArray;
  private scratch: Uint8ClampedArray;
  private history: Uint8ClampedArray[] = [];
  private previous = 0;
  private disposed = false;
  index = 0;
  constructor(
    readonly width: number,
    readonly height: number,
    rgba: Uint8ClampedArray,
  ) {
    this.pixels = premultiplyBitmap(rgba);
    this.scratch = new Uint8ClampedArray(rgba.length);
  }
  get savedFrames() {
    return this.history.length;
  }
  get retainedBytes() {
    return (
      this.pixels.byteLength +
      this.scratch.byteLength +
      this.history.reduce((sum, frame) => sum + frame.byteLength, 0)
    );
  }
  advance(frame: number, closing: boolean) {
    if (this.disposed || (!closing && frame > 39)) return false;
    if (frame === this.previous) return false;
    this.previous = frame;
    if (frame < 0 || frame % 2 !== 0) return false;
    if (closing) {
      const saved = this.history[this.index--];
      if (!saved) return false;
      drawBitmapOver(this.pixels, saved);
    } else {
      this.history[this.index++] = this.pixels.slice();
      blurPauseBitmap(this.pixels, this.width, this.height, this.scratch);
    }
    return true;
  }
  dispose() {
    this.disposed = true;
    this.history = [];
    this.pixels = this.scratch = new Uint8ClampedArray();
  }
}
