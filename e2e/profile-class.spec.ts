import { expect, test } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { TankDesign } from '../src/game/core/types';
import { encodeFixtureTank } from './helpers/tank-code';
const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');
const avatars: TankDesign[] = JSON.parse(
  readFileSync('src/game/data/tanks.json', 'utf8'),
).avatar_defaults;
for (const native of [false, true])
  test(`${native ? 'SWF' : 'mock'} viewer profile class stays separate from current-level editor and selection limits`, async ({
    page,
  }) => {
    test.skip(native && !existsSync(swf), 'Supply the local research SWF.');
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('http://127.0.0.1:3102');
    await page.getByLabel('Fixture').selectOption('unlock-retention');
    if (native) await page.getByLabel('Original SWF').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Use mock assets', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Ready', { timeout: 60000 });
    const proof = page.locator('#unlock-retention-controls'),
      advance = () =>
        page.getByRole('button', { name: 'Unlock viewer advance 20 frames', exact: true }).click();
    await expect(proof).toHaveAttribute('data-unlock-level', '1');
    await expect(proof).toHaveAttribute('data-profile-class', '4');
    await expect(page.getByText('Max Class: 2', { exact: true })).toBeVisible();
    const openViewer = async () => {
      await page.getByRole('button', { name: 'Load a Tank...', exact: true }).click();
      await advance();
      await expect(page.locator('.tank-viewer')).toHaveAttribute('data-viewer-ready', 'true');
    };
    await openViewer();
    const points = page.locator('[data-viewer-pane="toolbar:btnCurrentPoints_mc"]');
    await expect(points.locator('[data-creator-field="txtClass_txt"] .sr-only')).toHaveText('4');
    await expect(points.locator('[data-creator-field="txtGP_txt"] .sr-only')).toHaveText('2');
    await page.locator('#stage').screenshot({
      path: `test-results/${native ? 'native' : 'mock'}-profile-class-downgrade.png`,
    });
    const loadCode = async (tank: TankDesign) => {
      await page.getByRole('button', { name: 'View tank from code', exact: true }).click();
      await advance();
      const code = page.getByRole('dialog', { name: 'Enter tank code' });
      await code
        .getByRole('textbox', { name: 'Tank code' })
        .fill(tank.sourceCode ?? encodeFixtureTank(tank));
      await code.getByRole('button', { name: 'Submit tank code', exact: true }).click();
      await expect(page.locator('.tank-viewer')).toContainText('Page: 1 out of: 1');
      await advance();
      await page.getByRole('button', { name: `Load ${tank.name}`, exact: true }).click();
    };
    await loadCode(avatars.find((tank) => tank.name === 'Fury')!);
    await expect(page.locator('.viewer-rejection')).toHaveAccessibleName(
      'You Cannot Select This Tank: Exceeds your Gun Points',
    );
    for (let i = 0; i < 5; i++) await advance();
    // No GP overflow here: current-level class validation fails but the stored-class label is empty.
    await loadCode({
      ...avatars[0],
      id: 'L-body-class3',
      name: 'Body Class3',
      sourceCode: undefined,
      classId: 3,
      parts: [avatars[0].parts[0]],
    });
    await expect(page.locator('.viewer-rejection')).toHaveAccessibleName(
      'You Cannot Select This Tank: Exceeds your',
    );
    expect(
      await page
        .locator('.viewer-rejection [data-creator-field="txtErrorOutputText_txt"] .sr-only')
        .textContent(),
    ).toBe('Exceeds your ');
    for (let i = 0; i < 5; i++) await advance();
    await page.getByRole('button', { name: 'Return to Tank Creator', exact: true }).click();
    await page.getByRole('button', { name: 'Re-earn next unlock level', exact: true }).click();
    await expect(proof).toHaveAttribute('data-unlock-level', '2');
    await expect(proof).toHaveAttribute('data-profile-class', '3');
    await expect(page.getByText('Max Class: 3', { exact: true })).toBeVisible();
    await openViewer();
    await expect(points.locator('[data-creator-field="txtClass_txt"] .sr-only')).toHaveText('3');
    await expect(points.locator('[data-creator-field="txtGP_txt"] .sr-only')).toHaveText('3');
    await page.locator('#stage').screenshot({
      path: `test-results/${native ? 'native' : 'mock'}-profile-class-reupgrade.png`,
    });
    await page.getByRole('button', { name: 'Start fresh unlock session', exact: true }).click();
    await expect(proof).toHaveAttribute('data-profile-class', '2');
    await openViewer();
    await expect(points.locator('[data-creator-field="txtClass_txt"] .sr-only')).toHaveText('2');
    expect(errors).toEqual([]);
  });
