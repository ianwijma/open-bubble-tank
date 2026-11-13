# Original shape-query mask controls

The distinct `field-mask-*` family measures actual builtin
`hitTestPoint(x, y, true)`, Script `width`/`height`, `getBounds`, Point conversions
and reference getters in the preserved BT3 movie. **The finite runtime controls
support the changing depth latch and admit a child exactly at the mask end.**
They reject all-active-mask conjunction and inclusive end-depth clipping as a
contract for this loaded Ruffle runtime. Application traversal was unchanged by
this qualification. A later [unused traversal seam](field-query-traversal-reference.md)
implements the measured policies; the original draft stash
`73013f30bad8d3395f7c08026f60d4bda25146dc` remains historical evidence.

## Inputs and preservation

Research input is read-only
`/home/ian/Projects/ianwijma/documented-bubble-tank-3/re/bt3/uncompressed.swf`.
The prepared checkout starts at `39a7405` above `e3e92cc`. During this task the
parent reported authorized merged master `897d2e741b8a1d23f563f8bb8a2e6bd684932b9b`
(tree `e67613371458570ad8cb339c1a5f42b4dd38573d`); no rebase, ref update or master
reset was performed here. Legacy `22d9def7321bada8a2148a69a79a3392682bb390` was
not changed. PRs150–154 were parent work, not this research task.

| Input | SHA-256 |
| --- | --- |
| Original file | `f5827841c682f988f23dcf470ab4ab59c1ffc497acb4ca0f21077d03f942c153` |
| Final emitted probe | `8e9cdee399283d7fa7c534ff7404e1010b7cd196db1902ce602dfbcda669e0e0` |
| Python emitter | `857ed98f2fa457b0c962263061a149a13b06b8136ae93488c3010c9c20f0f4bd` |
| Actually loaded WASM, 14,302,754 bytes | `1ed33b9b71a6b01b9aafafed660be343ffeb2d246c5d79e6425a32bf93e38207` |
| Loaded core JS, 465,885 bytes | `26036a94567088dfb3de88a759e8ed10a4cea07b29500af36f345eef42420098` |
| Loaded Ruffle JS, 108,322 bytes | `d27c6bdce2a34afb32e8dfa40970bc7e86cbcb912f92db7eb3e1ac70e943bd82` |

The independent JS parser verifies all **3022 original tags**, their raw payloads,
tag headers and order, movie header fields, trailing bytes, both original ABC
tag payloads and original SymbolClass bindings. The sole original binding
change is document 0: `Main` → `BT3FieldMaskProbe`. Normalizing the supplied
already-expanded CWS container to FWS and updating file length are declared
container changes. Original ABC payload hashes remain
`130eef8fcef585dc1ae00f427903d11c35a79feb22e11d4e93219f987c719a1c` and
`d849764541e5f8b5b7d3b9bbdb31960ad9e47b8fd4a3e24652ccfa408c8be596`.

The **16 added project tags** are separately classified: fourteen one-frame
DefineSprite wrappers 60000–60013, one DoABC and one SymbolClass for those
wrappers. The probe has 3038 tags. Their exact hashes and independently parsed
placements are retained in the numeric fixture/proofs. The verifier parses
actual depth, clipDepth, translation, names and symbol references without
calling the emitter. It rejects undeclared placement flags, wrapper actions,
frames, tags, bindings and changed original bytes. A separate bounded ABC decoder
also checks the added glue's actual namespaces, class inheritance, methods,
instruction boundaries, calls and writes. It confirms 291 actual hitTestPoint
call sites with pushtrue/three arguments, 2522 ByteArray writes and 5044 word
reads, and restricts writes/calls to declared observation/setup APIs. It does
not interpret original methods or substitute a hit algorithm.

The added ABC defines a Main document subclass and plain MovieClip subclasses
for the wrappers. Its constructor calls original Main, then adds its own F8
listener. F8 removes that listener and synchronously constructs, parents,
reparents/removes objects, sets controlled display properties and observes
builtins. Original constructors/methods, ABCs, frame scripts, event listeners,
engine code, RNG and clocks are not patched or replaced. Startup/game code may
run normally before F8; global startup/event/RNG equivalence is not claimed.
No `graphics` reconstruction, computed host hit result, patched getter or method
stands in for a builtin observation.

