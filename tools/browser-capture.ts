/** Read-only capture of a caller-owned top-level Page and canvas. No browser lifecycle here. */
import type { Locator, Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { access, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const screenshotOptions = {
  type: 'png',
  fullPage: false,
  scale: 'css',
  animations: 'allow',
  caret: 'initial',
} as const;

async function readMetrics(page: Page, canvas: Locator) {
  const viewport = page.viewportSize();
  const dom = await canvas.evaluate(
    (element) => {
      const box = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      // The bbox is a content mapping only for a borderless, unpadded, untransformed canvas.
      let transformed = false;
      for (let ancestor: Element | null = element; ancestor;) {
        const css = getComputedStyle(ancestor);
        transformed ||=
          [css.transform, css.translate, css.rotate, css.scale, css.perspective].some(
            (value) => value !== 'none',
          ) || css.zoom !== '1';
        ancestor = ancestor.parentElement ?? (ancestor.getRootNode() as ShadowRoot).host ?? null;
      }
      const visual = window.visualViewport;
      return {
        browserClock: { timeOriginMs: performance.timeOrigin, nowMs: performance.now() },
        layout: {
          url: location.href,
          topLevel: window === window.top,
          viewport: { width: innerWidth, height: innerHeight },
          scroll: { x: scrollX, y: scrollY },
          dpr: devicePixelRatio,
          visualViewport: visual
            ? {
                width: visual.width,
                height: visual.height,
                offsetLeft: visual.offsetLeft,
                offsetTop: visual.offsetTop,
                pageLeft: visual.pageLeft,
                pageTop: visual.pageTop,
                scale: visual.scale,
              }
            : null,
          canvas: {
            isCanvas: element instanceof HTMLCanvasElement,
            connected: element.isConnected,
            bbox: { x: box.x, y: box.y, width: box.width, height: box.height },
            transformed,
            borderAndPadding: [
              style.borderLeftWidth,
              style.borderRightWidth,
              style.borderTopWidth,
              style.borderBottomWidth,
              style.paddingLeft,
              style.paddingRight,
              style.paddingTop,
              style.paddingBottom,
            ],
          },
        },
      };
    },
    undefined,
    { timeout: 5000 },
  );
  return { viewport, ...dom };
}

type Metrics = Awaited<ReturnType<typeof readMetrics>>;

function mappingFor({ x, y, width, height }: Metrics['layout']['canvas']['bbox']) {
  return {
    logicalSize: { width: 550, height: 450 },
    viewportBounds: { x, y, width, height },
    logicalToViewport: { offsetX: x, offsetY: y, scaleX: width / 550, scaleY: height / 450 },
    // Integer enclosure includes partly covered pixels; it is NOT a rounded canvas bbox.
    enclosingPixelBounds: {
      left: Math.floor(x),
      top: Math.floor(y),
      rightExclusive: Math.ceil(x + width),
      bottomExclusive: Math.ceil(y + height),
    },
    convention:
      'Continuous half-open bounds [x,x+w) × [y,y+h); PNG pixel (i,j) has CSS center (i+0.5,j+0.5). Logical (u,v) maps to (x+u*w/550,y+v*h/450). Invert at pixel centers; choose resampling offline. No rounding or crop performed.',
  };
}

/** Fresh outputPrefix required. Invalid PNGs are retained; valid means geometry checks only. */
export async function captureViewport(page: Page, canvas: Locator, outputPrefix: string) {
  if (canvas.page() !== page)
    throw new Error('Canvas locator must belong to the supplied owned Page.');
  const pngPath = resolve(`${outputPrefix}.png`);
  const jsonPath = resolve(`${outputPrefix}.json`);
  await mkdir(dirname(pngPath), { recursive: true });
  for (const path of [pngPath, jsonPath]) {
    const exists = await access(path).then(
      () => true,
      (error: NodeJS.ErrnoException) => {
        if (error.code !== 'ENOENT') throw error;
        return false;
      },
    );
    if (exists) throw new Error(`Capture prefix already exists: ${path}`);
  }

  const reasons: string[] = [];
  const startedAt = new Date().toISOString();
  const startedMs = performance.now();
  const elapsed = () => performance.now() - startedMs;
  const sample = async (phase: string): Promise<Metrics | null> => {
    try {
      return await readMetrics(page, canvas);
    } catch (error) {
      reasons.push(`${phase}-metrics-failed: ${String(error)}`);
      return null;
    }
  };
  const before = await sample('before');
  const screenshotStartedMs = elapsed();
  let bytes: Buffer | null = null;
  try {
    bytes = await page.screenshot(screenshotOptions);
  } catch (error) {
    reasons.push(`screenshot-failed: ${String(error)}`);
  }
  const screenshotEndedMs = elapsed();
  const after = await sample('after');
  const afterReadEndedMs = elapsed();

  let dimensions: { width: number; height: number } | null = null;
  if (bytes) {
    // Retain bytes before judging them. IHDR checks are not a full PNG decode.
    await writeFile(pngPath, bytes, { flag: 'wx' });
    if (
      bytes.length >= 33 &&
      bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) &&
      bytes.readUInt32BE(8) === 13 &&
      bytes.toString('ascii', 12, 16) === 'IHDR'
    ) {
      dimensions = { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
    } else reasons.push('png-invalid-ihdr');
  }
  for (const [phase, metrics] of [
    ['before', before],
    ['after', after],
  ] as const) {
    if (!metrics) continue;
    const { layout, viewport } = metrics;
    const { bbox, borderAndPadding } = layout.canvas;
    if (!layout.topLevel || !layout.canvas.isCanvas || !layout.canvas.connected)
      reasons.push(`${phase}-requires-connected-top-level-canvas`);
    if (layout.canvas.transformed || borderAndPadding.some((value) => parseFloat(value) !== 0))
      reasons.push(`${phase}-unsupported-canvas-box`);
    if (layout.dpr !== 1) reasons.push(`${phase}-unsupported-dpr`);
    const visual = layout.visualViewport;
    if (
      !visual ||
      visual.scale !== 1 ||
      visual.offsetLeft !== 0 ||
      visual.offsetTop !== 0 ||
      visual.width !== layout.viewport.width ||
      visual.height !== layout.viewport.height
    )
      reasons.push(`${phase}-unsupported-visual-viewport`);
    if (
      !viewport ||
      viewport.width !== layout.viewport.width ||
      viewport.height !== layout.viewport.height
    )
      reasons.push(`${phase}-viewport-disagreement`);
    if (
      ![bbox.x, bbox.y, bbox.width, bbox.height].every(Number.isFinite) ||
      bbox.width <= 0 ||
      bbox.height <= 0
    )
      reasons.push(`${phase}-invalid-canvas-bbox`);
    else if (
      bbox.x < 0 ||
      bbox.y < 0 ||
      bbox.x + bbox.width > layout.viewport.width ||
      bbox.y + bbox.height > layout.viewport.height
    )
      reasons.push(`${phase}-canvas-outside-viewport`);
    if (
      dimensions &&
      (dimensions.width !== layout.viewport.width || dimensions.height !== layout.viewport.height)
    )
      reasons.push(`${phase}-png-css-dimensions-disagree`);
  }
  if (before && after) {
    if (
      JSON.stringify({ viewport: before.viewport, layout: before.layout }) !==
      JSON.stringify({ viewport: after.viewport, layout: after.layout })
    )
      reasons.push('metrics-changed');
    if (
      before.browserClock.timeOriginMs !== after.browserClock.timeOriginMs ||
      after.browserClock.nowMs < before.browserClock.nowMs
    )
      reasons.push('browser-clock-discontinuity');
  }
  const result = {
    schemaVersion: 1,
    valid: reasons.length === 0,
    reasons,
    scope:
      'DPR1, top-level axis-aligned borderless canvas, unzoomed CSS viewport. Endpoint geometry only; no continuous registration, pixel-content, game/controller reliability or all-browser guarantee.',
    screenshotOptions,
    png: bytes
      ? {
          path: pngPath,
          bytes: bytes.length,
          sha256: createHash('sha256').update(bytes).digest('hex'),
          dimensions,
        }
      : null,
    jsonPath,
    timing: {
      startedAt,
      nodeClock: 'performance.now milliseconds',
      startedMs,
      screenshotStartedMs,
      screenshotEndedMs,
      afterReadEndedMs,
    },
    before,
    after,
    mapping: before ? mappingFor(before.layout.canvas.bbox) : null,
  };
  await writeFile(jsonPath, `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx' });
  return result;
}
