# Original public shape-query argument space

The distinct `root-query-*` research family begins at parent
`8c3b3894c9cc598fce4bd9fd2eea2497a3c34ea4`. In the measured Ruffle player-root
route, **public `hitTestPoint(x,y,true)` arguments are Main/root-relative**.
Supplying an actual `localToGlobal` Point applies the nonidentity root transform
again. This qualifies the finite player-root controls below; it does not qualify
the loaded-root route or migrate a production caller.

## Actual execution and discriminating controls

One declared one-frame wrapper60000 contains genuine original sprite1544,
whose geometric leaf is original shape1543. The added document class extends
original Main; it calls the original constructor, then registers its own F8
listener. F8 removes that listener and synchronously sets Main/wrapper display
properties and observes actual builtins. All pre-existing constructors, methods,
getters, frame scripts, RNG, clocks, engine code and original geometric payloads
remain unchanged. No graphics reconstruction, host-generated hit, replacement
getter, original method patch or synthesized Point result is used.

Both wrapper and original1544 are queried at supplied receiver-local Points
`(0,0)`, `(10,5)` and `(1000,0)`, in that order. They remain attached throughout
the accepted capture. Each of six phases resets all Main/wrapper setters in
X/Y/scaleX/scaleY/rotation order:

| Phase | Main requested X/Y, scales, rotation | Wrapper requested pose |
| --- | --- | --- |
| identity | 0,0; 1,1; 0° | identity |
| main1000 | 1000,0; 1,1; 0° | identity |
| main-offset | 137,-83; 1,1; 0° | identity |
| main-fraction | .07,-.07; 1,1; 0° | identity |
| main-affine | 1000,-200; 1.25,.75; 30° | identity |
| nested-affine | 1000,-200; 1.25,.75; 30° | 37,-21; .8,1.2; -30° |

`tests/fixtures/root-query-original.json` freezes **36 rows / 2,592 binary64
Numbers / 5,184 unsigned words**. Actual ByteArray.writeDouble and
readUnsignedInt provide the words, retaining signed zero. Booleans become Number
only after genuine builtin evaluation. Each row retains input, actual receiver
localToGlobal Point, Main.globalToLocal(stagePoint), Main.localToGlobal of all
three argument candidates, receiver.globalToLocal of the mapped stage argument,
receiver and Main getters, own/concatenated/Main-own/wrapper-own matrices, four
shape calls (raw/stage/root/repeated stage), and actual width/height. No bounds
hit is used as a shape oracle.

| Actual centre control, both receivers | actual stage Point | actual root Point | raw / stage / root shape hits |
| --- | --- | --- | --- |
| identity | (0,0) | (0,0) | 1 / 1 / 1 |
| main1000 | (1000,0) | (0,0) | 1 / 0 / 1 |
| main-offset | (137,-83) | (0,0) | 1 / 0 / 1 |
| main-fraction | (.05,-.05) | (0,0) | 1 / 1 / 1 |
| main-affine | (1000,-200) | (0,0) | 1 / 0 / 1 |
| nested-affine | (1047.95,-190.5) | (37.05,-21) | 0 / 0 / 1 |

The1000px control is a clear geometric miss, not an ambiguous small displacement:
original1544's Script width/height remain101; the identity far query misses,
and the incorrectly supplied stage centre maps to stage(2000,0), then actual
receiver local(1000,0). Fractional Main setters become(.05,-.05), and feeding
that stage Point maps it to(.1,-.1). Small translations therefore need not change
the Boolean. The nested centre's raw local input also misses while its distinct
root-relative Point hits, preventing “receiver-local” from being confused with
“root-relative.” Every root-relative far query misses.

## Actual root identity and bounded candidate comparison

Dictionary tokens identify retained object references, with strict identity
opcodes providing separate checks: null0, Main1, wrapper2, original1544=3,
stage4 and Main.loaderInfo5. In every row, receiver.root is actual Main;
Main.root is Main and Main.parent is actual stage. Receiver and root loaderInfo
equal Main.loaderInfo, both loader getters are null, and both loaderInfo.content
identities equal Main. Receiver.parent and stage identities match the declared
actual chain. This establishes the player-root identity through runtime getters;
the class name alone is not the root test.

