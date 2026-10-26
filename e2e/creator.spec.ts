import { test, expect, type Page } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { TankDesign, TankPart } from '../src/game/core/types';
const STARTER: TankDesign = JSON.parse(readFileSync(resolve('src/game/data/tanks.json'), 'utf8'))
  .avatar_defaults[0];
const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');
const part = (key: string, x: number, y: number, twin = ''): TankPart => ({
  key,
  type: 1001,
  x,
  y,
  twin,
  radius: 7,
  rotation: 0,
  scale: 1,
});
const seed: TankDesign = {
  ...STARTER,
  id: 'L10000001',
  name: 'Selection fixture',
  author: 'You',
  avatar: false,
  parts: [part('a', -40, -30, 'b'), part('b', -40, 30, 'a'), part('c', 35, -30), part('d', 90, 0)],
};
async function snapshot(page: Page): Promise<TankDesign> {
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const download = await downloading;
  return JSON.parse(readFileSync((await download.path())!, 'utf8'));
}
for (const assets of ['mock', 'SWF'])
  test(`${assets} creator: additive selection, marquee, mirrored group edits and undo`, async ({
    page,
  }) => {
    test.skip(assets === 'SWF' && !existsSync(swf), 'Supply the local reference SWF.');
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/');
    if (assets === 'SWF') await page.getByLabel('Bubble Tanks 3 Flash file').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Play with mock assets' }).click();
    await page.getByRole('button', { name: 'My tanks', exact: true }).click({ timeout: 60000 });
    await page.getByLabel('Import tank design').setInputFiles({
      name: 'selection.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(seed)),
    });
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    const canvas = page.locator('.creator-workspace canvas');
    const bounds = (await canvas.boundingBox())!;
    const at = (x: number, y: number) => ({
      x: bounds.x + ((x + 175) * bounds.width) / 350,
      y: bounds.y + ((y + 175) * bounds.height) / 350,
    });
    const click = async (x: number, y: number) => {
      const p = at(x, y);
      await page.mouse.click(p.x, p.y);
    };
    const drag = async (x: number, y: number, dx: number, dy: number) => {
      const from = at(x, y),
        to = at(x + dx, y + dy);
      await page.mouse.move(from.x, from.y);
      await page.mouse.down();
      await page.mouse.move(to.x, to.y, { steps: 8 });
      await page.mouse.up();
    };
    await click(-40, -30);
    await expect(page.getByText('Selected parts (2)', { exact: true })).toBeVisible();
    await click(35, -30);
    await expect(page.getByText('Selected parts (3)', { exact: true })).toBeVisible();
    await drag(-40, -30, 10, -15);
    let saved = await snapshot(page);
    expect(saved.parts.map((p) => [p.key, p.x, p.y])).toEqual([
      ['a', -30, -45],
      ['b', -30, 45],
      ['c', 45, -45],
      ['d', 90, 0],
    ]);
    await click(130, 110);
    await drag(-60, -70, 125, 50);
    await expect(page.getByText('Selected parts (3)', { exact: true })).toBeVisible();
    await page.getByText('Selected parts (3)', { exact: true }).click();
    await page.getByLabel('Part scale').fill('1.4');
    await page.getByLabel('Part rotation').fill('45');
    saved = await snapshot(page);
    expect(saved.parts.map((p) => [p.key, p.scale, p.rotation])).toEqual([
      ['a', 1.4, 45],
      ['b', 1.4, -45],
      ['c', 1.4, 45],
      ['d', 1, 0],
    ]);
    await page.getByRole('button', { name: 'To front', exact: true }).click();
    expect((await snapshot(page)).parts.map((p) => p.key)).toEqual(['d', 'a', 'b', 'c']);
    await page.screenshot({ path: `test-results/${assets}-creator-group.png` });
    await page.getByRole('button', { name: 'Delete selected part', exact: true }).click();
    expect((await snapshot(page)).parts.map((p) => p.key)).toEqual(['d']);
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    expect((await snapshot(page)).parts.map((p) => p.key)).toEqual(['d', 'a', 'b', 'c']);
    await page.getByLabel('Symmetric Mode').uncheck();
    await click(-30, -45);
    await expect(page.getByText('Selected parts (1)', { exact: true })).toBeVisible();
    await drag(-30, -45, 5, 6);
    saved = await snapshot(page);
    const moved = saved.parts.find((p) => p.key === 'a')!;
    expect(moved.x).toBeCloseTo(-25, 4);
    expect(moved.y).toBeCloseTo(-39, 4);
    expect(moved.twin).toBe('');
    expect(saved.parts.find((p) => p.key === 'b')).toMatchObject({ x: -30, y: 45, twin: '' });
    // Restore the pair, then merge it with one extra horizontal mouse move
    // after reaching the axis: the SWF checks snap candidates before moving.
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await page.getByLabel('Symmetric Mode').check();
    const inspector = page.locator('details.creator-inspector');
    if ((await inspector.getAttribute('open')) !== null) await inspector.locator('summary').click();
    await click(-30, -45);
    const from = at(-30, -45),
      axis = at(-30, 0),
      merge = at(-29, 0);
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(axis.x, axis.y, { steps: 8 });
    await page.mouse.move(merge.x, merge.y);
    await page.mouse.up();
    saved = await snapshot(page);
    expect(saved.parts.map((p) => p.key)).toEqual(['d', 'a', 'c']);
    expect(saved.parts.find((p) => p.key === 'a')).toMatchObject({ y: 0, twin: '' });
    await expect(page.getByText('Selected parts (1)', { exact: true })).toBeVisible();
    await drag(-29, 0, 0, 25);
    saved = await snapshot(page);
    const owner = saved.parts.find((p) => p.key === 'a')!;
    const twin = saved.parts.find((p) => p.key === owner.twin)!;
    expect(owner.y).toBeGreaterThan(0);
    expect(twin.twin).toBe(owner.key);
    expect(twin.y).toBeCloseTo(-owner.y, 4);
    expect(twin.x).toBeCloseTo(owner.x, 4);
    expect(twin.rotation).toBe(-owner.rotation);
    expect(saved.parts.map((p) => p.key)).toEqual(['d', 'a', twin.key, 'c']);
    await expect(page.getByText('Selected parts (2)', { exact: true })).toBeVisible();
    await page.screenshot({ path: `test-results/${assets}-creator-respawn.png` });
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    expect((await snapshot(page)).parts.map((p) => p.key)).toEqual(['d', 'a', 'c']);
    await click(-29, 0);
    await page.mouse.move(merge.x, merge.y);
    await page.mouse.down();
    const canceled = at(-29, 20);
    await page.mouse.move(canceled.x, canceled.y, { steps: 8 });
    await canvas.dispatchEvent('pointercancel', { pointerId: 1 });
    await page.mouse.up();
    const restored = await snapshot(page);
    expect(restored.parts.map((p) => p.key)).toEqual(['d', 'a', 'c']);
    expect(restored.parts.find((p) => p.key === 'a')).toMatchObject({ y: 0, twin: '' });
    await expect(page.getByText('Selected parts (1)', { exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  });
