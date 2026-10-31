/** Owned original-runtime capture; no screenshots or SWF bytes enter source control. */
import { chromium, expect } from '@playwright/test';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { CREATOR_GUIDE } from '../src/game/core/creator-guide';

const scenario = process.env.BT3_REFERENCE_SCENARIO ?? 'creator';
if (!['creator', 'validation'].includes(scenario))
  throw new Error('Choose creator or validation reference scenario.');
const swf = resolve(
    process.env.BT3_SWF_FILE ?? '../documented-bubble-tank-3/re/bt3/uncompressed.swf',
  ),
  output = resolve(
    process.env.BT3_REFERENCE_CAPTURE_DIR ??
      `reference-captures/${scenario === 'validation' ? 'creator-validation' : 'creator'}`,
  ),
  url = process.env.BT3_REFERENCE_URL ?? 'http://127.0.0.1:3104';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  headless: true,
  args: [
    '--no-sandbox',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--js-flags=--stack-size=4096',
  ],
});
const page = await browser.newPage({ viewport: { width: 1100, height: 1000 } }),
  errors: string[] = [],
  captures: string[] = [];
page.on('pageerror', (error) => errors.push(error.message));
try {
  await page.goto(url);
  await page.getByLabel('Original SWF').setInputFiles(swf);
  await expect(page.getByRole('status')).toHaveAttribute('data-ready', 'true', { timeout: 30000 });
  const stage = page.locator('ruffle-player');
  const click = async (x: number, y: number) => {
    const b = (await stage.boundingBox())!;
    await page.mouse.click(b.x + (x * b.width) / 550, b.y + (y * b.height) / 450, { delay: 50 });
    await page.waitForTimeout(400);
  };
  const capture = async (name: string) => {
    await stage.screenshot({ path: resolve(output, `${name}.png`) });
    captures.push(name);
  };
  const probe = async () => {
    const png = await stage.screenshot();
    return page.evaluate(
      async (bytes) => {
        const image = await createImageBitmap(
            new Blob([new Uint8Array(bytes)], { type: 'image/png' }),
          ),
          canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(image, 0, 0);
        const pixels = ctx.getImageData(220, 272, 110, 20).data;
        let bright = 0;
        for (let i = 0; i < pixels.length; i += 4)
          if (pixels[i] > 100 && pixels[i + 1] > 160 && pixels[i + 2] > 160) bright++;
        const error = ctx.getImageData(235, 160, 80, 35).data,
          title = ctx.getImageData(50, 50, 450, 100).data,
          guest = ctx.getImageData(8, 10, 15, 15).data,
          icon = ctx.getImageData(372, 232, 26, 26).data,
          guide = ctx.getImageData(180, 220, 20, 20).data;
        let errorInk = 0,
          titleInk = 0,
          guestInk = 0,
          menuInk = 0,
          guideInk = 0;
        for (let i = 0; i < error.length; i += 4)
          if (error[i] > 200 && error[i + 1] < 100 && error[i + 2] < 80) errorInk++;
        for (let i = 0; i < title.length; i += 4)
          if (title[i] > 200 && title[i + 1] > 200 && title[i + 2] > 200) titleInk++;
        for (let i = 0; i < guest.length; i += 4)
          if (guest[i] > 180 && guest[i + 1] < 130 && guest[i + 2] < 130) guestInk++;
        for (let i = 0; i < icon.length; i += 4)
          if (icon[i] > 160 && icon[i + 1] > 160 && icon[i + 2] > 160) menuInk++;
        for (let i = 0; i < guide.length; i += 4)
          if (guide[i] < 20 && guide[i + 1] < 20 && guide[i + 2] < 20) guideInk++;
        return {
          bright,
          errorInk,
          green: ctx.getImageData(150, 100, 1, 1).data[1],
          titleInk,
          guestInk,
          menuInk,
          guideInk,
        };
      },
      [...png],
    );
  };
  await expect.poll(async () => (await probe()).bright, { timeout: 20000 }).toBeGreaterThan(80);
  await capture('preloader');
  await click(10, 440);
  await click(265, 280);
  await expect.poll(async () => (await probe()).green, { timeout: 5000 }).toBeLessThan(50);
  await capture('storage-tutorial');
  await click(362, 380);
  await click(362, 371);
  await click(372, 416);
  // Wait for the creator icon itself: under software rendering, the title intro
  // can take much longer than its nominal 50fps duration.
  await expect
    .poll(
      async () => {
        const state = await probe();
        return state.guestInk > 5 && state.titleInk > 2000 && state.menuInk > 25;
      },
      { timeout: 45000 },
    )
    .toBe(true);
  await page.waitForTimeout(2000);
  await capture('main-menu');
  await click(385, 244);
  await expect.poll(async () => (await probe()).guideInk, { timeout: 10000 }).toBeGreaterThan(200);
  await capture('guide-2');
  for (const frame of CREATOR_GUIDE.frames) {
    const button = frame.buttons.find((b) => b.name === 'next_tut')!;
    await click(
      (CREATOR_GUIDE.parent.tx + button.matrix.tx) / 20 + button.bounds.x + button.bounds.width / 2,
      (CREATOR_GUIDE.parent.ty + button.matrix.ty) / 20 +
        button.bounds.y +
        button.bounds.height / 2,
    );
    await capture(frame.frame === 7 ? 'guide-off' : `guide-${frame.frame + 1}`);
  }
  const dragPreview = async (x: number, y: number) => {
    const b = (await stage.boundingBox())!,
      from = { x: b.x + (468 * b.width) / 550, y: b.y + (213 * b.height) / 450 },
      to = { x: b.x + (x * b.width) / 550, y: b.y + (y * b.height) / 450 };
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    for (let i = 1; i <= 20; i++) {
      await page.mouse.move(
        from.x + ((to.x - from.x) * i) / 20,
        from.y + ((to.y - from.y) * i) / 20,
      );
      await page.waitForTimeout(25);
    }
    await page.mouse.up();
    await page.waitForTimeout(400);
  };
  if (scenario === 'validation') {
    await click(382, 235); // Weapons tab; one Basic Cannon remains affordable at18GP.
    await click(450, 265);
    for (let i = 1; i <= 10; i++) {
      await dragPreview(187, 200);
      if (i === 9) await capture('nine-accepted-cannon-pairs');
    }
    await expect.poll(async () => (await probe()).errorInk, { timeout: 5000 }).toBeGreaterThan(100);
    await capture('symmetric-overspend-reverted');
    await click(500, 400);
    await click(326, 431);
    await capture('undo-after-rejection');
    await click(382, 284); // Behavior tab; first two rows are Aggressor and Skittish.
    await click(450, 265);
    await dragPreview(187, 200);
    await expect.poll(async () => (await probe()).errorInk).toBe(0);
    await capture('duplicate-aggressors-accepted');
    await click(450, 285);
    await dragPreview(187, 200);
    await expect.poll(async () => (await probe()).errorInk, { timeout: 5000 }).toBeGreaterThan(100);
    await capture('mixed-behaviors-reverted');
  } else {
    await click(263, 16);
    await capture('empty-save-alert');
    await click(500, 400);
    const b = (await stage.boundingBox())!,
      point = (x: number, y: number) => ({
        x: b.x + (x * b.width) / 550,
        y: b.y + (y * b.height) / 450,
      }),
      from = point(468, 213),
      to = point(186, 231);
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    for (let i = 1; i <= 20; i++) {
      await page.mouse.move(
        from.x + ((to.x - from.x) * i) / 20,
        from.y + ((to.y - from.y) * i) / 20,
      );
      await page.waitForTimeout(25);
    }
    await page.mouse.up();
    await page.waitForTimeout(400);
    await capture('one-bubble');
    await click(263, 16);
    await capture('save-name');
    await click(191, 332);
    await click(353, 16);
    await capture('exit-confirmation');
  }
  const manifest = {
    scenario,
    source: swf,
    sha256: createHash('sha256')
      .update(await readFile(swf))
      .digest('hex'),
    browser: browser.version(),
    ruffle: '0.7.1',
    renderer: 'wgpu-webgl',
    stackKB: 4096,
    stage: { width: 550, height: 450 },
    capturedAt: new Date().toISOString(),
    captures,
    pageErrors: errors,
    limitation:
      'Ruffle emulation; stopped foreground captures do not establish Adobe parity or frame timing.',
  };
  await writeFile(resolve(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(JSON.stringify({ output, captures: captures.length, pageErrors: errors }));
} finally {
  await browser.close();
}
