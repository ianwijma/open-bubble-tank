import { saveCreator } from './helpers/creator';
import { waitForMainMenu } from './helpers/main-menu';
import { expect, test } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const STARTER = JSON.parse(readFileSync(resolve('src/game/data/tanks.json'), 'utf8'))
  .avatar_defaults[0];
const swf =
  process.env.BT3_SWF_FILE ?? resolve('../documented-bubble-tank-3/re/bt3/uncompressed.swf');
for (const native of [false, true])
  test(`${native ? 'SWF' : 'mock'} creator saves fresh edited copies and persists the third-tank medal`, async ({
    page,
  }) => {
    test.skip(native && !existsSync(swf), 'Supply the local reference SWF.');
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/');
    if (native) await page.getByLabel('Bubble Tanks 3 Flash file').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Play with mock assets' }).click();
    await waitForMainMenu(page);
    await page.getByRole('button', { name: 'My tanks', exact: true }).click({ timeout: 60000 });
    for (const [index, avatar] of [true, false].entries())
      await page.getByLabel('Import tank design').setInputFiles({
        name: `import-${index}.json`,
        mimeType: 'application/json',
        buffer: Buffer.from(
          JSON.stringify({
            ...STARTER,
            id: `imported-${index}`,
            name: `Imported ${index}`,
            author: "Alice O'Brien",
            difficulty: -12345,
            avatar,
          }),
        ),
      });
    const read = () =>
      page.evaluate(() =>
        JSON.parse(
          localStorage.getItem('open-bubble-tank.profile.v1') ?? '{"tanks":[],"achievements":[]}',
        ),
      );
    await expect.poll(async () => (await read()).tanks.length).toBe(2);
    expect((await read()).achievements).not.toContain('Tank Creator');
    await page.getByRole('button', { name: 'Edit', exact: true }).first().click();
    await saveCreator(page, { name: 'Edited copy', author: "Alice O'Brien" });
    await expect.poll(async () => (await read()).tanks.length).toBe(3);
    const profile = await read();
    expect(profile.tanks.map((tank: { id: string }) => tank.id)).toEqual([
      'imported-0',
      'imported-1',
      'L10000001',
    ]);
    expect(profile.tanks[2].sourceCode).toBeUndefined();
    expect(profile.tanks[2].author).toBe("Alice O'Brien");
    expect(profile.tanks[2].difficulty).not.toBe(-12345);
    expect(profile.tanks[0].difficulty).toBe(-12345);
    expect(profile.tanks[0].name).toBe('Imported 0');
    expect(profile.achievements).toContain('Tank Creator');
    expect(profile.nextTankId).toBe(10000002);
    await page.reload();
    expect((await read()).achievements).toContain('Tank Creator');
    if (native) await page.getByLabel('Bubble Tanks 3 Flash file').setInputFiles(swf);
    else await page.getByRole('button', { name: 'Play with mock assets' }).click();
    await waitForMainMenu(page);
    await page.getByRole('button', { name: 'My tanks', exact: true }).click({ timeout: 60000 });
    await expect(page.getByText('Edited copy', { exact: true })).toBeVisible();
    await expect(page.getByText('Imported 0', { exact: true })).toBeVisible();
    await expect(page.getByText('Imported 1', { exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  });
