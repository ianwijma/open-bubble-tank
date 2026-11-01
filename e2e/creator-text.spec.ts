import { expect, test } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const CREATOR_PALETTE = JSON.parse(
  readFileSync(resolve('src/game/data/creator-palette.json'), 'utf8'),
) as typeof import('../src/game/core/creator-palette').CREATOR_PALETTE;
const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');
const dialogs = JSON.parse(
  readFileSync(resolve('src/game/data/creator-dialogs.json'), 'utf8'),
) as typeof import('../src/game/core/creator-dialogs').CREATOR_DIALOGS;
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

for (const native of [false, true])
  test(`${native ? 'SWF' : 'mock'} creator device-font text retains paragraphs, color and inline advances`, async ({
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
    const device = page.locator('[data-creator-field="device"]'),
      paragraph = device.locator(':scope > [aria-hidden="true"]'),
      nowrap = page.locator('[data-creator-field="device-nowrap"]'),
      inline = page.locator('[data-creator-field="inline-advances"]');
    await expect(device.locator('img')).toHaveCount(0);
    await expect(paragraph.locator(':scope > *')).toHaveCount(0);
    expect(await paragraph.textContent()).toBe(
      'First device line\nSecond device line\nThird device line',
    );
    await expect(device).toHaveCSS('color', 'rgb(32, 160, 224)');
    expect(parseFloat(await device.evaluate((n) => getComputedStyle(n).opacity))).toBeCloseTo(
      128 / 255,
      6,
    );
    await expect(paragraph).toHaveCSS('font-family', 'Arial, sans-serif');
    await expect(paragraph).toHaveCSS('white-space', 'pre-wrap');
    await expect(paragraph).toHaveCSS('text-align', 'left');
    const codeField = dialogs.frames.find((f) => f.frame === 3)!.fields[0],
      label = dialogs.frames.find((f) => f.frame === 1)!.fields[0];
    expect(parseFloat(await paragraph.evaluate((n) => getComputedStyle(n).lineHeight))).toBeCloseTo(
      codeField.lineHeight,
      3,
    );
    const positions = await paragraph.evaluate((node) => {
      const text = node.firstChild!;
      return [0, text.textContent!.indexOf('Second'), text.textContent!.indexOf('Third')].map(
        (start) => {
          const range = document.createRange();
          range.setStart(text, start);
          range.setEnd(text, start + 1);
          return range.getBoundingClientRect().y;
        },
      );
    });
    expect(positions[1] - positions[0]).toBeCloseTo(codeField.lineHeight, 2);
    expect(positions[2] - positions[1]).toBeCloseTo(codeField.lineHeight, 2);
    const unwrapped = nowrap.locator(':scope > [aria-hidden="true"]');
    await expect(unwrapped).toHaveCSS('white-space', 'pre');
    await expect(unwrapped).toHaveCSS('text-align', 'center');
    await expect(nowrap).toHaveCSS('overflow', 'hidden');
    const width = ((label.advances!.B + label.advances!.C) * label.size) / 1024;
    expect(
      await inline
        .locator(':scope > [aria-hidden="true"]')
        .evaluate((node) => parseFloat((node as HTMLElement).style.left)),
    ).toBeCloseTo((160 - width) / 2, 3);
    await expect(inline.locator('img')).toHaveCount(native ? 1 : 0);
    if (native)
      await expect
        .poll(() =>
          inline
            .locator('img')
            .evaluate(
              (node) =>
                (node as HTMLImageElement).complete && (node as HTMLImageElement).naturalWidth > 0,
            ),
        )
        .toBe(true);
    const primitive = page.locator('[data-primitive-font] text').first();
    await expect(primitive).toHaveAttribute('font-family', 'Arial, sans-serif');
    await expect(primitive).toHaveAttribute('font-weight', 'normal');
    await expect(primitive).toHaveAttribute('font-style', 'normal');
    await page
      .locator('#stage')
      .screenshot({ path: testInfo.outputPath(`${native ? 'native' : 'mock'}-device-text.png`) });
    expect(errors).toEqual([]);
  });
