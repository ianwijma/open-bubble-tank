# Original actor and field Point arithmetic

This distinct `actor-point-*` research family starts at
`bd2f3e1d885a13c14b81e6c3ff1548d57f5cb132`. Production simulation, renderer,
UI and existing probe families are unchanged. The parent owns production
integration and browser validation in its other checkout.

`tests/fixtures/actor-point-original.json` freezes **112 original runtime rows /
2,576 binary Number values / 5,152 unsigned words**. Every row includes receiver
cached scale/position/rotation, own and concatenated matrices, supplied input,
intermediate stage Point and final local Point. Actual builtin
`ByteArray.writeDouble/readUnsignedInt` supplies big-endian high/low words,
including signed zero. No recreation arithmetic generates the frozen words.

## Actual execution and declared setup

The added document class extends original Main. It constructs original
BTAGameWorld, Bubblefield1551, bullet1781 `_‑dl`, top1718 `_‑My`, highlight1780
`_‑Zs`, bottom117 `_‑Rt`, and the original avatar from
`TankData.ImportTankData(_‑HJ.getInstance()._‑7G[0])` (`A10000063`) followed by
public `_‑Tr(1,world)`. Field1551's actual `enemyLayer_mc`1547 remains identity.
The avatar initially remains a World child at local0,0.

Main is0,0; World is its separate child at275,225. Current field is(-140,70),
initial scale1. The same valid Shrink dependency setup as the world-layer probe
executes original public `Setup(Main)`, `DeathAnimPart2` and **119 synchronous
original `ShrinkBubblefield(null)` calls**. Glue removes only the ENTER_FRAME
listener added by DeathAnimPart2. Original SHAKE/FLASH/random calls execute;
Main's screen-effects ENTER_FRAME cannot interleave these synchronous calls.
Neither original ABC, method, RNG nor clock is patched. Collapse119 produces
cached scale `0.4166666666666692`, effective a/d `0.4166666567325592`, and avatar
compensation(-77.35,35.7); collapse51 effective scale is0.75.

The four source wave children and highlight receive scaleY then scaleX1.4,
as in the preceding probe. These are dependency/setup controls, not ordinary
field population or World.Run. The new probe does not execute DeathAnimPart3,
Destroy, arrival, private layer factories, AttachNewBubblefield or encounter
scheduling. New actual bullet/top constructors copy CURRENT field(-140,70),
remain unit scale, and attach to World; new actual field is(700,-90), unit scale.
Those copies and parenting are explicitly source-backed glue.

Original public DisplayObject `localToGlobal` and `globalToLocal` execute on
these actual objects. Roundtrip rows call both builtins, retaining the
intermediate Point; direct-stage rows call only globalToLocal on a supplied
stage Point. Transfer rows call actual World.localToGlobal then the actual
receiver.globalToLocal. World is the exact original avatar.parent throughout
these attached controls; the glue uses that retained parent alias, not a map or
completion-context lookup. GetHitLocation itself is not invoked: its builtin
avatar.localToGlobal(detail) operation is measured directly. Equality opcodes compare each actual source/receiver
parent with the specific expected object, not just its class name.

| Phase | Rows | Bounded control |
| --- | ---: | --- |
| collapse0/51/119 |54|Root, nested1547 and avatar; four round trips and two supplied stage Points each |
| main-fraction119 |12|Root/avatar, same six Points, separate Main setters(.07,-.07) become(.05,-.05) |
| conversion119 |16|World source into current root, next root, next bullet and next top |
| rotation90/30/60 |12|Three avatar detail round trips and one parent Position transfer per rotation |
| detach119 |12|Actual World.removeChild(root); root and retained1547 Point controls |
| reparent119 |6|Actual1547.addChild(avatar) under detached field, retaining avatar own119 pose |

