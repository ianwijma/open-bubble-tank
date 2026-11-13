# Original retained actor and mounted artwork clocks

The observed original actor trees keep advancing after their field ancestor is
removed and after the actor itself is removed. A directly removed mounted root
also retains independently advancing descendants. Restoring the same objects does
not restart their mounted frames. This qualifies the actor-specific question in
[the artwork boundary audit](actor-artwork-query-boundary.md), in the identified
Ruffle runtime. The reconstruction's existing attached-field-only `artAge` policy
is therefore insufficient for these retained references. This commit contains
new evidence/tools/tests only; it changes no production clock or existing fixture.

Prepared base: `e7e4b00b0f0c5aa5be285c75592126c119689bc3`. Read-only original:
`/home/ian/Projects/ianwijma/documented-bubble-tank-3/re/bt3/uncompressed.swf`,
SHA256 `f5827841c682f988f23dcf470ab4ab59c1ffc497acb4ca0f21077d03f942c153`.
The [fidelity ledger](fidelity.md) still applies; actor/global/Adobe/full-game parity
is not established.

## Genuine actors and explicit controls

`actor-clock-probe.py` adds one separate ABC and changes CID0 Main to a subclass.
It leaves original constructors, frame scripts, RNG, builtins and engine methods
unchanged. It constructs a genuine BTAGameWorld and Bubblefield, supplies the
field's `gWorldRef`, calls original `Setup(Main)` and retains the original
`enemyLayer_mc`. These dependency/parent assignments are glue. Neither the probe's
world nor its actors are registered to execute gameplay Run; the added ABC has
no actor, World, field or effects-engine Run calls. Their invocation counts are
not independently instrumented. Original Main/startup activity is outside that
claim. Observed NPC state remains `intState=1`, life2, ID `E10000033`, zero primary
weapons throughout. It is a living object without measured gameplay execution.

Original `TankData._-Tr` constructs all three trees:

| Label                  | Original construction                                                       | Authored contents                                                                       |
| ---------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `before:controlled`    | F8, original AddTankObject records, `_‑Tr(0,world)`                         | Wiggle Cluster1501 at Y−20 and Y+20; Rotating Machine Gun4015 at X30; scales1/rotation0 |
| `before:npc`           | F8, original `_‑HJ.getInstance()._‑UH[13]`, ImportTankData, `_‑Tr(3,world)` | Built-in Floaty, E10000033; three Small Bubbles1001 and Medium Dark Bubble1102          |
| `inside:mount-control` | Same controlled design constructed inside declared ENTER1                   | Same actual catalog children; outer stays under a separate attached anchor              |

The controlled data records are deliberately artificial. Part roots and their
children are actual catalog classes, not synthetic timelines or replacement
constructors. MovieClip outer roots have observed currentFrame0/totalFrames1;
this says nothing about the clocks of their authored children.

The finite sequence is:

1. Attach the first two actors to the original field layer. The inside-ENTER actor
   attaches to the separate anchor. Sample constructor return and addChild return.
2. ENTER111: call original uncleared-field `Deactivate`; sample its return, then
   remove the field from World through **glue**. Actors keep that original layer
   as their direct parent. Separately remove the inside actor's actual rotor from
   the still-attached actor through **glue**; retain that exact mount strongly.
3. ENTER221: **glue** reattaches the same field and the same removed mount.
4. ENTER331: **glue** directly removes the first two actual actors from the layer.
   Their mounted children retain their respective actor as parent.
5. ENTER441: construct a **glue cache record** `{mc: actualNpc,xLoc:13,yLoc:23,rot:0}`
   and execute original field `_‑G0(records,Main)`. It restores the same NPC into
   the actual layer and `arrEnemies`, writes13/23, and preserves every sampled
   mounted object/frame. The controlled mode0 outer is separately re-added by
   **glue**. Continue through ENTER/EXIT550.

This is actual `_‑G0` execution, not an addChild labeled as cache restoration.
Original World `_‑4j` departure, actual cache creation/lookup, travel, destruction,
and normal arrival remain unexecuted. Floaty has no primary weapons, so `_‑G0`'s
primary-target redirection branch is not exercised. `BT3_ACTOR_CLOCK_RESTORE`
records `true false`: true is exact `arrEnemies[0] === npc`; false compares its
callback to the field's **public** `TankCallback` lookup. The original method is
private, so that comparison cannot authenticate the original private closure.
It is retained as a failed diagnostic, not evidence that SetCallback failed or
that callbacks are equivalent. No private callback is invoked by the probe.

## Frames, phases and retained correspondence

