# Retained carrier clocks and delayed engine registration

Both original carriers advance and wrap while **unparented**, including after
calling original `AddEffectToQueue`. Original `CreateEffect` preserves their
current frame. Attachment does not start a new lifetime in the observed runtime.
Completion is a later explicit engine poll against the retained clip's current
frame, rather than an attachment-relative timer.

This bounded research starts at `b2aa47b113986dacc89e1d4251c4e6e81aa72f63`.
It reads no parent draft and changes no gameplay, rendering, wrapper state, RNG,
original method or research-repository file. It does not establish Adobe or
full-game parity. The [fidelity ledger](fidelity.md) and preceding
[ownership audit](live-field-display-ownership-audit.md) remain applicable.

## Finite original-runtime observations

The distinct opt-in `carrier-clock-probe.py` appends project-authored ABC and
changes only CID0's document binding to a Main subclass. F8 constructs six actual
original clips: queued, project-held unparented, and immediately parented controls
for each carrier. `getQualifiedClassName`, total frames, zero children, stable
constructor names, `parent === null`, and `parent === registeredLayer` are sampled.
The engine uses its actual `PackageInternalNs("")._-2c` class and public methods.

| Boundary                                 | `_‑YE`, symbol1828                    | `_‑5z`, symbol1801                    |
| ---------------------------------------- | ------------------------------------- | ------------------------------------- |
| Constructor return                       | frame1, parent null                   | frame1, parent null                   |
| Original AddEffectToQueue return         | frame1, same name, parent null        | frame1, same name, parent null        |
| First ENTER1 / first EXIT1               | 1 / 1                                 | 1 / 1                                 |
| ENTER2 / EXIT2                           | 2 / 2                                 | 2 / 2                                 |
| First complete wrap while queued         | ENTER25=25, ENTER26=1                 | ENTER26=26, ENTER27=1                 |
| ENTER32, immediately before CreateEffect | frame7, parent null                   | frame6, parent null                   |
| Immediately after original CreateEffect  | **frame7**, exact top parent          | **frame6**, exact bottom parent       |
| Original Run callback                    | ENTER50 poll, frame25, still parented | ENTER52 poll, frame26, still parented |
| Following EXIT                           | detached, still frame25               | detached, still frame26               |
| ENTER70 / EXIT70 after removal           | frame20 /20, parent null              | frame18 /18, parent null              |

All three controls for each class have the same sampled root frame throughout70
ENTER cohorts: `(tick−1) % totalFrames + 1`. Both constructor boundaries precede
ENTER1; neither construction nor attachment is counted as an already observed
advance. Stage advancement is bracketed by successive event samples; this does
not locate it relative to every original Main/World listener.

The original queue is **actually called**, using a fresh original Bubblefield,
fresh BTAGameWorld, and its source-required `blnGameOver=true` gate. Glue also holds
the same references. It does **not** drain the original field queue or invoke
Field.Run/World.Run. At ENTER32 it directly calls original engine CreateEffect on
those very clips. This intentionally isolates delayed registration from unrelated
field simulation. The two additional held controls do not call the queue. Static
pcode proves the actual queue retains the supplied reference without attachment.
There is no claim that the weapon's real KillShield or `_‑AL` callback ran:
completion callbacks here are project-authored observation methods.

Original `_‑8o` registers two real MovieClip layer instances under
TopEffectsLayer/BottomEffectsLayer. CreateEffect changes X/Y from0/0 to13/23 and
14/24, changes names to effect_1/effect_2, attaches each clip to the exact respective
instance and leaves its current frame unchanged. Random rotation is false. Engine
Run is explicitly polled by glue on each ENTER32–70, with one additional poll at50;
it is not treated as an independent original ENTER_FRAME registration.

## Callback snapshot and reentrant EXIT control

The YE callback observes its original carrier parented, constructs a fresh YE,
calls controlled `gotoAndStop(25)`, and registers it through original CreateEffect.
The actual order at tick50 is:

