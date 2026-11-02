import { expect, test } from '@playwright/test';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { waitForMainMenu } from './helpers/main-menu';

const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');
for (const native of [false, true]) {
  test(`${native ? 'SWF' : 'mock'} viewer guide persists only after both pages and keeps offline local help`, async ({
    page,
  }) => {
    test.skip(native && !existsSync(swf), 'Supply the local research SWF.');
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const boot = async () => {
      await page.goto('/');
      if (native) await page.getByLabel('Bubble Tanks 3 Flash file').setInputFiles(swf);
      else await page.getByRole('button', { name: 'Play with mock assets' }).click();
      await waitForMainMenu(page);
      await page.getByRole('button', { name: 'Enemy tank creator', exact: true }).click();
      await page.getByRole('button', { name: 'Load a Tank...', exact: true }).click();
      await expect(page.locator('.tank-viewer')).toHaveAttribute('data-viewer-ready', 'true');
    };
    const seen = () =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem('open-bubble-tank.profile.v1') ?? '{}')
            .tankViewerHelpSeen === true,
      );
    await boot();
    const guide = page.getByRole('dialog', { name: 'Tank viewer guide' });
    await expect(guide).toContainText('Welcome to the Tank Viewer Screen!');
    await expect(guide.getByRole('button', { name: 'Previous guide page' })).toHaveCount(0);
    await expect(page.locator('.viewer-content')).toHaveAttribute('inert', '');
    await page
      .locator('.tank-viewer')
      .screenshot({ path: `test-results/${native ? 'native' : 'mock'}-viewer-guide-welcome.png` });
    await page.keyboard.press('Escape');
    await expect(guide).toHaveCount(0);
    expect(await seen()).toBe(false);
    await page.getByRole('button', { name: 'Return to Tank Creator' }).click();
    await page.getByRole('button', { name: 'Load a Tank...', exact: true }).click();
    await guide.getByRole('button', { name: 'Next guide page' }).click();
    await expect(guide).toContainText('Online sharing is offline.');
    await expect(guide).toContainText('locally stored tanks');
    await guide.locator('[data-creator-field="offlineGuide"] img').evaluateAll(async (images) => {
      await Promise.all(images.map((image) => (image as HTMLImageElement).decode()));
    });
    const note = guide.locator('[data-creator-field="offlineGuide"]');
    await expect(note).toBeVisible();
    const arrow = await guide
      .locator('.viewer-group')
      .first()
      .locator(':scope > img, :scope > svg.viewer-art')
      .first()
      .evaluate(async (node) => {
        const canvas = document.createElement('canvas');
        canvas.width = 550;
        canvas.height = 450;
        const ctx = canvas.getContext('2d')!;
        if (node instanceof HTMLImageElement) {
          await node.decode();
          ctx.drawImage(
            node,
            parseFloat(node.style.left),
            parseFloat(node.style.top),
            parseFloat(node.style.width),
            parseFloat(node.style.height),
          );
        } else {
          const svg = node.cloneNode(true) as SVGSVGElement;
          svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
          svg.setAttribute('width', '550');
          svg.setAttribute('height', '450');
          const image = new Image(),
            url = URL.createObjectURL(
              new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' }),
            );
          try {
            image.src = url;
            await image.decode();
            ctx.drawImage(image, 0, 0);
          } finally {
            URL.revokeObjectURL(url);
          }
        }
        // Source1410: the tip reaches saved tanks; its upper corner retains only backdrop595.
        const alpha = (x: number, y: number) => ctx.getImageData(x, y, 1, 1).data[3];
        return {
          upper: alpha(450, 225),
          backdrop: alpha(500, 225),
          tip: alpha(460, 239),
          center: alpha(450, 239),
        };
      });
    expect(arrow.backdrop).toBeLessThanOrEqual(26);
    expect(arrow.upper).toBe(arrow.backdrop);
    expect(arrow.tip).toBeGreaterThan(128);
    expect(arrow.center).toBe(255);
    if (native) {
      const pixels = await note.locator('img').evaluateAll((images) =>
        images.map((node) => {
          const image = node as HTMLImageElement,
            canvas = document.createElement('canvas');
          canvas.width = image.naturalWidth;
          canvas.height = image.naturalHeight;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(image, 0, 0);
          const rgba = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
          let painted = 0;
          for (let i = 3; i < rgba.length; i += 4) if (rgba[i] > 0) painted++;
          return painted;
        }),
      );
      expect(pixels).toHaveLength(2);
      for (const count of pixels) expect(count).toBeGreaterThan(100);
    }
    await note.screenshot({
      path: `test-results/${native ? 'native' : 'mock'}-viewer-guide-note.png`,
    });
    expect(await seen()).toBe(false);
    await page
      .locator('.tank-viewer')
      .screenshot({ path: `test-results/${native ? 'native' : 'mock'}-viewer-guide-local.png` });
    await guide.getByRole('button', { name: 'Previous guide page' }).click();
    await expect(page.locator('.tank-viewer')).toHaveAttribute('data-guide-page', '1');
    await guide.getByRole('button', { name: 'Next guide page' }).click();
    await guide.getByRole('button', { name: 'Next guide page' }).click();
    await expect(guide).toHaveCount(0);
    expect(await seen()).toBe(true);
    await boot();
    await expect(guide).toHaveCount(0);
    await expect(page.locator('.viewer-content')).not.toHaveAttribute('inert', '');
    expect(errors).toEqual([]);
  });
}
