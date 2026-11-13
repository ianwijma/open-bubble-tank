# Retained pickup ownership and qualified animation continuation

Prepared from `e4d1f2873f0693d1b2528bb22adfc6168e1ce896`. This bounded
implementation restores actual pickup identity, physical life-layer membership
and source removal phases. The subsequent [pickup clock qualification](pickup-clock-reference.md)
replaces its held frame1 preview with retained source-backed animation. The audit
and validation below describe the picked ownership ancestor; historical unresolved
playback statements are superseded by that separate original-runtime evidence. There is
no complete field width/hit query, ordinary boss/win, Adobe, pixel, audio or
full-game parity claim. The [field inventory](live-field-display-ownership-audit.md),
[wrapper state](field-wrapper-state.md) and [fidelity ledger](fidelity.md) retain
those wider obligations.

`World.pickupDisplays` is a pure owner keyed by actual `Pickup` and `Field`
objects. Each explicit construction creates a distinct frozen clip-lifetime
handle with the original symbol, total frames and frame1 registration metadata.
Its identity survives removal, reattachment, drawing, UID/value/dead writes and
Run-array replacement. `owned(field)` enumerates actual lifeBubbleLayer children
in addChild order. Same-parent addChild raises the child; reparenting removes its
old membership without changing the original Setup callback or avatar reference.
A detached wrapper still owns its children. The field cache never restores that
life layer into a new wrapper.

`read` returns a frozen read projection carrying the actual object, parent,
original Setup references and retained clip handle. It never discovers a child,
creates a clip, runs a script or draws entropy. The ordered Set and mutable
instance bookkeeping stay private. There is no Pixi, AssetPack, DOM, shape proxy
or second clock in this simulation owner. `FieldRuntime.pickups` remains the
independent `_‑Ym` Run vector; its setters and direct mutations do not change
physical membership.

## Qualified source phases

All paths below are relative to the read-only research root
`/home/ian/Projects/ianwijma/documented-bubble-tank-3/re/bt3/`.
Qualified `export_pcode/scripts/` namespaces and branch edges take precedence over
textual listing order in `export_scripts/scripts/`.

- `_‑Pu.pcode:48–116`: the base constructor calls `constructsuper`, initializes
  life1, draws `_‑Wq(4,22)` into scatter speed, then writes movement/collection
  flags. The explicit constructor draw is not in Setup.
- `_‑0D.pcode:3390–4113` / `_-0D.as:777`: every denomination branch constructs
  `_‑Bd`, `_‑Oh` or `_‑5A`, writes X then Y then rotation, adds the original clip
  to `lifeBubbleLayer_mc`, calls Setup, appends `_‑Ym`, then optionally writes
  `blnCollect=true`. For the first branch the path is
  `ofs0039 → ofs00c0 → ofs00a9 → ofs009b → ofs0084 → ofs0076 → ofs0059`.
  The five branch uses `ofs00f1 → ofs01a8 → ofs0191 → ofs0183 → ofs016c → ofs015e`;
  the fifty branch uses `ofs0334 → ofs03bb → ofs03a4 → ofs0396 → ofs037f → ofs0371`.
  The four other single/five sites repeat that attach/Setup/append sequence.
- `_‑Pu.pcode:689–735` / `_-Pu.as:163`: Setup writes denomination, bound outside
  callback, then avatar. It does not change parent, rotation, speed or timeline.
- `_‑0D.as:557–600` and qualified collision/`_‑PL` pcode: collision snapshots
  matching objects before collection callbacks. `_‑PL.pcode:3212–3314` pays life
  and statistics, splices the matching reference, then removes that exact child.
- `_‑0D.pcode:1042–1113`: outside callback `_‑8A` scans its original vector,
  splices the matching reference, then calls its life layer's removeChild. A
  missing vector reference returns without removing anything. An actual wrong
  parent raises the narrow `PickupChildRemovalError` after the splice. World
  catches that known source-listener failure and still reaches its artwork
  finally block; arbitrary errors remain visible.
- `_‑0D.pcode:1115–1178`: `_‑Yz` removes vector-referenced children first, then
  replaces the vector. It does not sweep display-only children created by
  artificial array mutations. A failing removeChild interrupts bulk cleanup.
  `Deactivate.pcode:4789–4908` invokes this only for its completed-wrapper gate;
  collapse Destroy reaches the same cleanup. Uncleared cached/detached wrappers
  retain their actual children.

`spawnPickups` now makes attach/Setup/append distinct operations and applies the
source forced-collection flag after append (including immediately cancelling
scatter). Its existing two explicit RNG draws remain speed4…22 then
rotation−180…180, with one existing UID per object. No native frame-script entropy
is borrowed from either stream. `dropBubbles` explicitly supplies its source
current-wrapper target even inside a different field Run. Collection and outside
callbacks mutate membership at their source phases; bounds removal still skips
the shifted next vector element for that Run. Current per-frame movement units
and existing position arithmetic are unchanged.

Raw tests and browser fixtures explicitly call `importPickupFixtures` for omitted
constructor/addChild/Setup operations. That helper lives only under tools/tests,
imports each original raw object once and never repairs a later removal.
Production never imports membership from a Run vector.

## Playback boundary and deliberate presentation limit

Original `_‑Bd` binds symbol1816 and `_‑Oh` binds1817. Each qualified constructor
calls its superclass before `addFrameScript(0, frame1)`. Their actual frame1
methods store `r = Math.round(Math.random()*10)` and call `gotoAndPlay(r)`.
These roots have40 authored frames. Original `_‑5A` binds1820, has31 authored
frames, and its qualified constructor only calls the superclass; it registers no
frame script. The bindings/counts come from the supplied binary, through the
repeatable importer, with pcode digests alongside them.

