import { expect, test } from './helpers/frame-paced-test';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { waitForMainMenu } from './helpers/main-menu';
import { exitCreator } from './helpers/creator';
import { visitAdjacentFieldAndReturn } from './helpers/field-travel';
import { DEFAULT_SETTINGS } from '../src/game/core/constants';
import type { TankDesign } from '../src/game/core/types';
const avatars: TankDesign[] = JSON.parse(
  readFileSync('src/game/data/tanks.json', 'utf8'),
).avatar_defaults;
const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');
for (const native of [false, true])
  test(`${native ? 'SWF' : 'mock'} missing class-three level-one default retains loading and stable offstage previews`, async ({
    page,
  }) => {
    test.setTimeout(120000);
    test.skip(native && !existsSync(swf), 'Supply local research SWF.');
    const starter = avatars[0],
      sturdy = avatars.find((tank) => tank.name === 'Sturdy')!;
    const guard = {
      ...sturdy,
      id: 'loading-fixture-guard',
      sourceCode: undefined,
      parts: [
        ...sturdy.parts,
        { ...starter.parts[1], key: 'loading-fixture-forcefield', type: 5005, x: 0, y: 0 },
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
        progression: [starter, guard],
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
    const menu = page.getByRole('dialog', { name: 'Upgrade your tank', exact: true });
    const foreground = menu.locator('.upgrade-foreground');
    await expect(foreground).toHaveAttribute('data-upgrade-pending', '1');
    await expect(foreground).toHaveAttribute('data-upgrade-root-frame', '1');
    await expect(menu.getByRole('status')).toHaveText('Loading tanks');
    await expect(menu.locator('canvas[data-upgrade-ready="true"]')).toHaveCount(2);
    expect(
      await menu
        .locator('[data-upgrade-slot]')
        .evaluateAll((cards) => cards.map((card) => card.getAttribute('data-upgrade-slot'))),
    ).toEqual(['1', '2']);
    // Playwright's role matcher does not account for inert; inspect Chromium's actual AX tree.
    const accessibility = await page.context().newCDPSession(page);
    const { nodes } = await accessibility.send('Accessibility.getFullAXTree');
    expect(
      nodes.filter((node) => !node.ignored && /^Choose /.test(node.name?.value ?? '')),
    ).toEqual([]);
    expect(nodes.some((node) => !node.ignored && node.name?.value === 'Loading tanks')).toBe(true);
    await accessibility.detach();
    for (const button of await menu.locator('.upgrade-pick,.upgrade-edit').all())
      await expect(button).toBeDisabled();
    const stage = (await page.locator('.stage-space').boundingBox())!;
    for (const card of await menu.locator('.upgrade-card').all()) {
      const box = (await card.boundingBox())!;
      expect(
        box.x + box.width <= stage.x ||
          box.x >= stage.x + stage.width ||
          box.y + box.height <= stage.y ||
          box.y >= stage.y + stage.height,
      ).toBe(true);
    }
    const loader = menu.locator('[data-upgrade-loading-frame]');
    const frame = await loader.getAttribute('data-upgrade-loading-frame');
    await expect.poll(() => loader.getAttribute('data-upgrade-loading-frame')).not.toBe(frame);
    const preview = await menu.locator('canvas').first().elementHandle();
    const age = Number(await preview!.getAttribute('data-upgrade-age'));
    await menu.screenshot({
      path: `test-results/${native ? 'swf' : 'mock'}-pending-upgrade-loading.png`,
    });
    const editCurrent = menu.getByRole('button', { name: 'Edit Your Current Tank', exact: true });
    await expect(menu).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(editCurrent).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(editCurrent).toBeFocused(); // No offstage card enters the focus loop.
    await page.keyboard.press('Enter');
    await expect(page.locator('.creator')).toBeVisible();
    expect(await preview!.evaluate((node) => node.isConnected)).toBe(true);
    await expect
      .poll(async () => Number(await preview!.getAttribute('data-upgrade-age')))
      .toBeGreaterThan(age);
    await expect(menu).toHaveCount(0);
    await exitCreator(page); // Existing slot destroys even this partially loaded menu.
    await expect(page.locator('.upgrade-screen')).toHaveCount(0);
    await expect(page.locator('.upgrade-bitmap')).toHaveCount(0);
    expect(await preview!.evaluate((node) => node.isConnected)).toBe(false);
    expect(errors).toEqual([]);
  });
