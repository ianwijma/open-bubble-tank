import { expect, test } from '@playwright/test';

test('mock real keyboard events preserve logical aliases, direction priority and Space latches', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('http://127.0.0.1:3102');
  await page.getByLabel('Fixture').selectOption('hotkey-input');
  await page.getByRole('button', { name: 'Use mock assets', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Ready');
  const stage = page.locator('#stage'),
    surface = page.getByRole('application', { name: 'Hotkey input surface' });
  const sample = async () => {
    await page
      .getByRole('button', { name: 'Sample input frame', exact: true })
      .dispatchEvent('click');
    return JSON.parse((await stage.getAttribute('data-input-proof'))!);
  };
  await surface.focus();
  await page.keyboard.down('ShiftRight');
  expect(await sample()).toMatchObject({ up: true, down: false, left: true, right: false });
  await page.keyboard.down('ShiftLeft');
  await page.keyboard.up('ShiftRight');
  expect(await sample()).toMatchObject({ up: false, left: false });
  await page.keyboard.up('ShiftLeft');

  await page.keyboard.down('ControlLeft');
  expect(await sample()).toMatchObject({ locks: 1 });
  await page.keyboard.down('ControlRight');
  expect(await sample()).toMatchObject({ locks: 1 });
  await page.keyboard.up('ControlLeft');
  await sample();
  await page.keyboard.up('ControlRight');
  await page.keyboard.down('ControlRight');
  expect(await sample()).toMatchObject({ locks: 2 });
  await page.keyboard.up('ControlRight');

  await page.getByLabel('Input bindings').selectOption('horizontal-space');
  await page.keyboard.down('Space');
  expect(await sample()).toMatchObject({ left: true, right: false, secondary: false });
  await page.keyboard.up('Space');
  await sample();
  await page.getByLabel('Input bindings').selectOption('vertical-space');
  await page.keyboard.down('Space');
  expect(await sample()).toMatchObject({ up: true, secondary: true });
  await page.getByLabel('Input bindings').selectOption('horizontal-space');
  expect(await sample()).toMatchObject({ left: true, secondary: true });
  await page.keyboard.up('Space');
  expect(await sample()).toMatchObject({ secondary: false });
  await page.keyboard.press(';');
  expect(await sample()).toMatchObject({ pauses: 1 });
  await page.getByRole('button', { name: 'Clear input', exact: true }).click();
  expect(await sample()).toMatchObject({ up: false, left: false, secondary: false });
  await page.keyboard.press('ControlLeft');
  expect(await sample()).toMatchObject({ locks: 2 }); // A released key is absent at the next frame.
  expect(errors).toEqual([]);
});

test('mock modifier pause binding resumes through the production dialog with either alias', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'open-bubble-tank.profile.v1',
      JSON.stringify({ version: 1, settings: { h5: 'ShiftRight' } }),
    ),
  );
  await page.goto('/');
  await page.getByRole('button', { name: 'Play with mock assets', exact: true }).click();
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'Choose your tanks' })
    .getByRole('button', { name: 'PLAY', exact: true })
    .click();
  await expect(page.locator('.game-canvas canvas')).toBeVisible();
  await page.getByRole('application').focus();
  await page.keyboard.press('ShiftRight');
  await expect(page.getByRole('dialog', { name: 'Paused', exact: true })).toBeVisible();
  await page.keyboard.press('ShiftLeft');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
