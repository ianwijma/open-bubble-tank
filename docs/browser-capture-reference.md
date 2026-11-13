# Owned viewport capture contract

`tools/browser-capture.ts` exports
`captureViewport(page: Page, canvas: Locator, outputPrefix: string)`. The caller
owns the page/context, supplies a unique prefix, serializes captures, and closes
its resources. The canvas must represent the 550×450 logical stage; the helper
does not infer its rendering. It checks that the locator belongs to that page; ownership
itself is a caller precondition. This tools-only addition changes no application,
simulation, controller, or actor ownership behavior.

```ts
const capture = await captureViewport(page, page.locator('canvas'),
  'reference-captures/example/checkpoint-01');
if (!capture.valid) throw new Error(capture.reasons.join('; '));
// Retain the full PNG and JSON even when rejected. Process pixels offline.
```

The sole capture API is `page.screenshot` with PNG, `fullPage:false`, `scale:'css'`,
`animations:'allow'`, and `caret:'initial'`. There is no element screenshot, clip,
resize, scroll, input, private game read, injected observer, or state write. Public
DOM reads collect the canvas rectangle, page URL, viewport, scroll, DPR,
visualViewport and browser monotonic clock before/after. The sidecar also retains
the configured Playwright viewport, Node monotonic timing, PNG IHDR dimensions,
byte count and SHA-256.

`valid` requires exactly matching endpoint layout/page metrics, an uninterrupted
browser clock origin, positive in-viewport bounds, PNG/CSS viewport dimension
agreement, DPR1 and an unzoomed visual viewport. Mapping is limited to a connected
top-level borderless, unpadded canvas without CSS transforms/zoom on its ancestor
chain. Unsupported geometry is rejected explicitly. `valid` checks geometry at
the endpoints; it does not prove pixel content, visibility through occlusion,
unchanged metrics between samples, or continuous video registration. IHDR parsing
alone is not a full image decode. A transient excursion returning to the same
endpoint metrics can escape these checks.

Each result writes `<prefix>.png` and `<prefix>.json`; invalid bytes are preserved
without repair, cropping or helper retries. Existing prefixes are refused.
Screenshot/metric failures produce an invalid sidecar (and no PNG if screenshot
acquisition failed); filesystem errors throw and may leave a retained PNG without
a completed sidecar. Callers must check `valid` before using `mapping`.

The mapping treats the logical stage as continuous `[0,550) × [0,450)` and the
DOM bbox as continuous half-open viewport bounds. Logical `(u,v)` maps to
`(x + u*width/550, y + v*height/450)`. PNG pixel `(i,j)` has CSS center
`(i+0.5,j+0.5)` at DPR1. Invert that affine map at pixel centers; choose an offline
resampling policy explicitly. `enclosingPixelBounds` uses floor at the near edges
and ceil at the far edges; it includes partly covered pixels, not a normalized
550×450 crop. At `(225,213.5,550,450)`, that enclosure is
`[225,775) × [213,664)`. Fractional registration remains in the sidecar.

## Local qualification

`tools/qualify-browser-capture.ts` runs the actual helper on a synthetic data URL
with fixed viewport-corner fiducials and an animated canvas at fractional
Y213.5. It uses a fresh owned Chrome context, 1000×900 viewport/video and DPR1,
blocks network requests, and closes context/browser in `finally`. It needs local
Chrome, FFmpeg/ffprobe and existing Playwright dependencies, with no server or
CDP connection. Shared preview entry was checked and its temporary tab closed;
its tools do not expose the required Page screenshot options/sidecars, so owned
Playwright qualifies this capture API directly. No live game was started.

From prepared parent `e76507bf9c337630b2f52201c8e6ff85d7c9c365`:

```sh
mkdir -p reference-captures/browser-capture-validation
bun tools/qualify-browser-capture.ts reference-captures/browser-capture-qualification-03 > reference-captures/browser-capture-validation/qualification-03.log 2>&1
bun run format > reference-captures/browser-capture-validation/format.log 2>&1
bun run check > reference-captures/browser-capture-validation/check-final.log 2>&1
```

Use a fresh output directory on repetition. The final `-03` run retained 12 valid
fractional-position captures, an offscreen PNG/sidecar rejected with
`before-canvas-outside-viewport` and `after-canvas-outside-viewport`, and three
animation captures rejected with `metrics-changed`. Persisted JSON/PNG hashes
were checked. FFmpeg decoded all 16 PNGs, checking the four corner colors and,
for valid captures, mapping-derived interior/background pixels. The finalized
video decoded 77 frames; all 77 passed the four corner-patch checks. This finite
sample is not a general browser/provider robustness guarantee or a controller
permission/reliability claim.

The ignored `manifest.json` records tool/HTML/Chrome hashes, runtime versions,
captures, empty page-error/request lists and successful resource closure.
`video-analysis.json` retains exact ffprobe/FFmpeg argument arrays, metadata,
per-frame corner means and PNG checks. Chrome was 157.0.8103.38,
Playwright 1.64.1 and Bun 1.3.9. Final video SHA-256:
`7c3ef6b6b56aa30cb712e45d47b24b29c8d497cbb1e104e91adb36a39a30acc9`.
Local artifacts live under this checkout's ignored `reference-captures/`.
Run `-01` is preserved with its failed FFmpeg `-fps_mode` invocation and source
snapshots; installed FFmpeg requires `-vsync 0`. Run `-02` passed 76 video frames;
`-03` adds retained-PNG pixel checks. No earlier result is relabeled as the final
qualifier. Formatting/check pass; product e2e is outside this tools-only scope.
Dependencies were reused locally without installation/upgrades. No media,
dependencies, capture outputs or build output enter the commit.

## Prior evidence boundary

Read-only evidence:
`/home/ian/.t3/worktrees/open-bubble-tank/t3-d84e5ece/reference-captures/capture-qualification-3365/`.
Its manifests, analysis summaries and analysis logs record two synthetic
1000×900 DPR1 Chrome 157.0.8103.38 runs, each with 12 captures per mode and a
550×450 canvas at (225,214). Run 1 decoded invalid geometry in clip 12/123 frames,
element 1/138 and viewport 0/124. The `inflight/` run recorded clip 14/126,
element 11/145 and viewport 0/124. Its RAF/resize/scroll/visualViewport tuple-change
logger retained only the initial tuple for each mode. All contexts/browser
closed. Producers were neither rerun nor modified; failed samples remain there.
Manifest SHA-256s are
`a3258eff51cb90d1e9ef74e1c4793f1c50c7089e7ab7bd1951cdda2710add452`
and `36c420c088a77255105ff0c282f4f47bba74e97c507da2a839eb04c98140e62f`.

These observations indicate a bounded capture-provider/compositor issue; they do
not establish that all browsers or simulation behavior remained unchanged. The
historical `ordinary-native-4353d49` video's reported intermittent malformed
geometry prevents treating it as continuously registered evidence despite decode
success. This task did not re-audit that old video or run another game. Individual
retained screenshots and public observations retain their own limited scope;
ordinary boss/win, original/Adobe equivalence and full-game parity remain open.
