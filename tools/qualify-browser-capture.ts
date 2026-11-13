/** Local synthetic qualification only. Requires local Chrome, ffmpeg and ffprobe; no server. */
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, realpath } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { captureViewport } from './browser-capture';

const output = resolve(process.argv[2] ?? 'reference-captures/browser-capture-qualification');
await mkdir(dirname(output), { recursive: true });
await mkdir(output, { recursive: false }); // Never replace a previous qualification.
const sha256 = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');
const executablePath = '/usr/bin/google-chrome';
const html = `<!doctype html><style>
html,body { margin:0; width:100%; height:100%; overflow:hidden; background:#202830 }
canvas { position:absolute; left:225px; top:213.5px; width:550px; height:450px }
.corner { position:fixed; width:40px; height:40px; z-index:2 }
@keyframes drift { from { top:213.5px } to { top:313.5px } }
</style><div class="corner" style="left:0;top:0;background:#f00"></div>
<div class="corner" style="right:0;top:0;background:#0f0"></div>
<div class="corner" style="left:0;bottom:0;background:#00f"></div>
<div class="corner" style="right:0;bottom:0;background:#ff0"></div>
<canvas width="550" height="450"></canvas><script>
const canvas=document.querySelector('canvas'), ctx=canvas.getContext('2d');
let frame=0; function draw() {
ctx.fillStyle='#d0e0f0'; ctx.fillRect(0,0,550,450);
ctx.strokeStyle='#102030'; ctx.strokeRect(0.5,0.5,549,449);
ctx.fillStyle='#102030'; ctx.font='24px monospace'; ctx.fillText('synthetic '+frame++,25,60);
requestAnimationFrame(draw); } draw();
</script>`;
await writeFile(resolve(output, 'synthetic.html'), html);
const captures: Awaited<ReturnType<typeof captureViewport>>[] = [];
const pageErrors: string[] = [];
const blockedRequests: string[] = [];
const manifest = {
  startedAt: new Date().toISOString(),
  command: `bun tools/qualify-browser-capture.ts ${process.argv[2] ?? 'reference-captures/browser-capture-qualification'}`,
  scope: 'Finite local synthetic geometry qualification; no live game or controller claim.',
  helperSha256: sha256(await readFile(resolve('tools/browser-capture.ts'))),
  qualifierSha256: sha256(await readFile(resolve('tools/qualify-browser-capture.ts'))),
  htmlSha256: sha256(html),
  executablePath,
  executableSha256: sha256(await readFile(await realpath(executablePath))),
  chromeBinarySha256: sha256(await readFile('/opt/google/chrome/chrome')),
  playwrightVersion: JSON.parse(
    await readFile(resolve('node_modules/@playwright/test/package.json'), 'utf8'),
  ).version,
  bunVersion: Bun.version,
  browserVersion: '',
  contextClosed: false,
  browserClosed: false,
};
const browser = await chromium.launch({ executablePath, headless: true });
manifest.browserVersion = browser.version();
let videoPath = '';
try {
  const context = await browser.newContext({
    viewport: { width: 1000, height: 900 },
    deviceScaleFactor: 1,
    recordVideo: { dir: output, size: { width: 1000, height: 900 } },
  });
  try {
    await context.route('**/*', (route) => {
      blockedRequests.push(route.request().url());
      return route.abort();
    });
    const page = await context.newPage();
    page.on('pageerror', (error) => pageErrors.push(error.message));
    videoPath = await page.video()!.path();
    await page.goto(`data:text/html,${encodeURIComponent(html)}`);
    const canvas = page.locator('canvas');
    await page.waitForTimeout(300);
    const capture = async (name: string) => {
      const result = await captureViewport(page, canvas, resolve(output, name));
      captures.push(result);
      // Check the actual persisted artifacts, including rejected captures.
      const sidecar = JSON.parse(await readFile(result.jsonPath, 'utf8'));
      assert.deepEqual(sidecar, result);
      assert.ok(result.png);
      assert.equal(sha256(await readFile(result.png.path)), result.png.sha256);
      assert.deepEqual(result.png.dimensions, { width: 1000, height: 900 });
      return result;
    };
    for (let i = 0; i < 12; i++) {
      const result = await capture(`stable-${String(i).padStart(2, '0')}`);
      assert.equal(result.valid, true, JSON.stringify(result.reasons));
      assert.deepEqual(result.mapping!.viewportBounds, {
        x: 225,
        y: 213.5,
        width: 550,
        height: 450,
      });
      assert.deepEqual(result.mapping!.enclosingPixelBounds, {
        left: 225,
        top: 213,
        rightExclusive: 775,
        bottomExclusive: 664,
      });
      await page.waitForTimeout(80);
    }
    // Changes belong only to this synthetic fixture; the helper itself never writes DOM state.
    await canvas.evaluate((element) => {
      (element as HTMLElement).style.top = '800px';
    });
    const offscreen = await capture('offscreen');
    assert.equal(offscreen.valid, false);
    assert.ok(offscreen.reasons.includes('before-canvas-outside-viewport'));
    assert.ok(offscreen.reasons.includes('after-canvas-outside-viewport'));
    await canvas.evaluate((element) => {
      (element as HTMLElement).style.top = '213.5px';
      (element as HTMLElement).style.animation = 'drift 2s linear infinite alternate';
    });
    for (let i = 0; i < 3; i++) await capture(`changing-${i}`);
    assert.ok(captures.slice(-3).some((result) => result.reasons.includes('metrics-changed')));
    await page.waitForTimeout(200);
  } finally {
    await context.close(); // Finalize the video before ffmpeg reads it.
    manifest.contextClosed = true;
  }
} finally {
  await browser.close();
  manifest.browserClosed = true;
  await writeFile(
    resolve(output, 'manifest.json'),
    JSON.stringify({ ...manifest, videoPath, captures, pageErrors, blockedRequests }, null, 2) +
      '\n',
  );
}

