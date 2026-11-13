# Retained pickup clock qualification

This continuation replaces the local ownership draft's permanent frame1 preview
with source-backed, retained animation. It qualifies the three pickup classes in
the observed Ruffle runtime, including construction before/inside ENTER, source
Setup/Spawn calls, removal and numeric child poses. It does not qualify ordinary
World.Run, complete field geometry, original global entropy/event equality,
Adobe behavior, pixel/audio equality or full-game parity.

Ownership ancestor: `e36bbf8` cherry-picks draft `6b04efbe2e78b0a2741658a2765523877cf9ca11`
onto `c91ebe48d3a42f54acc12f7bd1f57214b65088dc`. The newer carrier queues,
`clearEffectQueue`, effect entry/finally ordering, retained field artwork and the
binary-qualified default under-avatar resolver are preserved. No remote changes
or sixth PR are part of this work.

## Source and declared controls

Read-only research root:
`/home/ian/Projects/ianwijma/documented-bubble-tank-3/re/bt3`.
[The ownership reference](pickup-display-ownership-reference.md) records qualified
`export_pcode/scripts/_-0D.pcode:3390–4113` Spawn branch edges and `_‑Pu.pcode:689–735`
Setup writes. Those ordering conclusions remain in force.

The distinct `tools/reference/pickup-clock-probe.py` adds one project-authored ABC
and changes only document binding0 from Main to BT3PickupClockProbe. Both original
ABC payloads, all3,018 nonbinding tags, complete original tag order and movie-header
payload are independently verified. No original class, method, frame script,
Math.random, source binding or payload is replaced. The original has3,022 tags.
Existing carrier/projectile/beam/under-avatar emitters are unchanged.

F8 constructs a BTAGameWorld and Bubblefield, supplies `gWorldRef`, sets the
world's game-over flag, and creates the following actual original references:

- Three parentless roots, three attached roots and three roots explicitly removed
  at ENTER20, covering `_‑Bd1816`, `_‑Oh1817` and `_‑5A1820` in each group.
- Direct original Setup calls with denomination, a valid bound glue callback and
  null avatar (valid for the typed parameter). Setup's before/after root pose,
  parent, value and child identity are sampled. No pickup Run is invoked.
- Original `SpawnLifeBubbles(29,39,1,1,false)`, `(30,40,5,1,false)` and
  `(31,41,50,1,false)` on the actual field. The source constructs, positions,
  rotates, attaches, calls Setup and appends its vector. The probe retains the
  actual resulting children and observes denomination/parent/position/rotation.
  Null avatar is sufficient for these original methods; attraction, source Run,
  collection and outside callback execution are outside this runtime control.

The default cohort constructs before the next ENTER. `--inside-enter` moves those
same operations into the declared ENTER1 callback. ENTER90 explicitly calls
original `gotoAndPlay(1)` on the two parentless scripted roots, with separate
pre/post samples. All other wraps are natural. Both captures end at EXIT180.
Reentrant EXIT events produced by original gotos are retained in the raw trace;
they are not counted as additional stage frames.

The initial inside probe lacked an initialization guard and attempted root reads
during unrelated original Main reentrant EXIT events before its first ENTER.
A second draft also skipped child samples and its128-line DOM ring lost an initial
batch. These are rejected development runs under `reference-captures/pickup-inside*`
and `pickup-before*`, not qualification evidence. The final emitter guards until
construction is complete, samples available children, and the reference viewer's
opt-in `BT3_REFERENCE_TRACE_LINES=2048` avoids that loss. Its default remains128.

## Observed mechanics

Both scripted roots have40 authored frames, call the original base constructor,
then register frame1: `r = Math.round(Math.random()*10); gotoAndPlay(r)`.
The31-frame1820 root registers no frame action. Source `_‑Pu` draws scatter speed
4…22 during its constructor, before Spawn's outer rotation draw; Setup draws no
entropy and changes no timeline or parent.

Construction samples show root frame1 and `r=NaN`. Frame1 scripts execute after
the probe's Main/ENTER work and before the final EXIT sample. Natural wraps expose
frame1 in ENTER and the sampled random target in final EXIT. Target0 clamps to1;
target1 is a self-target. Neither causes an observed recursive loop, and later
natural wraps run the script again.