Wrappers use genuine original sprite 1539 → shape 1538 for the filled circle
mask and sprite 1544 → shape 1543 for the target. Each original sprite/shape
payload is retained verbatim. Nested controls place project wrapper 60000 under
another authored mask. Actual original Bubblefield 1551, including exterior
mask 1542 → shape 1541, is a separate corroborating receiver, not the overlap
oracle. Arbitrary overlaps are project-authored controls, not asserted ordinary
encounters or reachable gameplay states.

## Measured query contract

All wrapper origins are 0,0 under Main reset to 0,0. The query Point is created
through actual `wrapper.localToGlobal(new Point(0,0))`. A shifted mask uses
x=1000; its direct own-centre query remains positive before runtime assignment.
The final field exterior control instead queries wrapper Point(500,0).

| Authored control | Actual wrapper hit | Independent direct target hit |
| --- | --- | --- |
| Mask1 depth 1/end 10 misses; mask2 depth 3/end 12 hits; target depth 5 | true | true |
| Same overlap, first hits/second misses | false | true |
| Both hit / both miss | true / false | true / true |
| Missed mask end 10; target depth 9 / 10 / 11 | false / true / true | true in all three |
| Nonoverlapping ranges 1–4 and 6–10, target 8; miss-hit / hit-miss / hit-hit | true / false / true | true in all three |
| Ancestor mask hits / misses; nested overlap-miss-hit wrapper | true / false | true / true on nested wrapper receiver |
| Authored mask `visible=false` / `alpha=0` | false / true | true / true |
| Target `visible=false` / `alpha=0` | true / true | true / true |

These observations agree with the tagged-source mutable latch at the selected
controls: a later mask hit can reset a prior miss; a later miss can block; an
ordinary child's depth equal to the latch is admitted. They **do not authenticate
the compiled source revision** or prove every tagged-source branch. The parent’s
read-only source copies under `t3-d84e5ece/test-results/field-query-traversal/`
retain the hashes listed in [the original qualification gap](field-query-mask-qualification.md).
There was no contradiction requiring a forced green result or broader scope.

Explicit runtime `target.mask = m1` is a separate object-reference mechanism:

- Before assignment the original target and mask each hit. After assignment the
  target/wrapper hit, while a direct query on the assigned mask itself misses.
  That exclusion is not missing artwork: the unassigned original control hits.
- Moving the assigned mask to x=1000 makes both target and wrapper miss. The
  target's Script width stays 101. Hidden and alpha-zero runtime masks still
  allow the target to hit when their geometry contains the Point. This differs
  from the hidden authored clipDepth mask control above.
- `addChild` reparents the mask into a different Main child. Its actual parent
  token changes 2→6, while the target's actual mask token stays 4 and its hit stays
  true. Querying that other holder misses, although its width remains 847.5.
- Removing the mask makes parent token 0; target mask token remains 4. The target
  still hits with mask x=0, and moving that **detached** mask to x=1000 makes the
  attached target miss. Actual removal did not clear or disable the reference.
- Removing the target leaves wrapper width 0 and no hit. Direct detached target
  queries miss even after `target.mask=null`, while its width remains 101.
  Reattaching it unmasked restores its hit. Do not diagnose its detached miss
  as loss of geometric content, or promise detached direct hits from local bounds.

Script bounds are not shape-query clipping. A shifted authored mask contributes
width 1474.25/height 847.5 even when the wrapper misses; overlap-miss-hit has
width 1847.5. The runtime wrapper width changes 847.5→101 only when its mask is
physically reparented away. Field 1551 width is 1381.4. Its exterior mask misses
at centre but **hits at wrapper(500,0)**, independently confirming the artwork
rather than treating the centre miss as absence. These are actual builtin
Numbers, not AABBs synthesized by the probe.

## Evidence and rejecting controls