1. First engine poll begins with top1/bottom1.
2. YE callback sees frame25 and its exact top parent.
3. `gotoAndStop` produces an extra EXIT50 delivery for the six observed clips.
   The completing YE is **still parented in this first EXIT50**.
4. Callback-born clip is registered at stopped frame25 under top.
5. First poll returns with top1/bottom1: original YE was removed, born YE remains.
6. Second explicit poll in the same ENTER cohort invokes the born callback while
   parented, then returns with top0/bottom1.
7. Regular EXIT50 observes original YE detached. The5z completes separately at52.

The full ordered matrix has860 samples:854 ordinary constructor/queue/control/
registration/ENTER/EXIT coordinates plus six reentrant EXIT50 samples. They are
retained individually. Collapsing them would erase a real parent-state boundary.
This control corroborates callback-before-detach and ready-identity snapshot
retention; it does not test arbitrary callback mutation of existing records or
runtime layer-name replacement.

## Qualified pcode and implementation consequence

All source paths here are under the read-only
`/home/ian/Projects/ianwijma/documented-bubble-tank-3/re/bt3/`.
`P:` denotes `export_pcode/scripts/`; `AS:` denotes
`export_scripts_deobf/scripts/`. Raw hashes and numbered readable excerpts are in
the capture directory. Branch chains, rather than textual decompiler order, show:

- `P:_‑0D.pcode:4166–4223`, AddEffectToQueue: gate, then original `_‑I4.push`
  stores `effectClass=getlocal1` with location/layer/rotation/callback. No addChild,
  constructor, stop/play or goto occurs on this path.
- `P:_‑2c.pcode:237–338`, CreateEffect: increment ID → `ofs0072` optional rotation
  → `ofs0069` X → `ofs0060` Y → `ofs004f` name → `ofs003f` current name lookup and
  addChild → `ofs0023` completion-record push → `ofs001b` return original input.
  There is no timeline reset or play command in that branch chain.
- `P:_‑2c.pcode:341–397`, `_‑8o`: `ofs0032` writes layer.name → `ofs001f` selects
  ordinary `_‑TU` versus text `_‑Zn` array. `_‑Z7` at691–754 scans current names
  and returns the first matching registered instance, otherwise null.
- `P:_‑2c.pcode:1225–1424`, Run: `_‑Fm` pause gate, first scan `_‑C0` using
  currentFrame≥totalFrames and snapshot ready clip identities into local1;
  only afterward does the `ofs00a4` loop invoke `_‑9p` on those identities.
- `P:_‑2c.pcode:1576–1683`, `_‑9p`: identity scan enters `ofs0073`; callback
  executes before jumping to `ofs004c`, which **rereads the indexed record** and
  resolves its **current layer name**, removes its current mc, then `ofs003b`
  clears mc and `ofs002b` splices. A stored concrete-parent removal policy alone
  is not the whole original contract.
- `P:BTAGameWorld.pcode:2010–2295`, Run: state0 dispatches `ofs01a8→ofs018d`
  interface→`ofs0179` current field→`ofs0163` next field→`ofs014f` avatar→
  `ofs0139` engine→`ofs012f` tail. State2 uses `ofs00fe` interface→`ofs00e5`
  current→`ofs00cf` next→`ofs00b9` engine→movement; state4 uses the corresponding
  `_‑4i` field chain before avatar and engine. This is static phase proof, not a
  newly measured World.Run trace.
- `AS:_‑ct/AGunShield.as:51` queues new YE with KillShield; `_‑ct/_‑YM.as:47`
  queues new5z with `_‑AL`. Carrier constructors only call super; the original
  sprites independently contain25/26 empty frames and no placed children.