Before-ENTER roots first present frame1 (or the registered random target) at
EXIT1, then advance before ENTER2. Inside-ENTER construction has a crucial split:

| First source action | EXIT1 | ENTER2 / EXIT2 | ENTER3 |
| --- | --- | --- | --- |
| Script jumps to2…10 | chosen target | target+1 | target+2 |
| Script returns1 | 1 | 1 | 2 |
| Unscripted1820 | 1 | 1 | 2 |

Before-ENTER sampling also observes a zero self-target at spawn1/wrap76. The
inside capture observes1 at initial held1 and three later action boundaries; it
does not sample0. Applying zero's clamp to the inside constructor hold combines
that original observation with source/unchanged-frame semantics, and has a host
control; it is not a separately observed inside-zero run.

Parentless and removed retained references continue advancing. Attachment and
removal do not restart the timeline. Root child identities remain stable through
these wraps and removals. All9,788 root samples have matching child-pose samples;
independent folding of original raw placement tags matches sampled X/Y/scaleX/
scaleY exactly (maximum numeric error0). The1820 nested1819 clip remains frame1.
These pickups have no independently animated multi-frame descendant; the evidence
qualifies their actual nested tree, not arbitrary scripted nested classes.

The before capture has4,882 root/child pairs and34 natural scripted wrap boundaries;
the inside capture has4,906 pairs and35. Repeated same-value writes between sampled
`r` values are invisible. These are **not complete draw counts**. Per-object replay
inputs preserve observed action results for finite checkpoints; they do not recover
a global source RNG stream or prove its interleaving with gameplay/other clips.

## Independent identities

Original SWF SHA256:
`f5827841c682f988f23dcf470ab4ab59c1ffc497acb4ca0f21077d03f942c153`.

| Input | SHA256 |
| --- | --- |
| Before probe | `f3b8ad375145985211637ec80e5bfd608b8e3a06ed41a8b8731a21488a149d77` |
| Inside probe | `b007fb5da19585122668eeb579b6df365684abf118beb65e50de1995336c8f8d` |
| `_‑Pu` qualified pcode | `d1608b380f813c2fd1cbf635803754ff7b99c601ce19b505ee7ca929f0fb755e` |
| `_‑Bd` qualified pcode | `b8ac716aef1882f92e0dcd08b04f7c7574a00a9d4a23e7a48df850d55f9079da` |
| `_‑Oh` qualified pcode | `02a2407d886331e06e568ef8c6a9e359f509beb93ee907e1de7cb3304e9442f2` |
| `_‑5A` qualified pcode | `c1823b9ab4c7f2005ae07fc77adb3d0d397b268bef2d9a56ed2da1333a301241` |
| `_‑0D` qualified pcode | `5b30ed4cca2a726a56569c8da70a24c652282c92836692cdbd6fd1f97fc8b5ae` |

Both captures independently inventory loaded CDP Debugger bytes, reconcile their
HTTP responses and installed bytes, and retain Browser.getVersion. Browser:
Chrome157.0.8103.38, revision `a733b5afbb3ba618844ff8876b89ad1a774b2f18`.
Loaded Ruffle0.7.1 modules:

| Module | SHA256 |
| --- | --- |
| ruffle.js | `26036a94567088dfb3de88a759e8ed10a4cea07b29500af36f345eef42420098` |
| core.ruffle.16d61072ac7fdc4d5013.js | `d27c6bdce2a34afb32e8dfa40970bc7e86cbcb912f92db7eb3e1ac70e943bd82` |
| observed wasm | `1ed33b9b71a6b01b9aafafed660be343ffeb2d246c5d79e6425a32bf93e38207` |

REA performed the declared Load/readiness/focus/F8/DONE actions. Before discovery
and scenario Evidence IDs are
`ev_8403f7cd83468b8518fcf0e1dcb834012acb4c553a8fc016a1197bc164d44aff` and
`ev_d524dc6c929f08b4091c2c509dc52adab2390e3bcfe2fc8410ab66bab569bfd7`;
inside IDs are
`ev_a1986a30dad39a28ec897fb43f5b99c4973e53cf68f4517a8fd30b54f0433bd5` and
`ev_411ad201347c33c5a10a7e2513a4888bc936aa1826785b4e3ac0090736fe2d9f`.
All actions complete. REA marks events **incomplete/equality-ineligible**. Its
independent DOM corroborates the final2,048 raw lines only. The project observer's
durable JSONL supplies the historical trace; zero browser/AVM errors are observed.
No pinned source tag is presented as compiled-runtime revision proof.

