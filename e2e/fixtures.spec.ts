import { test, expect } from '@playwright/test';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');
test('native tactical HUD uses class health widths, partial ally rings and fixed radar arrows', async ({
  page,
}) => {
  test.skip(!existsSync(swf), 'Set BT3_SWF_FILE to render the original SWF fixtures.');
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('http://127.0.0.1:3102');
  await page.getByLabel('Fixture').selectOption('tactical-hud');
  await page.getByLabel('Original SWF').setInputFiles(swf);
  const status = page.getByRole('status');
  await expect(status).toContainText('Ready', { timeout: 60000 });
  const proof = JSON.parse((await status.getAttribute('data-tactical-hud'))!);
  expect(proof.empty).toBe(0);
  for (const [i, width] of [20, 60, 120].entries())
    expect(Math.abs(proof.barWidths[i] - width)).toBeLessThanOrEqual(2);
  expect(proof.filled).toBeGreaterThan(proof.unfilled + 40);
  expect(proof.unfilled).toBeGreaterThan(0);
  for (const ring of proof.rings) expect(ring.ink).toBeGreaterThan(100);
  expect(new Set(proof.rings.map((ring: { hash: number }) => ring.hash)).size).toBe(3);
  for (const arrow of proof.arrows) expect(arrow).toBeGreaterThan(0);
  expect(proof.cleared).toBe(0);
  expect(proof.collapseUiFrozen).toBe(true);
  expect(proof.collapseFrames).toBe(20);
  await page.screenshot({ path: 'test-results/fixture-tactical-hud.png' });
  expect(errors).toEqual([]);
});
test('native field captions keep their field origin and edit variants retain authored widths and hover alpha', async ({
  page,
}) => {
  test.skip(!existsSync(swf), 'Set BT3_SWF_FILE to render the original SWF fixtures.');
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('http://127.0.0.1:3102');
  await page.getByLabel('Fixture').selectOption('field-overlays');
  await page.getByLabel('Original SWF').setInputFiles(swf);
  const status = page.getByRole('status');
  await expect(status).toContainText('Ready', { timeout: 60000 });
  const proof = JSON.parse((await status.getAttribute('data-field-overlays'))!);
  for (const count of proof.stages) expect(count).toBeGreaterThan(500);
  expect(proof.fieldScalePreserved).toBe(true);
  expect(proof.cameraShift).toBe(-80);
  expect(proof.sliderWidths).toEqual([122, 401.45, 24]);
  expect(proof.normal).toBe(51);
  expect(proof.hovered).toBe(102);
  await page.screenshot({ path: 'test-results/fixture-field-overlays.png' });
  expect(errors).toEqual([]);
});
test('native HUD renders grouped primaries, secondary-only, empty weapons and partial fills', async ({
  page,
}) => {
  test.skip(!existsSync(swf), 'Set BT3_SWF_FILE to render the original SWF fixtures.');
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('http://127.0.0.1:3102');
  await page.getByLabel('Fixture').selectOption('hud');
  await page.getByLabel('Original SWF').setInputFiles(swf);
  const status = page.getByRole('status');
  await expect(status).toContainText('Ready', { timeout: 60000 });
  const proof = JSON.parse((await status.getAttribute('data-hud'))!);
  expect(proof.empty).toBe(0);
  for (const key of ['primary', 'secondary', 'secondaryOnly', 'life']) {
    expect(proof[key].filled).toBeGreaterThan(proof[key].empty + 50);
    expect(proof[key].empty).toBeGreaterThan(0);
  }
  expect(proof.labels).toEqual(["BC's", 'HC', 'MG', 'SMG', 'DLMG', '2P', '3S', '5S', 'PC']);
  await page.screenshot({ path: 'test-results/fixture-hud.png' });
  expect(errors).toEqual([]);
});
test('native beam masks and each turret construction state render in deterministic fixtures', async ({
  page,
}) => {
  test.skip(!existsSync(swf), 'Set BT3_SWF_FILE to render the original SWF fixtures.');
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('http://127.0.0.1:3102');
  await page.getByLabel('Original SWF').setInputFiles(swf);
  await expect(page.getByRole('status')).toContainText('Ready', { timeout: 60000 });
  await expect(page.getByRole('status')).toContainText('1 beam(s)');
  await expect(page.getByRole('status')).toHaveAttribute('data-beam-mid-hit', 'true');
  await expect(page.getByRole('status')).toHaveAttribute('data-beam-beyond-hit', 'false');
  await page.screenshot({ path: 'test-results/fixture-healing.png' });
  await page.getByLabel('Fixture').selectOption('damage');
  await expect(page.getByRole('status')).toContainText('frame 30');
  await expect(page.getByRole('status')).toContainText('1 beam(s)');
  await expect(page.getByRole('status')).toContainText('patients 985');
  await expect(page.getByRole('status')).toHaveAttribute('data-beam-mid-hit', 'true');
  await expect(page.getByRole('status')).toHaveAttribute('data-beam-beyond-hit', 'false');
  await page.screenshot({ path: 'test-results/fixture-damage.png' });
  for (const stage of [1, 2, 3, 4]) {
    await page.getByLabel('Fixture').selectOption(`turret-${stage}`);
    await expect(page.getByRole('status')).toContainText(`builds ${stage}`);
    await page.screenshot({ path: `test-results/fixture-turret-${stage}.png` });
  }
  await page.getByLabel('Fixture').selectOption('statuses');
  await expect(page.getByRole('status')).toHaveAttribute('data-status-marks', '20');
  await expect(page.getByRole('status')).toHaveAttribute('data-infected-life', '98');
  await page.screenshot({ path: 'test-results/fixture-statuses.png' });
  await page.getByLabel('Fixture').selectOption('ink');
  await expect(page.getByRole('status')).toContainText('frame 30');
  await page.screenshot({ path: 'test-results/fixture-ink.png' });
  await page.getByLabel('Fixture').selectOption('protection');
  await expect(page.getByRole('status')).toContainText('frame 5');
  await page.screenshot({ path: 'test-results/fixture-protection.png' });
  await page.getByRole('button', { name: 'Hit forcefield' }).click();
  await page.screenshot({ path: 'test-results/fixture-forcefield-hit.png' });
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Hit forcefield' }).click();
  await expect(page.getByRole('status')).toHaveAttribute('data-forcefield-ready', 'false');
  await page.screenshot({ path: 'test-results/fixture-forcefield-broken.png' });
  for (let i = 0; i < 32; i++)
    await page.getByRole('button', { name: 'Advance 10 frames' }).click();
  await expect(page.getByRole('status')).toHaveAttribute('data-forcefield-ready', 'true');
  await page.screenshot({ path: 'test-results/fixture-forcefield-rearm.png' });
  await page.getByLabel('Fixture').selectOption('downgrade');
  await expect(page.getByRole('status')).toHaveAttribute('data-player-design', 'higher');
  await page.screenshot({ path: 'test-results/fixture-higher.png' });
  await page.getByRole('button', { name: 'Downgrade tank' }).click();
  await expect(page.getByRole('status')).toHaveAttribute('data-player-design', 'lower');
  await expect(page.getByRole('status')).toHaveAttribute('data-secondary', '3010');
  await page.getByRole('button', { name: 'Advance 10 frames' }).click();
  await page.screenshot({ path: 'test-results/fixture-lower.png' });
  await page.getByRole('button', { name: 'Secondary attack' }).click();
  await expect(page.getByRole('status')).toHaveAttribute('data-shield', '25');
  await page.screenshot({ path: 'test-results/fixture-lower-shield.png' });
  await page.getByLabel('Camera zoom').fill('65');
  await expect(page.getByRole('status')).toHaveAttribute('data-camera-scale', '0.65');
  await page.getByLabel('Camera zoom').fill('100');
  await page.getByLabel('Fixture').selectOption('travel');
  await expect(page.getByRole('status')).toHaveAttribute('data-travel', 'transit');
  await page.screenshot({ path: 'test-results/fixture-travel-1.png' });
  await page.getByRole('button', { name: 'Advance 10 frames' }).click();
  await page.screenshot({ path: 'test-results/fixture-travel-11.png' });
  for (let i = 0; i < 8; i++) await page.getByRole('button', { name: 'Advance 10 frames' }).click();
  await expect(page.getByRole('status')).toHaveAttribute('data-field', '1,0');
  await expect(page.getByRole('status')).toHaveAttribute('data-connections', '1');
  await page.getByLabel('Fixture').selectOption('morphs');
  await expect(page.getByRole('status')).toHaveAttribute('data-morph-samples', '18');
  await expect(page.getByRole('status')).toHaveAttribute('data-morph-mask-moves', 'true');
  await page.screenshot({ path: 'test-results/fixture-morphs.png' });
  expect(
    Number(await page.getByRole('status').getAttribute('data-morph-error')),
    (await page.getByRole('status').getAttribute('data-morph-errors')) ?? '',
  ).toBeLessThan(2);
  expect(
    Number(await page.getByRole('status').getAttribute('data-morph-cache-pixels')),
  ).toBeLessThanOrEqual(8 * 1024 * 1024);
  await page.screenshot({ path: 'test-results/fixture-morphs.png' });
  await page.getByLabel('Fixture').selectOption('playback');
  await expect(page.getByRole('status')).toHaveAttribute('data-playback-samples', /\d+/, {
    timeout: 15000,
  });
  const samples = Number(await page.getByRole('status').getAttribute('data-playback-samples'));
  const missed = Number(await page.getByRole('status').getAttribute('data-playback-missed'));
  const spurious = Number(await page.getByRole('status').getAttribute('data-playback-spurious'));
  expect(samples).toBeGreaterThan(1000);
  expect((missed + spurious) / samples).toBeLessThan(0.02);
  const frames = JSON.parse((await page.getByRole('status').getAttribute('data-playback-frames'))!);
  expect(
    frames.find((row: { type: number; y: number }) => row.type === 1501 && row.y < 0).frames,
  ).toEqual([1, 26, 1, 1]);
  expect(
    frames.find((row: { type: number; y: number }) => row.type === 1501 && row.y > 0).frames,
  ).toEqual([51, 76, 51, 51]);
  await page.screenshot({ path: 'test-results/fixture-playback.png' });
  await page.getByLabel('Fixture').selectOption('minimap');
  await expect(page.getByRole('status')).toHaveAttribute('data-minimap', /traveled/);
  const map = JSON.parse((await page.getByRole('status').getAttribute('data-minimap'))!);
  expect(map.traveled).toBeGreaterThan(220);
  expect(map.untraveled).toBeLessThan(30);
  expect(map.uncleared).toBeGreaterThan(70);
  expect(map.uncleared).toBeLessThan(110);
  expect(map.cleared).toBeLessThan(30);
  expect(map.destroyed).toBeGreaterThan(200);
  expect(map.clipped).toBe(0);
  expect(map.hidden).toBe(0);
  await page.screenshot({ path: 'test-results/fixture-minimap.png' });
  expect(errors).toEqual([]);
});
