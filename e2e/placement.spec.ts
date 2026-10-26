import { test, expect, type Page, type Locator } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { TankDesign } from '../src/game/core/types';
import { dropPreview } from './helpers/creator';
const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');
async function snapshot(page: Page): Promise<TankDesign> {
  const waiting = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  return JSON.parse(readFileSync((await (await waiting).path())!, 'utf8'));
}
async function animatedPixels(canvas: Locator) {
  const signature = () =>
    canvas.evaluate((element) => {
      const cv = element as HTMLCanvasElement;
      const pixels = cv.getContext('2d')!.getImageData(0, 0, cv.width, cv.height).data;
      let hash = 2166136261;
      for (const value of pixels) hash = Math.imul(hash ^ value, 16777619);
      return hash >>> 0;
    });
  // Require three poses, so switching from the static loading fallback is insufficient.
  const first = await signature();
  await expect.poll(signature).not.toBe(first);
  const second = await signature();
  await expect.poll(signature).not.toBe(second);
}
for (const assets of ['mock', 'SWF'])
  test(`${assets} creator uses preview placement, repeated drops, axis snap and cancellation`, async ({
    page,
  }) => {
    test.skip(assets === 'SWF' && !existsSync(swf), 'Provide the local reference SWF.');
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/');
    if (assets === 'SWF') await page.getByLabel('Bubble Tanks 3 Flash file').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Play with mock assets' }).click();
    await page.getByRole('button', { name: 'Enemy tank creator' }).click({ timeout: 60000 });
    expect(await snapshot(page)).toMatchObject({ parts: [], life: 1, reward: 1, speed: 1 });
    const row = page.getByRole('button', { name: 'Place Medium Bubble', exact: true });
    await row.click();
    await expect(row).toHaveAttribute('aria-pressed', 'true');
    if (assets === 'SWF') await animatedPixels(page.locator('.creator-part-preview canvas'));
    await page.locator('.creator-workspace canvas').click({ position: { x: 175, y: 175 } });
    expect((await snapshot(page)).parts).toEqual([]); // Palette selection does not arm canvas clicks.
    await dropPreview(page, 40, -25);
    if (assets === 'SWF') await animatedPixels(page.locator('.creator-workspace canvas'));
    let saved = await snapshot(page);
    expect(saved.parts).toHaveLength(2);
    expect(saved.parts.map((p) => [p.type, p.scale, p.rotation])).toEqual([
      [1002, 1, 0],
      [1002, 1, 0],
    ]);
    for (const part of saved.parts) expect(part.radius).toBeCloseTo(12.6, 6);
    expect(saved.parts[0].x).toBeCloseTo(40, 4);
    expect(saved.parts[0].y).toBeCloseTo(-25, 4);
    expect(saved.parts[1]).toMatchObject({ twin: saved.parts[0].key });
    expect(saved.parts[1].y).toBeCloseTo(25, 4);
    await expect(page.getByText(/^Selected parts/)).toHaveCount(0);
    await expect(row).toHaveAttribute('aria-pressed', 'true');
    await dropPreview(page, -40, 2);
    saved = await snapshot(page);
    expect(saved.parts).toHaveLength(3);
    expect(saved.parts[2]).toMatchObject({ type: 1002, y: 0, twin: '' });
    await page.getByLabel('Symmetric Mode').uncheck();
    await dropPreview(page, -70, -2);
    saved = await snapshot(page);
    expect(saved.parts).toHaveLength(4);
    expect(saved.parts[3]).toMatchObject({ y: 0, twin: '' });
    await dropPreview(page, 200, 0);
    expect((await snapshot(page)).parts).toHaveLength(4);
    const preview = page.getByRole('button', {
      name: 'Drag Medium Bubble into design',
      exact: true,
    });
    const r = (await preview.boundingBox())!;
    const canvas = (await page.locator('.creator-workspace canvas').boundingBox())!;
    await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
    await page.mouse.down();
    await page.mouse.move(canvas.x + canvas.width / 2, canvas.y + canvas.height / 2, { steps: 10 });
    await preview.dispatchEvent('pointercancel', { pointerId: 1 });
    await page.mouse.up();
    expect((await snapshot(page)).parts).toHaveLength(4);
    await page.mouse.click(
      canvas.x + ((40 + 175) * canvas.width) / 350,
      canvas.y + ((-25 + 175) * canvas.height) / 350,
    );
    await expect(page.getByText('Selected parts (1)', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Place Small Bubble', exact: true }).click();
    await dropPreview(page, 110, 40);
    expect((await snapshot(page)).parts).toHaveLength(5);
    await expect(page.getByText('Selected parts (1)', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    expect((await snapshot(page)).parts).toHaveLength(4);
    await row.click();
    await preview.focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
    saved = await snapshot(page);
    expect(saved.parts).toHaveLength(5);
    expect(saved.parts[4]).toMatchObject({ x: 1, y: 0, twin: '' });
    await preview.focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Escape');
    expect((await snapshot(page)).parts).toHaveLength(5);
    await page.screenshot({ path: `test-results/${assets}-creator-placement.png` });
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    expect((await snapshot(page)).parts).toHaveLength(4);
    expect(errors).toEqual([]);
  });