Both fresh captures agree on these Wiggle-negative frames. Each column is a
literal ENTER sample; detachment/reattachment operations occur afterward.

| Cohort        | ENTER1/2/3 | 111 | 150 | 200 | 220 | 221 | 331 | 400 | 440 | 441 | EXIT550 |
| ------------- | ---------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | ------- |
| F8 controlled | 1/2/3      | 13  | 3   | 4   | 24  | 25  | 37  | 8   | 48  | 49  | 11      |
| Inside ENTER1 | 1/1/2      | 12  | 2   | 3   | 23  | 24  | 36  | 7   | 47  | 48  | 10      |

The F8 positive-Y cluster returns from construction at1 and ENTER1 is1; EXIT1
is51. ENTER50 is100 and EXIT50 is51. The negative-Y cluster's ENTER50 is50 and
EXIT50 is1. Actual source jumps consume these boundaries; assuming a simple
50-frame age modulo would be wrong. Each110-cohort state window spans more than
two observed cluster wraps and multiple40-frame descendant boundaries. Initial
construction inside ENTER shows the additional frame1 hold at ENTER2. These
local samples do not locate every constructor or listener in the full game.

The original rotating-gun root (`_-ct::_-KE`, symbol701) stays frame1/total2.
Its original frame1/frame2 scripts call `stop()`. Its40-frame bubble descendants
continue. For the inside actor, the removed rotor is Dictionary ID30; retained
child31 remains parented to it while the rotor itself has null parent. Example:

| Sample        | ENTER110 | 111 before removal | 150 detached | 200 detached | 220 detached | 221 before re-add | 222 reattached | 550 |
| ------------- | -------- | ------------------ | ------------ | ------------ | ------------ | ----------------- | -------------- | --- |
| Run A child31 | 36       | 37                 | 36           | 16           | 36           | 37                | 38             | 37  |
| Run B child31 | 14       | 15                 | 14           | 29           | 12           | 13                | 14             | 22  |

Its own root remains1 throughout. Stopping a root does not freeze all descendants;
ancestor detachment, own removal and source stop operations are separate states.
Bubble frame1 scripts retain their original `Math.round(Math.random()*10)` and
`gotoAndPlay` calls. No RNG source or seed is replaced, and repeated equal states
are not treated as a complete count of random draws.

Builtin Dictionary object keys assign stable IDs. Strong per-tree arrays retain
all39 encountered MovieClips. Every selected snapshot walks current getChildAt
order, then reads those retained references independently, including the absent
mount. Shapes are deliberately excluded from the registry; current child counts
still include them. No null child lookups occurred in these captures. This does
not resolve transient geometry lookup holes in other families.

Each row keeps class, direct-parent Dictionary ID, parent-null flag, actual
`stage !== null`, raw name, current/total frame and child count. Twelve own-pose
Numbers (X/Y/scales/rotation/alpha and matrix a/b/c/d/tx/ty) come directly from
original getters through builtin ByteArray.writeDouble/readUnsignedInt. Frozen
hex words preserve every bit; no recreation pose is an oracle. Only auto-generated
`instanceN` names normalize across captures; raw identities/names remain checked
within each capture. Generic outer frame0 is preserved, not changed to1.

Original frame-script goto calls produce reentrant EXIT deliveries, including30
complete actor snapshot deliveries at tick1 in run A and33 in run B. All repeated
rows stay ordered in the frozen fixtures. ENTERs are independently checked once
per declared window, and every declared action coordinate is required. The two
contracts deliberately differ; event/RNG equality is not claimed.

The initial development run attempted the legacy `isPlaying` getter. The sealed
rotor threw ReferenceError #1069; that failed scenario remains ignored under
`dev-a`. The final probe never reads that getter and records `not-read`. Source
stop calls plus measured frames establish the limited playback result. An earlier
40-second DONE timeout also remains under `dev-b`; final90-second scenarios both
complete. Neither development run is an oracle.

## Source and independent evidence

All source paths are under the read-only original directory above. The audit
hashes45 original AS, deobfuscated AS and qualified pcode files, including every
bound MovieClip class reachable from these chosen parts. Important paths:

- `export_scripts/scripts/TankData.as:429–570`: AddTankObject, actual `_‑Tr`
  construction/setters/addChild and role registration. Mode0 avoids gameplay
  registration; mode3 creates original EnemyAI and its source initialization.
- `export_scripts/scripts/BTAGameWorld.as:313–364` and qualified pcode `_‑4j`
  beginning1055: remove old field while caching actual `mc` references.
