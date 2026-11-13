# Bounded viewport registration through responsive scaling

This tools-only correction addresses the normal `GameShell` responsive ancestor
(`src/components/game-shell.tsx` ResizeObserver assigns `transform:scale(...)`).
It changes no product style, canvas size, input, simulation or rendering. The
caller still owns a top-level Page, serializes acquisitions, supplies unique
prefixes and a connected borderless/padding-free canvas representing the complete
550×450 logical stage. DPR must be 1, with an unzoomed matching viewport.

Schema 2 retains `transformed` as a diagnostic, and records every canvas-through-
HTML-root ancestor (including shadow hosts): tag/id, fractional bbox, transform,
origin/box, individual transforms, perspective/origin/style, zoom, motion path,
Typed OM components, matrix and explicit unsupported reasons. All this metadata
participates in endpoint equality. The helper has no lifecycle, input, game-state,
asset-extraction or image-normalization behavior. Screenshot options remain PNG,
`fullPage:false`, `scale:'css'`, `animations:'allow'`, `caret:'initial'`.

The admitted subset consists of no transform, or CSS transform lists made only
of positive 2D scale, 2D translation and positive diagonal 2D matrix components.
Each component and the final finite matrix must preserve the axes and their
positive directions. Resolved transform origins must contain finite pixel X/Y
and zero Z; HTML view-box/border-box semantics are admitted. Nonzero X/Y origins,
percentage translations/origins, independent X/Y scales and nested lists are
qualified below. Origins are applied by the browser; the helper does not rebuild
CSS layout or compose an alternate matrix from rounded ancestor rectangles.
For this subset, the canvas content rectangle's near corner remains the bbox's
near corner, and its full logical axes map across that bbox. Fractional offsets
and extents are retained; integer enclosure uses floor/ceil only.

Chromium CSS Typed OM is required for transformed nodes. Computed matrices alone
lose provenance: `translate3d(0,0,0)` and `rotate(0deg)` can both become a 2D
identity matrix. Typed component checks therefore reject all 3D forms, even
mathematically 2D equivalents, rotation/skew (including cancelling/zero forms),
negative/zero components and cancelling reflections. Individual `translate`,
`rotate`, `scale`, perspective, preserve-3D, zoom, motion paths, non-HTML ancestry,
unsupported transform-box/origin and missing/unreadable Typed OM fail closed.
Other browsers and other syntax need independent qualification before expansion.

A valid result establishes endpoint geometry only. The caller's full-stage
content assumption remains necessary; validity says nothing about stable pixels,
occlusion, content identity, game/controller reliability or continuous video.
Equal endpoints can miss an excursion between samples. No original/Adobe,
global-event, actor/overlap identity or full-game proof follows.

## Repeatable synthetic regression

`tools/qualify-browser-capture-geometry.ts` exercises the actual helper on fresh
owned data-URL pages, not game pixels. Literal layout/origin/translation/scale
parameters independently project six colored logical fiducials. It compares
fractional bounds, enclosure, each mapped fiducial and 5×5 decoded pixel patches,
plus four fixed viewport corners. The oracle never reads BCR or derives expected
pixels from the candidate mapping. Prefix refusal and retained-byte hashes are
checked too. Each run requires a new output directory and closes owned contexts
and browser in finally. No server, CDP, installation or external traffic is used.

```sh
CAPTURE_HELPER=reference-captures/geometry-contract-work/browser-capture.before.mts bun tools/qualify-browser-capture-geometry.ts reference-captures/geometry-contract-before-01
bun tools/qualify-browser-capture-geometry.ts reference-captures/geometry-contract-after-final
bun tools/qualify-browser-capture.ts reference-captures/geometry-contract-legacy-control
python3 tools/decode-capture-pngs.py --output reference-captures/geometry-contract-work/final-synthetic-decodes.json reference-captures/geometry-contract-after-final/*.png reference-captures/geometry-contract-legacy-control/*.png
bun run format
bun run check
```

The baseline helper is preserved bytewise before editing. Its driver exits 1:
all four transformed positive cases reject, while the no-transform control
passes. Additional new adversaries expose its preserve-3D/motion-path gaps.
Final driver exits 0 with 30 cases: five supported layouts (untransformed Y213.5,
normal (60,78.5,880,720) scale1.6, nested unequal positive scales/nonzero origins,
2D matrix translation and percentage translation/origin) and 25 rejections.
Rejections cover reflections/cancelling negatives, rotation/zero rotation,
skew/cancelling skew, perspective, three 3D-equivalent forms, Z origin, all three
individual transforms, zoom, border, padding, ancestor perspective/preserve-3D/
rotation/zoom, motion path, offscreen, dynamic geometry and DPR2.

Five actual-helper mutations each exit 1: deleted geometry guard (20 adversaries
fail), unit scale (four supported cases fail), hardcoded1.6 composition (four),
rounded fractional mapping Y (four), and discarded X origin (five). Mutant source,
raw PNG/JSON/HTML, manifest and logs are retained separately. They are never
relabeled as successful acquisitions. The initial successful synthetic run also
remains separate from the final formatted-source run. A transient TypeScript
Typed-OM intersection error was corrected before final checks; no runtime failure
was hidden. Formatting/typecheck/full check passes 1,291 tests /75,956 assertions.
No product flow changed, so broad unrelated application suites were not rerun.

