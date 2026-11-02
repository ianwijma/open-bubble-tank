/** Native canvas input for the owned reference browser. Run with Node, not Bun. */
import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
const [command, ...raw] = process.argv.slice(2),
  values = raw.map(Number);
const referenceOrigin = new URL(process.env.BT3_REFERENCE_URL ?? 'http://127.0.0.1:3103').origin;
const browser = await chromium.connectOverCDP(
  `http://127.0.0.1:${process.env.BT3_REFERENCE_CDP_PORT ?? 9223}`,
  { timeout: 10000 },
);
let release: (() => Promise<void>) | undefined;
try {
  const page = browser
    .contexts()
    .flatMap((c) => c.pages())
    .find((p) => new URL(p.url()).origin === referenceOrigin);
  if (!page) throw new Error('Open the local original reference viewer first.');
  if (command === 'reload' && raw.length === 1) await page.reload();
  if ((command === 'load' || command === 'reload') && raw.length === 1) {
    await page.getByLabel('Original SWF').setInputFiles(raw[0]);
    await page.waitForFunction(
      () => document.querySelector('#status')?.getAttribute('data-ready') === 'true',
    );
  }
  const r = await page.locator('ruffle-player').boundingBox();
  if (!r) throw new Error('Load the original SWF first with load PATH.');
  const point = (x: number, y: number) => ({
    x: r.x + (x * r.width) / 550,
    y: r.y + (y * r.height) / 450,
  });
  if ((command === 'load' || command === 'reload') && raw.length === 1) {
    /* Captured below after the local file loads. */
  } else if (command === 'status') {
    console.log(await page.locator('#status').innerText());
    console.log(await page.locator('#trace').innerText());
  } else if (command === 'click' && values.length === 2) {
    const p = point(values[0], values[1]);
    // Keep down/up in separate Flash frames; a zero-duration click can miss MOUSE_DOWN.
    await page.mouse.click(p.x, p.y, { delay: 50 });
  } else if (command === 'hold' && values.length === 3) {
    const p = point(values[0], values[1]);
    await page.mouse.move(p.x, p.y);
    release = () => page.mouse.up();
    await page.mouse.down();
    await page.waitForTimeout(Math.min(30000, Math.max(0, values[2])));
  } else if (command === 'keyhold' && raw.length === 2) {
    release = () => page.keyboard.up(raw[0]);
    await page.keyboard.down(raw[0]);
    await page.waitForTimeout(Math.min(30000, Math.max(0, values[1])));
  } else if (command === 'drag' && values.length === 4) {
    const from = point(values[0], values[1]),
      to = point(values[2], values[3]);
    await page.mouse.move(from.x, from.y);
    release = () => page.mouse.up();
    await page.mouse.down();
    for (let i = 1; i <= 20; i++) {
      await page.mouse.move(
        from.x + ((to.x - from.x) * i) / 20,
        from.y + ((to.y - from.y) * i) / 20,
      );
      await page.waitForTimeout(25);
    }
    await page.mouse.up();
    release = undefined;
  } else if (command === 'move' && values.length === 2) {
    const p = point(values[0], values[1]);
    await page.mouse.move(p.x, p.y);
  } else if (command === 'press' && raw.length === 1) await page.keyboard.press(raw[0]);
  else if (command === 'pause')
    await page.getByRole('button', { name: 'Pause reference', exact: true }).click();
  else if (command === 'resume')
    await page.getByRole('button', { name: 'Resume reference', exact: true }).click();
  else if (command === 'wait' && values.length === 1)
    await page.waitForTimeout(Math.min(30000, Math.max(0, values[0])));
  else
    throw new Error(
      'Use load PATH, reload PATH, click X Y, hold X Y MS, keyhold KEY MS, drag X Y X Y, move X Y, press KEY, wait MS, status, pause, or resume.',
    );
  await page.waitForTimeout(400);
  const path = process.env.BT3_REFERENCE_CAPTURE ?? 'test-results/reference-current.png';
  await mkdir(dirname(path), { recursive: true });
  await page.locator('ruffle-player').screenshot({ path });
  console.log(`Original stage capture: ${path}`);
} finally {
  try {
    await release?.();
  } finally {
    await browser.close();
  }
}
