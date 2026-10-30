import { expect, test } from '@playwright/test';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { waitForMainMenu } from './helpers/main-menu';

test.use({ storageState: { cookies: [], origins: [] } });
const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');
for (const native of [false, true])
  test(`${native ? 'SWF' : 'mock'} creator guide follows six original pages and latches on entry`, async ({
    page,
  }) => {
    test.skip(native && !existsSync(swf), 'A local research SWF is required.');
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/');
    if (native) await page.getByLabel('Bubble Tanks 3 Flash file').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Play with mock assets' }).click();
    await waitForMainMenu(page, { creatorGuide: 'keep' });
    await page.getByRole('button', { name: 'Enemy tank creator', exact: true }).click();
    const guide = page.getByRole('dialog', { name: 'Tank creator guide' }),
      next = guide.getByRole('button', { name: 'Next creator guide page' });
    await expect(guide).toHaveAttribute('data-guide-frame', '2');
    await expect(guide.getByRole('button', { name: 'Previous creator guide page' })).toHaveCount(0);
    expect(
      await page.evaluate(
        () => JSON.parse(localStorage.getItem('open-bubble-tank.profile.v1')!).creatorHelpSeen,
      ),
    ).toBe(true);
    await page
      .locator('.creator')
      .screenshot({ path: `test-results/${native ? 'native' : 'mock'}-creator-guide-welcome.png` });
    // Shape595 covers the original stage and intercepts the underlying controls.
    await expect(page.locator('.creator-editor-content')).toHaveAttribute('inert', '');
    const tab = await page
      .getByRole('button', { name: 'Weapons', exact: true, includeHidden: true })
      .boundingBox();
    await page.mouse.click(tab!.x + tab!.width / 2, tab!.y + tab!.height / 2);
    await expect(guide).toHaveAttribute('data-guide-frame', '2');
    await next.click();
    await expect(guide).toHaveAttribute('data-guide-frame', '3');
    await guide.getByRole('button', { name: 'Previous creator guide page' }).click();
    await expect(guide).toHaveAttribute('data-guide-frame', '2');
    for (let frame = 3; frame <= 7; frame++) {
      await next.click();
      await expect(guide).toHaveAttribute('data-guide-frame', String(frame));
      await page.locator('.creator').screenshot({
        path: `test-results/${native ? 'native' : 'mock'}-creator-guide-${frame}.png`,
      });
    }
    await next.click();
    await expect(guide).toHaveCount(0);
    await page.reload();
    if (native) await page.getByLabel('Bubble Tanks 3 Flash file').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Play with mock assets' }).click();
    await waitForMainMenu(page, { creatorGuide: 'keep' });
    await page.getByRole('button', { name: 'Enemy tank creator', exact: true }).click();
    await expect(guide).toHaveCount(0);
    expect(errors).toEqual([]);
  });
