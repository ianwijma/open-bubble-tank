/** Observe native menu targets in the owned Ruffle browser; never enters the application build. */
import { chromium } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
const input = process.argv[2] ?? '/tmp/bt3-menu-pointer-probe.swf',
  output = process.argv[3] ?? '/tmp/bt3-menu-pointer-observation.json',
  originalInput = process.argv[4];
const endpoint = process.env.BT3_REFERENCE_CDP_ENDPOINT ?? 'http://127.0.0.1:9223';
const origin = new URL(process.env.BT3_REFERENCE_URL ?? 'http://127.0.0.1:3103/').origin;
const captureDirectory = process.env.BT3_REFERENCE_CAPTURE_DIR ?? '/tmp';
await mkdir(captureDirectory, { recursive: true });
const browser = await chromium.connectOverCDP(endpoint);
try {
  const page = browser
    .contexts()
    .flatMap((c) => c.pages())
    .find((p) => p.url().startsWith(`${origin}/`));
  if (!page) throw new Error(`No reference viewer is open at ${origin}.`);
  await page.getByLabel('Original SWF').setInputFiles(input);
  await page.waitForFunction(
    () => document.querySelector('#status')?.getAttribute('data-ready') === 'true',
  );
  const movie = page.locator('ruffle-player');
  const point = async (x: number, y: number) => {
    const box = (await movie.boundingBox())!;
    return { x: box.x + (x * box.width) / 550, y: box.y + (y * box.height) / 450 };
  };
  const click = async (x: number, y: number) => {
    const p = await point(x, y);
    await page.mouse.click(p.x, p.y);
    await page.waitForTimeout(500);
  };
  const brightAt = async (x: number, y: number, w: number, h: number, threshold: number) => {
    const png = await movie.screenshot();
    return page.evaluate(
      async ({ bytes, x, y, w, h, threshold }) => {
        const image = await createImageBitmap(
          new Blob([new Uint8Array(bytes)], { type: 'image/png' }),
        );
        const canvas = document.createElement('canvas');
        canvas.width = 550;
        canvas.height = 450;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(image, 0, 0);
        image.close();
        const pixels = ctx.getImageData(x, y, w, h).data;
        let bright = 0;
        for (let i = 0; i < pixels.length; i += 4)
          if (pixels[i] > 180 && pixels[i + 1] > 180 && pixels[i + 2] > 180) bright++;
        return bright > threshold;
      },
      { bytes: Array.from(png), x, y, w, h, threshold },
    );
  };
  const menuVisible = () => brightAt(5, 420, 131, 22, 50);
  for (let i = 0; i < 75 && !(await brightAt(220, 272, 110, 20, 80)); i++)
    await page.waitForTimeout(200);
  await click(10, 440);
  await click(265, 280);
  for (const [x, y] of [
    [362, 380],
    [362, 372],
    [371, 415],
  ]) {
    if (await menuVisible()) break;
    await click(x, y);
  }
  for (let i = 0; i < 30 && !(await menuVisible()); i++) await page.waitForTimeout(200);
  if (!(await menuVisible()))
    throw new Error('Original main menu was not reached. Inspect the owned browser.');
  await page.waitForTimeout(3000);
  const observations: {
    label: string;
    x: number;
    y: number;
    trace: string;
    target?: { name: string; parent: string };
    menuVisible?: boolean;
    press?: { x: number; y: number };
  }[] = [];
  let previous = await page.locator('#trace').innerText(),
    target: { name: string; parent: string } | undefined;
  for (const [label, x, y] of [
    ['empty', 400, 410],
    ['plus-icon-only', 181, 225],
    ['plus-inner', 166, 244],
    ['plus-grown-edge', 144.5, 244],
    ['reset', 400, 410],
    ['plus-idle-edge', 144.5, 244],
    ['plus-bounds-corner', 146.5, 229.5],
    ['play-inner', 275, 225],
    ['play-grown-edge', 202, 226],
    ['reset-play', 400, 410],
    ['play-idle-edge', 202, 226],
  ] as const) {
    const p = await point(x, y);
    await page.mouse.move(p.x, p.y);
    await page.waitForTimeout(250);
    const trace = await page.locator('#trace').innerText();
    const events = trace.startsWith(previous) ? trace.slice(previous.length).trim() : trace;
    for (const match of events.matchAll(/POINTER_PROBE (mouseOver|mouseOut) (\S+) (\S+)/g))
      target = match[1] === 'mouseOver' ? { name: match[2], parent: match[3] } : undefined;
    observations.push({
      label,
      x,
      y,
      trace: events,
      target,
    });
    previous = trace;
    await movie.screenshot({ path: join(captureDirectory, `bt3-pointer-${label}.png`) });
  }
  await click(181, 225);
  observations.push({
    label: 'plus-icon-release',
    x: 181,
    y: 225,
    trace: await page.locator('#trace').innerText(),
    menuVisible: await menuVisible(),
  });
  const press = { x: 400, y: 410 },
    release = { x: 203.9, y: 299.4 },
    down = await point(press.x, press.y),
    up = await point(release.x, release.y);
  await page.mouse.move(down.x, down.y);
  await page.mouse.down();
  await page.mouse.move(up.x, up.y);
  await page.mouse.up();
  await page.waitForTimeout(500);
  const releasedTrace = await page.locator('#trace').innerText(),
    lastRelease = [...releasedTrace.matchAll(/POINTER_PROBE mouseUp (\S+) (\S+)/g)].at(-1);
  observations.push({
    label: 'press-outside-release-settings',
    ...release,
    press,
    trace: releasedTrace,
    target: lastRelease ? { name: lastRelease[1], parent: lastRelease[2] } : undefined,
    menuVisible: await menuVisible(),
  });
  await movie.screenshot({ path: join(captureDirectory, 'bt3-pointer-release-settings.png') });
  const result = {
    runtime: 'Ruffle 0.7.1 / Chromium',
    limitation: 'Root mouse-event observer on an original-game copy; not Adobe Flash execution.',
    originalInputSha256: originalInput
      ? createHash('sha256')
          .update(await readFile(originalInput))
          .digest('hex')
      : undefined,
    probeSha256: createHash('sha256')
      .update(await readFile(input))
      .digest('hex'),
    settleMilliseconds: 3000,
    hoverMilliseconds: 250,
    observations,
  };
  await writeFile(output, JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser.close();
}
