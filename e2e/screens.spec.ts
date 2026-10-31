import { expect, test } from './helpers/frame-paced-test';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');

test('mock Info exit keeps the immediate pause key on the returned dialog', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Play with mock assets' }).click();
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'Choose your tanks' })
    .getByRole('button', { name: 'PLAY', exact: true })
    .click();
  const game = page.locator('.game-canvas');
  await expect(game.locator('canvas')).toBeVisible();
  await game.focus();
  await page.keyboard.press('KeyP');
  await page.getByRole('button', { name: 'Tank info', exact: true }).click();
  const info = page.getByRole('dialog', { name: 'Tank information', exact: true });
  await expect(info.locator('.tank-portrait canvas')).toBeVisible();
  await info.evaluate((element) => {
    // Deliver the next key in the first microtask after Info is removed. This
    // exposes the commit-to-passive-effect focus gap without clock sleeps.
    const observer = new MutationObserver(() => {
      if (element.isConnected) return;
      observer.disconnect();
      const target = document.activeElement!;
      document.body.dataset.infoReturnFocus = target.getAttribute('aria-label') ?? target.tagName;
      for (const type of ['keydown', 'keyup'])
        target.dispatchEvent(new KeyboardEvent(type, { key: 'p', code: 'KeyP', bubbles: true }));
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });
  await page.keyboard.press('Escape');
  await expect(info).toHaveCount(0);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('body')).toHaveAttribute('data-info-return-focus', 'Paused');
});

for (const native of [false, true]) {
  test(`${native ? 'SWF' : 'mock'} tank information shows native class attributes and returns to a frozen pause`, async ({
    page,
  }) => {
    test.skip(native && !existsSync(swf), 'A local research SWF is required.');
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/');
    if (native) await page.getByLabel('Bubble Tanks 3 Flash file').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Play with mock assets' }).click();
    await page.getByRole('button', { name: 'Play', exact: true }).click({ timeout: 60000 });
    await page.getByRole('button', { name: 'Original game size', exact: true }).click();
    await page
      .getByRole('dialog', { name: 'Choose your tanks' })
      .getByRole('button', { name: 'PLAY', exact: true })
      .click();
    const game = page.locator('.game-canvas');
    await expect(game.locator('canvas')).toBeVisible();
    await game.focus();
    await page.keyboard.press('KeyP');
    await page.getByRole('button', { name: 'Tank info', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Tank information', exact: true });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(
      'Class1Speed1Armor100%PrimaryWeaponsBasic CannonSecondaryWeaponsN/APassiveWeaponsN/A',
    );
    await expect(dialog.locator('.tank-portrait canvas')).toBeVisible();
    await expect
      .poll(
        async () =>
          dialog.locator('.tank-portrait').evaluate((node) => {
            const matrix = new DOMMatrix(getComputedStyle(node.parentElement!).transform);
            return Math.abs(matrix.e - 359.5);
          }),
        { timeout: 15000 },
      )
      .toBeLessThan(0.05);
    await page.screenshot({ path: `test-results/${native ? 'swf' : 'mock'}-tank-information.png` });
    await dialog.getByRole('button', { name: 'BACK', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole('dialog', { name: 'Paused', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Tank info', exact: true }).click();
    await expect(dialog.locator('.tank-portrait canvas')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await page.keyboard.press('KeyP');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test(`${native ? 'SWF' : 'mock'} win screen fades in its authored controls and omits retired promotion`, async ({
    page,
  }) => {
    test.skip(native && !existsSync(swf), 'A local research SWF is required.');
    // The fixture mounts the production component; no test hooks enter the game.
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('http://127.0.0.1:3102');
    await page.getByLabel('Fixture').selectOption('win-screen');
    if (native) await page.getByLabel('Original SWF').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Use mock assets', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Ready', { timeout: 60000 });
    const dialog = page.getByRole('dialog', {
      name: "You've Proven Yourself The Greatest!",
      exact: true,
    });
    await expect(dialog.getByRole('button')).toHaveCount(2);
    await expect(dialog).not.toContainText('Parts Pack Manager');
    await expect(dialog).not.toContainText('FIELDS');
    await expect(dialog.locator('[data-win-age]')).toHaveAttribute('data-win-age', '63');
    await expect(dialog.locator('[data-blur-passes]')).toHaveAttribute('data-blur-passes', '19');
    const resume = dialog.getByRole('button', { name: 'Continue Your Game', exact: true });
    await expect(resume).toBeEnabled();
    await resume.hover();
    await page.screenshot({ path: `test-results/${native ? 'swf' : 'mock'}-win-screen.png` });
    await resume.click();
    await expect(page.getByRole('status')).toHaveAttribute('data-win-action', 'continue');
    await dialog.getByRole('button', { name: 'Main Menu', exact: true }).click();
    await expect(page.getByRole('status')).toHaveAttribute('data-win-action', 'menu');
    expect(errors).toEqual([]);
  });
}