## Implementation and reproduction

`PickupDisplays` preserves the draft's actual object identity, physical child
order, captured Setup references and removal semantics. Each lifetime now owns a
pure `SwfClip` tree built from repeatably imported numeric placements. Stage entry
advances existing frames before World.Run; its finally pass runs pending scripts
and initializes new lifetimes. It distinguishes the changed-frame constructor
jump from the extra unchanged-frame hold. Weak clock references allow removed,
held lifetimes to animate without a strong expired-object registry. Reads and
paint/query calls never construct, advance or consume entropy.

`ClipTimeline` / `SwfClip` expose separate entry and frame-script phases while
preserving the combined tick/advance API used elsewhere. The renderer calls
`updatePose` on that exact retained tree, also accepted by native Script bounds
and geometric queries. It does not infer a frame from stats, gameplay age or UID.
Mock art uses its existing procedural paint with the imported authored pulse.
No native circle fallback or complete field-query claim is added.

Artwork uses injectable host `Math.random`, explicitly exposed as
`entropy='host-artwork', globalSourceEntropy='unproved'`. Gameplay RNG and UID
streams are unchanged. Source constructor speed/rotation ordering is retained;
complete original entropy ordering remains unfinished. That boundary does not
prevent the demonstrated animated mechanics from replacing the static preview.

```sh
python3 tools/reference/pickup-clock-probe.py ORIGINAL reference-captures/NEW/probe.swf [--inside-enter]
BT3_REFERENCE_PORT=3665 BT3_REFERENCE_TRACE_LINES=2048 BT3_SWF_FILE=reference-captures/NEW/probe.swf bun run reference
BT3_REFERENCE_CDP_PORT=9665 BT3_REFERENCE_URL=http://127.0.0.1:3665 bun tools/reference-browser.ts
BT3_PROBE_OUT=reference-captures/NEW BT3_REFERENCE_URL=http://127.0.0.1:3665 BT3_REFERENCE_CDP_ENDPOINT=http://127.0.0.1:9665 node tools/reference/pickup-clock-observe.ts
# Arm observer, then perform and retain the declared REA scenario/DOM.
# For a fresh random run only, declare its raw trace identity (not behavior proof):
node tools/reference/pickup-clock-fixture.mjs --declare-trace CAPTURE [--inside-enter]
BT3_PICKUP_VERIFY_FIXTURE=CAPTURE/observation-fixture.json node tools/reference/pickup-clock-verify.mjs ORIGINAL PROBE CAPTURE [--inside-enter]
BT3_PICKUP_VERIFY_FIXTURE=CAPTURE/observation-fixture.json node tools/reference/pickup-clock-reject.mjs ORIGINAL PROBE CAPTURE [--inside-enter]
node tools/reference/pickup-clock-fixture.mjs BEFORE_CAPTURE INSIDE_CAPTURE
bun tools/import-pickup-display.ts /home/ian/Projects/ianwijma/documented-bubble-tank-3
```

Committed fixtures pin the exact retained traces for canonical re-verification.
Fresh runs have different unmodified random results and reentrant EXIT multiplicity.
The explicit declaration mode records only their raw digest/count in a caller-owned
fixture; all source preservation, phase/action/pose, DOM and runtime checks still
run independently before production checkpoint import. It does not declare a new
browser/runtime identity or qualify a failed/missing phase.

The verifier imports no native pickup/clip implementation. Its17 rejecting controls
per cohort include payload/ABC/binding corruption, parent/Setup/spawn errors,
frozen/global-frame/removed clocks, root/child identity resets, static child pose,
nested-frame invention, missing samples, loaded WASM mismatch and independent DOM
mismatch. Eleven semantic controls update their caller-owned expected trace digest
so hash rejection cannot hide a missing mechanism assertion. Never reverify another
checkout's captures in place; copy first because derived verification writes files.

Final validation and cleanup are recorded in the fidelity ledger and ignored
`test-results/pickup-playback/`. Raw final evidence is under this checkout's ignored
`reference-captures/pickup-before-final/` and `pickup-inside-final/`. No SWFs,
extracted media, captures, dependencies or build output are committed.