`tools/decode-capture-pngs.py` opens originals read-only, fully decodes with existing
Pillow and FFmpeg, requires identical RGB bytes, checks IHDR/sidecar/hash/length,
and writes only a new report. Nine prior home/pause PNGs independently agree;
the prior artifact manifest and all its entries were checked bytewise. All eight
old home sidecars remain invalid/raw. No writing verifier ran on that family.
Its report SHA256 is
`26cabe82c8c6ab9a93cabab0a2cd8b469feb5408321b8c4c3e68248d3d91d53b`;
artifact manifest SHA256 is
`7ad294e9254570d1ef9107bb275ac3d1b3df181e477404112e60cdea0e0d722c`.

## Fresh production preflight

Exactly one new public-UI home attempt completed in this checkout under ignored
`reference-captures/current-build-home-scaling-20261114-01/`. Shared preview status
and an owned blank-tab entry were checked; its exposed API cannot supply actual
Page screenshot options/sidecars. That tab was closed, and the documented owned
Playwright fallback was used without CDP. No other browser or port was touched.

Source head `fe2286440a123953cba052fa34fa893220a898a5`, tree
`fa4a6fd14f7ad145095dee0a36b25946d3ce46f8`, built production ID
`41Gv6C5peRp5gFn-_ysqz`. All921 tracked inputs were frozen before build and
unchanged after capture; SWF and acquisition-script hashes also remained fixed.
The SWF digest is
`f5827841c682f988f23dcf470ab4ab59c1ffc497acb4ca0f21077d03f942c153`.
All11 actually loaded JS response digests match the frozen pre-navigation build
and final disk bytes. Their sorted URL/NUL/digest/LF aggregate is
`ed6f1bb20eb604ef1b97978f71497ba729c8cbf1add00c4508f6d8d50770a870`.
Chrome157.0.8103.38, Playwright1.64.1 and Bun1.3.9 were reused without installs.

Exact orchestration/acquisition/verification commands and argument arrays are
retained in `run.py`, `run.json`, `capture.mts`, `verify.py` and decoder reports:

```sh
python3 reference-captures/current-build-home-scaling-20261114-01/run.py
# runner: bun run build
# runner: node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 4535
# runner: bun reference-captures/current-build-home-scaling-20261114-01/capture.mts
python3 tools/decode-capture-pngs.py --output reference-captures/current-build-home-scaling-20261114-01/independent-decodes.json reference-captures/current-build-home-scaling-20261114-01/*.png
python3 reference-captures/current-build-home-scaling-20261114-01/verify.py
```

The fresh default context used1000×900/DPR1 and the real file input, normal
Play/Choose-your-tanks PLAY and Close-secondary-help buttons. No settings changed,
movement/fire keys were held or aim override performed. Eight home captures span
8,145ms from first browser-before to last browser-after on one monotonic origin.
All eight have valid endpoint geometry, bbox `(60,78.5,880,720)`, scale1.6 and
enclosure `[60,940)×[78,799)`. The extra pause PNG is also geometry-valid.
All nine original1000×900 PNGs independently decode identically in Pillow/FFmpeg;
sidecar/persisted-byte hash/IHDR checks pass. Independent literal layout math
checks the mapping; offline contrast scans bracket painted stage edges at
X60–939 and Y79–798 on every home image. Those integer paint brackets do not
independently resolve the unknown game's fractional edge coverage; the synthetic
fiducials establish that bounded fractional contract.

Inspected original home00/home07 and pause PNGs show the full home tutorial,
compact map and central yellow/blue paint. HUD entry paint changes/fades, so
stable pixels are explicitly unproved. The Pause dialog was publicly verified
and visually says paused; its existing temporary text remains visible. No actor
identity, classifier, controller or progression was attempted.
**currentHomeOnly=true, overlapQualified=false, controllerAllowed=false.**

The helper hash is
`80c56097f2f62d62e9063fc94e2ef0046036a1ff16782d70165ad8be2d709603`.
The acquisition report SHA256 is `006cf99b4717f022a96b99ca7b18fada054152f1fde9c2619a18649f9ffd64f7`;
synthetic qualification-summary SHA256 is `89e3da32ad16f8300c9b711c04959302d973e06a1d5aca4259b9a9ad2b28deb3`.
Both families retain hash inventories and all rejected/mutant/raw evidence.
The pre-existing57-entry artifact inventory still matches, including all eight
rejected old home sidecars; no prior evidence was rewritten or relabeled.

Finally blocks released inputs, verified/captured public Pause, closed context
and browser, then stopped the owned server. All24 observed PID/start-time
fingerprints and referenced crashpad2670818 are absent; ports4535/10535 were
verified free before and after. Process sampling is not a continuous transient
process audit. The temporary dependency symlink is removed at handback; parent
.next/resources and original inputs were never written. No remote action,
controller/ordinary playthrough, original/Adobe/pixel-equivalence/global-event or
full-game completion claim belongs to this correction.