- `export_scripts/scripts/_‑0D.as:128–169,1117–1137` and qualified pcode `_‑G0`
  beginning371: restore actual cached objects, and uncleared Deactivate retention.
  Pcode resolves the decompiler's misleading loop order; no mounted reconstruction
  or stop/play command occurs in that restore path.
- `export_scripts_deobf/scripts/_‑MQ.as`: source Y branch and frame50/frame100
  gotoAndPlay loops. `_‑ct/_‑KE.as`: original root frame1/frame2 stop scripts.
  `BubbleTanks3_fla/componentbubbleyellow_65.as`: original random child jump.
- `export_scripts/scripts/EnemyAI.as:13–26`, `_‑Zx.as:581–648,1035–1038`:
  living setup and callback setter. No gameplay Run is measured by these excerpts.

Exact per-file hashes, part/symbol/frame bindings and the original encrypted-code
hash for Floaty are frozen in both JSON fixtures. Canonical JSON audit SHA256 is
`67d40c0ac56156212d5cdf1736e5ad3a5b471b2f3fc41f8430a1d23afd1d71ea`.

The separate JS verifier independently parses all3022 original tags, header
payload, tag headers, ABC payloads and order. They are identical except CID0's
document binding. Every non-document binding and its order remains identical.
One classified added DoABC yields3023 tags. It checks deterministic reemission,
source bytes, all frozen rows/words, original probe loading and runtime identity.
It writes derived proofs/reemissions only into the caller-owned capture copies.

Both observers arm before external input in separate fresh owned Chrome
processes/capture directories. Actual REA performs declared Load/readiness/3s
startup/focus/F8/DONE actions. Independent retained REA DOM agrees with the last
4096 raw trace lines of each collector. This corroborates that tail, not earlier
history; the durable project trace is the earlier-history source. Captures are:

| Capture | REA scenario                                                          | MovieClip rows | Binary Numbers |
| ------- | --------------------------------------------------------------------- | -------------- | -------------- |
| A       | `ev_f228e97a78ffe6de67e18f682cda1ec058f9f871591e25ecc27b2edb522558f0` | 27,972         | 335,664        |
| B       | `ev_194ad68f0195bc960c96470edc488a0234de4b5dc37bc2c066e7f12ef6618720` | 28,372         | 340,464        |

Both REA records explicitly report **incomplete events**, missing `events`, and
**equality_eligible=false**. Both have zero recorded page/AVM errors. Retired
network/CSP diagnostics remain. CDP inventory/getScriptSource obtains actual
loaded JS and WASM bytes, compared against captured successful HTTP responses and
installed bytes, rather than accepting package names as runtime identity.

| Artifact               | SHA256                                                             |
| ---------------------- | ------------------------------------------------------------------ |
| Probe, both captures   | `29125140589eb1dbff66e1715e459996ab18f84db7381de2ef49e132cdae9bae` |
| Exact Python emitter   | `ef77a8956150b12e11603da4083ea01adca5c4a39baf5f59f4981ab37e64e96f` |
| Added glue ABC         | `e3953d1725a03e6c6c91eaf2371acb7062ccfea90adaa9251166e9860cda2c04` |
| Original ABC payload1  | `130eef8fcef585dc1ae00f427903d11c35a79feb22e11d4e93219f987c719a1c` |
| Original ABC payload2  | `d849764541e5f8b5b7d3b9bbdb31960ad9e47b8fd4a3e24652ccfa408c8be596` |
| Loaded Ruffle JS       | `26036a94567088dfb3de88a759e8ed10a4cea07b29500af36f345eef42420098` |
| Loaded core JS         | `d27c6bdce2a34afb32e8dfa40970bc7e86cbcb912f92db7eb3e1ac70e943bd82` |
| Loaded WASM            | `1ed33b9b71a6b01b9aafafed660be343ffeb2d246c5d79e6425a32bf93e38207` |
| Loaded actor viewer JS | `a08396339b282d4edadc2d36a20fbcd1fe6707a6f8af0fc066ca5005b426859e` |
| Fixture A              | `f0b285c62a0c9e6f45504c9148ed9ece2250cb9d8af3445eac8551aa2c8ac71f` |
| Fixture B              | `30b552684e3a1990ab6e9ec213c5488f7beb72e47e6cacc97ebf4cd1e6385e88` |

Chrome157.0.8103.38 / V8 15.7.112.23, revision
`a733b5afbb3ba618844ff8876b89ad1a774b2f18`, headless Linux/SwiftShader,
Ruffle package0.7.1. REA changes the initial1100×1000 viewport to its declared
1280×720 default. Loaded compiled Ruffle source revision is **unproved**; package
version, recovered Rust source or newer engine behavior cannot substitute for
these loaded bytes. No Adobe execution, pixel or audio comparison occurred.

