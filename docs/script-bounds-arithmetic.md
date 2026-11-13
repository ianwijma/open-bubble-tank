# Script width/height arithmetic: local implementation boundary

This work starts at prepared `12ff5b0115688be1a81ed4d3a8c598e2d391a38e`,
which audits immutable final PR144 head `1ca0d1d91ac8bc4614e1565d62a3f50a5c9790e5`.
It implements a qualified arithmetic API, without assembling a field display
population or changing ownership, beam collision, transit spacing, rendering,
existing creator/projectile/protection measurements, or any production caller.
There is no complete or partial replacement field query in this change.

## Mechanism and module API

`core/display-transform.ts` already owns float32 matrix products and Point
transforms with signed integer twip translations. `ActorParents` has a separate
Point adapter with the same ties-even mechanism; its ownership and implementation
remain untouched. New `displayMatrixRectangle(matrix, rectangle)` transforms all
four declared twip corners through that existing Point primitive and selects
integer extrema. It does not round a pixel width or multiply a previously rounded
width. Each multiplication and addition is float32; rounding precedes integer
translation, including during matrix composition.

`assets/projectile-bounds.ts` now exposes `scriptTwipBounds` with the same
source/ID/age/matrix/override/path/depth/retained-pose parameters as the existing
`scriptBounds`. They share one traversal, retaining child frame ages, overrides,
mask/transparent children and the depth guard. The new path keeps every leaf and
union extent in integer twips until its final return in pixels. Its pixel leaf
source represents declared integer twips; nearest rounding at that decoding
boundary recovers metadata after binary pixel division, rather than applying a
DisplayObject position setter. No pixel sampling, filter growth, mask intersection
or renderer object participates. Empty trees return `undefined`; a real leaf
under zero scale returns a zero-size rectangle.

`AssetPack.clipScriptTwipBounds(pose, matrix?)` connects the arithmetic to actual
parsed leaf metadata and retained `SwfClip` placements. The optional matrix maps
the clip's own coordinates into the query space; translations must be signed
integer twips. A width caller supplies the clip's own parent-space display matrix.
The clip pose must already have started/advanced. Queries do not mutate shared
placements, advance clocks or draw RNG. This boundary is ready for the separately
owned complete field query. It does not construct that query's membership.

Existing `scriptBounds`, `clipScriptBounds`, projectile/tank adapters and paint
visitors retain their continuous arithmetic and current outputs. They are not
made exact by this addition. Their synthetic continuous-transform tests remain
unchanged. Migrating them requires qualifying their own setter construction and
source call contract, rather than changing all geometry visitors at once.

The mechanism is corroborated by primary tagged Ruffle source:

