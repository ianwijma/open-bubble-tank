import { expect, test } from './helpers/frame-paced-test';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { waitForMainMenu } from './helpers/main-menu';
import { visitAdjacentFieldAndReturn } from './helpers/field-travel';
import { DEFAULT_SETTINGS } from '../src/game/core/constants';
import type { TankDesign } from '../src/game/core/types';
const avatars: TankDesign[] = JSON.parse(
  readFileSync('src/game/data/tanks.json', 'utf8'),
).avatar_defaults;
const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');
for (const native of [false, true])
  test(`${native ? 'SWF' : 'mock'} upgrade screen preserves authored three-card geometry, summaries and live fitted artwork`, async ({
    page,
  }) => {
    test.setTimeout(120000);
    test.skip(native && !existsSync(swf), 'Supply local research SWF.');
    const starter = avatars[0],
      heavy = avatars.find((t) => t.name === 'Heavy Seeker')!;
    const guard = {
      ...heavy,
      id: 'fixture-level-two-guard',
      sourceCode: undefined,
      parts: [
        ...heavy.parts,
        { ...starter.parts[1], key: 'fixture-forcefield', type: 5005, x: 0, y: 0 },
      ],
    };
    await page.addInitScript(
      (profile) => localStorage.setItem('open-bubble-tank.profile.v1', JSON.stringify(profile)),
      {
        version: 1,
        creatorHelpSeen: true,
        tankViewerHelpSeen: true,
        secondaryHelpSeen: true,
        tanks: [],
        achievements: [],
        nextTankId: 10000001,
        settings: DEFAULT_SETTINGS,
        progression: [starter, avatars.find((t) => t.name === 'Sturdy')!, guard],
      },
    );
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/');
    if (native) await page.getByLabel('Bubble Tanks 3 Flash file').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Play with mock assets', exact: true }).click();
    await waitForMainMenu(page);
    await page.getByRole('button', { name: 'Original game size', exact: true }).click();
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await page.getByRole('checkbox', { name: 'Use saved avatars from previous game' }).check();
    await page
      .getByRole('dialog', { name: 'Choose your tanks' })
      .getByRole('button', { name: 'PLAY', exact: true })
      .click();
    await expect(page.locator('.game-canvas canvas')).toBeVisible();
    await page.locator('.game-canvas').focus();
    await visitAdjacentFieldAndReturn(page);
    await page.getByRole('button', { name: 'Edit your tank', exact: true }).click();
    await page
      .getByRole('dialog', { name: 'Edit your tank?', exact: true })
      .getByRole('button', { name: 'YES', exact: true })
      .click();
    const menu = page.getByRole('dialog', { name: 'Upgrade your tank', exact: true }),
      cards = menu.locator('.upgrade-card'),
      canvases = cards.locator('canvas');
    await expect(cards).toHaveCount(3);
    await expect(cards.locator('canvas:visible')).toHaveCount(3);
    await expect(menu.locator('canvas[data-upgrade-ready="true"]')).toHaveCount(3);
    expect(
      await menu
        .locator('.upgrade-pick')
        .evaluateAll((nodes) => nodes.map((n) => n.getAttribute('aria-label'))),
    ).toEqual(['Choose Nimble', 'Choose Heavy Seeker', 'Choose Punisher']);
    const stage = (await page.locator('.stage-space').boundingBox())!,
      box = (await menu.boundingBox())!;
    expect(box.x - stage.x).toBeCloseTo(0);
    expect(box.y - stage.y).toBeCloseTo(0);
    const scale = box.width / 550;
    const centers = [];
    for (let i = 0; i < 3; i++) {
      const b = (await cards.nth(i).boundingBox())!;
      centers.push((b.x + b.width / 2 - box.x) / scale);
      expect((b.y - box.y) / scale).toBeCloseTo(97.3, 1);
      expect(b.width / scale).toBeCloseTo(176.5, 1);
      expect(b.height / scale).toBeCloseTo(230, 1);
      const pose = JSON.parse((await canvases.nth(i).getAttribute('data-upgrade-bounds'))!);
      expect(pose.scale).toBeLessThanOrEqual(1);
      expect(pose.width).toBeLessThanOrEqual(158.001);
      expect(pose.height).toBeLessThanOrEqual(84.001);
    }
    centers.forEach((value, index) => expect(value).toBeCloseTo([94, 275, 456][index], 1));
    await expect(cards.nth(0).locator('[data-creator-field="primary_dt"] .sr-only')).toHaveText(
      'Primary: 1 Super Machine Gun, ',
    );
    const ink = () =>
      canvases.nth(1).evaluate((node) => {
        const p = (node as HTMLCanvasElement).getContext('2d')!.getImageData(0, 0, 1100, 1100).data;
        let count = 0,
          hash = 2166136261;
        for (let i = 0; i < p.length; i += 4) {
          if (p[i + 3]) count++;
          hash = Math.imul(hash ^ p[i], 16777619);
          hash = Math.imul(hash ^ p[i + 3], 16777619);
        }
        return { count, hash };
      });
    const before = await ink();
    expect(before.count).toBeGreaterThan(500);
    await expect.poll(async () => (await ink()).hash, { timeout: 5000 }).not.toBe(before.hash);
    await menu.screenshot({ path: `test-results/${native ? 'swf' : 'mock'}-authored-upgrade.png` });
    expect(errors).toEqual([]);
    await expect(menu.getByRole('alert')).toHaveCount(0);
  });
