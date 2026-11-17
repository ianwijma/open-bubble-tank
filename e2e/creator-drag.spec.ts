import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import type { TankDesign, TankPart } from '../src/game/core/types';
import { readCreatorDesign, readDisplayedCreatorDesign } from './helpers/creator';
import { waitForMainMenu } from './helpers/main-menu';

const starter: TankDesign = JSON.parse(readFileSync('src/game/data/tanks.json', 'utf8'))
  .avatar_defaults[0];
// Public Save/Copy exports from the drag reference scenario.
const pair: TankPart[] = [-10, 10].map((y, i) => ({
  key: `${i + 1}_mc`,
  type: 1001,
  twin: `${2 - i}_mc`,
  x: -20,
  y,
  rotation: 0,
  scale: 1,
  radius: 7,
}));

test(`creator follows the twin merge/respawn rules and accepts quarter-pixel and zero-delta drag events`, async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Play' }).click();
  await waitForMainMenu(page);
  await page.getByRole('button', { name: 'My tanks', exact: true }).click();
  await page.getByLabel('Import tank design').setInputFiles({
    name: 'twin-drag.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        ...starter,
        sourceCode: undefined,
        id: 'twin-drag',
        avatar: false,
        parts: pair,
      }),
    ),
  });
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByRole('button', { name: 'SAVE', exact: true }).hover();
  // Match the measured4× embedding so every quarter-pixel step is explicit.
  await page.setViewportSize({ width: 2600, height: 2200 });
  await page.addStyleTag({
    content:
      '.stage-frame{position:fixed!important;left:0!important;top:0!important;width:2200px!important;height:1800px!important;max-width:none!important}',
  });
  await expect
    .poll(async () => (await page.locator('.creator-workspace canvas').boundingBox())!.width)
    .toBe(1400);
  const canvas = page.locator('.creator-workspace canvas'),
    b = (await canvas.boundingBox())!,
    at = (x: number, y: number) => ({
      x: b.x + ((x + 175) * b.width) / 350,
      y: b.y + ((y + 175) * b.height) / 350,
    }),
    move = async (x: number, y: number) => {
      const p = at(x, y);
      await page.mouse.move(p.x, p.y);
    },
    parts = async () => (await readCreatorDesign(page)).parts,
    displayed = async () => (await readDisplayedCreatorDesign(page)).parts;
  const start = at(-20, -10);
  await page.mouse.click(start.x, start.y);
  await expect(page.getByRole('status')).toContainText('Selected parts (2)');
  // Without a delivered move during the press, ordinary click toggling remains active.
  await page.mouse.click(start.x, start.y);
  await expect(page.getByRole('status')).toContainText('Selected parts (1)');
  await page.mouse.click(start.x, start.y);
  await expect(page.getByRole('status')).toContainText('Selected parts (2)');
  await page.mouse.down();
  await move(-19, -10);
  await move(-19, 0);
  expect((await displayed()).map((p) => p.y)).toEqual([0, 0]);
  await move(-18, 0);
  const merged = await displayed();
  expect(merged).toHaveLength(1);
  expect(merged[0]).toMatchObject({ key: '1_mc', y: 0, twin: '' });
  expect(merged[0].x).toBeCloseTo(-18, 4);
  await move(-17, 6);
  await page.mouse.up();
  const respawned = await parts();
  expect(respawned).toHaveLength(2);
  expect(respawned[0].key).toBe('1_mc');
  expect(respawned[1]).toMatchObject({ key: respawned[0].twin, twin: '1_mc' });
  for (const [i, p] of respawned.entries()) {
    // Released metadata now contains the display getter coordinates.
    expect(p.x).toBeCloseTo(-17, 4);
    expect(p.y).toBeCloseTo(i === 0 ? 6 : -6, 4);
  }
  await move(-17, 6);
  await page.mouse.down();
  // The 4× positive eighth leaves this pose unchanged; the following
  // quarter reaches the next device pixel. Saved metadata waits for release.
  await move(-16.875, 6);
  for (const p of await displayed()) expect(p.x).toBe(-17);
  await move(-16.75, 6);
  await page.mouse.up();
  const quarter = await parts();
  for (const p of quarter) expect(p.x).toBeCloseTo(-16.75, 4);
  expect(quarter.map((p) => p.y)).toEqual(respawned.map((p) => p.y));
  await expect(page.getByRole('status')).toContainText('Selected parts (2)');
  // A delivered move event with unchanged coordinates still starts the drag,
  // suppresses CLICK selection toggling and records an accepted no-op snapshot.
  await canvas.evaluate((element) => {
    element.addEventListener(
      'pointerdown',
      (event) => {
        if (!(event instanceof PointerEvent)) return;
        // Reuse the actual browser coordinates to deliver exactly zero delta.
        element.dataset.downX = String(event.clientX);
        element.dataset.downY = String(event.clientY);
      },
      { once: true },
    );
  });
  await page.mouse.down();
  await canvas.evaluate((element) => {
    element.dispatchEvent(
      new PointerEvent('pointermove', {
        clientX: Number(element.dataset.downX),
        clientY: Number(element.dataset.downY),
        pointerId: 1,
        bubbles: true,
      }),
    );
    delete element.dataset.downX;
    delete element.dataset.downY;
  });
  await page.mouse.up();
  expect(await parts()).toEqual(quarter);
  await expect(page.getByRole('status')).toContainText('Selected parts (2)');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  expect(await parts()).toEqual(quarter);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  expect(await parts()).toEqual(respawned);
  await page.locator('.creator').screenshot({ path: `test-results/mock-creator-drag.png` });
  expect(errors).toEqual([]);
});
