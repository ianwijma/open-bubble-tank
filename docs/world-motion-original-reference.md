# Original camera method over source Number movement

This bounded research starts at `e98242ef15f7bc85ab350c96709eee5876b354ed`,
the documentation descendant of PR153's repaired `34955e5` source. Production
modules are unchanged. This qualification is independent of the failing native
progression/controller investigation; it neither inspects that diagnostic nor
claims to explain its result.

**Yes, the actual original public `BTAGameWorld.AdjustBubblefieldObjects`
executes over this sequence and supports the new receiver-local bridge.** After
10 CLASS1 right/down acceleration calls and30 release calls, its actual current
root is(-170.55,-170.55), avatarUnder is(170.55,170.55), and the avatar remains
World-local(0,0). The original avatar parent's `localToGlobal(Position)` followed
by current-field `globalToLocal` returns(170.55,170.55). Independent Tank scalar
accumulation171.15 is not the observed Point. This is a finite original-method
control, not original World.Run or ordinary gameplay.

The new `world-motion-*` family and
[400-row binary fixture](../tests/fixtures/world-motion-original.json) are distinct
from `world-layer-*` and `actor-point-*`. Their tools and frozen fixtures remain
byte-identical. No old research capture is verified in place or rewritten.

## Source qualification and executed scope

The read-only original root is
`/home/ian/Projects/ianwijma/documented-bubble-tank-3/re/bt3`.
`uncompressed.swf` SHA256 is
`f5827841c682f988f23dcf470ab4ab59c1ffc497acb4ca0f21077d03f942c153`.
Qualified pcode controls take priority over decompiler ordering:

- `BTAGameWorld.as1348–1386 / pcode6133–6371`: actual camera method. Its
  branch graph executes current root X/Y subtraction, avatarUnder X/Y addition,
  both original background callbacks, current and next sibling copies, then
  private `_‑Xa`. Compound writes reread their own DisplayObject getters.
- `BTAGameWorld.as1467–1500 / pcode6828–6980`: next mask always receives a
  rotation from avatar-minus-next-root X; current writes only on the `_‑WU`
  latch edge. Neither the vector nor avatar's own X/Y is overwritten.
- `AvatarInterface.as179–182,650–774 / pcode constructor359–380 and movement
  3070–3700`: acceleration0.6×class speed, axis clamp6×speed; release branches
  subtract0.09 when positive and add0.09 otherwise, then snap when abs<0.5.
  Release Y precedes X. `MoveAvatar`, AS1315–1323, invokes the camera callback.
  CLASS1 speed1 is read from actual imported TankData and frozen on every row.
  Active axes remain above the snap threshold through call40; inactive axes
  execute the zero→0.09→snap0 branch. No near-threshold active-axis claim follows.
- `_‑KM.as1–17 / pcode`: genuine public QName(PackageNamespace(""),"_-KM"),
  with Number x/y. The camera's original parameter type and actual qualified
  runtime name both check this class; no fabricated vector class is registered.
- `Main.as512–519`, `_‑Rm.as16–44,196–205`, `_‑2t.as40–53`: original background
  constructors accept actual stage/Main; `_‑59` updates its original Number
  point after multiplication by−1 then0.4. Both actual `_‑Rm` dependencies are
  supplied. No callback substitute or no-op method is used.
- `_‑0D.as320–323,382–385`: source avatar parent Position conversion. The probe
  executes the actual builtin Point operations directly, not those combat methods.
- `_‑ct/_‑1W.as51–54 / pcode`: teleport computes destination minus origin and
  invokes the same public camera. The probe controls only that displacement/call;
  it does not execute the weapon, mouse acquisition, clipping or queued effects.

The added document extends original Main. Each of four cohorts constructs a
fresh original World, actual field1551, nested authored avatarUnder/under/mask,
original117 bottom, current1781 bullet/1718 top/1780 highlight, a builtin screen
MovieClip, actual next1551, next1781/1718 and the real avatar returned by
`TankData.ImportTankData(_‑HJ.getInstance()._‑7G[0])` (`A10000063`) and
`_‑Tr(1,world)`. Actual public field `Setup(Main)` runs for both fields.

Construction, parenting and dependency assignment are **GLUE**. World is a Main
child at(275,225); current root and avatar start(0,0), unit scale. Bottom is under
actual1540. Next root is(700,-90); its bullet/top are deliberately stale(11,22)
before call1. The method itself copies them to(700,-90) on every call. Current
sibling copies and both mask results are also actual-method results. Private
next-highlight `_‑Qd` stays null; its non-null branch is unexercised. No private
factory, AttachNewBubblefield, arrival, width/height sizing or full population
method is invoked.

