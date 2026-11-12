import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from './helpers/frame-paced-test';
import { waitForMainMenu } from './helpers/main-menu';
import { visitAdjacentFieldAndReturn } from './helpers/field-travel';
import { saveCreator } from './helpers/creator';
import type { TankDesign } from '../src/game/core/types';
import { DEFAULT_SETTINGS } from '../src/game/core/constants';

const avatars: TankDesign[] = JSON.parse(
  readFileSync('src/game/data/tanks.json', 'utf8'),
).avatar_defaults;
const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');

for (const native of [false, true])
  test(`${native ? 'SWF' : 'mock'} exact upgrade defaults use newest saved avatars independently of enemy sources`, async ({
    page,
  }) => {
    test.setTimeout(120000);
    test.skip(native && !existsSync(swf), 'Supply the local research SWF.');
    const starter = avatars[0];
    const guard = {
      ...starter,
      id: 'fixture-guard',
      parts: [...starter.parts, { ...starter.parts[1], key: 'forcefield', type: 5005, x: 0, y: 0 }],
    };
    const first = {
      ...avatars.find((tank) => tank.name === 'Assassin')!,
      sourceCode: undefined,
      id: 'L10000001',
      name: 'Earlier saved avatar',
    };
    const newest = { ...first, id: 'L10000002', name: 'Latest saved avatar' };
    // Explicit restored-history setup, not evidence of earning six ordinary upgrades.
    await page.addInitScript(
      (profile) => localStorage.setItem('open-bubble-tank.profile.v1', JSON.stringify(profile)),
      {
        version: 1,
        creatorHelpSeen: true,
        tankViewerHelpSeen: true,
        secondaryHelpSeen: true,
        settings: DEFAULT_SETTINGS,
        achievements: [],
        nextTankId: 10000003,
        tanks: [first, newest],
        progression: [starter, ...Array(6).fill(guard)],
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
    await expect(page.getByRole('checkbox', { name: /My enemy tanks/ })).toBeDisabled();
    await page.getByRole('checkbox', { name: 'Use saved avatars from previous game' }).check();
    await page
      .getByRole('dialog', { name: 'Choose your tanks' })
      .getByRole('button', { name: 'PLAY', exact: true })
      .click();
    await expect(page.locator('.game-canvas canvas')).toBeVisible();
    await page.locator('.game-canvas').focus();
    await visitAdjacentFieldAndReturn(page);
    const edit = page.getByRole('button', { name: 'Edit your tank', exact: true });
    await expect(edit).toBeEnabled();
    await edit.click();
    await page
      .getByRole('dialog', { name: 'Edit your tank?', exact: true })
      .getByRole('button', { name: 'YES', exact: true })
      .click();
    const menu = page.getByRole('dialog', { name: 'Upgrade your tank', exact: true });
    await expect(menu.locator('.upgrade-pick')).toHaveCount(2);
    await expect(menu.locator('canvas[data-upgrade-ready="true"]')).toHaveCount(2);
    expect(
      await menu
        .locator('.upgrade-pick')
        .evaluateAll((buttons) => buttons.map((button) => button.getAttribute('aria-label'))),
    ).toEqual(['Choose Latest saved avatar', 'Choose The Harbinger']);
    await expect(
      menu.getByRole('button', { name: 'Choose Earlier saved avatar', exact: true }),
    ).toHaveCount(0);
    await menu.screenshot({
      path: `test-results/${native ? 'swf' : 'mock'}-saved-upgrade-defaults.png`,
    });
    await menu
      .getByRole('button', { name: 'Choose Latest saved avatar', exact: true })
      .click({ position: { x: 88, y: 190 } });
    await expect(page.getByLabel('Tank health')).toContainText(
      'Latest saved avatar: 27 of 2000 health',
    );
    await edit.click();
    await page
      .getByRole('dialog', { name: 'Edit your tank?', exact: true })
      .getByRole('button', { name: 'YES', exact: true })
      .click();
    await menu.getByRole('button', { name: 'Edit Latest saved avatar', exact: true }).click();
    await saveCreator(page, { name: 'Saved during this run' });
    await expect(page.getByLabel('Tank health')).toContainText('Saved during this run');
    await edit.click();
    await page
      .getByRole('dialog', { name: 'Edit your tank?', exact: true })
      .getByRole('button', { name: 'YES', exact: true })
      .click();
    await expect(menu.locator('.upgrade-pick').first()).toHaveAttribute(
      'aria-label',
      'Choose Saved during this run',
    );
    await menu.getByRole('button', { name: 'Choose Saved during this run', exact: true }).click();
    await expect(page.getByLabel('Tank health')).toContainText(
      'Saved during this run: 27 of 2000 health',
    );
    expect(errors).toEqual([]);
  });