A faithful implementation therefore needs a preconstructed clip identity and
stage clock before queue flush, separately from attachment and completion-record
creation. Retained unparented carriers must keep advancing, including after engine
removal while referenced. Registration must not restart a lifetime or force play.
Poll after the appropriate field/avatar phases and preserve the ready snapshot.
The old immediate pending-array attachment schedule cannot be justified as the
original queue's behavior by attachment-relative25/26-frame delays.

These observations resolve this parentless-clock question in the identified
Ruffle runtime. They do not settle the entire constructor/event/RNG schedule,
construction inside an already running ENTER cohort, source queue draining during
real weapon triggers/crossings, engine pause interaction, arbitrary callback
mutation/name collisions, or Adobe behavior. Do not claim those from this probe.

## Independent verification and exact identities

`carrier-clock-verify.mjs` reuses the existing SWF parsers independently of the
emitter. It verifies all3022 original tags retain their order and payloads except
CID0 Main→BT3CarrierClockProbe; exactly one added DoABC makes3023 tags. Both original
ABC payloads, all3018 nonbinding/non-ABC payloads, movie-header payload and every
other SymbolClass entry/order remain identical. Deterministic reemission matches.
The prior43/70/87-row default emitters are unchanged.

The verifier checks the complete ordered matrix, actual classes, stable/distinct
instance names, exact registered-parent booleans, per-frame progression across
wraps and after detach, callback boundaries and every explicit poll. Canonical
`trace.jsonl` agrees with observation.json; the final128 lines independently match
REA's retained DOM and a separate final DOM read. This independent tail is not
claimed to recover earlier historical samples.

| Artifact                            | SHA256                                                             |
| ----------------------------------- | ------------------------------------------------------------------ |
| Original uncompressed.swf           | `f5827841c682f988f23dcf470ab4ab59c1ffc497acb4ca0f21077d03f942c153` |
| Probe/repeated SWF,6403284 bytes    | `3ecefd46578426f5ce40193ed41adce60c5bf9505d1f8f137626da4127e8e5d7` |
| Emitter used for capture            | `9d6e02895813bca08f96acd11632d2f4a0a0a628a6339649d8bd3752c282ba07` |
| Original ABC payload1,9311 bytes    | `130eef8fcef585dc1ae00f427903d11c35a79feb22e11d4e93219f987c719a1c` |
| Original ABC payload2,1000022 bytes | `d849764541e5f8b5b7d3b9bbdb31960ad9e47b8fd4a3e24652ccfa408c8be596` |
| Added ABC bytes                     | `57238427f231379b760a2a758476221714962170c4e7bea33f501e65be1d0753` |
| Added DoABC payload,3765 bytes      | `36a0f5523176ca2c5afb0b19f8d1c2af8bc86dfe033ed7c21b22dfe0a87e88a2` |
| Loaded Ruffle JS                    | `26036a94567088dfb3de88a759e8ed10a4cea07b29500af36f345eef42420098` |
| Loaded core.16d61072ac7fdc4d5013.js | `d27c6bdce2a34afb32e8dfa40970bc7e86cbcb912f92db7eb3e1ac70e943bd82` |
| Loaded WASM,14302754 bytes          | `1ed33b9b71a6b01b9aafafed660be343ffeb2d246c5d79e6425a32bf93e38207` |
| Loaded reference viewer JS          | `967cffbcce1ffbf1d07001b27827f4f9107b73517a684e56ba88e58827efa164` |

Chrome157.0.8103.38, V8 `15.7.112.23`, revision
`a733b5afbb3ba618844ff8876b89ad1a774b2f18`, headless Linux with SwiftShader.
The fresh owned browser began at1100×1000; REA's connect scenario applied its
1280×720 viewport and declared default environment, with the connect-mode limits
retained verbatim. CDP-loaded JS/WASM digests match installed Ruffle0.7.1 bytes
and captured successful response-body hashes. **The compiled Ruffle source
revision is unproved.** Executable hash, boot identity, full process arguments,
PID/start fingerprints and source hashes remain in the ignored capture directory.
The observer's final try/finally and inventory-method wording were improved after
capture; its delivered source hash is not claimed as the exact earlier process.