function run(command: string, args: string[]) {
  const result = spawnSync(command, args, { maxBuffer: 64 * 1024 * 1024 });
  assert.equal(result.status, 0, `${command}: ${result.stderr.toString()}`);
  return result.stdout;
}
const probeArgs = ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', videoPath];
const probe = JSON.parse(run('ffprobe', probeArgs).toString());
const stream = probe.streams.find(
  (stream: { codec_type: string }) => stream.codec_type === 'video',
);
assert.equal(stream.width, 1000);
assert.equal(stream.height, 900);
// Decode EVERY frame, retaining four 10×10 interior patches at the fixed viewport corners.
const filter =
  '[0:v]split=4[a][b][c][d];[a]crop=10:10:5:5[a1];[b]crop=10:10:985:5[b1];[c]crop=10:10:5:885[c1];[d]crop=10:10:985:885[d1];[a1][b1][c1][d1]hstack=inputs=4,format=rgb24[out]';
const decodeArgs = [
  '-v',
  'error',
  '-i',
  videoPath,
  '-filter_complex',
  filter,
  '-map',
  '[out]',
  '-vsync',
  '0',
  '-f',
  'rawvideo',
  '-pix_fmt',
  'rgb24',
  '-',
];
const raw = run('ffmpeg', decodeArgs);
const frameBytes = 40 * 10 * 3;
assert.equal(raw.length % frameBytes, 0);
const expected = [
  [255, 0, 0],
  [0, 255, 0],
  [0, 0, 255],
  [255, 255, 0],
];
// Decode the retained helper PNGs too; inspect corners and a mapping-derived canvas interior.
const pngChecks = captures.map((capture) => {
  const args = ['-v', 'error', '-i', capture.png!.path, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'];
  const pixels = run('ffmpeg', args);
  assert.equal(pixels.length, 1000 * 900 * 3);
  const rgb = (x: number, y: number) => [
    ...pixels.subarray((y * 1000 + x) * 3, (y * 1000 + x) * 3 + 3),
  ];
  const corners = [
    [10, 10],
    [990, 10],
    [10, 890],
    [990, 890],
  ].map(([x, y]) => rgb(x, y));
  assert.deepEqual(corners, expected);
  if (capture.valid) {
    const map = capture.mapping!.logicalToViewport;
    // Logical (275,200) lies in the blank interior, below the changing frame label.
    assert.deepEqual(
      rgb(Math.floor(map.offsetX + 275 * map.scaleX), Math.floor(map.offsetY + 200 * map.scaleY)),
      [208, 224, 240],
    );
    assert.deepEqual(rgb(500, 212), [32, 40, 48]); // Above the fractional top edge.
  }
  return { path: capture.png!.path, sha256: capture.png!.sha256, args, corners };
});
const rows = Array.from({ length: raw.length / frameBytes }, (_, frame) => {
  const means = expected.map((_, corner) => {
    const totals = [0, 0, 0];
    for (let y = 0; y < 10; y++)
      for (let x = 0; x < 10; x++)
        for (let c = 0; c < 3; c++)
          totals[c] += raw[frame * frameBytes + (y * 40 + corner * 10 + x) * 3 + c];
    return totals.map((total) => total / 100);
  });
  return {
    frame,
    meanRGB: means,
    fullViewportGeometry: means.every((mean, i) =>
      mean.every((value, c) => Math.abs(value - expected[i][c]) < 35),
    ),
  };
});
const analysis = {
  videoPath,
  videoSha256: sha256(await readFile(videoPath)),
  probeArgs,
  decodeArgs,
  probe,
  pngChecks,
  decodedFrames: rows.length,
  invalidFrames: rows.filter((row) => !row.fullViewportGeometry).length,
  rows,
};
await writeFile(resolve(output, 'video-analysis.json'), JSON.stringify(analysis, null, 2) + '\n');
assert.ok(rows.length > 0);
assert.equal(analysis.invalidFrames, 0, 'Retain failed video and analysis; do not repair or trim.');
assert.deepEqual(pageErrors, []);
assert.deepEqual(blockedRequests, []);
console.log(
  JSON.stringify(
    {
      output,
      stableCaptures: 12,
      rejectedCaptures: captures.filter((result) => !result.valid).length,
      decodedFrames: rows.length,
      invalidVideoFrames: analysis.invalidFrames,
      videoSha256: analysis.videoSha256,
      contextClosed: manifest.contextClosed,
      browserClosed: manifest.browserClosed,
    },
    null,
    2,
  ),
);
