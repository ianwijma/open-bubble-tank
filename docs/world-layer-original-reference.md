# Original collapse/avatar/World numeric controls

This research slice starts at `1ebd885a156fc484ef95c2515d1daf2114276f73`.
It changes only reference tools, a numeric fixture and evidence documentation.
The parent owns renderer/simulation consumers in another checkout. It does not
replace the old `tools/fixtures/collapse.ts` assertions here.

`tests/fixtures/world-layer-original.json` contains **90 independently measured
snapshots / 1,890 binary Number values / 3,780 unsigned words**. No native
RetainedTransform, WorldDisplays, simulation or renderer output generated them.
The `world-layer-*` family is distinct from all previous probe families.

## Actual original execution and declared glue

The document class extends original Main, whose constructor supplies the real
`_-1w` screen-effects service. The probe constructs original BTAGameWorld,
Bubblefield1551, bullet1781 `_‑dl`, top1718 `_‑My`, highlight1780 `_‑Zs`, bottom117
`_‑Rt`, and a builtin empty MovieClip screen layer. Original TankData imports
`_-HJ.getInstance()._-7G[0]` (`A10000063`) and calls `_‑Tr(1,world)`, constructing
an actual `_‑Zx` avatar. No replacement avatar class is used.

Public `_‑0D.Setup(Main)` writes private namespace15 `mRef`; public `gWorldRef`
and World layer/avatar properties supply the other dependencies. Original
`DeathAnimPart2` captures private `scaleChange = root.scaleX / 204`. Glue removes
only the listener just added by that call, then synchronously invokes original
`ShrinkBubblefield(null)` **119 times**. It does not patch any original ABC,
method, RNG, timer or frame script. SHAKE, FLASH and their original random draws
execute normally. Main's screen-effects ENTER_FRAME does not execute between
these synchronous calls. Consequently this is an original-method **numeric
setter control**, not an observation of ordinary collapse scheduling or World.Run.

Qualified `export_pcode/scripts/_-0D.pcode:699–906` is authoritative: the X chain
writes avatar → bottom → top → bullet → highlight → receiver root. Y reads back
the root's cached Number scaleX and writes that same chain. Avatar X/Y compound
writes reread their own truncating coordinate getters on every call. Main's
World positioning is `Main.as:1112–1116`; separate Main translation is retained.

At declared phase120, **no120th shrink executes**. Glue replays only
`DeathAnimPart3`'s transform prefix: avatar scaleY then scaleX1, X/Y0, receiver
and highlight alpha0. It does **not** call original DeathAnimPart3: that method
continues into `_‑Zu`/Destroy, requiring real interface, minimap, effects and
escape-transition dependencies (`_-0D.as:223–234,1424–1457`). Neither destruction
nor the source caller/event order is established by this fixture.

Next construction is also explicitly glue, following the qualified private
namespace16 `_‑Ii` / `_‑XS` bodies (`BTAGameWorld.pcode:7575,3696`) and the
attachment branch8433–8775. Actual new bullet/top clips copy CURRENT receiver
X/Y, while actual new highlight copies NEXT root X/Y and wave scale. The private
factories and AttachNewBubblefield are not invoked. Detachment replays actual
removeChild operations; it does not execute original arrival/cache promotion.

## Finite setup and frozen measurements

Logical stage550×450; Main is initially0,0; World is its child at275,225.
Receiver root is(-140,70), scale1. Four wave children (under mask, exterior mask,
over detail, background) receive scaleY then scaleX1.4; highlight receives1.4
separately. Bullet/top/highlight are World siblings at(-140,70). Bottom117 is at
local0,0 under the actual original1540 under-effects slot beneath the receiver.
This is a declared retained pose, not a claim that `_‑L9`'s first-field branch
would initially copy0 from a root already at(-140,70). Avatar is a World sibling
at0,0, scale1. Screen is a separate identity World child at0,0.

Every snapshot records original cached scaleX/Y, own X/Y/alpha, all six effective
`transform.matrix` coefficients, all six `transform.concatenatedMatrix` API
coefficients, and original `localToGlobal` results for(0,0) and(100,40). Values
are captured by original builtin `ByteArray.writeDouble/readUnsignedInt`, big
endian high/low words, preserving signed zero. There is no decimal toPrecision
conversion in the numeric oracle.

| Phase | Snapshots | Scope |
| --- | ---: | --- |
| collapse0,1,2,51,119 |55|11 roles after actual original shrink calls, or before the first call |
| main-fraction119 |11|Same retained state; explicit Main setters0.07,−0.07 |
| finish-glue120 |11|Transform prefix only; Main reset0,0 |
| next-glue120 |4|Original new clips; source position/scale-copy glue |
| detach-glue120 |9|Seven retained detached/root-child roles plus attached World/Main controls |

The11 regular roles are root, bottom, top, bullet, highlight, avatar, background,
under1540, screen, World and Main. All93 declared trace rows (90 numeric plus
begin/avatar/done) fit the viewer's128-row tail. Raw collector and independent
REA DOM retain every declared sample. They do not recover startup events before
traceObserver installation.

