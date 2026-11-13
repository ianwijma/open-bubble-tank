# Original StaticText shape contact

The separate `text-contact-*` family qualifies a finite original-runtime contract:
**original tutorial StaticText hits empty interior and rotated world-AABB corners
outside its local rectangle**. An explicit project normal-mode control misses
those Points; an advanced-mode copy matches the original. This supports the
advanced bounds branch in the loaded runtime. It does not establish an exact
Engine-bounds arithmetic implementation or authorize field-provider integration.

## Preserved input and project additions

Read-only original:
`/home/ian/Projects/ianwijma/documented-bubble-tank-3/re/bt3/uncompressed.swf`.
This checkout began at `8c3b3894c9cc598fce4bd9fd2eea2497a3c34ea4` on
`t3/qualify-static-text-contact`. No subagents were used. No master/legacy ref,
provider setting, remote, PR, deployment or shared geometry/paint file changed.
The parent owns the stack and integration.

| Artifact | SHA-256 |
| --- | --- |
| Original | `f5827841c682f988f23dcf470ab4ab59c1ffc497acb4ca0f21077d03f942c153` |
| Final emitted probe | `9d5153223e82ff7a4afa068975074ec503fd5aaa7548e3b7c9bc03681256c63a` |
| Python emitter | `3b13e174838be1178fe7a1347cabced1e21f8b08990789fffdfe795287519afd` |
| Formatted binary-word fixture | `0f674440933863b175ef2d2614c28e2e6cae2ebee33e58fa42e7e085f0f85876` |
| Emission declaration | `1c7bff4fa164e8665deddae7d6bcb500dcab4eaefbb97a2b1f165531b52b5f21` |
| Loaded WASM, 14,302,754 bytes | `1ed33b9b71a6b01b9aafafed660be343ffeb2d246c5d79e6425a32bf93e38207` |
| Loaded core JS, 465,885 bytes | `26036a94567088dfb3de88a759e8ed10a4cea07b29500af36f345eef42420098` |
| Loaded Ruffle JS, 108,322 bytes | `d27c6bdce2a34afb32e8dfa40970bc7e86cbcb912f92db7eb3e1ac70e943bd82` |
| Loaded viewer JS, 3,579 bytes | `34f10c038f3c88d6c5e747161b38ecd5bd697318a32ec82743aac796fb7945a5` |

The independent JS verifier walks **3022 original tags**, preserving every raw
payload, tag header and order, movie header fields, trailer, both original ABCs
and all non-document bindings. Only document CID 0 changes `Main` to the added
`BT3TextContactProbe`. The existing validated expanded-CWS input is normalized to
FWS in memory and the output file length changes. Original ABC payload hashes are
`130eef8fcef585dc1ae00f427903d11c35a79feb22e11d4e93219f987c719a1c` and
`d849764541e5f8b5b7d3b9bbdb31960ad9e47b8fd4a3e24652ccfa408c8be596`.
All 422 original CSM records are unchanged. An independent body decode pins
renderer 1/grid 2/thickness 0/sharpness 0 for original texts 1659–1666 and records their
actual tag payload hashes, CSM hashes and integer-twip bounds in the fixture.

There are **16 added tags**, for 3038 total: two derived DefineText2 tags, two CSM
records, ten one-frame DefineSprite wrappers 60000–60009, one DoABC and one
SymbolClass. Wrappers 60000–60007 place genuine original texts 1659–1666 at depth 1,
named `target`, with identity placement matrices. The text leaves report actual
`flash.text::StaticText`, not a project replacement class. Wrappers 60008/60009
place **PROJECT-owned derived** texts 61000/61001. Their text payload after CID is
byte-identical to original1659, retaining its font 361, glyphs, text matrix,
colors and bounds. New settings explicitly select normal 0/advanced 1, grid 2 and
zero floats. Original settings are never mutated. The derived comparison does
not claim that any original tutorial leaf uses normal mode.

The added document subclass calls the unchanged Main constructor and installs
one F8 listener. F8 removes its own listener, resets Main x/y to 0, and constructs,
attaches, transforms, queries and removes the declared controls synchronously.
Every row measures Main x/y/rotation 0 and scaleX/scaleY 1. It never patches original
ABCs, constructors, frame scripts, listeners, clocks, RNG, hit/getter functions
or engine code. Original startup can run before F8. No graphics calls, raster
alpha, host-computed contact or replaced getter supplies a result.

