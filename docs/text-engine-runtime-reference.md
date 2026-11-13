# StaticText Engine bounds from declared twips

The distinct `text-engine-*` family qualifies a finite arithmetic contract for
original tutorial StaticText. Starting with **declared integer-twip bounds and
actual own/parent matrices**, the source-derived candidate matches **1,890
advanced-text contact controls** and **5,102 applicable matrix checks**. It never
reads Script bounds to calculate candidate Engine bounds. Actual builtin
`hitTestPoint(..., true)` supplies every frozen hit expectation.

`core/static-text-geometry.ts` exposes a pure bounds helper and internal advanced
stage gate. No renderer, browser service, simulation, native geometry provider or
field consumer selects them yet. Generic display geometry remains unchanged.

## Source and arithmetic

Primary tagged Ruffle v0.7.1 sources, retained read-only under ignored
`test-results/text-engine/source/`:

| Source | SHA-256 |
| --- | --- |
| [StaticText](https://github.com/ruffle-rs/ruffle/blob/v0.7.1/core/src/display_object/text.rs#L186-L215) | `db41714d0fbda4b35c7c29e3c6dca2273224275aa8e89519fab7bfcf83e21600` |
| [Display ancestry and bounds](https://github.com/ruffle-rs/ruffle/blob/v0.7.1/core/src/display_object.rs#L1381-L1427) | `533958d30210bc71387bbe1b8caf107597f73a2ba7bc2d7be8524bf61a323937` |
| [Render matrix](https://github.com/ruffle-rs/ruffle/blob/v0.7.1/render/src/matrix.rs#L182-L249) | `50e5c8a1e7ce7d75eeed6e6f0dd0b26d682ca2d66316a5cca1331364674bee01` |
| [Twip rectangle](https://github.com/ruffle-rs/ruffle/blob/v0.7.1/swf/src/types/rectangle.rs#L77-L82) | `ff57b9d02aa9d8613f059f080831311cf8e46b2c52b87eb31dc39c76416b41d9` |
| [MovieClip dispatch](https://github.com/ruffle-rs/ruffle/blob/v0.7.1/core/src/display_object/movie_clip.rs#L2673-L2718) | `fc229d96ab6fced20391cf810d9d89a2118803cb7f5ce48ddf6967e52e35700a` |
| [AVM public query](https://github.com/ruffle-rs/ruffle/blob/v0.7.1/core/src/avm2/globals/flash/display/display_object.rs#L719-L760) | `3830a495c32197555194d6b3fabab9f26631983cb511a9ce4b8618c18c944312` |
| [Graphic leaf](https://github.com/ruffle-rs/ruffle/blob/v0.7.1/core/src/display_object/graphic.rs#L274-L300) | `b13cd3a224b8906e082083ebcc5dfb9cfe4fb31806fcbb7505cfe4a93dd17f5a` |

These tags are **not authenticated compiled revisions**. Runtime controls support
the bounded arithmetic below; they do not certify source/WASM identity.

For a no-scroll-rect StaticText, use its declared DefineText rectangle without
applying the text/glyph matrix. Start with the actual own display matrix, then
left-multiply each ancestor from immediate parent toward the stage, excluding
the stage itself. Include Main, even when it is identity. The existing frozen
Float32 matrix product retains separate multiplication/addition rounding and
nearest/ties-even twip translation. Transform all four declared corners with
the existing frozen Point helper, including integer-twip rounding at each corner,
then take coordinate extrema. Do not transform and re-box at each ancestor.
Containment includes all four integer extrema and permits zero width/height.

Keep the query Point conversion separate: public pixel arguments undergo the
existing truncating twip write and explicit root mapping before this stage gate.
The helper accepts an already quantized **stage-space twip Point**. It does not
apply a second pixel write or infer root identity. Main0 suffices here; use the
separately [qualified player-root argument seam](player-root-field-query-reference.md)
when integrating a public query.

All original cases first reappear without changing their inputs: the previous
322 controls and all 13,524 binary Numbers match the unchanged
`text-contact-original.json` bit-for-bit. The new fixture adds 2,232 controls and
24 actual matrix getter fields per row. Each of 2,554 rows retains 66 Numbers,
for **168,564 binary64 values per capture**. The four matrices are target-own,
wrapper-own, target-concatenated and wrapper-concatenated. Six detached matrix
comparisons are explicitly outside the ancestry composition check; their actual
getter words and original miss results remain frozen.

New boundary cohorts use genuine `getBounds(stage)` getters **only to select
query inputs**, never to calculate expectations or candidate bounds. Each queries
four edge midpoints with offsets −.1, −.05, −.025, −.01, 0, .01, .025, .05 and
.1 pixels. Original1659 and both project normal/advanced copies cover identity,
fractional translation/positive scale, half-twip extrema, composed rotations and
nonuniform scales, reflection, zero X, zero Y and zero-both scales. The other
seven genuine tutorial leaves cover identity boundaries. The composed/reflected
matrices have nonorthogonal columns: these are bounded measured shear controls,
not a claim about arbitrary affine inputs or direct matrix setters.

Candidate comparisons match945 direct StaticText and945 wrapper hits. Ideal
Number extrema disagree on48 controls; transforming an AABB at every ancestor
on76; an inverse-before-leaf policy on134. For example, original1659's
fraction-scale right edge quantizes to(5634,887) twips and genuinely hits the
rounded maximum5634, while ideal Number bounds reject it. At identity,
input(−16.575,44.875) remains outside the decimal minimum−16.55 but truncates
into the inclusive minimum twip and hits. The tests retain both phenomena.
These wrong-policy comparisons are candidate-only diagnostics after freezing;
none supplies an oracle or alters a capture.

## Dispatch boundary for parent integration

The source and observations require class-specific traversal. Do not move these
rules into a shared pre-leaf mask/inverse guard:

| Condition | StaticText advanced branch | MovieClip wrapper |
| --- | --- | --- |
| Engine bounds | Declared rectangle transformed as above | Bounds include transformed descendants |
| Inverse | Returns on an advanced bounds hit before inversion | Requires world inverse before visiting children |
| Assigned runtime masker | Not consulted by tagged StaticText; measured assigned-mask-miss text still hits | Tagged MovieClip checks masker; preserve existing qualified clip/shape policies |
| Visibility | Tagged StaticText tests it only for `SKIP_INVISIBLE`; public hidden controls hit | MovieClip has its own visible/maskee exception |
| Being a mask / `SKIP_MASK` | Tagged StaticText does not inspect this flag | MovieClip explicitly excludes a maskee when this flag is set |
| Detachment | Public AVM entry rejects off-stage receivers | Same public attachment check |

Public `AVM_HIT_TEST` selects `SKIP_MASK`, without `SKIP_INVISIBLE`. The existing
public visibility/alpha/runtime-mask controls reproduce unchanged. The new
bounded zero-X, zero-Y and zero-both controls directly hit advanced line/point
bounds while wrappers and normal text miss. This does not remove shape inverse
or mask checks globally. The Graphic source still requires a world inverse and
native vector contact, and existing shape/mask qualifications remain authoritative.

**Being a StaticText mask, authored text clipDepth masks, mouse-pick options,
arbitrary mask chains/cycles and scrollRect remain unmeasured.** The source-only
flag review above must not be relabelled runtime qualification. The pure helper
implements no attachment, visibility, mask, normal-glyph or container policy.
Parent integration should choose an explicitly advanced StaticText leaf before
the common inverse/runtime-mask path, retain container-specific guards, and reject
unsupported text modes/classes. No guessed circle/AABB or normal-glyph fallback
is authorized. Complete actor/effect geometry and broad World circle/beam/spawn/
spacing consumers remain parent work.

## Preserved artifacts and independent captures

Read-only supplied input:
`/home/ian/Projects/ianwijma/documented-bubble-tank-3/re/bt3/uncompressed.swf`,
SHA-256 `f5827841c682f988f23dcf470ab4ab59c1ffc497acb4ca0f21077d03f942c153`.
All verifier/rejector invocations use an owned copy with that hash. No input or
previous evidence family is rewritten.

The independent JS parser preserves all3022 original tag headers/payloads/order,
movie header fields, trailer, both original ABCs,422 CSM records and non-document
bindings. Only CID0 changes Main to the added document subclass;16 classified
additions produce3038 tags. Original tutorial text and both derived glyph bodies
are checked independently. The only added timelines are the same declared
one-frame identity wrappers; no original constructor, frame script, builtin,
clock, RNG or engine method is replaced. Added glue calls original Main and adds
its own one-shot F8 listener, performing synchronous measurements.

The separate bounded ABC decoder verifies5,108 real three-argument shape=true
calls,7,662 Script-bound calls,168,564 actual ByteArray.writeDouble calls,
337,128 unsigned-word reads and the exact own/concatenated matrix field-read
counts. This is Number provenance and restricted glue decoding, not execution
coverage or interpretation of original ABC methods.

| Artifact | SHA-256 |
| --- | --- |
| Probe | `9d18b22352fe4cb345a01ebbbe7bf619a0daabf9db73dd36dacd7648c592b1b5` |
| Python emitter | `194164591e25f216ee322b1218bcd71eb168af7298e7bf97e3a420fd289453a0` |
| Formatted fixture | `f5dfc7fea77878932d3ab3cc64bcbda8aaf63f506e8d326668014687847ff1b4` |
| Both durable JSONL traces | `9eb4dde8ac3ca0d41b6dd4187d5a580e20ce36581cff8e5d6d9fd1eb0346b6a1` |
| Loaded WASM | `1ed33b9b71a6b01b9aafafed660be343ffeb2d246c5d79e6425a32bf93e38207` |
| Fresh-built and actually loaded viewer | `34f10c038f3c88d6c5e747161b38ecd5bd697318a32ec82743aac796fb7945a5` |

Fresh owned Chrome157.0.8103.38 processes/profiles and independently armed
observers ran both final captures. REA discovery selected only owned CDP10055 /
origin4055. REA6.7.0 CLI performed the declared load/ready/settle/focus/F8/DONE
scenarios, retaining complete Evidence JSON and independent final DOM:

- final-a: `ev_f0e776260825646eaa6c48c30b44aec0a6547d890c1b300a5a4db5de788c4d10`
- final-b: `ev_65ebfb06e555d13fccefc33286cbbd9d539dacef89d625f63b322989e79aa212`

Each REA DOM agrees with the durable raw trace and MutationObserver collector.
Passive post-DONE CDP inventory/getScriptSource binds all3 loaded JS/WASM modules
to installed bytes and independent response hashes. The probe response identity
also matches. Viewer response/source identity matches a fresh Bun build. Every
REA action completes and no page/AVM error occurs. Original startup CSP diagnostics
remain in the raw logs; an empty collector route-denial list is not absence of
attempted external traffic. REA reports incomplete/equality-ineligible, missing
events. There is no timing, full-event/global RNG, Adobe or pixel/audio claim.

Both captures pass an unmodified positive control followed by **38 synchronized
rejecting mutations each**. They cover all prior30 categories plus four actual
matrix observations, combined Point/hit fields, new boundary hits, coherent
boundary Point+hit edits and coherent own/concatenated-matrix forgeries. Applicable
observer/raw/DOM bytes, DOM digest/length, emission declarations and response
identities are updated together. Frozen binary words remain unchanged.

The first rejector attempt encountered Node's unbounded structural diff of the
2.7MB compact fixture: a forged width shifts dictionary indices across many rows.
Its subprocess was observed at97,708,472KiB RSS and subsequently exited with empty
stderr; termination cause is unestablished. No cleanup signal was sent after the
fingerprint precondition found that process had exited. The new verifier compares
SHA-256 of the entire deterministic fixture representation, preserving every
observed field with bounded diagnostics. Fresh rejection runs pass all38 controls
in both captures with assertions, rather than incidental failures. The earlier
attempt is retained separately. An initial full-check setup also found an ignored
exploratory TypeScript file in the repository-wide tsc include; it is preserved
as `.ts.txt`, with the failed log separate from final validation.

## Reproduction and validation

Use only owned4055/10055 after checking each requested port free. Do not use
shared application servers, browsers or `.next`. The observer must be armed
before running the scenario for a freshly discovered target:

```sh
mkdir -p test-results/text-engine
cp /home/ian/Projects/ianwijma/documented-bubble-tank-3/re/bt3/uncompressed.swf test-results/text-engine/original.swf
python3 tools/reference/text-engine-probe.py test-results/text-engine/original.swf test-results/text-engine/probe.swf > test-results/text-engine/emission.json
BT3_SWF_FILE=$PWD/test-results/text-engine/probe.swf BT3_REFERENCE_PORT=4055 BT3_REFERENCE_TRACE_LINES=4096 bun tools/reference-player.ts
BT3_REFERENCE_CDP_PORT=10055 BT3_REFERENCE_URL=http://127.0.0.1:4055 bun tools/reference-browser.ts
BT3_PROBE_OUT=test-results/text-engine/NEW-CAPTURE BT3_REFERENCE_CDP_ENDPOINT=http://127.0.0.1:10055 BT3_REFERENCE_URL=http://127.0.0.1:4055 node tools/reference/text-engine-observe.ts
node tools/reference/text-engine-scenario.mjs NEW_TARGET_ID > test-results/text-engine/NEW-CAPTURE/scenario-request.json
rea capture-browser-scenario test-results/text-engine/NEW-CAPTURE/scenario-request.json --format json > test-results/text-engine/NEW-CAPTURE/scenario.json
node tools/reference/text-engine-verify.mjs test-results/text-engine/original.swf test-results/text-engine/probe.swf test-results/text-engine/emission.json test-results/text-engine/NEW-CAPTURE
node tools/reference/text-engine-reject.mjs test-results/text-engine/original.swf test-results/text-engine/probe.swf test-results/text-engine/emission.json test-results/text-engine/NEW-CAPTURE test-results/text-engine/NEW-REJECTIONS.json
bun tools/reference/text-engine-compare.ts tests/fixtures/text-engine-original.json test-results/text-engine/comparison.json
bun test tests/text-engine-original.test.ts
bun run format
BT3_SWF_FILE=/home/ian/Projects/ianwijma/documented-bubble-tank-3/re/bt3/uncompressed.swf bun run check
```

Fixture generation is explicit through `text-engine-fixture.mjs` and was performed
only from owned final-a. Ordinary verification cannot overwrite frozen words.
Re-emission is byte-identical. Final checks pass **1,220 tests /60,343 assertions**;
the focused five-case cohort passes21,551 assertions. No application browser
consumer changes, so application E2E is not repeated. The affected reference-tool
browser flow has the two fresh original-runtime captures above. Both reference
screenshots remain under their capture directories.

Before the fidelity ledger addition, all873 initial tracked files remained
byte-identical. Original text-contact/root-query tools, fixtures and docs remain
unchanged. Owned process manifests retain exe, complete cmdline/stat, parent and
startticks for26 captured fingerprints, all verified gone. Server1276457,
first browser controller1276491 /Chrome1276520, second controller1280210 /
Chrome1280248 exited. Both owned ports are free. No shared browser/server/output,
master/legacy ref, remote, PR, push, watch, deployment or provider setting changes.

Remaining limits: normal glyph/other text modes, authored text masks and option
paths above, scrollRect/3D/nonfinite/overflow and arbitrary transforms, loaded-root
mapping, complete native field composition, ordinary reachability, compiled
source authentication, global events/RNG, Adobe, pixel/audio and full-game parity.
