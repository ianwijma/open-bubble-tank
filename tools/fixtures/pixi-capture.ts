import type { Renderer } from 'pixi.js';
type Options = Parameters<Renderer['extract']['pixels']>[0];

/** WebGL extraction exposes premultiplied bytes; Canvas2D's ImageData expects straight RGB. */
export function captureFrame(renderer: Renderer, options: Options) {
  const frame = renderer.extract.pixels(options),
    canvas = document.createElement('canvas');
  canvas.width = frame.width;
  canvas.height = frame.height;
  const ctx = canvas.getContext('2d')!,
    straight = ctx.createImageData(frame.width, frame.height);
  for (let i = 0; i < frame.pixels.length; i += 4) {
    const alpha = frame.pixels[i + 3];
    straight.data[i + 3] = alpha;
    if (alpha)
      for (let c = 0; c < 3; c++)
        straight.data[i + c] = Math.round((frame.pixels[i + c] * 255) / alpha);
  }
  ctx.putImageData(straight, 0, 0);
  return { ...frame, canvas };
}
export function captureCanvas(renderer: Renderer, options: Options) {
  return captureFrame(renderer, options).canvas;
}
