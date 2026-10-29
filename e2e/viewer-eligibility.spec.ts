import { expect, test } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import type { TankDesign } from '../src/game/core/types';
const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');
const avatars: TankDesign[] = JSON.parse(
  readFileSync('src/game/data/tanks.json', 'utf8'),
).avatar_defaults;
// Exercise the production codec in Bun; Playwright's Node ESM loader requires JSON import attributes.
const encodeFixture = (tank: TankDesign) =>
  execFileSync(
    'bun',
    [
      '-e',
      "import { encodeTankCode } from './src/game/services/tank-code'; console.log(await encodeTankCode(await Bun.stdin.json()));",
    ],
    {
      input: JSON.stringify(tank),
      encoding: 'utf8',
    },
  ).trim();
for (const native of [false, true])
  test(`${native ? 'SWF' : 'mock'} viewer accepts a candidate class budget and reports specific capacity/unlock failures`, async ({
    page,
  }) => {
    test.skip(native && !existsSync(swf), 'Supply the local research SWF.');
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('http://127.0.0.1:3102');
    await page.getByLabel('Fixture').selectOption('viewer-flow-eligibility');
    if (native) await page.getByLabel('Original SWF').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Use mock assets', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Ready', { timeout: 60000 });
    const advance = () =>
      page.getByRole('button', { name: 'Viewer advance 20 frames', exact: true }).click();
    await advance();
    const viewer = page.locator('.tank-viewer'),
      code = page.getByRole('dialog', { name: 'Enter tank code' });
    const loadCode = async (tank: TankDesign) => {
      await page.getByRole('button', { name: 'View tank from code', exact: true }).click();
      await advance();
      await code
        .getByRole('textbox', { name: 'Tank code' })
        .fill(tank.sourceCode ?? encodeFixture(tank));
      await code.getByRole('button', { name: 'Submit tank code', exact: true }).click();
      await expect(viewer).toContainText('Page: 1 out of: 1');
      await advance();
      await page.getByRole('button', { name: `Load ${tank.name}`, exact: true }).click();
    };
    // Class2 at level2 allows4 GP; the preceding Class1 editor/readout only has3 GP.
    const tripod = avatars.find((t) => t.name === 'Tripod')!;
    await loadCode(tripod);
    const confirmation = page.getByRole('dialog', { name: 'Load Tripod?', exact: true });
    await expect(confirmation).toBeVisible();
    await expect(page.getByRole('dialog', { name: 'Tank viewer message' })).toHaveCount(0);
    await advance();
    await viewer.screenshot({
      path: `test-results/${native ? 'native' : 'mock'}-viewer-eligibility.png`,
    });
    await confirmation.getByRole('button', { name: 'No', exact: true }).click();
    await advance();
    const starter = avatars[0],
      radar = {
        ...starter,
        id: 'L-eligibility-radar',
        name: 'Locked Radar',
        sourceCode: undefined,
        parts: [{ ...starter.parts[0] }, { ...starter.parts[1], type: 5001 }],
      };
    const classOnly = {
      ...starter,
      id: 'L-eligibility-class',
      name: 'Class Only',
      sourceCode: undefined,
      classId: 4,
      parts: [starter.parts[0]],
    };
    for (const [tank, expected] of [
      [avatars.find((t) => t.name === 'Super Nimble')!, 'Exceeds your Gun Points'],
      [radar, 'Do not have all the parts for this tank'],
      [classOnly, 'Exceeds your Class'],
    ] as const) {
      await loadCode(tank);
      const message = page.getByRole('dialog', { name: 'Tank viewer message', exact: true });
      await expect(message).toContainText(expected);
      await expect(
        page.getByRole('dialog', { name: `Load ${tank.name}?`, exact: true }),
      ).toHaveCount(0);
      await message.getByRole('button', { name: 'Dismiss message', exact: true }).click();
      await advance();
    }
    expect(errors).toEqual([]);
  });
