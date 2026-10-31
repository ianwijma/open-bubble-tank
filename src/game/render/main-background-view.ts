import paint from '../data/main-background.json';
import type { MainBackground } from '../core/main-background';

/** Shape356 gradient, followed by two _-US BitmapData layers at parent alpha0.5. */
export class MainBackgroundView {
  readonly canvas = document.createElement('canvas');
  private context: CanvasRenderingContext2D;
  private gradient = document.createElement('canvas');
  private pixels = document.createElement('canvas');
  private pixelContext: CanvasRenderingContext2D;
  private image: ImageData;
  private revision = -1;
  constructor() {
    for (const canvas of [this.canvas, this.gradient, this.pixels]) {
      canvas.width = 550;
      canvas.height = 450;
    }
    this.context = this.canvas.getContext('2d')!;
    this.pixelContext = this.pixels.getContext('2d')!;
    this.image = this.pixelContext.createImageData(550, 450);
    const ctx = this.gradient.getContext('2d')!,
      m = paint.fill.matrix;
    const gradient = ctx.createLinearGradient(
      -819.2 * m.a + m.tx / 20,
      -819.2 * m.b + m.ty / 20,
      819.2 * m.a + m.tx / 20,
      819.2 * m.b + m.ty / 20,
    );
    for (const stop of paint.fill.stops)
      gradient.addColorStop(stop.ratio / 255, `rgb(${stop.color.join(' ')})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 550, 450);
    this.draw();
  }
  draw(background?: MainBackground) {
    if (background && background.revision === this.revision) return;
    this.context.globalAlpha = 1;
    this.context.drawImage(this.gradient, 0, 0);
    for (const layer of background?.layers ?? []) {
      this.image.data.fill(0);
      for (const p of layer.painted) {
        const x = Math.trunc(p.x),
          y = Math.trunc(p.y);
        if (x < 0 || x >= 550 || y < 0 || y >= 450) continue;
        // setPixel32 replaces overlaps within a layer, including transparent particles.
        this.image.data.set([255, 255, 255, p.alpha], (y * 550 + x) * 4);
      }
      this.pixelContext.putImageData(this.image, 0, 0);
      this.context.globalAlpha = 0.5;
      this.context.drawImage(this.pixels, 0, 0);
    }
    this.context.globalAlpha = 1;
    this.revision = background?.revision ?? -1;
  }
}