These avatar examples use Main0,0; Point columns are actual original
localToGlobal outputs, not host multiplication of the matrix:

| Phase/age | Cached scaleX/Y | Avatar X,Y | Global(0,0) | Global(100,40) |
| --- | --- | --- | --- | --- |
| collapse0 |1|0,0|275,225|375,265|
| collapse1 |0.9950980392156863|−0.65,0.3|274.35,225.3|373.85,265.1|
| collapse2 |0.9901960784313727|−1.3,0.6|273.7,225.6|372.7,265.2|
| collapse51 |0.7500000000000013|−33.15,15.3|241.85,240.3|316.85,270.3|
| collapse119 |0.4166666666666692|−77.35,35.7|197.65,260.7|239.3,277.35|
| finish-glue120 |1|0,0|275,225|375,265|

At119, own root/avatar/top/bullet/highlight matrix a/d is
`0.4166666567325592`, while cached Number scale remains
`0.4166666666666692`. Root translation remains(-140,70). Nested bottom's attached
composed a/d is `0.1736111044883728`; background retains its own scale1.4 and
has composed a/d `0.5833333134651184`. Root/top/bullet/highlight Point(100,40)
is(176.65,311.65), bottom is(152.35,301.95), background is(193.35,318.35).
Screen and World never shrink. Finish leaves root/highlight alpha0 and their
retained119th scales, while avatar returns to scale1,0,0.

Main's requested(0.07,−0.07) becomes its own(0.05,−0.05). World retains own
(275,225), while its global origin becomes(275.05,224.95). Avatar's119th global
origin becomes(197.7,260.65). Applying Main and World as a single setter or
reconstructing avatar X/Y from an unquantized linear age formula is contradicted.
User zoom is a separate presentation addition and is absent from this original
World chain.

The next control sets next root(700,−90), scale1. Next bullet/top stay at current
(-140,70), scale1; next highlight takes(700,−90), scale1.4. Their global origins
are respectively(975,135), (135,295), (135,295), (975,135).

Before detaching, Main's fractional control is set again. World/Main remain
attached and retain their fractional global origins. Detached root/top/bullet/
highlight Point(0,0) is(-140,70) and Point(100,40) is(-98.35,86.65); independent
bottom is(0,0)/(41.65,16.65). Detached root's retained background is
(-140,70)/(−81.65,93.35). Own poses survive and both World/Main ancestors are lost.

**API discrepancy:** on detached root, Ruffle's concatenatedMatrix.a/d reports
`2.0833332538604736` despite own a/d `0.4166666567325592` and the Point results
above. On its retained background it reports a/d7 and tx/ty0 despite
localToGlobal retaining the detached root. The fixture preserves these getters
under `concatenated.*`; it does not call them the detached Point matrix or
silently substitute corrected values. The cause/compiled source revision is
unproved. Use the separately measured Point contract when qualifying native
localToGlobal consumers. The attached numeric controls have no such discrepancy.
Continuous painter matrices and quantized original Point API results are distinct
contracts; the fixture should not be consumed by weakening Point assertions to
continuous/uniform-camera approximations.

## Preservation, independent checks and limitations

Original SWF SHA256:
`f5827841c682f988f23dcf470ab4ab59c1ffc497acb4ca0f21077d03f942c153`.
Final probe SHA256:
`8ef4a4c9620b4fe89f252d47f36ce428bdf493da64fe97879c3bdbd95f4fcd9f`.
The fixture pins all11 qualified pcode source hashes. Its `_‑0D` hash is
`5b30ed4cca2a726a56569c8da70a24c652282c92836692cdbd6fd1f97fc8b5ae`;
BTAGameWorld is
`eda20420933f4bd87fe9dce652428c3dde3a4bc6e0ee31702325fcdb3c9dba0b`.

The independent existing SWF parser verifies all3022 original tags, including
nonbinding tag headers/payloads/order, both original ABC payloads, movie header
and every non-document binding. The only changes are CID0's document class and
one added glue ABC (3023 tags total). Re-emission produces identical probe bytes.
Six earlier beam/carrier emission modes reproduce their prepared-base hashes,
including binary under-avatar; their emitters/observers/verifiers are unchanged.

Raw durable trace, collector and independently captured REA DOM agree. Passive
Debugger inventory/getScriptSource measures loaded loader/core/WASM bytes and
viewer bytes; response bodies independently establish loaded probe/viewer
identity. Verifier re-reads installed module bytes rather than trusting recorded
comparison booleans. Loaded module identities are:

- WASM14,302,754 bytes: `1ed33b9b71a6b01b9aafafed660be343ffeb2d246c5d79e6425a32bf93e38207`.
- Core465,885 bytes: `26036a94567088dfb3de88a759e8ed10a4cea07b29500af36f345eef42420098`.
- Loader108,322 bytes: `d27c6bdce2a34afb32e8dfa40970bc7e86cbcb912f92db7eb3e1ac70e943bd82`.
- Viewer3,553 bytes: `967cffbcce1ffbf1d07001b27827f4f9107b73517a684e56ba88e58827efa164`.