Two fresh owned Chrome 157.0.8103.38 processes/profiles executed the **final**
97-row cohort. Each captures 2522 binary64 values, written in the movie with
`ByteArray.writeDouble`, rewound and emitted as two `readUnsignedInt` words.
Boolean results are converted to Number only after builtin evaluation. The
committed fixture deduplicates exact word pairs and retains per-row indices;
it does not regenerate expectations from decimal numbers or a candidate query.

| Final capture | REA Evidence ID |
| --- | --- |
| `test-results/field-mask/final-1` | `ev_069716d93d18cc60378b033a7d2233e0e8d7eb00d233371a5068d6100aa04dfe` |
| `test-results/field-mask/final-2` | `ev_530dab6d7bb6d782f669c4d7e69d15839260d72231958e91f96b8752045017c8` |

Both independently verified ordered MutationObserver trace, durable JSONL and
REA DOM agree exactly with the frozen fixture. CDP Debugger inventory and
getScriptSource observe loaded JS/WASM bytes, independently checked against
installed bytes and response identity. Each row also retains actual qualified
receiver/parent/Point classes, width/height, relative bounds, x/y, visibility,
alpha, repeated hit/width/height, own-centre hits, Point coordinates/round trips
and the numeric strict identity test showing a new Point rather than the input.
A Dictionary resolves actual own/parent/mask references to declared cohort-local
tokens: null 0, Main 1, wrapper 2, target 3, first mask 4, second mask 5, other holder 6.
Tokens are reused between cohorts; they are not globally unique object IDs.
`getChildIndex` is separately measured and **not mislabelled as timeline depth**;
authored depths come from independently parsed SWF records.

Both REA records explicitly remain `incomplete`, `equality_eligible=false`,
missing `events`. Full retained DOM rows are a finite artifact check, not a
complete-event comparison. No page/AVM getter errors occurred. CSP blocked
original analytics/ad/Mochibot startup fetches; those diagnostics remain in raw
captures. Route blocking also restricts traffic to the owned local origin, but
its empty denied list is not evidence of no attempted startup network calls.
Debugger attachment may perturb performance; no wall-clock/timing claim follows.

The rejector first passes an unmodified control, then rejects 21 copied mutations:
synchronized forged Boolean and nonboolean results; synchronized forged width;
parent ID, mask ID, child index, Point identity and parent class; missing row;
authored depth and mask-end metadata; forged loaded runtime; DOM disagreement;
changed original input, original ABC, non-document binding, added glue ABC,
actual project timeline depth, a forged shape=false call flag, header fields and injected AVM error. It updates
all raw/observer/DOM copies for consistent forgeries, recomputes DOM hashes and
applicable emission/response hashes. Failures are assertions, not incidental
parse/import errors. Source/runtime/production files are never swapped.

All 50 pre-existing reference-family files are byte-identical to `39a7405`.
A separate base/current emission audit reproduced all 22 older modes, including
thin-strokes, both carrier/pickup modes, all four beam modes and all four turret
flag combinations. Their emitted SWFs are byte-identical. No older mode or
capture was overwritten. Earlier 90/96-row exploratory captures under the same
ignored root remain separate and are not final-fixture evidence.

## Commands and cleanup

All paths below are relative to the prepared research checkout unless absolute.
The ignored `test-results/field-mask/` retains raw captures, requests, emissions,
proofs, rejection reports, fingerprints and validation logs. No SWF, screenshot,
raw capture, original media or dependency/build output is committed.

```sh
bun install --frozen-lockfile
ss -ltnp '( sport = :3915 or sport = :9915 )'
python3 tools/reference/field-mask-probe.py /home/ian/Projects/ianwijma/documented-bubble-tank-3/re/bt3/uncompressed.swf test-results/field-mask/probe-final.swf > test-results/field-mask/emission-final.json
BT3_SWF_FILE=$PWD/test-results/field-mask/probe-final.swf BT3_REFERENCE_PORT=3915 BT3_REFERENCE_TRACE_LINES=256 bun tools/reference-player.ts
BT3_REFERENCE_CDP_PORT=9915 BT3_REFERENCE_URL=http://127.0.0.1:3915 bun tools/reference-browser.ts
BT3_PROBE_OUT=test-results/field-mask/final-1 BT3_REFERENCE_CDP_ENDPOINT=http://127.0.0.1:9915 BT3_REFERENCE_URL=http://127.0.0.1:3915 node tools/reference/field-mask-observe.ts
```