Twenty rejecting mutations pass for each capture in owned copies. Semantic
mutations update raw JSONL, observation and independent DOM tail together; frozen
provenance still rejects changed birth holds, ancestor/direct-detach freezes,
restore resets, stopped-root play, removed-child clocks, IDs, parenting, poses,
playing claims, reentrant EXIT loss and missing ENTER. Remaining controls reject
forged WASM bytes, DOM disagreement, original ABC/nonbinding/movie-header changes,
non-document binding changes and altered glue. Probe mutations synchronize their
declared top-level hash, and the glue mutation also updates its declared ABC hash;
rejection reaches preservation/deterministic/frozen checks rather than merely a
stale digest. The first development rejector selected the wrong SymbolClass tag
for the Wiggle binding; the corrected tool locates the tag containing that binding.
Its failed owned output remains under `rejecting-controls-dev1`.

## Reproduction, implementation consequence and limits

```sh
node tools/reference/actor-clock-source.mjs ORIGINAL OWNED/source.json
python3 tools/reference/actor-clock-probe.py ORIGINAL OWNED/probe.swf OWNED/source.json > OWNED/emission.json
BT3_REFERENCE_PORT=4135 BT3_SWF_FILE=OWNED/probe.swf bun tools/reference/actor-clock-player.ts
BT3_REFERENCE_CDP_PORT=10135 BT3_REFERENCE_URL=http://127.0.0.1:4135 bun run reference:browser
BT3_PROBE_OUT=OWNED/NEW_CAPTURE BT3_REFERENCE_CDP_ENDPOINT=http://127.0.0.1:10135 BT3_REFERENCE_URL=http://127.0.0.1:4135 node tools/reference/actor-clock-observe.ts
# Arm first. REA discovery/scenario use these exact loopback endpoints and retain
# discovery.json/scenario.json in NEW_CAPTURE; see ignored request-a/request-b.json.
node tools/reference/actor-clock-fixture.mjs ORIGINAL OWNED/probe.swf OWNED/emission.json OWNED/NEW_CAPTURE OWNED/new-fixture.json
node tools/reference/actor-clock-verify.mjs ORIGINAL OWNED/probe.swf OWNED/emission.json OWNED/CAPTURE tests/fixtures/actor-clock-original-a.json
node tools/reference/actor-clock-reject.mjs ORIGINAL OWNED/probe.swf OWNED/emission.json OWNED/CAPTURE tests/fixtures/actor-clock-original-a.json
```

Use matching A/B fixtures when verifying these retained captures; new runs have
original random outcomes and require independent review/freezing. Never overwrite
a frozen fixture merely to make a new run pass. Capture directories must be fresh.
Raw artifacts, requests, source/input hashes, loaded modules, resource fingerprints,
proofs, screenshots and validation logs are ignored under
`reference-captures/actor-clock/` in this checkout. No SWF, raw media, dependencies,
build output or capture is committed. Prior reference families and read-only
research inputs remain byte-identical.

A later implementation needs actor/mounted identity and lifetime ownership separate
from attachment, paint, geometry queries and gameplay Run. Keep retained observed
clips advancing through ancestor and own removal, preserve source stops and
independent descendant clocks, and retain the constructor/event hold. Reattachment
must expose the same current children/frames. A lazy query getter must not create
or age a replacement tree. The existing host detached-artAge assertion is a host
policy, not contradictory original evidence; it is intentionally unchanged here.

Remaining objections: the private callback comparison above; unmeasured departure,
ordinary cache caller and weapon-target restoration; other parts, mounts,
status/protection/degradation/cleared-field destruction and unretained/collected
objects; arbitrary constructor epochs and full event/RNG ordering; complete
shape/mask/filter/bounds composition; compiled-source attribution; Adobe and
ordinary/full-game/pixel/audio equivalence. Generic effect/carrier evidence is
separate and was not used to infer this actor result.

Formatting and `bun run check` pass: **1,236 tests /60,428 assertions**, including
11 new original-evidence tests. Both finite original reference browser flows and
all40 rejecting controls pass. No application production/browser flow changed,
so application e2e is not required. Owned4135/10135 are closed and bindable after
cleanup; other owned/shared ports, browsers and `.next` were untouched. Temporary
dependency linking is removed. Master remains897d2e741b8a1d23f563f8bb8a2e6bd684932b9b
and legacy22d9def7321bada8a2148a69a79a3392682bb390. No remote action occurred.