Final Evidence is
`ev_4e0a300fc5f73d46ce71b379fb669313d7274fffd7fb508ad8c47109e13455be`.
A second fresh-browser capture,
`ev_1e6eeb992ee2f5f912f7cf4bb381040059f19f4392c15dfa02fc4e51e0a84d76`,
independently passes the frozen-word verifier, including every signed zero.
Chrome is157.0.8103.38 and runtime identifies itself as Ruffle0.7.1/wgpu-webgl.
All declared REA actions complete, but REA reports missing events and
`equality_eligible=false`. This is not an equality certificate. Compiled Ruffle
source revision, original ENTER_FRAME ordering, global RNG identity, ordinary
encounter/World.Run, Adobe, pixel/audio and full-game parity remain unproven.

Twelve fresh-copy mutations are rejected: missing sample, missing getter, a binary
word consistently forged in raw trace/observer/DOM (with updated DOM digest),
wrong parent class, wrong parent identity, changed signed zero, wrong cohort,
consistently forged runtime comparison metadata,
changed original ABC, non-document binding, changed glue ABC with updated probe
hash/response metadata, and reported AVM getter/capture failure. Frozen numeric
words reject the consistent numeric forgery; observer-versus-DOM agreement alone
is insufficient. Mutation directories are removed; reports remain caller-owned.

The first exploratory run completed after its collector deadline and is not the
fixture. Reusing the same owned browser then produced original keyDown
`TypeError #1009` after BEGIN, before avatar/samples; that failed capture is
retained, never accepted as equality or hidden. Fresh browser profiles produced
complete repeated controls. The reload failure's cause is not established; use
a fresh owned browser for reproduction.

## Reproduce and hand off

Original and qualified `export_pcode/scripts/` files must share the research
root. Outputs/captures below are caller-owned ignored paths. Do not run verifiers
on read-only research/prior captures; copy those first because derived proof
files are written inside CAPTURE.

```sh
python3 tools/reference/world-layer-probe.py ORIGINAL.swf PROBE.swf > EMISSION.json
BT3_REFERENCE_PORT=3685 BT3_SWF_FILE=PROBE.swf bun run reference
BT3_REFERENCE_CDP_PORT=9685 BT3_REFERENCE_URL=http://127.0.0.1:3685 bun run reference:browser
BT3_REFERENCE_CDP_ENDPOINT=http://127.0.0.1:9685 BT3_REFERENCE_URL=http://127.0.0.1:3685 BT3_PROBE_OUT=CAPTURE node tools/reference/world-layer-observe.ts
```

Verify3685/9685 are free first. The observer requires a fresh CAPTURE directory
and rejects an existing path before connecting. Arm the observer, discover only this owned9685
target, and execute REA capture_browser_scenario in connect mode against
`http://127.0.0.1:3685/`: click `#configured`; wait visible
`#status[data-ready="true"]`; wait2000ms; click `ruffle-player`; press F8 on it;
wait1000ms; retain final DOM/URL and console/page-error events. Save canonical
Evidence to `CAPTURE/scenario.json`. The exact actions/locators and successful
inputs are in the local final/repeat `scenario-input.json`. After observer DONE:

```sh
node tools/reference/world-layer-fixture.mjs ORIGINAL.swf PROBE.swf EMISSION.json CAPTURE OUTPUT.json
node tools/reference/world-layer-verify.mjs ORIGINAL.swf PROBE.swf EMISSION.json CAPTURE
node tools/reference/world-layer-reject.mjs ORIGINAL.swf PROBE.swf EMISSION.json CAPTURE REPORT.json
bun run format
bun run check
```

Fixture generation is an explicit regeneration command; ordinary verification
compares against the committed frozen fixture and never overwrites it. The
local final paths are `test-results/world-layer-original/probe-final.swf`,
`emission-final.json`, `final/`, `repeat/`, `rejected.json`, `legacy-emissions/`
and process/check/format manifests in that same ignored directory. All numeric
source/hash/runtime facts are retained without committing original media,
SWFs, runtime captures, dependencies or build output.

Formatting and TypeScript/check pass **1,060 tests /9,421 assertions**, zero
failures. No production code or browser flow changed; no production dev server,
build or browser E2E was run for this evidence slice. All owned reference/browser
process identities are recorded with PID/startticks and stopped;3685/9685 are
free. The temporary dependency link is removed before local commit. Protected
legacy22d9def7321bada8a2148a69a79a3392682bb390 and origin/master6125acd are unchanged.

The parent can replace the old collapse fixture's player140,−70/root1.4 setup
with this independently measured control and source layout writes. Remaining
objections are explicit: full DeathAnimPart3/arrival/event scheduling was not run;
detached concatenatedMatrix cannot be substituted for Point; exact field query,
constructor/cohort/RNG timing and renderer/zoom composition still need their own
consumer verification. No assertion should be relaxed to disguise those scopes.
