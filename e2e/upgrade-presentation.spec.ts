import { expect, test } from './helpers/frame-paced-test';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { waitForMainMenu } from './helpers/main-menu';
import { visitAdjacentFieldAndReturn } from './helpers/field-travel';
import { exitCreator } from './helpers/creator';
import { observeUpgradePreviewRenderer } from './helpers/upgrade-preview';
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
    await observeUpgradePreviewRenderer(page);
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
    const bitmap = page.locator('.upgrade-bitmap');
    await expect(bitmap).toHaveAttribute('data-capture-count', '1');
    await expect(bitmap).toHaveAttribute('data-saved-frames', '19');
    await expect(menu.locator('.upgrade-foreground')).toHaveAttribute('data-upgrade-alpha', '1');
    // The owning menu and its saved bitmap survive creator and nested viewer visits.
    await bitmap.evaluate((node) => {
      (node as HTMLElement).dataset.retainedMenu = 'same-menu';
    });
    const retainedPreview = await menu.locator('canvas').first().elementHandle();
    const previewAge = Number(await retainedPreview!.getAttribute('data-upgrade-age'));
    const renderer = await retainedPreview!.getAttribute('data-observed-upgrade-renderer');
    const fit = await retainedPreview!.getAttribute('data-upgrade-bounds');
    expect(renderer).toBeTruthy();
    const assertRetainedPreview = async (afterAge: number) => {
      expect(await retainedPreview!.evaluate((node) => node.isConnected)).toBe(true);
      await expect
        .poll(async () => Number(await retainedPreview!.getAttribute('data-upgrade-age')))
        .toBeGreaterThan(afterAge);
      expect(await retainedPreview!.getAttribute('data-observed-upgrade-renderer')).toBe(renderer);
      expect(await retainedPreview!.getAttribute('data-upgrade-bounds')).toBe(fit);
      return Number(await retainedPreview!.getAttribute('data-upgrade-age'));
    };
    await menu.getByRole('button', { name: 'Edit Nimble', exact: true }).click();
    await expect(bitmap).toHaveAttribute('data-upgrade-child', 'creator');
    const creatorAge = await assertRetainedPreview(previewAge);
    await expect(menu).toHaveCount(0); // The retained pane is absent from accessibility.
    await expect(page.locator('.creator')).toBeVisible();
    await page.getByRole('button', { name: 'Load a Tank...', exact: true }).click();
    await expect(bitmap).toHaveAttribute('data-upgrade-child', 'viewer');
    const viewerAge = await assertRetainedPreview(creatorAge);
    await expect(menu).toHaveCount(0);
    await expect(page.locator('.tank-viewer')).toHaveAttribute('data-viewer-ready', 'true');
    await page.getByRole('button', { name: 'Return to Tank Creator', exact: true }).click();
    await assertRetainedPreview(viewerAge);
    await expect(bitmap).toHaveAttribute('data-upgrade-child', 'creator');
    await expect(bitmap).toHaveAttribute('data-retained-menu', 'same-menu');
    await expect(bitmap).toHaveAttribute('data-upgrade-counter', '39');
    await expect(bitmap).toHaveAttribute('data-capture-count', '1');
    await exitCreator(page); // Existing progression slot: direct Destroy, no card reversal.
    await expect(bitmap).toHaveCount(0);
    await expect(menu).toHaveCount(0);
    expect(await retainedPreview!.evaluate((node) => node.isConnected)).toBe(false);
    const disposedAge = await retainedPreview!.getAttribute('data-upgrade-age');
    const disposedDraws = await retainedPreview!.getAttribute('data-observed-upgrade-draws');
    await page.getByRole('button', { name: 'Edit your tank', exact: true }).click();
    await page
      .getByRole('dialog', { name: 'Edit your tank?', exact: true })
      .getByRole('button', { name: 'YES', exact: true })
      .click();
    await expect(bitmap).toHaveAttribute('data-upgrade-counter', '39');
    expect(await retainedPreview!.getAttribute('data-upgrade-age')).toBe(disposedAge);
    expect(await retainedPreview!.getAttribute('data-observed-upgrade-draws')).toBe(disposedDraws);
    await menu
      .getByRole('button', { name: 'Choose Nimble', exact: true })
      .click({ position: { x: 88, y: 190 } });
    // Avatar replacement is immediate; card listeners stop while presentation remains.
    await expect(page.getByLabel('Tank health')).toContainText('Nimble');
    await expect(menu).toBeVisible();
    await expect(menu.getByRole('button', { name: 'Choose Nimble', exact: true })).toBeDisabled();
    await expect(menu.getByRole('button', { name: 'Edit Nimble', exact: true })).toBeDisabled();
    await expect(
      menu.getByRole('button', { name: 'Edit Your Current Tank', exact: true }),
    ).toBeEnabled();
    await page.mouse.move(0, 0);
    await expect(cards.first()).toHaveAttribute('data-upgrade-card-frame', '2');
    await expect
      .poll(async () =>
        Number(await menu.locator('.upgrade-foreground').getAttribute('data-upgrade-alpha')),
      )
      .toBeLessThan(1);
    await expect(bitmap).toHaveAttribute('data-capture-count', '1');
    await expect(menu).toHaveCount(0);
    await expect(bitmap).toHaveCount(0);
    expect(errors).toEqual([]);
    await expect(menu.getByRole('alert')).toHaveCount(0);
  });
