import { expect, test } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const CREATOR_PALETTE = JSON.parse(
  readFileSync(resolve('src/game/data/creator-palette.json'), 'utf8'),
) as typeof import('../src/game/core/creator-palette').CREATOR_PALETTE;
const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');
for (const native of [false, true])
  test(`${native ? 'SWF' : 'mock'} creator text uses source fonts, alignment, line spacing and clipped accessible fields`, async ({
    page,
  }, testInfo) => {
    test.skip(native && !existsSync(swf), 'A local research SWF is required.');
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('http://127.0.0.1:3102');
    await page.getByLabel('Fixture').selectOption('creator-text');
    if (native) await page.getByLabel('Original SWF').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Use mock assets', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Ready', { timeout: 60000 });
    const caption = page.locator('[data-creator-field="caption"]'),
      cost = page.locator('[data-creator-field="cost"]'),
      wrapped = page.locator('[data-creator-field="wrapped"]'),
      clipped = page.locator('[data-creator-field="clipped"]'),
      right = page.locator('[data-creator-field="right"]');
    await expect(caption).toBeVisible();
    await expect(caption).toHaveCSS('left', '20px');
    await expect(caption).toHaveCSS('top', '20px');
    await expect(caption).toHaveCSS('opacity', '0.6');
    await expect(right).toHaveCSS('opacity', '0.3');
    await expect(clipped).toHaveCSS('overflow', 'hidden');
    await expect(clipped).toHaveCSS('width', '15.25px');
    await expect(caption.locator('.sr-only')).toHaveCSS('position', 'absolute');
    await expect(caption).toMatchAriaSnapshot('- text: Click and Drag Object');
    const lines = wrapped.locator(':scope > [aria-hidden="true"]');
    await expect(lines).toHaveCount(4);
    const tops = await lines.evaluateAll((nodes) =>
      nodes.map((node) => parseFloat((node as HTMLElement).style.top)),
    );
    expect(tops.map((top) => top - tops[0])).toEqual([0, 12, 24, 36]);
    const field = CREATOR_PALETTE.library.caption,
      advance = (char: string) =>
        (CREATOR_PALETTE.fonts[field.fontId][char] * field.size) / 1024 + field.spacing,
      measure = (value: string) => [...value].reduce((sum, char) => sum + advance(char), 0),
      width = measure('Click and Drag Object'),
      line = caption.locator(':scope > [aria-hidden="true"]');
    expect(await line.evaluate((node) => parseFloat((node as HTMLElement).style.left))).toBeCloseTo(
      (field.width - width) / 2,
      3,
    );
    expect(await line.evaluate((node) => parseFloat((node as HTMLElement).style.top))).toBeCloseTo(
      2 + field.size * (field.ascent / 1024 - 1),
      3,
    );
    expect(
      await right
        .locator(':scope > [aria-hidden="true"]')
        .evaluate((node) => parseFloat((node as HTMLElement).style.left)),
    ).toBeCloseTo(field.width - 2 - measure('Right'), 3);
    if (native) {
      await expect(cost.locator('img')).toHaveCount(1);
      const proof = JSON.parse((await page.locator('#stage').getAttribute('data-creator-text'))!);
      const svgHash = await cost.locator('img').evaluate((image) => {
        const svg = decodeURIComponent((image as HTMLImageElement).src.split(',')[1]);
        let hash = 2166136261;
        for (let i = 0; i < svg.length; i++) hash = Math.imul(hash ^ svg.charCodeAt(i), 16777619);
        return hash >>> 0;
      });
      expect(svgHash).toBe(proof.expectedFont);
      expect(svgHash).not.toBe(proof.prefixFont);
      for (const image of await page.locator('.creator-text-field img').all())
        await expect
          .poll(() =>
            image.evaluate(
              (node) =>
                (node as HTMLImageElement).complete && (node as HTMLImageElement).naturalWidth > 0,
            ),
          )
          .toBe(true);
    } else {
      await expect(page.locator('.creator-text-field img')).toHaveCount(0);
      const glyphs = line.locator(':scope > span');
      await expect(glyphs).toHaveCount('Click and Drag Object'.length);
      expect(
        await glyphs.nth(1).evaluate((node) => parseFloat((node as HTMLElement).style.left)),
      ).toBeCloseTo(advance('C'), 3);
    }
    await page
      .locator('#stage')
      .screenshot({ path: testInfo.outputPath(`${native ? 'native' : 'mock'}-creator-text.png`) });
    // Changing fixture must remove the owned React root and its metadata.
    await page.getByLabel('Fixture').selectOption('creator-buttons');
    await expect(page.getByRole('status')).toContainText('Ready');
    await expect(page.locator('.creator-text-field')).toHaveCount(0);
    await expect(page.locator('#stage')).not.toHaveAttribute('data-creator-text');
    expect(errors).toEqual([]);
  });