Those facts do **not** establish when registration first executes, whether a
zero/one self-target causes another execution in the observed runtime, the number
and ordering of random draws, nested-child cohorts, or construction/attachment/
removal clock phases. The existing preserved-original projectile frame probe
samples different classes, reports `isPlaying` unavailable and leaves entropy
uncertain. The independent carrier verifier qualifies empty1801/1828 clocks,
including unparented advancement; it does not measure these pickup classes or
SpawnLifeBubbles. Their tools, verifiers and bounded references were inspected.
Applying their measured phase formulas to these pickups would be an inference.
No fresh original-runtime probe or REA scenario is claimed by this slice.

Every retained pickup handle therefore exposes `playback.status='unresolved'`
and `currentFrame=null`, including1820 pending its construction cohort. Its
separate `presentation={kind:'held-authored-preview',frame:1}` is explicitly a
static authored preview. Both modes retain that boundary; native drawing uses
`update(1,1)` and does not run the scripts or reconstruct a pose from
`world.stats.frames+uid`. This intentionally replaces the preceding invented
animation with a held supplied-art pose. It is a visible unresolved limitation,
not qualified native playback or geometry. A future complete field query must
reject this unresolved native pose; it must not interpret the preview frame as
an animation oracle. No clipping or geometry fallback is added.

The parent must qualify pickup constructor/frame-script execution and entropy
before supplying a production clock/current nested pose. Preserve original ABCs,
all nonbinding payloads/order, source bindings and Math.random; add only observation
glue, independent trace/payload verifiers and rejecting controls, as in the
existing tools. Record declared REA actions and missing events honestly. A pinned
Ruffle source tag is mechanism evidence, never compiled-version proof. This work
adds no second RegisteredEffects/carrier cohort implementation and changes none
of its queues, hooks or files.

## Source identities and reproduction

Original SWF SHA256:
`f5827841c682f988f23dcf470ab4ab59c1ffc497acb4ca0f21077d03f942c153`.
The supplied `uncompressed.swf` is the known FFDec expanded body with a retained
CWS signature. The independent audit checks its literal digest and length before
walking raw tag bytes, without the production SWF parser.

| Qualified pcode | SHA256                                                             |
| --------------- | ------------------------------------------------------------------ |
| `_‑0D`          | `5b30ed4cca2a726a56569c8da70a24c652282c92836692cdbd6fd1f97fc8b5ae` |
| `_‑Pu`          | `d1608b380f813c2fd1cbf635803754ff7b99c601ce19b505ee7ca929f0fb755e` |
| `_‑Bd`          | `b8ac716aef1882f92e0dcd08b04f7c7574a00a9d4a23e7a48df850d55f9079da` |
| `_‑Oh`          | `02a2407d886331e06e568ef8c6a9e359f509beb93ee907e1de7cb3304e9442f2` |
| `_‑5A`          | `c1823b9ab4c7f2005ae07fc77adb3d0d397b268bef2d9a56ed2da1333a301241` |

```sh
bun tools/import-pickup-display.ts /home/ian/Projects/ianwijma/documented-bubble-tank-3
bun run format
bun run check
BT3_SWF_FILE=/home/ian/Projects/ianwijma/documented-bubble-tank-3/re/bt3/uncompressed.swf bun run test:e2e --config test-results/pickup-ownership/playwright.config.mts
```

Repeated import plus formatting reproduces the metadata exactly. Only three
symbol identities/frame counts/registration booleans and input/pcode hashes are
imported; no original media, vectors, SWFs, captures, dependencies or build output
are committed. `test-results/pickup-ownership/independent-symbol-audit.py` supplies
nine independent binding/count/pcode-hash checks. This is a static binary/source
control, not an original runtime trace or binary playback-word oracle.

## Validation and integration limits

The initial focused before-integration run records one unchanged RNG/UID control
passing and eleven ownership tests failing because the owner is absent. The
implemented suite covers birth phases, raw-array independence, child order,
UID/value/dead aliases, explicit removal, wrong-parent callbacks, cleanup,
detached/cache lifetimes, unresolved playback and fixture-only bootstrap.
All previous assertions remain. Final `bun run format` and `bun run check` pass
1,053 tests /9,206 assertions with zero failures; the13 focused cases pass74
assertions. The ignored validation summary and focused log retain the results.

Serial check then the literal build/E2E command passes14 browser cases in52.9s,
with zero skips, retries, flaky results or page errors. Production BUILD_ID is
`CoRoG-v4PuO1tbDeTDkGv`. Private `.spec.mts` copies preserve every assertion and
change only fixture URL3102→3556. The private config disables server reuse and
owns3555/3556; both are free after Playwright cleanup. Optional original ports
3565/9565 were checked free and were not used. No parent process was connected to
or stopped.

The six-panel mock/SWF pickup galleries and nested-crossing captures were
inspected. The new gallery proves renderer object identity, actual child order,
array/dead/value retention, separate same-UID objects, explicit removal/disposal,
reattachment and pure repeated drawing. Existing pickup alpha-contact, crossing,
collapse, actor behavior and screen-effect assertions pass in both modes. These
are finite artificial controls, not a recorded ordinary encounter or original
animation comparison. Browser field/collapse transforms and mock artwork retain
their existing approximate presentation; root/life-layer geometry and exact
pickup setter semantics have not been qualified here.

The parent still owns complete ordered field composition/query, native pickup
playback qualification, retained dynamic geometry and exact combined-head
Actions/review validation. This local commit does not push, publish, merge,
watch, deploy, alter provider/billing settings or change protected master/legacy
refs. RetainedTransform, field-display.ts, under-avatar data/probes/resolver,
RegisteredEffects and actor renderer ownership are untouched.