Source Number input arithmetic is **GLUE executed in AVM2**, using the actual
vector and imported speed. The Python emitter never calculates expected camera
or Point values. The independent verifier also checks the supplied delta Numbers
against source-ordered input arithmetic without importing simulation modules.
No original method, ABC payload, registered script, RNG or clock is replaced.
Original constructors and their RNG/scripts execute; their global ordering is
not qualified. All camera calls and measurements are synchronous inside the
added F8 handler; original ENTER_FRAME cannot interleave those instructions.
F8 triggers glue, not original keyboard movement. Original World.Run,
AvatarInterface.Run/MoveAvatar and real movement keys are not executed.

## Measurements and comparisons

Four fresh constructions cover right, down, both and negative-both separately.
Each receives40 actual calls:10 held,30 release. Calls1/2/10/20/40 are sampled.
Each cohort then gets separate Main setters(.07,-.07), observed as(.05,-.05),
and another complete measurement without a camera call. On the both cohort only,
a controlled destination(250.079,-100.149) minus its actual current-field parent
Position supplies one additional actual camera call. Total actual calls:161.

The selected both-axis results below are independently decoded original words:

| Camera call | Actual delta per axis | Root per axis | Parent Position in current field |
| --- | --- | --- | --- |
|1|0.6|−0.6|0.6|
|2|1.2|−1.8|1.8|
|10|5.999999999999999|−33|33|
|20|5.1000000000000005|−87.85|87.85|
|40|3.3000000000000034|−170.55|170.55|

Right-only/down-only retain exact zero on the inactive axis. Negative-both call40
has root(170.55,170.55) and receiver-local Position(-170.55,-170.55). Fractional
Main changes the Position stage Point to(275.05,224.95), while current-field
Position stays(170.55,170.55). Controlled teleport delta is(79.529,-270.699);
actual receiver-local Position becomes(250.05,-100.1), root(-250.05,100.1).
These are observed outputs, not expected values generated by recreation arithmetic.

Each of25 phases measures16 roles: root, avatarUnder, avatar, current top/bullet/
highlight, under, bottom, screen, World, Main, next root/top/bullet and both masks.
Each row freezes31 Numbers: scaleX/Y, X/Y, alpha, rotation, all six own and all
six concatenated matrix API coefficients, actual localToGlobal(0,0)/(100,40),
actual avatar-parent Position input, intermediate stage and final receiver-local
Point, vector delta and imported speed. Original builtin
`ByteArray.writeDouble/readUnsignedInt` yields24,800 unsigned words, preserving
signed zero. Expected object equality opcodes also measure each actual parent
identity. No detached concatenatedMatrix is used; this probe has attached chains.
The older detached getter/Point discrepancy remains unresolved and unchanged.

[The candidate comparator](../tools/reference/world-motion-compare.ts) runs
public `World.step` for40 frames per fresh World, fractional Main and one explicit
public camera teleport. All498 tested current root/avatarUnder/avatar/sibling
X/Y, receiver bridge, velocity and root-forward Point values match the frozen
oracle. Separately, candidate core Point arithmetic replays measured own matrices
and declared attached ancestry:400 rows /3,200 scalar Point checks match. This
second comparison does not claim candidate construction/size matrices equal the
original: its matrix inputs are independently measured original getters.

There are12 declared current-mask setup differences. Fresh original field
constructors retain authored rotation0, while normal candidate World construction
uses `FieldDisplays.attach` and writes180. Original current initialization
AS413/pcode1599–1603 and next attachment AS1837/pcode8529–8532 justify that normal
write. At down/negative X, `_‑WU` remains false; original `_‑Xa` never rewrites the
current mask, so the differing initial values persist. This is a construction
scope difference, not a camera-method contradiction. It is preserved explicitly
in the comparator and tests. Next masks always take180 in these controls. No
production repair or assertion relaxation is made here.

Seven meaningful frozen-oracle tests pass1,035 assertions. Formatting/typecheck
and the complete check pass **1,136 tests /17,347 assertions**. Production modules
and browser flows are unchanged; production build/E2E and native-art progression
are outside this research slice. The original probe itself runs twice in fresh
owned browsers. Existing incomplete fidelity boundaries remain explicit in
[the ledger](fidelity.md).

## Independent preservation, evidence and rejecting controls

The independent existing SWF parser checks movie version/header/trailer, both
original ABCs, all3,022 original tags' raw headers/payloads/order and every
non-document binding. Only CID0's document class and one added glue ABC differ:
3,023 output tags. Emitter bytes/glue identity, qualified source hashes, supplied
inputs, row cohorts/classes/actual parent identities and every frozen binary word
are independently checked. Re-emission is byte-identical.