REA `list_browser_targets` selected only origin `http://127.0.0.1:3915` through
CDP 9915. `capture_browser_scenario` performed the declared navigation, configured
load, ready wait, 2s settle, player focus, F8 and DONE wait. Its exact normalized
requests are retained in each `scenario.json.parameters`. A reproducible CLI
request emitter is provided (it does not itself control a browser):

```sh
node tools/reference/field-mask-scenario.mjs E30CF5E9456DDA07D7CA48D2A9557565 > test-results/field-mask/final-1/scenario-request.json
# For a new browser, substitute its newly discovered target ID; never reuse a dead target.
rea capture-browser-scenario test-results/field-mask/final-1/scenario-request.json --format json > test-results/field-mask/final-1/scenario.json
```

The final captures used the REA tool, not a second replay of this CLI command.
The first final target was `E30CF5E9456DDA07D7CA48D2A9557565`; after closing that
owned browser, a fresh process/profile supplied
`B9EB4C3F5A0D01745B93094533E6187E` for `final-2`. Observer output used `final-2`
on that pass. Raw/proof inputs are never appended or reused as fresh evidence.

```sh
node tools/reference/field-mask-fixture.mjs /home/ian/Projects/ianwijma/documented-bubble-tank-3/re/bt3/uncompressed.swf test-results/field-mask/probe-final.swf test-results/field-mask/emission-final.json test-results/field-mask/final-1 tests/fixtures/field-mask-original.json
node tools/reference/field-mask-verify.mjs /home/ian/Projects/ianwijma/documented-bubble-tank-3/re/bt3/uncompressed.swf test-results/field-mask/probe-final.swf test-results/field-mask/emission-final.json test-results/field-mask/final-1
node tools/reference/field-mask-verify.mjs /home/ian/Projects/ianwijma/documented-bubble-tank-3/re/bt3/uncompressed.swf test-results/field-mask/probe-final.swf test-results/field-mask/emission-final.json test-results/field-mask/final-2
node tools/reference/field-mask-reject.mjs /home/ian/Projects/ianwijma/documented-bubble-tank-3/re/bt3/uncompressed.swf test-results/field-mask/probe-final.swf test-results/field-mask/emission-final.json test-results/field-mask/final-1 test-results/field-mask/rejections-final.json
python3 test-results/field-mask/check-older-modes.py
bun test tests/field-mask-original.test.ts
bun run format
bun run check
```

Only owned 3915/9915 were used. `/proc` executable, full cmdline and stat start
fingerprints are retained in `processes-*.json` before each capture. Final server
PID 955054; first final browser controller 956825 / Chrome 956839; second 959019 /
Chrome 959057. Ctrl+C was sent only to the stored owned process sessions; each
controller closed its own browser/profile. Both ports are free after cleanup.
Neither 3875/9875 nor any resident/shared browser was used. Dependency installation
was local to this checkout; no provider or production settings changed.

Eight evidence contract tests cover the competing policies, end depth, reference
mask lifecycle, artwork controls, visibility, Script bounds and binary provenance.
Final formatting/typecheck/check passes 1,155 tests /18,862 assertions, including
8 focused cases /1,445 assertions. No production files changed.
Application E2E is not repeated: no application/production code or browser flow
changed. The two REA sessions are the affected reference-tool browser validation.
Complete field geometry/text, arbitrary mask chains/transforms, reciprocal mask
assignment, nonfinite/singular cases, ordinary reachability, global event/RNG,
Adobe Flash, pixel/audio and full-game parity remain unproved. The parent must
independently review this finite contract before migrating production traversal.


Local commit signing stalled in `/opt/1Password/op-ssh-sign` for about30 seconds.
The owned commit session was interrupted, then the explicitly authorized unsigned
fallback succeeded without changing Git/provider configuration:

```sh
git -c commit.gpgsign=false commit -m "Qualify original field mask query behavior with runtime controls"
```