Actual REA records are `ev_e4ed70e43c938cbcefc9eb3b09c38ff812974ee84c51788870251ff74225987d`
(target discovery) and
`ev_c6d961c3046446bb14548a1950286132f362f1bf63d6120f2ea90da3764eb4b0`
(declared Load/readiness/focus/F8/DONE scenario). All actions completed. REA marks
its event evidence **incomplete**, missing events, **equality_eligible=false**;
that limit is preserved. The project collector supplies the canonical full trace,
not an REA instruction counter. Browser page errors and AVM errors are both zero.
Retired network/CSP/loader diagnostics remain in raw console records.

Eleven rejecting mutations use only copies below this capture directory. They
reject frozen parentless clocks, registration reset, wrong parent identity,
missing ENTER samples, callback-after-detach, prematurely consumed born record,
wrong loaded WASM hash, altered independent DOM, altered original ABC payload,
altered nonbinding payload and altered carrier SymbolClass binding. No derived
verifier output was written into a sibling or research checkout.

## Repeatability, validation and cleanup

```sh
python3 tools/reference/carrier-clock-probe.py /path/to/uncompressed.swf /tmp/carrier.swf
BT3_REFERENCE_PORT=3495 BT3_SWF_FILE=/tmp/carrier.swf bun run reference
BT3_REFERENCE_CDP_PORT=9495 BT3_REFERENCE_URL=http://127.0.0.1:3495 bun run reference:browser
BT3_PROBE_OUT=reference-captures/carrier-clock-runtime BT3_REFERENCE_CDP_ENDPOINT=http://127.0.0.1:9495 node tools/reference/carrier-clock-observe.ts
```

Arm the observer before the declared external Load/F8 scenario. Use a **new capture
directory** for each run: the durable JSONL is append-only. Retain independent REA
scenario Evidence as `{discovery,scenario}` in rea-evidence.json and source-file
hash objects in source-identities.json; existing captured examples are retained.
The observer performs no inputs. Its90-second observation deadline does not alter
the SWF clock. To verify the retained run and its rejecting copies:

```sh
node tools/reference/carrier-clock-verify.mjs /path/to/uncompressed.swf /tmp/carrier.swf reference-captures/carrier-clock-runtime
node tools/reference/carrier-clock-reject.mjs /path/to/uncompressed.swf /tmp/carrier.swf reference-captures/carrier-clock-runtime
```

All captures/derived outputs live under ignored
`reference-captures/carrier-clock-runtime/`: emission/reemission, original/runtime
identities, ordered trace, observation, REA records, screenshot, verified-probe,
rejecting-controls, process fingerprints, cleanup and check/format logs. The
committed measured fixture contains numeric contracts and boundary strings only.
No SWF, media, dependency, build or capture is committed.

The preceding evidence-only checkpoint validated separately:

`bun run format` and `bun run check` pass: TypeScript,1013 tests,8881 assertions.
No production flow/rule changed, so production e2e was not required. The existing
dependencies were temporarily linked and the link removed before handoff. All14
fingerprinted owned processes are absent;3495/9495 refuse connections. The extra
preview tab was closed. Other children's ports/processes and parent draft were
untouched. Protected master tracking ref remains
`cafcebd321997a6113a3a32ce92f81f63118a4bf`; legacy refs remain
`22d9def7321bada8a2148a69a79a3392682bb390`. There were no remote actions.

## Construction inside a declared ENTER callback

The implementation continuation adds opt-in `--inside-enter` to the **distinct**
carrier-clock emitter. Default emission remains byte-identical to the preceding
`3ecefd46578426f5ce40193ed41adce60c5bf9505d1f8f137626da4127e8e5d7`
probe. The new variant constructs the same six actual original objects inside
the glue's declared ENTER1 callback, before its ENTER sample. It calls the actual
original queue and delayed CreateEffect as before. Original ABC, carrier frame
scripts, methods, RNG, clock and all nonbinding payloads remain unchanged.