- [`render/src/matrix.rs`](https://github.com/ruffle-rs/ruffle/blob/v0.7.1/render/src/matrix.rs#L170):
  float32 coefficients, matrix/Point products, integer translation and rectangle
  corners; `round_to_i32` specifies nearest/ties-even and signed/nonfinite handling.
- [`core/src/display_object.rs`](https://github.com/ruffle-rs/ruffle/blob/v0.7.1/core/src/display_object.rs#L1403):
  `bounds_with_transform` composes transforms while visiting children;
  `local_bounds`/`width` use that traversal with the object's own matrix.
- [`get_dobj_bounds`](https://github.com/ruffle-rs/ruffle/blob/v0.7.1/core/src/avm2/globals/flash/display/display_object.rs#L1017)
  uses a different operation: obtain local bounds, then transform the resulting
  AABB to the target. Tagged source is mechanism evidence, **not an identified
  source revision of the captured WASM build**.

## Original controls and before/after evidence

The opt-in `--script-bounds-audit` probe retains all 70 previous original rows
and adds 17 rows immediately before original StopFiring/probe detachment/DONE.
It reuses original mask clip1542/shape1541, puts it in two project-added empty
MovieClips, and assigns rational matrices. It does not replace an original method,
ABC payload, frame script, RNG or clock. These are controlled geometry cases,
not ordinary gameplay, natural reachability, Adobe execution or timing evidence.

Controls include positive/negative half ties with odd positive/negative integer
translations, reflected scales, quarter scales, rotations, nested translation,
nested rotation/shear, zero scale, invisible artwork and alpha zero. Prior depth
mask controls remain unchanged: the actor at900 contributes Script width1610
under all three parents despite their differing shape hits. Two added narrow
coefficients (`0.038 × 1.141` and its reflection) distinguish float32 operations
from double arithmetic rounded only at the end: original width60.4 matches the
new path. A double evaluation of already-float32 coefficients yields60.3.

The eight retained scale widths also agree through the new AssetPack boundary
using the actual extracted field1551 hierarchy and original shape metadata:

| Control               |  Continuous before | Twip API after / original |
| --------------------- | -----------------: | ------------------------: |
| Authored field        | 1381.4293167114258 |                    1381.4 |
| Four child scales0.5  |             695.95 |                       696 |
| Four child scales1    |             1391.9 |                    1391.9 |
| Four child scales1.25 |           1739.875 |                    1739.9 |
| Four child scales2    |             2783.8 |                    2783.8 |
| Root scale0.5         |  690.7146583557129 |                     690.7 |
| Root scale1.25        | 1726.7866458892822 |                    1726.8 |
| Root scale2           | 2762.8586334228517 |                    2762.9 |

These after values describe the new API, not a changed live beam result. The
radius425 adapter still finishes415 at origin5.2 where the original finishes421.
No feature or complete-game parity claim is made.

A substantive distinction must survive integration: original `width` is **not**
`getBounds(target).width` for arbitrary nested transforms. Control8 returns
width1726 but `getBounds(world)` width2728.15, because the latter transforms a
previously unioned local rectangle. Translated half-tie control6 returns width696
but `getBounds(world)` width695.95. The fixture preserves both original outputs;
only the width/height contract selects the new leaf-transform traversal. Neither
new nor legacy visitor implements the general `getBounds(target)` contract.

`tests/fixtures/script-bounds-original.json` freezes measured trace rows, input
matrices, original leaf bounds, probe digest and evidence ID. Its expected values
come from AVM2 trace/independent REA DOM, never the native candidate. The recorder
extracts declared leaf metadata from the original SWF and pairs source traces with
the emitter's input manifest. `tests/script-twip-bounds.test.ts` uses exact equality,
not epsilons. Before implementation, the first16 cases against the old continuous
visitor produced5 passes/11 failures. Final20 regressions pass, covering all17
new originals, all8 known widths, the actual AssetPack/retained-pose boundary,
integer union, no placement mutation, and empty-versus-zero geometry. No existing
assertions or suites were removed or relaxed.

## Preservation and reproduction

```sh
python3 tools/reference/beam-wrapper-probe.py ORIGINAL.swf PROBE.swf --script-bounds-audit > EMISSION.json
BT3_REFERENCE_PORT=3375 BT3_SWF_FILE=PROBE.swf bun run reference
BT3_REFERENCE_CDP_PORT=9375 BT3_REFERENCE_URL=http://127.0.0.1:3375 bun run reference:browser
BT3_REFERENCE_CDP_ENDPOINT=http://127.0.0.1:9375 BT3_REFERENCE_URL=http://127.0.0.1:3375 BT3_PROBE_OUT=CAPTURE node tools/reference/beam-wrapper-observe.ts
```

Arm the collector before navigation. Use the owned9375 page with declared REA
load/configured click, ready wait,2000ms settle, player focus, F8 and1000ms settle.
Retain canonical Evidence as `CAPTURE/scenario.json`. After collector completion:

```sh
node tools/reference/script-bounds-fixture.mjs ORIGINAL.swf EMISSION.json CAPTURE tests/fixtures/script-bounds-original.json
node tools/reference/beam-wrapper-verify.mjs ORIGINAL.swf PROBE.swf CAPTURE --script-bounds-audit
bun run format
bun run check
```

Use a capture directory in the current checkout: the verifier writes
`verified-preservation.json` into it. The new verifier mode requires exactly all
87 rows in order, matching the measured bounds fixture and its probe digest;
it retains all previous70 assertions. Missing new row, changed60.4→60.3 output
and changed module digest mutations are rejected. Original3022 tag payloads and
order, both original ABCs, header and non-document bindings are preserved, with
one additional ABC and only the document binding changed. A second emission is
byte-identical. Default and geometry-audit emissions remain byte-identical to
existing digests `cff34e6c…f69` and `83d31c7f…1046` respectively; the default43-row
verifier also passes against a locally copied retained capture.

Final probe SHA-256:
`5a881148ed5bac23582e7a77f780b142aa9ade6902e58172abf8780f645ca278`.
REA Evidence:
`ev_db664f55e165ed103052975f34abac7c277a410d8c53ed3b3ae3e3c28b44cb33`.
All declared steps complete and the independent DOM matches the collector.
REA still reports incomplete/missing events and `equality_eligible=false`.
Post-DONE CDP bytes establish the loaded viewer/three Ruffle modules and match
the installed bytes; they do not establish a compiled Ruffle source revision.
No page errors or AVM Error# failures occurred; retired-service CSP failures
remain visible. Numeric source and module identities are retained locally.

Ignored artifacts are under `test-results/script-bounds-audit/`: original
emissions, initial/final captures, source files/hashes, candidate/native results,
mutation rejections, failing-before/final check/format logs and PID/start/cmd/cwd
records. Reference ports3375/9375 were used;3385/3386 were unused. Owned launcher
2915699, initial server2915634 and final server2952241 were closed. The original
Chrome root2915729 was recorded before its observed exit; no port remains open.
No dependency was installed; the temporary node_modules link is removed before
commit. No parent .next/process or protected branch was changed.

One read-only-scope mistake is explicitly retained: an initial default-verifier
recheck was pointed at the previous research checkout's `baseline-retained`
capture, rewriting its derived `verified-preservation.json`. Its probe path was
restored to `test-results/beam-wrapper-audit/baseline.swf`; source/observation/
scenario/SWF files were not changed. A pre-write digest was not retained, so
byte-for-byte restoration of that derived result is not certified. Subsequent
rechecks use copied captures in this checkout. The incident is recorded locally
in `reference-write-incident.json`; it must not be described as no sibling writes.

Formatting and `bun run check` pass:1,007 tests /8,830 assertions, zero failures.
There is no production browser caller migration or changed browser flow in this
slice, so no production build/e2e is claimed. The numeric AssetPack integration
was checked with actual original metadata without a renderer/browser build.
Complete field integration still requires its literal affected mock/SWF e2e on
its own private ports.

## Remaining boundaries

The complete field tree, child setter lifecycle and ownership belong to the
other implementation child. Existing gameplay/creator width adapters still use
the continuous visitor. Source-backed migration of each caller, broad signed32
overflow/nonfinite inputs, general getBounds(target), scrollRect, editable text,
filter/cache/paint behavior, complete runtime populations and ordinary gameplay
remain outside this arithmetic repair. Existing shape-hit semantics are not
altered. The source code's signed/nonfinite handling is inherited from the Point
primitive, but new original controls establish reflections and small signed twip
translations, not exhaustive signed32 boundaries. No sixth layer, PR, push,
merge, deployment or installation is part of this local work.
