import { expect, test, type Page } from '@playwright/test';
import { existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createDecipheriv } from 'node:crypto';
const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');
async function openFixture(page: Page, native: boolean) {
  await page.goto('http://127.0.0.1:3102');
  await page.getByLabel('Fixture').selectOption('creator-save-dialog');
  if (native) await page.getByLabel('Original SWF').setInputFiles(swf);
  else await page.getByRole('button', { name: 'Use mock assets', exact: true }).click();
  await expect(page.locator('#status')).toContainText('Ready', { timeout: 60000 });
}
async function profile(page: Page) {
  return JSON.parse((await page.locator('#stage').getAttribute('data-creator-submission'))!);
}
for (const native of [false, true]) {
  test(`${native ? 'SWF' : 'mock'} authored save dialog preserves names, exports source code and isolates unavailable sharing`, async ({
    page,
    context,
  }, testInfo) => {
    test.skip(native && !existsSync(swf), 'Supply the local research SWF.');
    const errors: string[] = [],
      external: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('request', (request) => {
      if (!/^(http:\/\/(127\.0\.0\.1|localhost)|data:|blob:)/.test(request.url()))
        external.push(request.url());
    });
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await openFixture(page, native);
    const opener = page.getByRole('button', { name: 'Open save', exact: true });
    await opener.click();
    let dialog = page.getByRole('dialog', { name: 'Save your tank', exact: true });
    await expect(dialog).toBeFocused();
    await expect(dialog).toHaveAttribute('data-dialog-frame', '2');
    const author = dialog.getByRole('textbox', { name: 'Author name', exact: true }),
      name = dialog.getByRole('textbox', { name: 'Tank name', exact: true });
    await expect(author).toHaveValue('BubbleTanks3');
    await expect(name).toHaveValue('Legacy: Tank');
    await author.fill("Alice O'Brien");
    await name.focus();
    await page.keyboard.press('End');
    await page.keyboard.type(' 2');
    await expect(name).toHaveValue('Legacy: Tank 2');
    await dialog.getByRole('button', { name: 'Continue', exact: true }).click();
    dialog = page.getByRole('dialog', { name: 'Tank saved', exact: true });
    await expect(dialog).toHaveAttribute('data-dialog-frame', '3');
    const codebox = dialog.getByRole('textbox', { name: 'Saved tank code', exact: true });
    await expect(codebox).not.toHaveValue('');
    await expect(codebox).toHaveAttribute('readonly', '');
    const saved = await profile(page);
    expect(saved.nextTankId).toBe(10000002);
    expect(saved.tanks).toHaveLength(1);
    expect(saved.tanks[0]).toMatchObject({
      id: 'L10000001',
      name: 'Legacy: Tank 2',
      author: "Alice O'Brien",
    });
    const code = await codebox.inputValue(),
      decipher = createDecipheriv(
        'aes-128-ecb',
        Buffer.from(code.slice(0, 3) + code.slice(-3) + 'm7U5kDYy5W'),
        null,
      );
    const plain = Buffer.concat([
      decipher.update(Buffer.from(code.slice(3, -3), 'hex')),
      decipher.final(),
    ]).toString();
    expect(plain.split(';')[0].split(',').slice(0, 2)).toEqual(["Alice O'Brien", 'Legacy: Tank 2']);
    expect(plain.split(';')[0].split(',')[8]).toBe('1');
    await codebox.click();
    expect(
      await codebox.evaluate(
        (node) =>
          (node as HTMLTextAreaElement).selectionEnd - (node as HTMLTextAreaElement).selectionStart,
      ),
    ).toBe(code.length);
    await dialog.getByRole('button', { name: 'Copy tank code', exact: true }).click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(code);
    await expect(dialog.getByRole('status')).toHaveText('Tank code copied.');
    await dialog.screenshot({ path: testInfo.outputPath('saved-code.png') });
    await page.evaluate(() =>
      Object.defineProperty(navigator.clipboard, 'writeText', {
        configurable: true,
        value: async () => {
          throw new DOMException('Denied', 'NotAllowedError');
        },
      }),
    );
    await dialog.getByRole('button', { name: 'Copy tank code', exact: true }).click();
    await expect(dialog.getByRole('status')).toHaveText('Select and copy the code from the box.');
    await dialog.getByRole('button', { name: 'Share tank online', exact: true }).click();
    dialog = page.getByRole('dialog', { name: 'Tank submission error', exact: true });
    await expect(dialog).toHaveAttribute('data-dialog-frame', '7');
    await expect(dialog).toContainText('Community tank sharing is not connected.');
    expect((await profile(page)).tanks).toHaveLength(1);
    await dialog.getByRole('button', { name: 'Return to editing', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(opener).toBeFocused();
    expect(external).toEqual([]);
    expect(errors).toEqual([]);
  });
  test(`${native ? 'SWF' : 'mock'} save dialog keeps source input limits, whole-chunk rejection and browser focus adapters`, async ({
    page,
  }, testInfo) => {
    test.skip(native && !existsSync(swf), 'Supply the local research SWF.');
    await openFixture(page, native);
    const opener = page.getByRole('button', { name: 'Open save', exact: true });
    await opener.click();
    const dialog = page.getByRole('dialog'),
      author = dialog.getByRole('textbox', { name: 'Author name', exact: true }),
      name = dialog.getByRole('textbox', { name: 'Tank name', exact: true });
    await page.keyboard.press('Shift+Tab');
    await expect(dialog.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(author).toBeFocused();
    await expect(author).toHaveAttribute('maxlength', '20');
    await expect(name).toHaveAttribute('maxlength', '25');
    await name.fill('Tank!');
    await expect(name).toHaveValue('Legacy: Tank');
    const prevented = await name.evaluate((node) => {
      const data = new DataTransfer();
      data.setData('text', 'valid!');
      return !node.dispatchEvent(
        new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: data }),
      );
    });
    expect(prevented).toBe(true);
    await expect(name).toHaveValue('Legacy: Tank');
    await name.fill('A'.repeat(30));
    await expect(name).toHaveValue('A'.repeat(25));
    await author.fill('B'.repeat(30));
    await expect(author).toHaveValue('B'.repeat(20));
    await author.fill('');
    await name.focus();
    await expect(author).toHaveValue('Type your name...');
    await author.focus();
    await expect(author).toHaveValue('');
    await author.fill('Alice');
    const rect = await author.boundingBox(),
      root = await dialog.boundingBox();
    expect(rect!.x - root!.x).toBeCloseTo(207.9, 1);
    expect(rect!.y - root!.y).toBeCloseTo(181.5, 1);
    await name.fill('Tank');
    await dialog.locator('img').evaluateAll(async (images) => {
      await Promise.all(images.map((image) => (image as HTMLImageElement).decode()));
    });
    const continueButton = dialog.getByRole('button', { name: 'Continue', exact: true });
    const buttonBox = (await continueButton.boundingBox())!,
      dialogBox = (await dialog.boundingBox())!;
    const pixels = await dialog.screenshot();
    const ink = await page.evaluate(
      async ({ src, box }) => {
        const image = new Image();
        image.src = src;
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const context = canvas.getContext('2d')!;
        context.drawImage(image, 0, 0);
        const data = context.getImageData(
          Math.floor(box.x),
          Math.floor(box.y),
          Math.ceil(box.width),
          Math.ceil(box.height),
        ).data;
        let count = 0;
        for (let i = 0; i < data.length; i += 4)
          if (data[i] > 150 && data[i + 1] > 150 && data[i + 2] > 150) count++;
        return count;
      },
      {
        src: `data:image/png;base64,${pixels.toString('base64')}`,
        box: {
          x: buttonBox.x - dialogBox.x,
          y: buttonBox.y - dialogBox.y,
          width: buttonBox.width,
          height: buttonBox.height,
        },
      },
    );
    expect(ink).toBeGreaterThan(50);
    writeFileSync(testInfo.outputPath('name-form.png'), pixels);
    await dialog.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(opener).toBeFocused();
  });
  test(`${native ? 'SWF' : 'mock'} save errors consume an ID and exit confirmation keeps cancel and exit distinct`, async ({
    page,
  }) => {
    test.skip(native && !existsSync(swf), 'Supply the local research SWF.');
    await openFixture(page, native);
    await page.getByRole('button', { name: 'Open empty save', exact: true }).click();
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    let dialog = page.getByRole('dialog', { name: 'Tank submission error', exact: true });
    await expect(dialog).toContainText('You cannot submit tanks with nothing in them...Thanks!');
    expect((await profile(page)).nextTankId).toBe(10000002);
    expect((await profile(page)).tanks).toHaveLength(0);
    await dialog.getByRole('button', { name: 'Return to editing', exact: true }).click();
    const opener = page.getByRole('button', { name: 'Open exit', exact: true });
    await opener.click();
    dialog = page.getByRole('dialog', { name: 'Exit tank creator?', exact: true });
    await expect(dialog).toHaveAttribute('data-dialog-frame', '1');
    const cancel = dialog.getByRole('button', { name: 'Cancel', exact: true }),
      field = cancel.locator('.creator-text-field');
    await page.mouse.move(0, 0);
    await expect(field).toHaveCSS('color', 'rgb(204, 204, 204)');
    await cancel.dispatchEvent('pointerdown', { button: 2, pointerType: 'mouse' });
    await expect(field).toHaveCSS('color', 'rgb(204, 204, 204)');
    await cancel.dispatchEvent('pointerdown', { button: 0, pointerType: 'mouse' });
    await expect(field).toHaveCSS('color', 'rgb(255, 255, 255)');
    await cancel.dispatchEvent('pointercancel', { pointerType: 'mouse' });
    await expect(field).toHaveCSS('color', 'rgb(204, 204, 204)');
    await cancel.click();
    await expect(page.getByTestId('fixture-exits')).toHaveText('0');
    await expect(opener).toBeFocused();
    await opener.click();
    await page.getByRole('button', { name: 'Exit without saving', exact: true }).click();
    await expect(page.getByTestId('fixture-exits')).toHaveText('1');
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });
}