The112 rows plus BEGIN/avatar/DONE total115, below the128-row viewer tail.
Roundtrip inputs are(0,0), (100,40), (.079,.149), (-.15,.25). Supplied stage
Points are(135.079,295.149), (-.15,.25). Transfer inputs are(0,0), (100,40),
(.079,.149), (-77.35,35.7). Rotated detail inputs are(.079,.149), (100,40),
(-.15,.25); Position uses the actual avatar.x/y getters.

Authoritative source is the read-only sibling `re/bt3/export_pcode/scripts/`;
all11 qualified pcode digests are frozen in the fixture. Source sites:

- `_‑0D.pcode:699–906`: original Shrink setter chains, getter rereads,
  compensation and actual SHAKE/FLASH calls.
- `_‑0D.as:320–323,382–385`: avatar.parent.localToGlobal(Position), then
  receiver.globalToLocal for field combat Points.
- `_‑Zx.as:658–661`: GetHitLocation transforms the detail through the avatar;
  its separate methods at728–729 and890–943 retain physical parent semantics.
- `BTAGameWorld.pcode:7575,3696`: private namespace16 `_‑Ii` / `_‑XS` copy
  CURRENT X/Y for bullet/top. The probe copies their setters as glue.
- `Main.as:1112–1116`: distinct Main/World translation ancestry.

## Frozen contract and counterexamples

The separate `actor-point-compare.ts` consumes the already frozen runtime words.
It uses the existing core float32 matrix product/inverse/Point functions only
as a **candidate comparison**, never as fixture or preservation authority.
Physical matrices are composed from measured **own** matrices and the declared
actual parent chain. Detached concatenatedMatrix is excluded from this candidate
chain. Each Point API truncates pixel×20 inputs to signed integer twips, then
returns rounded float32 transform results divided by20; inverse translation has
its own integer-twip rounding. Final comparison uses Object.is, preserving zero
sign. All **112 inverse and84 forward comparisons match exactly**. There is no
counterexample to the proposed core inverse-then-Point arithmetic within this
finite control. It does not qualify arbitrary affine/singular/overflow/nonfinite
inputs or the parent's uncommitted ownership integration.

There are **36 measured counterexamples to roundtrip identity**. These results
are expected losses at the two Point boundaries, not an assertion to repair:

| Receiver/control | Input | Actual stage Point | Actual final local Point |
| --- | --- | --- | --- |
| root0 |(.079,.149)|(135.05,295.1)|(.05,.1)|
| root51 |(-.15,.25)|(134.9,295.2)|(-.15,.25)|
| root119 |(100,40)|(176.65,311.65)|(99.95,39.95)|
| root119 |(.079,.149)|(135,295.05)|(0,.1)|
| root119 supplied stage |(135.079,295.149)|(135.079,295.149)|(.1,.25)|
| avatar119 detail |(.079,.149)|(197.65,260.75)|(0,.1)|
| avatar119 detail + Main fraction |(.079,.149)|(197.7,260.7)|(0,.15)|
| avatar119 detail rotation90 |(.079,.149)|(197.6,260.7)|(0,.1)|
| avatar119 detail rotation30 |(.079,.149)|(197.65,260.75)|(.05,.15)|
| avatar119 detail rotation60 |(.079,.149)|(197.6,260.75)|(.05,.15)|
| detached root119 |(100,40)|(-98.35,86.65)|(99.95,39.95)|
| avatar reparented under detached1547 |(100,40)|(-154.9,91.85)|(99.95,40.05)|

Main must stay a separate setter ancestor: its fractional request moves root's
stage origin to(135.05,294.95). The resulting avatar detail roundtrip difference
above is measured. Main/World cannot be folded into a single coordinate setter.

The same World Position(-77.35,35.7) gives stage(197.65,260.7), then current
field local(150.35,-82.3), next field local(-777.35,125.7), and next bullet/top
local(62.65,-34.3). Receivers are distinct physical displays; the construction
copies CURRENT translation even though the new root is elsewhere. Rotation90,
30 or60 changes avatar.localToGlobal(detail), while
avatar.parent.localToGlobal(Position) stays(197.65,260.7). Do not use one as the
other's stage origin.

