import { expect, test } from '@playwright/test';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');
for (const native of [false, true])
  test(`${native ? 'SWF' : 'mock'} creator statistics retain source category summaries and enemy offsets`, async ({
    page,
  }, testInfo) => {
    test.skip(native && !existsSync(swf), 'A local research SWF is required.');
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('http://127.0.0.1:3102');
    await page.getByLabel('Fixture').selectOption('creator-stats');
    if (native) await page.getByLabel('Original SWF').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Use mock assets', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Ready', { timeout: 60000 });
    const panel = page.getByRole('complementary', { name: 'Tank statistics' });
    const field = (name: string) => panel.locator(`[data-creator-field="${name}"]`);
    const content = (name: string) => field(name).locator(':scope > .sr-only');
    const expectOrigin = async () => {
      const bounds = (await panel.boundingBox())!,
        stage = (await page.locator('#stage').boundingBox())!;
      expect(bounds.x - stage.x).toBe(392);
      expect(bounds.y - stage.y).toBe(5);
      expect(await panel.evaluate((node) => node.scrollTop)).toBe(0);
    };
    await expectOrigin();
    await expect(panel).toHaveCSS('left', '392px');
    await expect(panel).toHaveCSS('top', '5px');
    await expect(panel).toHaveCSS('width', '154px');
    await expect(panel).toHaveCSS('height', '161px');
    await expect(panel).toHaveCSS('padding', '0px');
    await expect(content('speed_txt')).toHaveText('100%');
    await expect(content('primary_txt')).toHaveText("2 BC's, 1 HC's, 1 MG's, ");
    await expect(content('secondary_txt')).toHaveText('1 Sticky Burst, ');
    await expect(content('passive_txt')).toHaveText('1 Health Readout, 1 Radar, ');
    await expect(content('PrimarySecondary_txt')).toHaveText(
      'Primary Weapons:\n\n\nSecondary Weapons:',
    );
    await expect(field('primary_txt')).toHaveCSS('top', '56px');
    await expect(field('secondary_txt')).toHaveCSS('top', '91px');
    if (native) await expect(panel.locator(':scope > img')).toHaveCount(1);
    else await expect(panel.locator(':scope > svg')).toHaveCount(1);
    await page.getByRole('button', { name: 'Use class 6', exact: true }).click();
    await expect(content('speed_txt')).toHaveText('30%');
    await page
      .locator('#stage')
      .screenshot({ path: testInfo.outputPath(`${native ? 'native' : 'mock'}-avatar-stats.png`) });
    await page.getByRole('button', { name: 'Show enemy statistics', exact: true }).click();
    await expect(content('speed_txt')).toHaveText('');
    await expect(content('Speed_txt')).toHaveText('');
    await expect(content('PassiveBehavior_txt')).toHaveText('');
    await expect(content('passive_txt')).toHaveText('');
    await expect(content('PrimarySecondary_txt')).toHaveText(
      'Primary Weapons:\n\n\nBehavior Weapons:',
    );
    await expect(content('primary_txt')).toHaveText('1 Basic Cannon, 1 Seekers, ');
    await expect(content('secondary_txt')).toHaveText('1 Aggressor, ');
    await expect(field('primary_txt')).toHaveCSS('top', '38px');
    await expect(field('secondary_txt')).toHaveCSS('top', '73px');
    await page
      .locator('#stage')
      .screenshot({ path: testInfo.outputPath(`${native ? 'native' : 'mock'}-enemy-stats.png`) });
    await expectOrigin();
    await page.getByRole('button', { name: 'Show avatar statistics', exact: true }).click();
    await expect(field('primary_txt')).toHaveCSS('top', '56px');
    await expect(content('speed_txt')).toHaveText('30%');
    await expectOrigin();
    await page.getByLabel('Fixture').selectOption('creator-buttons');
    await expect(panel).toHaveCount(0);
    await expect(page.locator('#creator-statistics-fixture-controls')).toHaveCount(0);
    expect(errors).toEqual([]);
  });