Durable raw trace, collector and separate REA final DOM agree on all404 declared
trace rows, within the configured1,024-row tail. DOM byte length/digest and loaded
probe/viewer response bytes are checked. Passive post-DONE Debugger inventory
and getScriptSource identify actual loaded loader/core/WASM/viewer bytes. The
verifier rereads installed runtime bytes; saved matchesObserved booleans alone
are insufficient. Startup diagnostics preceding traceObserver remain outside
this trace-completeness claim.

Fresh original REA Evidence:

- `ev_778788ce298421c1e5a931eb6d05181accb9f3ca436ccfff9230f190e2637091`
- `ev_aea66f3f9309f7c8b3b6e62347af5c89c6215d50eea80cc5685675af072b503e`

Chrome157.0.8103.38; runtime identifies as Ruffle0.7.1/wgpu-webgl. All declared
REA actions complete, but both captures report **missing events / equality_eligible=false**.
They are not equality certificates. Compiled Ruffle source revision, global
constructor/event/RNG identity, ordinary encounter/reachability, original
World.Run, Adobe, pixel/audio and complete-game parity remain unproved.

Fifteen fresh-copy mutations reject: missing sample/getter, consistent binary
forgery across durable trace+collector+DOM with updated DOM digest, parent class/
identity, signed-zero change, cohort, forged runtime comparisons, original ABC,
non-document binding, glue ABC with updated probe/response metadata, AVM error,
movie header, original non-ABC tag and class speed. Mutation directories are
removed; reports remain owned. An exploratory400-row run preceded the final
explicit dependency/speed/Y-before-X probe and is not the fixture. An early
cleanup bind check saw socket reuse delay; final listener and reusable-bind checks
both prove free ports. A missing comparator array annotation caused the first
check to fail; the typed fix is followed by the passing complete check.

## Reproduce within owned scope

Only3835/9835 are used. Check listeners and bind availability first; record exact
PID/startticks/commands/environment and child trees. Use a fresh browser per
capture, stop only fingerprint-matching owned roots, and prove their trees have
exited plus both ports free afterward. Never touch parent `.next` or another
child's ports/processes. The temporary dependency symlink points to existing
installed packages; no install/setup is performed, and the link is removed
before commit.

```sh
python3 tools/reference/world-motion-probe.py /home/ian/Projects/ianwijma/documented-bubble-tank-3/re/bt3/uncompressed.swf test-results/world-motion-original/probe-final.swf > test-results/world-motion-original/emission-final.json
BT3_REFERENCE_PORT=3835 BT3_REFERENCE_TRACE_LINES=1024 BT3_SWF_FILE=test-results/world-motion-original/probe-final.swf bun run reference
BT3_REFERENCE_CDP_PORT=9835 BT3_REFERENCE_URL=http://127.0.0.1:3835 bun run reference:browser
BT3_REFERENCE_CDP_ENDPOINT=http://127.0.0.1:9835 BT3_REFERENCE_URL=http://127.0.0.1:3835 BT3_PROBE_OUT=test-results/world-motion-original/final-a node tools/reference/world-motion-observe.ts
```

Arm the observer, then use actual advertised REA `list_browser_targets` on only
`http://127.0.0.1:9835`, allowed origin `http://127.0.0.1:3835`. REA connect
scenario navigates that selected target to `/`; click#configured, wait visible
#status[data-ready="true"], wait2,000ms, click ruffle-player, press F8, wait2,000ms;
retain final DOM/URL and console/page errors. Export the canonical complete
Evidence and select that record into CAPTURE/scenario.json. Exact complete inputs
are retained in `final-{a,b}/scenario-input.json`. Repeat on a new owned browser
with a fresh capture directory; never append to old raw evidence.

```sh
node tools/reference/world-motion-fixture.mjs ORIGINAL PROBE EMISSION CAPTURE tests/fixtures/world-motion-original.json
node tools/reference/world-motion-verify.mjs ORIGINAL PROBE EMISSION CAPTURE
node tools/reference/world-motion-reject.mjs ORIGINAL PROBE EMISSION CAPTURE REPORT.json
bun tools/reference/world-motion-compare.ts test-results/world-motion-original/comparison-final.json
bun test tests/world-motion-original.test.ts
bun run format
bun run check
```