After actual removeChild, root Point(0,0) is(-140,70), losing both World and
fractional Main. Root.concatenatedMatrix a/d nevertheless reports
2.0833332538604736; nested1547 reports a/d5,tx/ty0. Both actual Point APIs retain
the physical detached chain: root/1547 Point(100,40) is(-98.35,86.65), then
local(99.95,39.95). Reparenting the actual avatar under detached1547 produces
physical a/d0.1736111044883728 and origin(-172.25,84.9). Its concatenatedMatrix
instead reports a/d2.0833332538604736 and tx/ty(-77.35,35.7). This separately
reconfirms that this detached getter cannot be the Point inverse oracle.

## Preservation and independent evidence

The verifier uses the independent existing SWF parser to check movie version,
movie header payload, trailer, both original ABC payloads, every original tag
header/payload/order and all non-document bindings:3022 original tags become3023.
Only document CID0 binding and one added glue ABC differ. Original source hashes,
current emitter bytes, emitted glue bytes, supplied finite inputs and independently
enumerated row cohorts are checked, then the entire reconstructed numeric
fixture is compared with frozen words. Re-emission is byte-identical.

Raw durable trace and collector agree with independent REA final DOM, whose
bytes/digest are checked. Passive post-DONE CDP Debugger.getScriptSource supplies
loaded loader/core/WASM and viewer byte identities. Independent response bodies
establish probe/viewer identity. The verifier rereads installed runtime bytes;
recorded comparison booleans alone are insufficient. The frozen viewer hash
also binds its response/source identity.

Final fresh-browser Evidence:

- `ev_764b4ca3e1e677bfc8312a985a6731ca3d37c2f175175fa5c72cc720148b1772`
- `ev_8e1e77b5933a7528dd914ef928a57312c55ba59c0385870e49a5bb88a3e05567`

Both independently match all frozen words and identity controls. Chrome is
157.0.8103.38; runtime identifies as Ruffle0.7.1/wgpu-webgl. REA actions all
complete, but both report **missing events / equality_eligible=false**. These
captures are not equality certificates or reload-success evidence. Pre-observer
startup, compiled Ruffle revision, ordinary event/constructor/global RNG order,
Adobe/pixel/audio and complete-game parity remain unproved.

Thirteen fresh-copy adversarial mutations reject: missing row/getter, consistent
numeric forgery in durable trace+collector+REA DOM with updated DOM bytes/hash,
receiver parent class/identity, source parent identity, Point positive-zero to
negative-zero forgery, wrong cohort, consistent runtime comparison forgery,
original ABC mutation, non-document binding mutation, glue mutation with updated
probe/response hashes, and reported original AVM error. Temporary mutation copies
are removed. Earlier world-layer90-row evidence independently passes again in
an owned copy; its emitter reproduces the preceding exact probe hash. No old
capture, tool or numeric fixture is modified.

The earlier exploratory captures used an overflowing AVM2 pushshort numerator
for a supplied stage coordinate and are not accepted fixtures. The emitter now
constructs large integer numerators from bounded chunks; the verifier separately
checks every requested input against the design. The two final captures use this
corrected emitter. One browser startup and one early collector connection raced
server/CDP readiness and failed before original execution; their logs remain.

## Reproduction and local artifacts

Verify only3785/9785 are free and record owned PID/startticks/commands before
starting. Use a fresh owned browser profile per capture. Do not touch other
browser/server/.next processes. The original and its qualified pcode files must
share the supplied research root.

```sh
python3 tools/reference/actor-point-probe.py ORIGINAL.swf PROBE.swf > EMISSION.json
BT3_REFERENCE_PORT=3785 BT3_SWF_FILE=PROBE.swf bun run reference
BT3_REFERENCE_CDP_PORT=9785 BT3_REFERENCE_URL=http://127.0.0.1:3785 bun run reference:browser
BT3_REFERENCE_CDP_ENDPOINT=http://127.0.0.1:9785 BT3_REFERENCE_URL=http://127.0.0.1:3785 BT3_PROBE_OUT=CAPTURE node tools/reference/actor-point-observe.ts
```

