import { test as base } from '@playwright/test';
export { expect } from '@playwright/test';

/** Optional slow-render stress: preserve real clocks/input while delaying game RAF callbacks. */
export const test = base.extend({
  page: async ({ page }, use) => {
    const delay = Number(process.env.BT3_E2E_FRAME_DELAY_MS ?? 0);
    if (!Number.isFinite(delay) || delay < 0) throw new Error('Invalid frame delay.');
    if (delay > 0)
      await page.addInitScript((delay) => {
        const request = window.requestAnimationFrame.bind(window),
          cancel = window.cancelAnimationFrame.bind(window),
          pending = new Map<number, { timer: number; frame: number }>();
        let next = -1;
        window.requestAnimationFrame = (callback) => {
          if (!document.querySelector('.game-canvas')) return request(callback);
          const id = next--,
            entry = {
              timer: window.setTimeout(() => {
                entry.frame = request((now) => {
                  pending.delete(id);
                  callback(now);
                });
              }, delay),
              frame: 0,
            };
          pending.set(id, entry);
          return id;
        };
        window.cancelAnimationFrame = (id) => {
          const entry = pending.get(id);
          if (!entry) return cancel(id);
          clearTimeout(entry.timer);
          if (entry.frame) cancel(entry.frame);
          pending.delete(id);
        };
      }, delay);
    await use(page);
  },
});
