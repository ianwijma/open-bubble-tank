import type { Page } from '@playwright/test';

/** Observe the actual offscreen paint source without exposing renderer internals in the app. */
export async function observeUpgradePreviewRenderer(page: Page) {
  await page.addInitScript(() => {
    const drawImage = CanvasRenderingContext2D.prototype.drawImage;
    const sources = new WeakMap<object, number>();
    let next = 1;
    Object.defineProperty(CanvasRenderingContext2D.prototype, 'drawImage', {
      value: function (
        this: CanvasRenderingContext2D,
        source: CanvasImageSource,
        ...coordinates: number[]
      ) {
        Reflect.apply(drawImage, this, [source, ...coordinates]);
        if (!this.canvas.matches('.upgrade-tank-art')) return;
        let id = sources.get(source);
        if (id === undefined) sources.set(source, (id = next++));
        this.canvas.dataset.observedUpgradeRenderer = String(id);
        this.canvas.dataset.observedUpgradeDraws = String(
          Number(this.canvas.dataset.observedUpgradeDraws ?? 0) + 1,
        );
      },
    });
  });
}
