import { waitForMainMenu } from './helpers/main-menu';
import { test, expect } from '@playwright/test';
import { readCreatorDesign, dropPreview } from './helpers/creator';
import reference from '../tests/fixtures/creator-point-reference.json' with { type: 'json' };
const snapshot = readCreatorDesign;
test(`mock creator uses preview placement, repeated drops, axis snap and cancellation`, async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Play with mock assets' }).click();
  await waitForMainMenu(page);
  await page.getByRole('button', { name: 'Enemy tank creator' }).click({ timeout: 60000 });
  expect(await snapshot(page)).toMatchObject({ parts: [], life: 20, reward: 20, speed: 2 });
  const row = page.getByRole('button', { name: 'Place Medium Bubble', exact: true });
  await row.click();
  await expect(row).toHaveAttribute('aria-pressed', 'true');
  await page.locator('.creator-workspace canvas').click({ position: { x: 175, y: 175 } });
  expect((await snapshot(page)).parts).toEqual([]); // Palette selection does not arm canvas clicks.
  // Replay a measured original gesture: canvas-relative integers at the fitted
  // 1.6× scale do not survive the source Point/display conversions unchanged.
  const placement = reference.placement.find((row) => row.name === 'placement-eighth-scale1')!;
  await page.addStyleTag({
    content:
      '.stage-frame{position:fixed!important;left:0!important;top:0!important;width:550px!important;height:450px!important;max-width:none!important}',
  });
  await expect
    .poll(async () => (await page.locator('.creator-workspace canvas').boundingBox())!.width)
    .toBe(350);
  const stage = (await page.locator('.stage-space').boundingBox())!;
  const start = (await page.locator('.creator-part-preview').boundingBox())!;
  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
  await page.mouse.down();
  await page.mouse.move(stage.x + placement.mouse.x, stage.y + placement.mouse.y, { steps: 12 });
  await page.mouse.up();
  let saved = await snapshot(page);
  expect(saved.parts).toHaveLength(2);
  expect(saved.parts.map((p) => [p.type, p.scale, p.rotation])).toEqual([
    [1002, 1, 0],
    [1002, 1, 0],
  ]);
  for (const part of saved.parts) expect(part.radius).toBeCloseTo(12.6, 6);
  expect(saved.parts.map(({ x, y }) => ({ x, y }))).toEqual(
    placement.expected.map(({ x, y }) => ({ x, y })),
  );
  expect(saved.parts[0].twin).toBe(saved.parts[1].key);
  expect(saved.parts[1].twin).toBe(saved.parts[0].key);
  const selection = page.getByRole('status', { includeHidden: true });
  await expect(selection).toHaveText('Selected parts (0)');
  await expect(selection).toBeHidden();
  await expect(page.getByRole('status')).toHaveCount(0);
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
  await page.mouse.click(stage.x + placement.mouse.x, stage.y + placement.mouse.y);
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
  await page.screenshot({ path: `test-results/mock-creator-placement.png` });
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  expect((await snapshot(page)).parts).toHaveLength(4);
  expect(errors).toEqual([]);
});
