/** Synthetic evidence only: literal layout construction, never BCR as the pixel oracle. */
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { captureViewport as actualCapture } from './browser-capture';

const helperPath = resolve(process.env.CAPTURE_HELPER ?? 'tools/browser-capture.ts');
const captureViewport: typeof actualCapture = (await import(pathToFileURL(helperPath).href))
  .captureViewport;
const output = resolve(process.argv[2] ?? 'reference-captures/capture-geometry');
await mkdir(output, { recursive: false });
const sha = (b: Buffer | string) => createHash('sha256').update(b).digest('hex');
// Child first. Each point passes through layout + origin + translation + positive scale.
// These literal construction parameters are the oracle; DOM measurements are candidates only.
type Node = {
  x: number;
  y: number;
  sx: number;
  sy: number;
  ox: number;
  oy: number;
  tx: number;
  ty: number;
};
const node = (x: number, y: number, sx = 1, sy = sx, ox = 0, oy = 0, tx = 0, ty = 0): Node => ({
  x,
  y,
  sx,
  sy,
  ox,
  oy,
  tx,
  ty,
});
const fixtures = [
  { name: 'untransformed', nodes: [node(225, 213.5)], transform: false },
  { name: 'normal-responsive', nodes: [node(0, 0), node(60, 78.5, 1.6)], transform: true },
  {
    name: 'nested-origins',
    nodes: [
      node(7, 9, 1.1, 0.8, 23, 41, 4.25, 5.5),
      node(31, 27, 0.9, 1.2, 50, 60, 2, 3),
      node(100, 80, 1.25, 1.1, 100, 75, 11.5, 8.25),
    ],
    transform: true,
  },
  {
    name: 'matrix-translation',
    nodes: [node(200.25, 180.5, 1.2, 1.1, 40, 20, 12.25, 8.5)],
    transform: true,
    matrix: true,
  },
  {
    name: 'percent-translation-origin',
    nodes: [node(100, 100, 1.2, 1.1, 275, 225, 55, 45)],
    transform: true,
    percent: true,
  },
];
const points = [
  [16, 16],
  [534, 16],
  [16, 434],
  [534, 434],
  [147, 121],
  [401, 307],
];
const colors = ['#ff00ff', '#00ffff', '#ff8000', '#8000ff', '#1040d0', '#30b050'];
const expectedColors = [
  [255, 0, 255],
  [0, 255, 255],
  [255, 128, 0],
  [128, 0, 255],
  [16, 64, 208],
  [48, 176, 80],
];
function project(nodes: Node[], x: number, y: number) {
  for (const n of nodes) {
    x = n.x + n.ox + n.tx + n.sx * (x - n.ox);
    y = n.y + n.oy + n.ty + n.sy * (y - n.oy);
  }
  return { x, y };
}
function html(fixture: (typeof fixtures)[number], extra = '', ancestorExtra = '') {
  let content = '<canvas width="550" height="450"></canvas>';
  for (const [i, n] of fixture.nodes.entries()) {
    const transform = !fixture.transform
      ? 'none'
      : fixture.matrix
        ? `matrix(${n.sx},0,0,${n.sy},${n.tx},${n.ty})`
        : `translate(${fixture.percent ? '10%,10%' : `${n.tx}px,${n.ty}px`}) scale(${n.sx},${n.sy})`;
    const style = `position:absolute;left:${n.x}px;top:${n.y}px;width:550px;height:450px;transform:${transform};transform-origin:${fixture.percent ? '50% 50%' : `${n.ox}px ${n.oy}px`};${i === 0 ? extra : ''}`;
    // Apply innermost node to the canvas itself, all remaining nodes to HTML ancestors.
    if (i === 0) content = content.replace('<canvas ', `<canvas style="${style}" `);
    else content = `<div style="${style}">${content}</div>`;
  }
  return `<!doctype html><style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#202830} canvas{display:block} .corner{position:fixed;width:40px;height:40px;z-index:100}@keyframes drift{from{top:100px}to{top:300px}}</style>
<div style="${ancestorExtra}">${content}</div>
<div class="corner" style="left:0;top:0;background:#f00"></div><div class="corner" style="right:0;top:0;background:#0f0"></div><div class="corner" style="left:0;bottom:0;background:#00f"></div><div class="corner" style="right:0;bottom:0;background:#ff0"></div>
<script>const c=document.querySelector('canvas'),x=c.getContext('2d');x.fillStyle='#d0e0f0';x.fillRect(0,0,550,450);${points.map(([x, y], i) => `x.fillStyle='${colors[i]}';x.fillRect(${x - 7},${y - 7},14,14);`).join('')}</script>`;
}
const manifest = {
  synthetic: true,
  command: ['bun', 'tools/qualify-browser-capture-geometry.ts', ...process.argv.slice(2)],
  helperPath,
  helperSha256: sha(await readFile(helperPath)),
  qualifierSha256: sha(await readFile(import.meta.path)),
  startedAt: new Date().toISOString(),
  browserVersion: '',
  contextClosed: false,
  browserClosed: false,
  cases: [] as {
    name: string;
    expectedValid: boolean;
    valid: boolean;
    reasons: string[];
    assertions: string[];
    error?: string;
  }[],
  errors: [] as string[],
};
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true });
manifest.browserVersion = browser.version();
const context = await browser.newContext({
  viewport: { width: 1000, height: 900 },
  deviceScaleFactor: 1,
});
try {
  await context.route('**/*', (r) => r.abort());
  const page = await context.newPage();
  page.on('pageerror', (e) => manifest.errors.push(String(e)));
  const run = async (
    name: string,
    source: string,
    expectedValid: boolean,
    fixture?: (typeof fixtures)[number],
    reason = 'unsupported-canvas-box',
  ) => {
    await writeFile(resolve(output, `${name}.html`), source, { flag: 'wx' });
    await page.goto(`data:text/html,${encodeURIComponent(source)}`);
    const c = await captureViewport(page, page.locator('canvas'), resolve(output, name));
    const row = {
      name,
      expectedValid,
      valid: c.valid,
      reasons: c.reasons,
      assertions: [] as string[],
      error: undefined as string | undefined,
    };
    manifest.cases.push(row);
    try {
      assert.equal(c.valid, expectedValid, JSON.stringify(c.reasons));
      if (!expectedValid)
        assert.ok(
          c.reasons.some((r) => r.includes(reason)),
          JSON.stringify(c.reasons),
        );
      assert.ok(c.png);
      assert.equal(sha(await readFile(c.png.path)), c.png.sha256);
      assert.deepEqual(JSON.parse(await readFile(c.jsonPath, 'utf8')), c);
      if (fixture) {
        const origin = project(fixture.nodes, 0, 0),
          far = project(fixture.nodes, 550, 450);
        const expected = {
          x: origin.x,
          y: origin.y,
          width: far.x - origin.x,
          height: far.y - origin.y,
        };
        for (const key of ['x', 'y', 'width', 'height'] as const)
          assert.ok(
            Math.abs(c.mapping!.viewportBounds[key] - expected[key]) < 0.0001,
            `${key}: expected ${expected[key]}, got ${c.mapping!.viewportBounds[key]}`,
          );
        assert.deepEqual(c.mapping!.enclosingPixelBounds, {
          left: Math.floor(origin.x),
          top: Math.floor(origin.y),
          rightExclusive: Math.ceil(far.x),
          bottomExclusive: Math.ceil(far.y),
        });
        const map = c.mapping!.logicalToViewport;
        for (const [x, y] of points) {
          const p = project(fixture.nodes, x, y);
          assert.ok(
            Math.abs(map.offsetX + x * map.scaleX - p.x) < 0.0001 &&
              Math.abs(map.offsetY + y * map.scaleY - p.y) < 0.0001,
          );
        }
        row.assertions.push('literal-construction-bounds-and-six-fiducial-mappings');
        const decoded = spawnSync(
          'ffmpeg',
          ['-v', 'error', '-i', c.png.path, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
          { maxBuffer: 8 * 1024 * 1024 },
        );
        assert.equal(decoded.status, 0, decoded.stderr.toString());
        assert.equal(decoded.stdout.length, 2700000);
        const rgb = (x: number, y: number) => [
          ...decoded.stdout.subarray((y * 1000 + x) * 3, (y * 1000 + x) * 3 + 3),
        ];
        for (const [i, [x, y]] of points.entries()) {
          const p = project(fixture.nodes, x, y);
          for (let dy = -2; dy <= 2; dy++)
            for (let dx = -2; dx <= 2; dx++)
              assert.deepEqual(rgb(Math.floor(p.x) + dx, Math.floor(p.y) + dy), expectedColors[i]);
        }
        assert.deepEqual(
          [
            [10, 10],
            [990, 10],
            [10, 890],
            [990, 890],
          ].map(([x, y]) => rgb(x, y)),
          [
            [255, 0, 0],
            [0, 255, 0],
            [0, 0, 255],
            [255, 255, 0],
          ],
        );
        row.assertions.push('independent-six-5x5-pixel-patches-and-four-viewport-corners');
      }
      const bytes = await readFile(c.png.path);
      await assert.rejects(
        captureViewport(page, page.locator('canvas'), resolve(output, name)),
        /prefix already exists/,
      );
      assert.deepEqual(await readFile(c.png.path), bytes);
      row.assertions.push('unique-prefix-refusal-and-byte-retention');
    } catch (e) {
      row.error = String(e);
    }
  };
  for (const f of fixtures) await run(f.name, html(f), true, f);
  const base = fixtures[0];
  for (const [name, extra] of [
    ['negative', 'transform:scale(-1,1)'],
    ['cancelled-negative', 'transform:scale(-1,-1) scale(-1,-1)'],
    ['rotate', 'transform:rotate(10deg)'],
    ['rotate-zero', 'transform:rotate(0deg)'],
    ['skew', 'transform:skewX(10deg)'],
    ['cancelled-skew', 'transform:skewX(10deg) skewX(-10deg)'],
    ['perspective', 'transform:perspective(500px) rotateY(10deg)'],
    ['matrix3d-2d-equivalent', 'transform:matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1)'],
    ['translate3d-2d-equivalent', 'transform:translate3d(0px,0px,0px)'],
    ['scale3d-2d-equivalent', 'transform:scale3d(1,1,1)'],
    ['origin-z', 'transform:scale(1.1);transform-origin:20px 30px 1px'],
    ['individual-scale', 'scale:1.2'],
    ['individual-translate', 'translate:1px 2px'],
    ['individual-rotate', 'rotate:0deg'],
    ['zoom', 'zoom:1.1'],
    ['border', 'border:1px solid red'],
    ['padding', 'padding:1px'],
  ])
    await run(name, html(base, extra), false);
  for (const [name, extra] of [
    ['ancestor-perspective', 'perspective:500px'],
    ['ancestor-preserve3d', 'transform-style:preserve-3d'],
    ['ancestor-rotate', 'transform:rotate(2deg)'],
    ['ancestor-zoom', 'zoom:1.1'],
    ['motion-path', 'offset-path:path("M 0 0 L 10 10")'],
  ])
    await run(name, html(base, '', extra.replaceAll('"', "'")), false);
  await run('offscreen', html(base, 'top:800px'), false, undefined, 'canvas-outside-viewport');
  await run(
    'dynamic',
    html(base, 'animation:drift 0.7s linear infinite alternate'),
    false,
    undefined,
    'metrics-changed',
  );
  // A separate fresh context proves the DPR guard is still enforced on the actual helper.
  const dprContext = await browser.newContext({
    viewport: { width: 1000, height: 900 },
    deviceScaleFactor: 2,
  });
  try {
    const p = await dprContext.newPage();
    await p.goto(`data:text/html,${encodeURIComponent(html(base))}`);
    const c = await captureViewport(p, p.locator('canvas'), resolve(output, 'dpr2'));
    manifest.cases.push({
      name: 'dpr2',
      expectedValid: false,
      valid: c.valid,
      reasons: c.reasons,
      assertions: [],
    });
    assert.equal(c.valid, false);
    assert.ok(c.reasons.includes('before-unsupported-dpr'));
  } finally {
    await dprContext.close();
  }
} finally {
  await context.close();
  manifest.contextClosed = true;
  await browser.close();
  manifest.browserClosed = true;
  await writeFile(resolve(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', {
    flag: 'wx',
  });
}
console.log(JSON.stringify(manifest, null, 2));
assert.deepEqual(manifest.errors, []);
assert.deepEqual(
  manifest.cases.filter((c) => c.error),
  [],
  'Retain failures; no retries or relabeling.',
);
