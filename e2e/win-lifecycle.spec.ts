import { expect, test } from './helpers/frame-paced-test';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';

const swf =
  process.env.BT3_SWF_FILE ??
  '/home/ian/Projects/ianwijma/documented-bubble-tank-3/re/bt3/uncompressed.swf';
for (const native of [false, true])
  test(`${native ? 'SWF' : 'mock'} win captures before completion, shares stopped World frames and releases its lifetime`, async ({
    page,
  }, testInfo) => {
    test.setTimeout(120000);
    test.skip(native && !existsSync(swf), 'Supply the local research SWF.');
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${process.env.BT3_FIXTURE_PORT ?? 3102}`);
    await page.getByLabel('Fixture').selectOption('win-screen');
    if (native) await page.getByLabel('Original SWF').setInputFiles(resolve(swf));
    else await page.getByRole('button', { name: 'Use mock assets', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Ready', { timeout: 60000 });
    const host = page.locator('#stage');
    const next = (count: number) =>
      page.getByRole('button', { name: `Win advance ${count}`, exact: true }).click();
    const complete = () =>
      page.getByRole('button', { name: 'Complete boss field', exact: true }).click();
    await expect(host).toHaveAttribute('data-ready', 'true');
    await complete();
    const state = page.locator('[data-win-age]');
    await expect(state).toHaveAttribute('data-win-age', '0');
    expect(JSON.parse((await host.getAttribute('data-birth'))!)).toEqual({
      cleared: false,
      completed: false,
      editEnabled: false,
      forced: false,
      playerAge: 0,
    });
    await page.getByRole('button', { name: 'Compare completion pixels', exact: true }).click();
    const pixels = JSON.parse((await host.getAttribute('data-capture-pixels'))!);
    expect(pixels.captures).toBe(1);
    expect(pixels.different).toBeGreaterThan(5);
    expect(pixels.preCorner[0]).toBeGreaterThan(150); // Fresh red Main flash above shade.
    await host.screenshot({ path: testInfo.outputPath('win-capture-birth.png') });
    const age = Number(await host.getAttribute('data-player-age'));
    const art = Number(await host.getAttribute('data-art-age'));
    const backgrounds = await host.getAttribute('data-background-ages');
    await expect(host).toHaveAttribute('data-hit-timer', '9');
    await next(5);
    await expect(state).toHaveAttribute('data-win-age', '5');
    await expect(host).toHaveAttribute('data-player-age', String(age));
    await expect(host).toHaveAttribute('data-art-age', String(art + 5));
    await expect(host).toHaveAttribute('data-hit-timer', '4');
    await expect(host).toHaveAttribute('data-background-ages', backgrounds!);
    for (let i = 0; i < 6; i++) await next(5);
    for (let i = 0; i < 4; i++) await next(1);
    await expect(state).toHaveAttribute('data-win-age', '39');
    await expect(state).toHaveAttribute('data-saved-frames', '19');
    await expect(state).toHaveAttribute('data-foreground-raised', 'false');
    await next(1);
    await expect(state).toHaveAttribute('data-content-frame', '2');
    await expect(state).toHaveAttribute('data-foreground-raised', 'true');
    await expect(page.locator('.win-bitmap + div')).toHaveCSS('opacity', '0');
    await next(1);
    await expect(state).toHaveAttribute('data-content-frame', '3');
    await expect(page.locator('.win-bitmap + div')).toHaveCSS('opacity', '0.0859375');
    await next(20);
    await next(1);
    await expect(state).toHaveAttribute('data-content-frame', '24');
    await expect(page.locator('.win-bitmap + div')).toHaveCSS('opacity', '1');
    await next(1);
    await expect(state).toHaveAttribute('data-content-frame', '25');
    await host.screenshot({ path: testInfo.outputPath('win-capture-open.png') });
    await page.getByRole('button', { name: 'Win save stopped return', exact: true }).click();
    await page.getByRole('button', { name: 'Continue Your Game', exact: true }).click();
    await expect(state).toHaveCount(0);
    await expect(host).toHaveAttribute('data-disposed-bytes', '0');
    await expect(host).toHaveAttribute('data-disposed-age', '63');
    await expect(host).toHaveAttribute('data-world-mode', 'stopped');
    await expect(host).toHaveAttribute('data-same-world', 'true');
    await expect(host).toHaveAttribute('data-boss-defeated', 'true');
    await expect(page.locator('.game-canvas')).toBeFocused();
    await next(1);
    expect(JSON.parse((await host.getAttribute('data-background-ages'))!)).toEqual(
      JSON.parse(backgrounds!).map((value: number) => value + 1),
    );
    await page.getByRole('button', { name: 'Win new game', exact: true }).click();
    await expect(host).toHaveAttribute('data-ready', 'true');
    await expect(host).toHaveAttribute('data-same-world', 'false');
    await complete();
    await next(20);
    await next(20);
    await next(1);
    await page.getByRole('button', { name: 'Main Menu', exact: true }).click();
    await expect(state).toHaveCount(0);
    await expect(page.locator('.game-canvas')).toHaveCount(0);
    await expect(host).toHaveAttribute('data-world-mode', 'menu');
    const oldArt = await host.getAttribute('data-art-age');
    await next(5);
    await expect(host).toHaveAttribute('data-art-age', oldArt!);
    await page.getByRole('button', { name: 'Win new game', exact: true }).click();
    await expect(host).toHaveAttribute('data-ready', 'true');
    await expect(host).toHaveAttribute('data-same-world', 'false');
    await expect(host).toHaveAttribute('data-boss-defeated', 'false');
    await expect(host).toHaveAttribute('data-player-age', '0');
    expect(errors).toEqual([]);
  });