The first command explicitly regenerates only from original evidence. Ordinary
verification never overwrites the frozen fixture. Verifiers write derived proofs
inside caller-owned CAPTURE; make owned copies before verifying any prior or
research capture. Here originals, probes, captures, REA bundles, emission/
re-emission, process/environment/starttick manifests,15 rejections, candidate
comparison, format/check logs, input hashes and cleanup proof stay under ignored
`test-results/world-motion-original/`. No SWF, image/audio, capture, dependency or
build output is committed. No PR, push, merge, watch or deploy is performed.
Protected origin/master6125acdef18d9bc3c238d460930e238fc4c71f6d and legacy
22d9def7321bada8a2148a69a79a3392682bb390 remain unchanged.

## Exact byte identities

Probe: `4a267c9c4566127da71d584c520078badcd599efe6b4a35eceea26ca78f377eb`.

Emitter source: `864a6edac92dc98f6afe43041d7b327cceeae702f67c4e3c62a1f71193568f76`.

Added glue ABC: `a08b7c5d85e94d7cc9d9bb9cb5f763387ec2b9d844b381fa458f1438ef690107`.

Loaded runtime modules (observed bytes):

| Module | Bytes | SHA256 |
| --- | ---: | --- |
|WASM|14302754|`1ed33b9b71a6b01b9aafafed660be343ffeb2d246c5d79e6425a32bf93e38207`|
|core|465885|`26036a94567088dfb3de88a759e8ed10a4cea07b29500af36f345eef42420098`|
|loader|108322|`d27c6bdce2a34afb32e8dfa40970bc7e86cbcb912f92db7eb3e1ac70e943bd82`|
|viewer|3579|`34f10c038f3c88d6c5e747161b38ecd5bd697318a32ec82743aac796fb7945a5`|

Original ABC tag-payload hashes:

- `130eef8fcef585dc1ae00f427903d11c35a79feb22e11d4e93219f987c719a1c`
- `d849764541e5f8b5b7d3b9bbdb31960ad9e47b8fd4a3e24652ccfa408c8be596`

All16 qualified pcode inputs (relative to the read-only original root):

| Source | SHA256 |
| --- | --- |
|`export_pcode/scripts/Main.pcode`|`faa5c3e921e0f625b5d07e07a1946b50ee5645a49290b9c42a923f9e904dde1d`|
|`export_pcode/scripts/BTAGameWorld.pcode`|`eda20420933f4bd87fe9dce652428c3dde3a4bc6e0ee31702325fcdb3c9dba0b`|
|`export_pcode/scripts/_-0D.pcode`|`5b30ed4cca2a726a56569c8da70a24c652282c92836692cdbd6fd1f97fc8b5ae`|
|`export_pcode/scripts/TankData.pcode`|`4f1eec91c07616eaa1895078047c1423a21ce0253192d61161dfdc8f120491f0`|
|`export_pcode/scripts/_-Zx.pcode`|`2a3d03e2eebf57c8189b5d4e2aea67e48f6dcfb50477271f07dca15b22bf80ea`|
|`export_pcode/scripts/Bubblefield.pcode`|`3812bb686dde401803a56f75195f741a8a53fea87c45310700240f4acdc6e55e`|
|`export_pcode/scripts/_-dl.pcode`|`8c301f340cb075b8ce196f21eeff167c6646eb0fc7f75160dab5ee1ae34e043e`|
|`export_pcode/scripts/_-My.pcode`|`86c10cf1b0698794069644a5afca022700f2040129b559f63e95afeb6a1c3cae`|
|`export_pcode/scripts/_-Zs.pcode`|`46f1f633c3baa616ed778290713c6f0c3c04423297588d21f6339f01780da0e8`|
|`export_pcode/scripts/_-Rt.pcode`|`9165c7ad6a0dc8f20e05326de71474690ecdb7f780eef14dda0148772cfb1789`|
|`export_pcode/scripts/AvatarInterface.pcode`|`d5878da5caacba0ec2b83c02283a828036a5d83d22c88ae1d05d332fc7426e05`|
|`export_pcode/scripts/_-HJ.pcode`|`aabf76a02243d0d8fcf79a7c47b66e315295190b326bfa649c734a47d60d58a3`|
|`export_pcode/scripts/_-KM.pcode`|`e2433be9d5c58703374941fd2bc38cf85101881e9acedc2fe363bf789067e16b`|
|`export_pcode/scripts/_-Rm.pcode`|`d36ce33b9aa9efaec929477973d6b17b18dfbff240da66e745559f5288ec30e9`|
|`export_pcode/scripts/_-2t.pcode`|`37a4fcd43c656d37d57437150ebd338eda705bebbea6ab9f531cebcf0dacdd7d`|
|`export_pcode/scripts/_-ct/_-1W.pcode`|`5660c78c8c299114bfa8d125ad8505955335111575ae189ca32089b2b11754dc`|