| Boundary                                       | YE1828/25        | 5z1801/26        |
| ---------------------------------------------- | ---------------- | ---------------- |
| Constructor inside ENTER1; same ENTER1 / EXIT1 | 1 / 1            | 1 / 1            |
| Subsequent ENTER2 / EXIT2                      | 1 / 1            | 1 / 1            |
| ENTER3 / EXIT3                                 | 2 / 2            | 2 / 2            |
| ENTER32 CreateEffect, before / after           | 6 / 6            | 5 / 5            |
| Original Run completion while parented         | ENTER51, frame25 | ENTER53, frame26 |
| Retained, removed object at ENTER70 / EXIT70   | 19 / 19          | 17 / 17          |

The extra frame1 boundary is observed for queued, held and parented controls.
The callback-born stopped-final YE registered during poll51 survives that poll
and completes on poll52. The deliberate extra poll50 precedes this birth in the
new variant. The reentrant EXIT now occurs at51, while the completing YE is still
parented. The independent verifier checks all860 ordered samples, actual classes,
names, coordinate writes, both parent identities, all polls, original preservation,
loaded JS/WASM/Chrome identities and both independent final DOM reads. Thirteen
mutations reject incorrect birth-EXIT advance, next-ENTER advance, frozen clocks,
registration reset, parent identity, missing samples, callback ordering, early
snapshot consumption, loaded identity, DOM disagreement and payload/binding edits.
The default capture was reverified **in an owned copy**, including its eleven
rejecting mutations. No derived output was written into the evidence child.

New probe SHA256 is
`e50335883d3fa5d20fcdcecd01a646180d9de7a8a156c212e754c22337bd9e4a`;
capture emitter SHA256 is
`0e451c20da397a9f318d723499fd33bea73a93f6f97449edd75013dbaef3f863`.
The original and loaded Ruffle/Chrome identities are those pinned above and in
`tests/fixtures/carrier-enter-original.json`. REA scenario
`ev_ac5746ed2b782e38ce74880235bfd01d96fd85eaa33b3e9886e86bd75cb5ada1`
performed Load/readiness/focus/F8/DONE. Initial discovery was
`ev_a5aacb26953187c85a428135a23209415e0bb85ce3bbc4f3b0fa3f2c819bfa78`;
the retained post-run discovery is included separately. All scenario actions
completed. REA still marks events incomplete and equality-ineligible. The full
trace comes from the project observer, with the independent DOM limited to its
final128 lines. Page/AVM errors are zero; retired loader/CSP diagnostics remain raw.

Exact repeatability commands, from this isolated checkout:

```sh
python3 tools/reference/carrier-clock-probe.py /home/ian/Projects/ianwijma/documented-bubble-tank-3/re/bt3/uncompressed.swf reference-captures/carrier-enter-runtime/probe.swf --inside-enter
BT3_REFERENCE_PORT=3525 BT3_SWF_FILE=reference-captures/carrier-enter-runtime/probe.swf bun run reference
BT3_REFERENCE_CDP_PORT=9525 BT3_REFERENCE_URL=http://127.0.0.1:3525 bun run reference:browser
BT3_PROBE_OUT=reference-captures/carrier-enter-runtime BT3_REFERENCE_URL=http://127.0.0.1:3525 BT3_REFERENCE_CDP_ENDPOINT=http://127.0.0.1:9525 node tools/reference/carrier-clock-observe.ts
node tools/reference/carrier-clock-verify.mjs /home/ian/Projects/ianwijma/documented-bubble-tank-3/re/bt3/uncompressed.swf reference-captures/carrier-enter-runtime/probe.swf reference-captures/carrier-enter-runtime --inside-enter
node tools/reference/carrier-clock-reject.mjs /home/ian/Projects/ianwijma/documented-bubble-tank-3/re/bt3/uncompressed.swf reference-captures/carrier-enter-runtime/probe.swf reference-captures/carrier-enter-runtime --inside-enter
```

