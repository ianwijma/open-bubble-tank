# Geometry from retained native clips

`retainedClipGeometry` projects a caller-owned, already constructed `SwfClip`
through its actual retained child objects and current render order. It never
calls `start`, `construct`, `advance`, frame scripts, random functions or an
age-based display-list reconstruction. Missing children, mismatched symbol/birth
records and unknown symbols reject explicitly. Empty known sprites remain
distinct from unsupported content. The supplied pose's construction/lifetime
must already be established by its owner; an uninitialized pose is not a native
construction oracle.

`AssetPack.nativeClipGeometry` binds that projection to actual supplied shape
definitions and the existing geometric fill/stroke contact visitor. The returned
tree carries declared integer-twip extents and actual placement matrices, depths,
mask ends and morph ratios. Alpha and glow/paint-cache padding do not select
geometry. Building the tree or reading its bounds needs no DOM or Path allocation;
shape contact can lazily cache native paths. No raster-alpha or mock-contour
fallback is installed. Unsupported definition leaves such as text/bitmaps reject.
Runtime drawings and mask relationships are outside this authored pose projection;
their owners must compose them explicitly before claiming complete geometry. The
reader cannot detect a drawing that its caller never supplied.

The read uses current placements rather than child Map insertion order, preserving
the independently corrected [effect correspondence](effect-clock-correspondence-reference.md).
It copies placement matrices and leaf rectangles instead of exposing mutable
metadata as output. A later owner write requires a new population/geometry read.
It does not register a new clock, assign gameplay IDs or instantiate artwork.

## Bounds and contact stay separate

Static shapes supply their declared Script rectangle. Morph Script bounds retain
the original start rectangle; contact receives the current retained ratio through
the existing morph interpolation/shape visitor. This preserves the current
`scriptTwipBounds` distinction rather than substituting painted extents.

[Tagged Ruffle v0.7.1 morph code](https://github.com/ruffle-rs/ruffle/blob/v0.7.1/core/src/display_object/morph_shape.rs#L114)
separates Script start bounds from interpolated Engine bounds. The fetched source
SHA-256 is `af86999fd6c87fe84de2e053a4370d7133f2f0103d5aeaa9fd1f4221e2638a57`.
This is static evidence, not authentication of the loaded runtime or a new
original morph-width/contact qualification. Existing double/rounding interpolation,
Canvas path contact, transformed Engine gates and arbitrary affine edge cases
remain bounded implementation contracts. Do not claim complete morph or Adobe
equality from the new tree adapter.

## Verification boundary

The four unit cases exercise child order despite differing Map insertion history,
no clock/entropy writes, matrix-copy isolation, missing/mismatched children,
unsupported geometry, actual placement ratio, empty sprites, declared morph
start bounds and distant contact without native path allocation. They do not
fabricate an original contour.

The existing shape-contact browser fixture additionally reads original sprites
1539/1544 and their actual supplied shape leaves, and applies the independently
parsed project-wrapper metadata from the
[original mask qualification](field-mask-runtime-reference.md). Its51 finite
controls compare native vector contact and exact Script dimensions directly with
the unchanged binary oracle: overlap/end/nested masks, authored visibility and
all runtime-reference assignment/reparent/removal phases. The E2E requires the
exact control-key set, not just a passing subset. Both actual shape contact and
bounds participate; the unit cohort's restricted centre/miss predicates are not
used here. Main remains zero, matching those frozen controls. This is a
reconstruction comparison to previously captured original execution, not a fresh
original run, complete field geometry or public root-coordinate qualification.

The existing primitive, stroke, protection and actual projectile-contact checks
stay intact. The new retained adapter also repeats all13 scaled/nested/reflected
thin-stroke controls and transparent-fill contact against the existing fixed
expectations. Mock mode explicitly returns no original-native mask proof. The generic native
API has no gameplay caller yet; its affected browser path is the development-only
fixture and asset gate. No test API is exposed in the production Next.js build.

Reproduction and ignored evidence:

```sh
bun test tests/retained-geometry.test.ts
bun run format
BT3_SWF_FILE=/home/ian/Projects/ianwijma/documented-bubble-tank-3/re/bt3/uncompressed.swf bun run check
BT3_SWF_FILE=/home/ian/Projects/ianwijma/documented-bubble-tank-3/re/bt3/uncompressed.swf bun run test:e2e --config test-results/native-retained-geometry/playwright.config.mts
```

The private config uses only owned4015/4016 and sets the server working directory
explicitly. The source spec copy changes only its import path and fixture port;
all assertions remain. The first setup attempt completed its production build
but started zero browser cases because its fixture command resolved relative to
the config directory. A second setup collected zero cases because Node required
the JSON import attribute; that test import is corrected and collection was
checked before the next run. Both failed setup logs are retained separately. Final results,
input hashes, JSON report, screenshots and cleanup evidence belong under ignored
`test-results/native-retained-geometry/`.

Final formatting/check passes **1200 tests /19461 assertions**. The literal E2E
command completes its production build and **2 mock/supplied-file cases**, with
zero skips, failures or flaky results. Build ID `NJRTYdp8_WZkh3KuZR9Ws` has all
**777 captured build-input hashes unchanged**. Both actual proof JSON files and
the51 original-mask comparisons are retained in the report;13 stroke controls
run in each fixture mode. Both final paint sheets were inspected. Owned servers
exited and4015/4016 were free; no other browser/process was used or stopped.

Remaining complete-field work includes text mode/contact, actor child/protection
transforms and runtime masks, pickup/effect owner poses, dynamic rocket lines,
under-avatar/root mapping, full mock contours and eventual hot-path consumers.
No ordinary-game, complete event/RNG, compiled-runtime revision, Adobe, pixel/audio
or full-game parity claim follows.