Arm the observer first, then discover only owned9785. REA connect scenario at
`http://127.0.0.1:3785/`: click#configured; wait visible
#status[data-ready="true"]; wait2000ms; click ruffle-player; press F8; wait1000ms;
retain final DOM/URL and console/page errors. Save complete canonical Evidence
as CAPTURE/scenario.json. Exact inputs are retained in final-a/final-b.

```sh
node tools/reference/actor-point-fixture.mjs ORIGINAL.swf PROBE.swf EMISSION.json CAPTURE OUTPUT.json
node tools/reference/actor-point-verify.mjs ORIGINAL.swf PROBE.swf EMISSION.json CAPTURE
node tools/reference/actor-point-reject.mjs ORIGINAL.swf PROBE.swf EMISSION.json CAPTURE REPORT.json
bun tools/reference/actor-point-compare.ts tests/fixtures/actor-point-original.json COMPARISON.json
bun run format
bun run check
```

Fixture regeneration is explicit; ordinary verification never overwrites frozen
words. Verifiers write derived proofs into CAPTURE: copy previous captures into
your own ignored outputs first. Here all raw captures, probe/emission/re-emission,
comparison,13 rejections, old world-layer copy, format/check logs and exact owned
process trees/startticks/commands remain under
`test-results/actor-point-original/`. Only tools/docs/numeric fixture are committed.

## Exact identities and validation

Original SWF SHA256: `f5827841c682f988f23dcf470ab4ab59c1ffc497acb4ca0f21077d03f942c153`.

Probe SHA256: `c6a2dedd675b8f96c8fd193c9824004a81584463206877eeb800dca3ac601c1e`.

Emitter source SHA256: `0dd5492d7d59472bcbf952749d0719e0d7d74bd6be74e22f9aae1f0bb411de6d`.

Added glue ABC SHA256: `06b9efb5303f0ada6d4d10e578087175995570ace2dd866d0a71d7b286f076d4`.

Loaded WASM (14,302,754 bytes): `1ed33b9b71a6b01b9aafafed660be343ffeb2d246c5d79e6425a32bf93e38207`.

Loaded core (465,885 bytes): `26036a94567088dfb3de88a759e8ed10a4cea07b29500af36f345eef42420098`.

Loaded loader (108,322 bytes): `d27c6bdce2a34afb32e8dfa40970bc7e86cbcb912f92db7eb3e1ac70e943bd82`.

Loaded viewer (3,579 bytes): `34f10c038f3c88d6c5e747161b38ecd5bd697318a32ec82743aac796fb7945a5`.

All11 pcode hashes and both original ABC tag-payload hashes are in the numeric
fixture. Notable source hashes are `_‑0D`
`5b30ed4cca2a726a56569c8da70a24c652282c92836692cdbd6fd1f97fc8b5ae`,
BTAGameWorld
`eda20420933f4bd87fe9dce652428c3dde3a4bc6e0ee31702325fcdb3c9dba0b`,
and `_‑Zx`
`2a3d03e2eebf57c8189b5d4e2aea67e48f6dcfb50477271f07dca15b22bf80ea`.

Formatting and `bun run check` pass **1,109 tests /16,078 assertions**, zero
failures. Both fresh final captures pass the112-row frozen verifier;13 mutations
reject. No production E2E is run because production rules/UI are unchanged.
Owned reference PID119452/startticks3422312 and final browsers
PID121109/startticks3423395, PID125870/startticks3429453 exit through SIGINT;
all their recorded child trees exit, and3785/9785 are free. Earlier exploratory
owned trees are also stopped. Exact commands, environments, child commands and
startticks are in the ignored process manifests. The temporary dependency link
is removed before commit. Master/legacy refs and parent checkout remain untouched.