This resolves **this declared glue ENTER construction** in the identified Ruffle
runtime. It does not prove every global constructor/event/RNG phase, Adobe
behavior, source World.Run execution or ordinary weapon reachability. The World
phase mapping remains an inference from the qualified pcode, not a new original
gameplay trace.

## Queue and clock implementation

`RegisteredEffects.constructCarrier` gives the actual preconstructed carrier one
lazy frame accessor over its construction epoch and a monotonically increasing
numeric cohort. The engine holds only a WeakSet for idempotent construction; it
does not root every expired clip in a permanent clock registry. A retained
unparented, queued, attached, cleared or removed carrier reads its continuing
wrapping clock. Registration and removal never stop, play or reset it. The frame
setter supports existing explicit host controls; it does not represent a full
MovieClip playback interpreter.

`World.step` starts the carrier cohort before Main/world work. The final ordinary
artwork pass does not advance that same carrier cohort twice. A standalone
`World.advanceArtwork` (Main4 skipping World.Run) starts the next carrier cohort.
Thus a constructor between frames first presents1 at next ENTER/EXIT, while a
constructor during Run presents1 both at that EXIT and the following ENTER/EXIT.
Poll reads the current ENTER pose, while presented EXIT retains that same pose.
The old post-Run pending.frame increment conflated those two boundaries. Actor,
projectile, attached shield-film and menu clocks are not rewritten.

`FieldRuntime` owns an ordered queue of request records: exact original object,
supplied X/Y, layer name, random-rotation flag and callback. Its live tail flush
registers each request through the current engine name lookup; only a successful
flush replaces the queue. Appended requests survive and run in source order.
An error preserves the queue, including already attempted entries, as in the
original live indexed loop. The ordinary `effectQueue` read is now an immutable
artwork snapshot; fixture mutations use explicit `queueEffect`/`clearEffectQueue`
adapters. No array-discovery ownership fallback was added.

`scheduleShield`/`scheduleShot` construct immediately and queue through the source
weapons' explicit `objWorld.currentBFTarget` (`AS:_-ct/AGunShield.as:51` and
`AS:_-ct/_-YM.as:47`). Even next-field weapons therefore use the outgoing queue.
If that tail already ran, registration waits until its next Run. A request
explicitly queued on next instead flushes at next's tail, still resolving the
outgoing registered layer. Completion polling follows relevant field/avatar
phases; callback-born requests wait for a subsequent tail. Queueing never makes
the clip a physical child. `.pending` includes logical queued and registered
carriers; `.queuedCarriers`, `effectEngine.pendingFor`, `parent` and `owned` keep
queue, engine-record and physical ownership reads distinct. Clearing the engine
does not clear a field queue; clearing a field queue does not stop its retained
carrier clocks. On arrival, the existing completed-wrapper Deactivate branch
separately clears its unflushed queue (`AS:_-0D.as:1117–1138`, qualified
`P:_-0D.pcode:4789–4908`, `ofs0029`). An uncleared outgoing wrapper retains its
queue. A callback-born queued-carrier regression covers both arrival branches
and its continuing unparented clock. The previous ordered-ready snapshot, callback-before-remove,
indexed reread and current-name removal/error contracts are preserved.

Carrier construction consumes no gameplay random values or actor/projectile UID.
Source registration writes request X/Y and optional random rotation at flush;
later arbitrary clip edits cannot replace the supplied request scalars. Artwork
identity and other prequeue modifications remain on the original object. The core
engine imports no AssetPack, Pixi, DOM or browser services.

An identical public-API comparison against parent
`451fecab451c25e5955f40b8cd6954044b942138` retains the26-frame carrier through pause,
resume, completion and removal:

