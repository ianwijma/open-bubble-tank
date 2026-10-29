import { expect, test, type Page } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { TankDesign } from '../src/game/core/types';
import { dropPreview } from './helpers/creator';
import { encodeFixtureTank } from './helpers/tank-code';
const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');
async function design(page: Page): Promise<TankDesign> {
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  return JSON.parse(readFileSync((await (await download).path())!, 'utf8'));
}
for (const native of [false, true])
  test(`${native ? 'SWF' : 'mock'} unlocked Radar survives real downgrades through creator and viewer, then resets in a fresh session`, async ({
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
    const proof = page.locator('#unlock-retention-controls');
    await expect(proof).toHaveAttribute('data-unlock-level', '1');
    await expect(proof).toHaveAttribute('data-radar-unlocked', 'true');
    await page.getByRole('button', { name: 'Passive', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Place Radar', exact: true })).toBeEnabled();
    await page.getByLabel('Symmetric Mode').uncheck();
    await page.getByRole('button', { name: 'Place Radar', exact: true }).click();
    await dropPreview(page, 20, 20);
    const placed = await design(page);
    expect(placed.parts.filter((p) => p.type === 5001)).toHaveLength(1);
    await expect(page.getByRole('button', { name: 'SAVE', exact: true })).toBeEnabled();
    await page
      .locator('#stage')
      .screenshot({ path: `test-results/${native ? 'native' : 'mock'}-retained-unlocks.png` });
    const tankCode = encodeFixtureTank({
      ...placed,
      id: 'L-retained-radar',
      name: 'Retained Radar',
      sourceCode: undefined,
    });
    const advance = () =>
      page.getByRole('button', { name: 'Unlock viewer advance 20 frames', exact: true }).click();
    const importRadar = async () => {
      await page.getByRole('button', { name: 'Load a Tank...', exact: true }).click();
      await advance();
      await expect(page.locator('.tank-viewer')).toHaveAttribute('data-viewer-ready', 'true');
      await page.getByRole('button', { name: 'View tank from code', exact: true }).click();
      await advance();
      const code = page.getByRole('dialog', { name: 'Enter tank code' });
      await code.getByRole('textbox', { name: 'Tank code' }).fill(tankCode);
      await code.getByRole('button', { name: 'Submit tank code', exact: true }).click();
      await expect(page.locator('.tank-viewer')).toContainText('Page: 1 out of: 1');
      await advance();
      await page.getByRole('button', { name: 'Load Retained Radar', exact: true }).click();
    };
    await importRadar();
    const confirm = page.getByRole('dialog', { name: 'Load Retained Radar?', exact: true });
    await expect(confirm).toBeVisible();
    await confirm.getByRole('button', { name: 'Yes', exact: true }).click();
    await expect(page.locator('.creator')).toBeVisible();
    expect((await design(page)).parts.filter((p) => p.type === 5001)).toHaveLength(1);
    await page.getByRole('button', { name: 'Passive', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Place Radar', exact: true })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Place Radar', exact: true })).toHaveAttribute(
      'aria-description',
      'Not enough Gun Points.',
    );
    await page.getByRole('button', { name: 'Start fresh unlock session', exact: true }).click();
    await expect(proof).toHaveAttribute('data-unlock-level', '1');
    await expect(proof).toHaveAttribute('data-radar-unlocked', 'false');
    await page.getByRole('button', { name: 'Passive', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Radar, unlocks at level 3', exact: true }),
    ).toBeDisabled();
    await page
      .locator('#stage')
      .screenshot({ path: `test-results/${native ? 'native' : 'mock'}-fresh-unlocks.png` });
    await importRadar();
    await expect(
      page.getByRole('status', {
        name: 'You Cannot Select This Tank: Do not have all the parts for this tank',
        exact: true,
      }),
    ).toBeVisible();
    await expect(confirm).toHaveCount(0);
    expect(errors).toEqual([]);
  });
