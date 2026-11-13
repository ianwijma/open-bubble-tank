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

The independent live preflight, source/build/loaded-response identity, decoded
pixels, bounded clock interval and cleanup record are appended after acquisition.
Only one fresh public-UI home attempt is authorized for this correction.