| Observation                                | Parent       | Implementation |
| ------------------------------------------ | ------------ | -------------- |
| Immediately scheduled, physically parented | true         | false          |
| Presented EXIT1 frame                      | 2            | 1              |
| Paused EXIT32 frame / physical parent      | 7 / attached | 6 / null       |
| Completion after resume                    | Run52        | Run52          |
| Held removed carrier at EXIT70             | frozen26     | wrapping18     |

The new results match the original before-ENTER measurements. The retained
command/script/results live in `test-results/carrier-queue/phase-comparison.mts`,
`before.json` and `after.json`. For ordering coverage, an artificial ready-carrier
fixture now explicitly registers before its later artwork; its original
callback-before-later-detach assertion is retained. Its callback-born carrier's
old presented frame2 becomes measured frame1 and remains physically unparented
until the next field tail. The shield-film regression's cleanup carrier at
EXIT60 changes11→10; its independent film-age/frame assertions stay unchanged.
The paused Massive fixture retains all bullet/pose assertions and now documents
EXIT25=25 followed by ENTER26=26, rather than calling the prior EXIT pose26.

Remaining limits: existing owner-death/replacement callback guards remain a
separate source gap. Ordinary effect host ages, mounted artwork timing, arbitrary
off-World stage-listener construction order, general frame-script/RNG/Adobe
scheduling, all source errors and complete gameplay/pixel/audio parity remain
unqualified. The probe does not execute original field queue draining or
World.Run. No renderer, complete field query, under-avatar sizing or handoff
change is included in this implementation.

## Implementation validation and cleanup

- `bun run format` and `bun run check` pass: TypeScript, **1,035 tests / 9,124 assertions**. Typecheck and build ran serially. Fourteen added regressions cover both construction cohorts, 70-frame parentless wraps, delayed registration/no reset, retained removed clocks, outgoing/current-name routing, next/avatar tail phases, callback-born queue retention, independent clearing, live appends, failed tails, scalar retention, conditional Deactivate and no gameplay RNG/UID consumption.
- Literal final browser command: `BT3_SWF_FILE=/home/ian/Projects/ianwijma/documented-bubble-tank-3/re/bt3/uncompressed.swf bun run test:e2e --config test-results/carrier-queue/playwright.config.mts`. Production build **`ayQyN9v03Uw-ZAqd2QVWO`** and **28 mock/supplied-SWF cases** pass; skipped/unexpected/flaky are all zero. Every browser flow asserts no page errors. All **388** saved source/tool input hashes match after final formatting.
- The ignored config uses owned3535/3536, one worker and original unmodified assertions. Its private `.spec.mts` copies change only fixture3102→3536 and the frame-paced helper import path. They cover combat/screen/Main effects, two crossing flows, forcefield ordering, mounted Massive artwork, projectile clocks/order, shape contact, independent shield mounts, special projectiles and turret protection. An initial config run used the wrong working directory and stopped before browser tests; the owned config corrected that. Subsequent complete runs were repeated after source-routing and Deactivate corrections; only the final report/build above is the delivered identity.
- Inspected finite supplied-art paint: `test-results/swf-mounted-art.png`, `swf-screen-effects.png`, `swf-shield-ownership.png` and `swf-active-crossing.png`. These are scoped fixture panels, not ordinary progression or original-runtime gameplay comparisons.
- Exact config/spec copies, baseline/after comparison, source-input hashes, build/test log, JSON browser report, `verification.json` and `cleanup.json` are under ignored `test-results/carrier-queue/`. New original observation/REA/module/source identities, trace, independent verification and rejecting copies are under ignored `reference-captures/carrier-enter-runtime/`; the default evidence recheck is under `reference-captures/carrier-default-recheck/`.
- Six identified owned process roots/browser/observer PIDs are absent;3525/9525/3535/3536 refuse connections. The dependency link is removed at handoff. No other task resources, research/evidence child files, protected refs, renderer/field-display/under-avatar tools or handoff were changed. No SWF/media/dependency/build/capture is committed, and no remote action occurred.