The independent bounded ABC decoder finds **644 actual shape=true hitTestPoint
calls**, 966 getBounds calls, 13,524 ByteArray writes and 27,048 word reads. It
checks pushtrue and three arguments at each hit call, class inheritance,
instruction boundaries and restricted calls/writes. It is not a general AVM
interpreter and does not authenticate the Ruffle compiled source revision.

## Measured contact and objections

Each of 322 ordered rows freezes 42 values as actual AVM `ByteArray.writeDouble`
output, rewound and emitted through two `readUnsignedInt` calls. The fixture
deduplicates 157 exact binary64 pairs; per-row indices refer to those original
words, never candidate geometry or decimal-derived expectations. Results include
repeated hit/width/height reads, x/y/scale/rotation/visibility/alpha, actual
relative/local/world Script bounds, input and resulting Point coordinates,
round trips, strict Point identities, parent/mask references and child index.
Qualified class names come from actual builtin objects. `getChildIndex` is not
timeline depth: the latter is independently decoded from placements.

A Dictionary resolves actual references to cohort-local tokens: null 0, Main 1,
wrapper 2, text 3, original mask 4. They are reused between cohorts, not global IDs.
For local queries a new Point is passed to actual `target.localToGlobal`; the
returned Point differs by strict identity. For world queries the actual input
Point is used directly and identity is true. `globalToLocal` always returns a
separate Point in this cohort. Their values and identity Booleans are binary
observations, including singular-case outputs; they do not prove inverse
availability for all singular transforms.

- All eight original leaves and their wrappers hit their local-bounds centre
  and minimum corner, and miss the selected outside-right Point.
- Original 1659 at local Point(-16,80) hits. This lies inside its declared bounds
  [-16.55,278.85] × [0.75,89]. The identical normal-mode derived text misses;
  advanced 61001 hits. A separate Point(131.1,44.85) hits in all three modes,
  positively establishing usable glyph geometry in the normal control.
- Direct world queries on the selected baseline minimum/maximum corners and
  four edge midpoints hit; the selected one-twip-outside controls miss. Exact
  input words matter. For example, the direct maximum x is
  278.84999999999997. Passing that same input through `localToGlobal` yields 278.8.
  Neither query path is replaced with a host transform or ideal decimal value.
- Parent translation(123.25,-47.5), scale(1.5,0.5), parent rotation 37°, leaf
  rotation 37°, and a nested reflection/nonuniform-scale/rotation control retain
  the discriminating behavior. With parent rotation the world-near-min Point
  is(77.65,-61.15), with measured local round trip(-29.75,33.05), outside the
  original x minimum -16.55. With leaf rotation it is(-65.8,-8.35), returning
  (-57.6,32.95). Both original/advanced leaf and wrapper hit; normal misses.
  A nested case returns local(31.7,-17), outside y minimum 0.75, and still hits
  original/advanced. These exclude an inverse-local-rectangle or glyph policy
  for the measured original advanced contact. Selected world-AABB exterior
  Points miss in all modes.
- Text and wrapper visibility=false or alpha=0 retain contact. Actual text
  removal makes both text and empty wrapper miss while text width remains 295.4;
  reattachment restores the hit. Removing the wrapper from Main makes both miss;
  restoring the wrapper restores both. Bounds alone do not confer attachment.
- A runtime-mask control retrieves actual original field 1551's
  `effect_mask_under` (sprite 1539 → shape 1538), reparents it into the wrapper and
  retains its actual mask token 4. Before assignment this mask directly hits
  (-16,80); shifted to x 1000 while unassigned it misses. After assignment the mask
  itself is excluded. **Original StaticText and wrapper continue to hit with
  this mask assigned and shifted to x 1000**, also with hidden/alpha-zero mask.
  Clearing the reference gives token 0 and preserves the hit. This differs from
  the MovieClip target in the older unchanged field-mask family. Applying the
  existing generic runtime-mask exclusion to this text receiver would contradict
  these observations. This is a parent integration objection requiring explicit
  review; no shared traversal change is made here.
- With wrapper scaleX=0, original and advanced StaticText directly hit the
  measured collapsed-line Point(0,44.875); their wrappers miss. Derived normal
  text misses. World Script width is 0. These bounded observations do not license
  a universal inverse, singular wrapper policy or finite/nonfinite fallback.

