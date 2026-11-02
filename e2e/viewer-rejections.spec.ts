import { expect, test } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');
const rejectionLayout = JSON.parse(
  readFileSync('src/game/data/tank-viewer.json', 'utf8'),
).rejection;
const avatar = JSON.parse(readFileSync('src/game/data/tanks.json', 'utf8')).avatar_defaults.find(
  (t: { name: string }) => t.name === 'Super Nimble',
);
for (const native of [false, true])
  test(`${native ? 'SWF' : 'mock'} viewer rejection uses authored fades, pointer shielding and independent timed lifetimes`, async ({
    page,
  }) => {
    test.skip(native && !existsSync(swf), 'Supply the local research SWF.');
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('http://127.0.0.1:3102');
    await page.getByLabel('Fixture').selectOption('viewer-flow-eligibility');
    if (native) await page.getByLabel('Original SWF').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Use mock assets', exact: true }).click();
    await expect(page.locator('#status')).toContainText('Ready', { timeout: 60000 });
    const advance = (n: 1 | 5 | 20) =>
      page.getByRole('button', { name: `Viewer advance ${n} frames`, exact: true }).click();
    await advance(20);
    const viewer = page.locator('.tank-viewer'),
      openCode = page.getByRole('button', { name: 'View tank from code', exact: true });
    await openCode.click();
    await advance(20);
    const code = page.getByRole('dialog', { name: 'Enter tank code' });
    await code.getByRole('textbox', { name: 'Tank code' }).fill(avatar.sourceCode);
    await code.getByRole('button', { name: 'Submit tank code', exact: true }).click();
    await expect(viewer).toContainText('Page: 1 out of: 1');
    await advance(20);
    const load = page.getByRole('button', { name: 'Load Super Nimble', exact: true });
    await load.click();
    const effect = page.locator('.viewer-rejection');
    await expect(effect).toHaveCount(1);
    await expect(effect).toHaveAttribute('data-rejection-frame', '1');
    await expect(effect).toHaveAccessibleName(
      'You Cannot Select This Tank: Exceeds your Gun Points',
    );
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.locator('.viewer-content')).not.toHaveAttribute('inert', '');
    const box = (await openCode.boundingBox())!;
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await expect(code).toHaveCount(0); // Source backdrop is a pointer shield, with no dismiss handler.
    for (let i = 0; i < 3; i++) await advance(20);
    await expect(effect).toHaveAttribute('data-rejection-frame', '61');
    await expect(effect.locator('[data-rejection-layer="933"]')).toHaveAttribute(
      'data-rejection-alpha',
      '1',
    );
    await expect(effect.locator('[data-rejection-layer="message"]')).toHaveAttribute(
      'data-rejection-alpha',
      '0.96875',
    );
    await advance(5);
    await advance(5);
    await expect(effect).toHaveAttribute('data-rejection-frame', '71');
    await expect(effect.locator('[data-rejection-layer="933"]')).toHaveAttribute(
      'data-rejection-alpha',
      '0.953125',
    );
    const capture = await viewer.screenshot({
      path: `test-results/${native ? 'native' : 'mock'}-viewer-rejection.png`,
    });
    const title = rejectionLayout.pieces.find((p: { symbol: number }) => p.symbol === 1555),
      b = title.art[0].bounds,
      field = rejectionLayout.fields[0];
    const regions = [
      {
        x: rejectionLayout.x + (title.matrix.tx + b.xMin) / 20,
        y: rejectionLayout.y + (title.matrix.ty + b.yMin) / 20,
        width: (b.xMax - b.xMin) / 20,
        height: (b.yMax - b.yMin) / 20,
      },
      {
        x: rejectionLayout.x + field.matrix.tx / 20 + field.x,
        y: rejectionLayout.y + field.matrix.ty / 20 + field.y,
        width: field.width,
        height: field.height,
      },
    ];
    const visibleText = await page.evaluate(
      async ({ png, regions }) => {
        const image = new Image();
        image.src = `data:image/png;base64,${png}`;
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(image, 0, 0);
        return regions.map((region) => {
          const scale = image.width / 550;
          const pixels = ctx.getImageData(
            Math.floor(region.x * scale),
            Math.floor(region.y * scale),
            Math.ceil(region.width * scale),
            Math.ceil(region.height * scale),
          ).data;
          let bright = 0;
          for (let i = 0; i < pixels.length; i += 4) {
            const low = Math.min(pixels[i], pixels[i + 1], pixels[i + 2]);
            const high = Math.max(pixels[i], pixels[i + 1], pixels[i + 2]);
            if (low > 120 && high - low < 30) bright++;
          }
          return bright;
        });
      },
      { png: capture.toString('base64'), regions },
    );
    expect(visibleText[0], 'fading rejection heading paints in the page').toBeGreaterThan(100);
    expect(visibleText[1], 'fading rejection reason paints in the page').toBeGreaterThan(50);
    for (let i = 0; i < 3; i++) await advance(5);
    for (let i = 0; i < 4; i++) await advance(1);
    await expect(effect).toHaveAttribute('data-rejection-frame', '90');
    await expect(effect.locator('[data-rejection-layer="message"]')).toHaveAttribute(
      'data-rejection-alpha',
      '0.03125',
    );
    await advance(1);
    await expect(effect).toHaveCount(0);
    // Keyboard activation is an accessibility addition and can create separate overlapping clips.
    await load.focus();
    await load.press('Enter');
    await advance(20);
    await load.focus();
    await load.press('Enter');
    await expect(effect).toHaveCount(2);
    await expect(effect.first()).toHaveAttribute('data-rejection-frame', '21');
    await expect(effect.last()).toHaveAttribute('data-rejection-frame', '1');
    for (let i = 0; i < 3; i++) await advance(20);
    await advance(5);
    await advance(5);
    await expect(effect).toHaveCount(1);
    await expect(effect).toHaveAttribute('data-rejection-frame', '71');
    await advance(20);
    await expect(effect).toHaveCount(0);
    await openCode.click();
    await expect(code).toBeVisible();
    await expect(page.locator('#stage')).toHaveAttribute('data-viewer-flow-subscriptions', '5');
    await page.getByLabel('Fixture').selectOption('healing');
    await expect(page.locator('#stage')).toHaveAttribute('data-viewer-flow-subscriptions', '0');
    expect(errors).toEqual([]);
  });