Tagged [Ruffle v0.7.1 display_object.rs](https://github.com/ruffle-rs/ruffle/blob/v0.7.1/core/src/avm2/globals/flash/display/display_object.rs#L719-L760)
predicts that null-loader root branch at719–760. Its independently fetched source
SHA256 is `3830a495c32197555194d6b3fabab9f26631983cb511a9ce4b8618c18c944312`.
This source is **not authenticated as the compiled WASM revision**. The loaded-root
stage-argument branch is not executed here and remains explicitly unqualified.

The separate candidate-only `root-query-compare.ts` reads the already frozen
words. It composes measured own matrices using the existing core arithmetic and
compares Main mapping of raw/stage/root arguments, receiver forward Points and
receiver inverse Points: **180/180 exact comparisons**, using Object.is. It
never generates a hit expectation or rewrites the oracle. This supports supplying
actual root ancestry to the existing explicit public-query boundary for these
controls. It does not qualify an automatic identity resolver or production
field/circle/beam/spacing migration. The internal stage-space seam retains its
separate contract described in [the traversal reference](field-query-traversal-reference.md).

## Preservation, evidence and rejecting controls

The independent JS parser preserves all3022 original tag payloads, tag headers,
order, movie header fields, trailer, both original ABC payloads and original
non-document bindings. Only original CID0's Main binding is replaced by the
declared document subclass. The original already-expanded CWS container is
normalized to FWS with updated length. Three classified additions yield3025
tags: one DefineSprite wrapper, one glue DoABC and its wrapper SymbolClass.
The parser independently requires wrapper60000/depth1/name target/reference1544,
one frame, identity placement, no clipDepth/drawing/actions, and the exact binding.
Its separate bounded added-ABC decoder checks classes/namespaces/traits,
instruction boundaries, allowed calls/writes,144 actual three-argument shape=true
calls,2592 binary writes and5184 unsigned reads. It does not interpret original
methods or authenticate compiled runtime source.

Two fresh owned Chrome157.0.8103.38 processes, targets and temporary profiles ran
the final probe. The MutationObserver collector and durable JSONL agree with
independent final REA DOM bytes/digest. Passive post-DONE CDP script inventory
and getScriptSource bind loaded JS/WASM bytes to installed bytes, reread by the
verifier, and independently observed response identities. The viewer is likewise
checked against its response and a fresh build. Probe response identity is checked.

| Capture | Independent REA Evidence ID | Scenario JSON SHA256 |
| --- | --- | --- |
| final-a | `ev_0b3d6dbdf80719faaf4c0b8bef30d7fbf01aa035ba3617d21629a5fe236bc0ae` | `494d7a373a61fc7c48a61632ce9feeaad58643305f32265d997b6af8fc45a7a6` |
| final-b | `ev_b73171c727964fc0c9493feb1abf6fef5af966e85f8fce8cc64dd7859962a01b` | `4732cbfff320f6d00924ef815a6ba2ff59d89eeacf1eaaae7cd760fe7b6fba1e` |

All declared REA actions complete, with no page/AVM errors in final captures.
Both explicitly report missing events, incomplete and equality_eligible=false.
They are finite artifact checks, not equality certificates. Original startup
analytics/ad fetches are CSP-blocked and retained as diagnostics. Post-DONE
Debugger observation does not qualify timing or pre-observer startup.

Twenty-three fresh-copy mutations reject for each capture after an unmodified
positive control: synchronized Boolean, nonboolean, width, Point, combined
Boolean+Point forgery (including updated mapped Point fields), parent/root/loader
identity, root mapping matrix, parent class, missing row, wrapper metadata,
cohort, mutually consistent false runtime identity, DOM disagreement, original
input/ABC, non-document binding, glue ABC, shape=false call, actual timeline depth,
movie header and AVM error. Numeric forgeries update collector/raw/REA DOM and
its hash/byte count; byte forgeries update applicable emission/probe/response
hashes. Every failure is an assertion rather than an incidental import error.
Only disposable owned copies are mutated, then removed.

## Commands, fingerprints and cleanup

All local raw artifacts remain ignored under `test-results/root-query/`.
Original inputs are read-only; verifications/rejections use an owned original
copy with the supplied hash. No research-repository file is written. No prior
probe family, fixture or evidence is edited. An owned manifest verifies every
parent tracked file byte-for-byte before adding the fidelity ledger entry.

```sh
bun install --frozen-lockfile
ss -ltnp '( sport = :3975 or sport = :9975 )'
cp /home/ian/Projects/ianwijma/documented-bubble-tank-3/re/bt3/uncompressed.swf test-results/root-query/original.swf
python3 tools/reference/root-query-probe.py test-results/root-query/original.swf test-results/root-query/probe.swf > test-results/root-query/emission.json
BT3_SWF_FILE=$PWD/test-results/root-query/probe.swf BT3_REFERENCE_PORT=3975 BT3_REFERENCE_TRACE_LINES=256 bun tools/reference-player.ts
BT3_REFERENCE_CDP_PORT=9975 BT3_REFERENCE_URL=http://127.0.0.1:3975 bun tools/reference-browser.ts
BT3_PROBE_OUT=test-results/root-query/final-a BT3_REFERENCE_CDP_ENDPOINT=http://127.0.0.1:9975 BT3_REFERENCE_URL=http://127.0.0.1:3975 node tools/reference/root-query-observe.ts
```

Arm the observer before REA discovery of only9975/origin3975. The scenario tool
emits the exact request for that fresh target. REA performs click#configured,
ready wait,2s settle, player focus, F8, DONE wait and final DOM/URL capture, with
console/page-error events. Canonical Evidence is saved as final-a/scenario.json.
Close that owned browser, start a fresh one, and repeat with final-b. Target IDs
were `2750543027705A214BE6634F72C4528B` and `590C343CFEB82830C287F33CC0280DA2`.

```sh
node tools/reference/root-query-scenario.mjs TARGET_ID > CAPTURE/scenario-request.json
node tools/reference/root-query-fixture.mjs test-results/root-query/original.swf test-results/root-query/probe.swf test-results/root-query/emission.json test-results/root-query/final-a tests/fixtures/root-query-original.json
node tools/reference/root-query-verify.mjs test-results/root-query/original.swf test-results/root-query/probe.swf test-results/root-query/emission.json CAPTURE
node tools/reference/root-query-reject.mjs test-results/root-query/original.swf test-results/root-query/probe.swf test-results/root-query/emission.json CAPTURE REPORT.json
bun tools/reference/root-query-compare.ts tests/fixtures/root-query-original.json test-results/root-query/comparison.json
python3 tools/reference/root-query-probe.py test-results/root-query/original.swf test-results/root-query/reemitted.swf > test-results/root-query/reemission.json
cmp test-results/root-query/probe.swf test-results/root-query/reemitted.swf
bun test tests/root-query-original.test.ts
bun run format
bun run check
git diff --check
```

Fixture generation is explicit. Ordinary verification never overwrites frozen
words. Re-emission is byte-identical. A final comment correction removed unused
mask-family wording from the emitter; only its source fingerprint changed, and
the before/after fixture audit confirms all numeric words and probe/glue bytes
remain identical. The ignored exploratory capture is not accepted: an unnecessary
detached identity dereference produced Error1009 before DONE, so final cohorts
omit it. No new detached result is inferred; the earlier internal detached-mask
contract remains unchanged.

| Artifact | SHA256 |
| --- | --- |
| Original SWF | `f5827841c682f988f23dcf470ab4ab59c1ffc497acb4ca0f21077d03f942c153` |
| Final probe | `7b116288e45b06c19cf3564cbdd7137fcadcf5fa66da2d2dff6517423a0b286d` |
| Final emitter source | `f350c5b161e12fb80e0348de8c00fffacd4d846fb40d4e780e3aebd68ec232fc` |
| Added DefineSprite raw tag | `76f288064aa20a5c300b719403bb3d72357ec79efe4a8c3446eab388c3d5220f` |
| Added DoABC raw tag | `fc1f4ebb93a73ac858c6f849667f3ec58701556d6b57db63eacc92fcbb19fc92` |
| Added SymbolClass raw tag | `66e6b8950fc6b7bd34f692266982942ed52eaba95684e14d274221f94df1792f` |
| Loaded WASM,14302754 bytes | `1ed33b9b71a6b01b9aafafed660be343ffeb2d246c5d79e6425a32bf93e38207` |
| Loaded ruffle.js,465885 bytes | `26036a94567088dfb3de88a759e8ed10a4cea07b29500af36f345eef42420098` |
| Loaded core chunk,108322 bytes | `d27c6bdce2a34afb32e8dfa40970bc7e86cbcb912f92db7eb3e1ac70e943bd82` |
| Loaded viewer,3579 bytes | `34f10c038f3c88d6c5e747161b38ecd5bd697318a32ec82743aac796fb7945a5` |
| Both durable numeric JSONL traces | `34d3fd28755df3076dda169e640e52e172b5915643edba7762f08bc16001fadb` |

Owned process manifests retain executable, full cmdline, parent PID, startticks
and complete descendant trees. Server1190426/start4499250; final browser
controllers1190600/start4499366 and1194892/start4504580; Chrome1190763/start4499399
and1194907/start4504621. Profiles were `/tmp/playwright_chromiumdev_profile-jrua7W`
and `/tmp/playwright_chromiumdev_profile-4EqRfW`. Exploratory server/browser trees
are also recorded. SIGINT was sent only to stored owned sessions. All recorded
fingerprints have exited and3975/9975 are free. Other browsers/processes/.next
were not touched.

Five focused cases pass879 assertions; formatting/typecheck/full check passes
1201 tests /20323 assertions. No application browser flow changed; the two
fresh REA sessions validate the affected reference tooling, so application E2E
is not repeated. Parent retains PR155/156 and the five-layer master gate.
Origin master897d2e741b8a1d23f563f8bb8a2e6bd684932b9b and legacy
22d9def7321bada8a2148a69a79a3392682bb390 remain unchanged. No push, PR, merge,
watch, deployment or provider configuration operation is performed here.

Unresolved: loaded-root stage mapping; arbitrary affine/contact-boundary,
singular/nonfinite/overflow inputs; complete native/text geometry and effects;
ordinary reachability, full startup/constructor/event/global RNG ordering;
authenticated compiled Ruffle source; Adobe, pixel/audio and full-game parity.