The tagged [v0.7.1 text implementation](https://github.com/ruffle-rs/ruffle/blob/v0.7.1/core/src/display_object/text.rs#L191)
predicts a world Engine-bounds gate followed by immediate advanced success and
normal glyph traversal. The read-only source copy retained under this task's
ignored root has SHA-256
`db41714d0fbda4b35c7c29e3c6dca2273224275aa8e89519fab7bfcf83e21600`.
The measured rotation and mode controls support this branch distinction. Loaded
WASM identity does not prove it was built from that tagged source.

**Exact Engine-bounds arithmetic remains unqualified.** The public getter here
is Script `getBounds(stage)`, used to select actual Point arguments; it is not an
Engine-bounds getter. No independently authenticated Engine-bound calculator has
been compared at fractional transformed extrema, hierarchy-dependent union
rounding, arbitrary shear, alternate stage transforms or all singular cases.
LocalToGlobal's observed quantization demonstrates why ideal Number AABBs are
insufficient. No pure helper or speculative glyph/circle/alpha fallback is added.
The result establishes finite native contact and excludes concrete wrong
policies; it does not force complete field geometry green.

## Two fresh captures and rejection

Both final captures used fresh owned Chrome 157.0.8103.38 processes and temporary
profiles, independently armed observers, newly discovered CDP targets and the
same final probe. Both durable JSONL streams are byte-identical:
`2bfd0404889b15b924024eedd157815116795cecc34cdbd50016098bff29a262`.

| Capture | REA Evidence ID | Raw observation SHA-256 | REA scenario SHA-256 |
| --- | --- | --- | --- |
| `test-results/text-contact/final-1` | `ev_4e6e1cb3deadbe6fe4df03148830fcd60b737f8776c011225019ce80feb0b906` | `19fa48ff9e1468356c888ca5e45007cb3ea28fae54cedd1410a868b29c51fd84` | `e17773019695e5ef8f832b23876343fed0fceafdb6dd1dd61586d84ddfcc9820` |
| `test-results/text-contact/final-2` | `ev_1bea9ec1f5e7fa105a709cc23222fe9daf7e8b5bd6730059456ed4700cdc8290` | `d2a49eb9255afffdadac530f4935364781d8e7d204f435bd63b1eca88b3ca677` | `16f564bdde781a12f6ef18f2663a09bf80c2e8054699c7e105118414fc5b139c` |

REA performed the declared navigation/load/ready wait/2s settle/focus/F8/DONE
scenario. Complete ordered trace rows from each independent REA final DOM agree
with the MutationObserver and durable raw file and the frozen fixture. Passive
post-DONE CDP Debugger inventory/getScriptSource independently observes loaded
JS/WASM, checking both installed bytes and captured response hashes. No loaded
byte identity is inferred from the package label alone. DOM evidence verifies
finite retained artifacts, not complete events or Adobe behavior. Both REA
records explicitly say `incomplete`, `equality_eligible=false`, missing `events`.
No page/AVM getter error was observed. Original startup analytics/ad/Mochibot
requests hit the unchanged viewer CSP; those diagnostics remain in raw logs.
Empty route-denial lists do not establish no attempted external requests.
Debugger attachment can perturb performance; no timing or frame-clock claim
follows. Earlier `explore-1` is separate and is not final-fixture evidence.

The rejector passes an unmodified control, then rejects 30 copied mutations:
synchronized hit/nonboolean/width/parent/mask/index/Point identity/Point value/
bounds/Main/class forgeries, missing sample, DOM disagreement, depth metadata,
derivative classification, forged loaded runtime identity, injected AVM error,
original input/ABC/text/CSM/order/binding changes, derived glyph payload/mode,
added glue, actual shape=false call, actual placement depth and movie header.
Applicable raw/observer/DOM copies and digests, emission declarations and response
hashes are updated together. Failures are assertions, not incidental import
errors. No installed runtime or original/production source is swapped.

## Reproduction, validation and cleanup

Only ports 3995/9995 belong to this task. Check they are free before each new owned
server/browser. No `.next`, application dev server or other CDP port was inspected. The shared preview navigation failed twice with
`ERR_CONNECTION_REFUSED` before server startup; its owned error tab was closed.
All substantive capture work used the requested owned REA browser.

```sh
bun install --frozen-lockfile
ss -ltnp '( sport = :3995 or sport = :9995 )'
mkdir -p test-results/text-contact
python3 tools/reference/text-contact-probe.py /home/ian/Projects/ianwijma/documented-bubble-tank-3/re/bt3/uncompressed.swf test-results/text-contact/probe-final.swf > test-results/text-contact/emission-final.json
BT3_SWF_FILE=$PWD/test-results/text-contact/probe-final.swf BT3_REFERENCE_PORT=3995 BT3_REFERENCE_TRACE_LINES=1024 bun tools/reference-player.ts
BT3_REFERENCE_CDP_PORT=9995 BT3_REFERENCE_URL=http://127.0.0.1:3995 bun tools/reference-browser.ts
BT3_PROBE_OUT=test-results/text-contact/NEW-CAPTURE BT3_REFERENCE_CDP_ENDPOINT=http://127.0.0.1:9995 BT3_REFERENCE_URL=http://127.0.0.1:3995 node tools/reference/text-contact-observe.ts
```

Arm the observer before performing the REA scenario. Discover only origin 3995
through REA `list_browser_targets` at CDP 9995. Emit a request using the newly
returned target; never reuse a dead target. The emitter only writes the request,
not browser actions. Execute it with REA and retain the complete returned Evidence
record as `scenario.json` in that fresh directory:

```sh
node tools/reference/text-contact-scenario.mjs NEW_TARGET_ID > test-results/text-contact/NEW-CAPTURE/scenario-request.json
rea capture-browser-scenario test-results/text-contact/NEW-CAPTURE/scenario-request.json --format json > test-results/text-contact/NEW-CAPTURE/scenario.json
```

The actual captures used the REA tool. The first target was
`98CDFFEAD15C34EA4F1445B625679356`; after its browser closed the fresh second was
`2E9B995343992292924CE37B817D7AB3`. Retained requests and Evidence parameters pin
these exact actions. The frozen fixture is generated only from owned capture 1;
then both captures independently verify against it:

```sh
node tools/reference/text-contact-fixture.mjs /home/ian/Projects/ianwijma/documented-bubble-tank-3/re/bt3/uncompressed.swf test-results/text-contact/probe-final.swf test-results/text-contact/emission-final.json test-results/text-contact/final-1 tests/fixtures/text-contact-original.json
node tools/reference/text-contact-verify.mjs /home/ian/Projects/ianwijma/documented-bubble-tank-3/re/bt3/uncompressed.swf test-results/text-contact/probe-final.swf test-results/text-contact/emission-final.json test-results/text-contact/final-1
node tools/reference/text-contact-verify.mjs /home/ian/Projects/ianwijma/documented-bubble-tank-3/re/bt3/uncompressed.swf test-results/text-contact/probe-final.swf test-results/text-contact/emission-final.json test-results/text-contact/final-2
node tools/reference/text-contact-reject.mjs /home/ian/Projects/ianwijma/documented-bubble-tank-3/re/bt3/uncompressed.swf test-results/text-contact/probe-final.swf test-results/text-contact/emission-final.json test-results/text-contact/final-1 test-results/text-contact/rejections-final.json
bun test tests/text-contact-original.test.ts
bun run format
BT3_SWF_FILE=/home/ian/Projects/ianwijma/documented-bubble-tank-3/re/bt3/uncompressed.swf bun run check
git diff --check
```

Ignored `test-results/text-contact/` retains emissions, raw captures, source copy,
proofs, artifact hashes, rejecting controls and validation logs. No SWF, extracted
image/audio or dependency/build output is committed. All 150 pre-existing tracked
reference/fixture/docs files retain their pre-task SHA-256. The complete original
tag preservation check also covers all original definitions outside this cohort.

Exact `/proc` exe, full cmdline, stat and start-tick fingerprints are retained
in `processes-final-1.json` and `processes-final-2.json`. Final server PID 1202395
(start 4512676); first browser controller 1204194(start 4514936),
Chrome 1204234(start 4514970); second controller 1209816(start 4519435),
Chrome 1210267(start 4519516). Ctrl+C was sent only to stored owned process sessions;
each controller closed its own browser. Both owned ports are free after cleanup.

Nine focused evidence tests pass 18,447 assertions. Formatting, TypeScript and the supplied-original full check pass **1,205 tests /
37,891 assertions** across 163 test files. Application E2E is not repeated: no production
application code or browser flow changed, and no application server/build is
started under this task's port/output restrictions. The affected reference-tool
flow is validated by the two fresh complete finite-cohort REA sessions.

Remaining limits include exact Engine-bound arithmetic, broader glyph/mode
coverage, authored text clipDepth masks, arbitrary runtime-mask chains and cycles,
singular/nonfinite transforms beyond the one bounded zero-scale control, public
root-coordinate mapping, ordinary reachability, global event/RNG equivalence,
Adobe Flash, pixel/audio and full-game parity. No `AssetPack.hitClip`, field
provider, shared display geometry/traversal, gameplay or paint integration is made.
