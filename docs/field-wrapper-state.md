# Retained field wrapper instances and lifecycle

Prepared from `b2aa47b113986dacc89e1d4251c4e6e81aa72f63`. This implements
numeric instance ownership/pose mutations in the simulation. It does **not**
publish a field width/hit service, change beam geometry, qualify under-avatar
width/height setters, or establish full-game parity. Read the historical
[live-field inventory](live-field-display-ownership-audit.md),
[Script arithmetic boundary](script-bounds-arithmetic.md),
[crossing contracts](crossing-source-reference.md) and
[fidelity ledger](fidelity.md) alongside this implementation.

## Implemented owner and read boundary

`World.fieldDisplays` owns a `FieldDisplays` model keyed by the actual `Field`
object in a WeakMap. Every construction receives fresh numerical identities,
including a revisit to the same coordinates. `FieldCache` continues storing
actor references and saved scalars; it never stores/reuses this wrapper model.
No gameplay UID or RNG draw is used for display identities.

`read(field)` returns frozen numeric snapshots of the root, all eight authored
slot instances and their authored descendants, tutorial identity/parent/stopped
source frame, concrete bottom117, stage-update counts, sizing requests and
collapse state. Construction clones every matrix/color array into independent
instance state; no `AssetPack`, `SwfClip`, cached `DisplayPlacement`, Pixi or DOM
object is retained or mutated. Reads never create instances, advance clocks,
resolve geometry, consume randomness, change parents or modify revisions.

The first tutorial is a root child after the eight authored slots. Later guides
are in the actor slot after its transparent helper and before subsequent actor
births. The selected frame is retained, independent of later writes to a map
record or `Field.tutorial`. Authored helper/logo identities and mask ranges remain
present. `stageUpdates` counts actual attached stage notifications, including
orphans and paused Worlds. It is **not** a synthetic timeline frame or a freshly
reconstructed random pose; native clip playback remains the parent's composition
work. Detached ancestors and detached117 stop receiving these notifications.

The authored1540 under-effects slot and nested117 bottom instance have distinct
identities. Bottom attaches at `_‑L9` and detaches at `_‑4j`; it is independent of
pending requests and attached effect membership. Parent effect ownership should
compose its actual registered lower-layer handle under these identities, rather
than copying `runtime.effects` or `effectQueue` into the wrapper's children.
Actor and life slots likewise expose explicit future owner insertion points;
the model does not infer actors/pickups from damage/Run arrays.

## Source mutations

Paths below are relative to the read-only research root
`/home/ian/Projects/ianwijma/documented-bubble-tank-3/re/bt3`.
Qualified `export_pcode/scripts/` QNames and branch edges take precedence over
`export_scripts_deobf/scripts/` textual ordering.

| Phase                | Implemented writes                                                                                                                                                             | Qualified evidence                                                            |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| First field          | Construct1551; attach root at0,0; retain authored exterior scale and -1twip translation; rotate mask180; nested117; root tutorial frame3                                       | `BTAGameWorld.pcode:1445–1645`; `_‑0D.pcode:2575–2606` Setup only stores Main |
| New/cache attachment | Fresh wrapper/tutorial before population; explicit actor addChild/callback/array phase before size writes; tutorial uses pre-increment visit count                             | `BTAGameWorld.pcode:7893–7910,8073,8116,8145`; `_‑0D.pcode:6413–6473`         |
| Child sizing         | Under-mask, exterior mask, detail, background: scaleY then scaleX for each; root/actor/life/under-avatar/1540 stay independent                                                 | `BTAGameWorld.pcode:8433–8478`, `ofs0591`                                     |
| Root attachment      | Truncating X/Y writes; attach; exterior rotation180; nested117 copied from the source-selected origin                                                                          | `BTAGameWorld.pcode:8433–8775`; `_‑L9:2732–2820`                              |
| Ordinary movement    | Root X/Y subtract movement; under-avatar X/Y add movement, each reading its own retained getter; then `_‑Xa`                                                                   | `BTAGameWorld.as:1348–1388`; `_‑Xa` qualified pcode starts6828                |
| Transit              | Current compound setters, next root positioning, next under-avatar projection, `_‑DF`, then masks                                                                              | `BTAGameWorld.as:1201–1306`; `AvatarInterface.pcode:4448–4519`                |
| Masks                | Next rotates0 iff avatar-relative X>0, otherwise180. Current writes only at the retained `_‑WU` edge. Arrival does not reset that latch. Retain asymmetric1541 and translation | `BTAGameWorld.pcode:6828` `_‑Xa`; `AS:1467–1500`                              |
| Arrival              | Detach117, unroot outgoing wrapper retaining all authored descendants/poses; promote next; SnapBack under-avatar through the promoted root; update masks. No `_‑0B` rebind     | `BTAGameWorld.pcode:1055–1443,5290`; `AS:1334–1340`                           |
| Orphan               | Superseded next remains rooted at its last pose; no subsequent camera snapshot reconstructs it                                                                                 | Crossing source paths and existing source contract                            |
| Collapse start       | Capture root.scaleX/204 as a Number once                                                                                                                                       | `_‑0D.pcode:590–636`                                                          |
| Collapse frame       | Avatar, current bottom, top, bullet, highlight, receiver root: X chain first, then Y chain reads back root.scaleX. Compensate avatar X/Y via truncating compound setters       | `_‑0D.pcode:699–906`                                                          |
| Collapse completion  | Stop shrink before frame120; avatar scaleY thenX=1 and X/Y=0; root/highlight alpha0; retain root/children through Destroy and new-field attachment                             | `_‑0D.pcode:908`; `AS:225–234,1424–1457`                                      |

The collapse receiver can differ from World's current bottom owner; `shrink`
accepts both identities. `onCollapseSiblingScale` and
`onCollapseHighlightAlpha` expose the source writes for the parent's excluded
sibling owners. They are not a second effect membership engine. Root and117
receive independent transforms: bottom descendants inherit both, whereas actors,
life and tutorial inherit the root once. The four setup child transforms survive.

Existing constructor/pose RNG order is preserved. Fresh wave births still use
authored background scale1; this change does not reintroduce future wave.scale
into spawn coordinates. Stage notification counting is separate from World Run.

## Under-avatar input and deliberately unresolved setters

`TankData._‑ZD()` is **not** `GetLargestRadiusFromRegistration` or
`World.protectionRadius`. Qualified `TankData.pcode:2739–2856` /
`TankData.as:576–596` starts maximum0 and scans stored `arrTankDetails` X/Y/radius:
ordinary square/multiply/add/sqrt, then detail.radius, then a strict greater-than
update. `ImportTankData`/detail construction retain the serialized radius
(`TankData.as:382,439`; existing catalog import preserves that column).
`catalog.tankRadius` has a minimum10 and uses `Math.hypot`; it is not reused here.
Empty, small and NaN controls protect this distinction.

At PlaceAvatar/UpdateAvatar, `FieldDisplays.updateAvatar` copies and freezes the
numeric details and captures the actual avatar identity. It computes `_‑G9`
as radius*2, then `_‑Q0` adds45 (`BTAGameWorld.as:1024–1097`;
`AvatarInterface.pcode:1871–1900`). These values do not get remeasured from a
later degraded/replaced actor.

`_‑DF` requests width then height on the retained `_‑0B`, followed by width then
height on latest-next when present. Each immutable operation carries a sequence,
gameplay-frame counter, actual wrapper/under-bubble identity, copied sizing input,
previous effective pose and unresolved-predecessor flag. Promotion preserves
`_‑0B`; a later UpdateAvatar explicitly rebinds it. An old detached first-field
under-bubble can therefore continue receiving requests after several arrivals.

`UnderAvatarSizeResolver` is a synchronous numeric constructor seam (the final
optional `World` constructor argument). It must return qualified Number scale
results at the actual setter phase. Height sees the immediately preceding width
result. Without that resolver, requests remain visibly `unresolved` and
`requireResolvedGeometry(field)` throws `IncompleteFieldGeometryError`. Authored
scale1 still exists as retained initial data; it is **not** accepted as the
geometry resulting from an unresolved request. A late resolver is never allowed
to silently replay over an unresolved predecessor or measure a changed actor.
Bind the parent's qualified resolver before creating a live World; delayed replay
would require its own qualified captured-operation resolver.

The parent owns positive axis-aligned1544/1543 setter qualification and final
composition. No guessed circle, protection radius, current-width multiplication,
continuous AssetPack width, or authored-size fallback is substituted here.

## Setter arithmetic and original controls

`core/retained-transform.ts` retains Number scale/rotation caches separately from
float32 matrix columns and truncating signed-twip position setters. Pinned primary
mechanism sources are [Ruffle v0.7.1 display_object.rs](https://github.com/ruffle-rs/ruffle/blob/v0.7.1/core/src/display_object.rs#L490)
and [types.rs](https://github.com/ruffle-rs/ruffle/blob/v0.7.1/core/src/types.rs#L1):
Percent stores unit*100 and exposes percent/100. A scale write updates its own
matrix column; rotation rebuilds both with retained scales/skew. This narrow
finite-field implementation is not a general rotated width/height setter.
The tagged source is not an identified revision of the loaded compiled WASM.

A fresh preserved-original probe adds13 `BT3_FIELD_POSE` rows after all87 existing
beam/bounds controls, before original StopFiring and world detachment. It reuses
the original1542/1541 and the existing added empty containers. It does not replace
any original method, ABC, frame script, RNG function or timer. Added controls
cover authored/1.2/0.1/asymmetric0.3 setter columns and cached getters, root/bottom
scale chains at1/2/51/119 writes, and ten getter-readback position subtractions.
They qualify finite setter mechanisms, not ordinary lifecycle timing, complete
field geometry, under-avatar setters, Adobe behavior or full-game equality.

At write119, original root.scaleX text is `0.4166666666666692`, while matrix.a is
binary32 `0.4166666567325592`; replacing the getter with matrix.a or
`1 - frame/204` fails the regression. Original decimal formatting can differ by
one Number ulp from the exact binary32-to-Number expansion (e.g. control101).
Tests decode the trace's matrix coefficients back into their declared binary32
type; the frozen raw trace remains unchanged. Number getter expectations compare parsed original trace text and are not
float32-rounded. Decimal formatting does not establish the exact original f64
word; these controls do not claim binary word equality for Number getters.
Under-avatar setter expectations remain unbound pending the parent's binary
ByteArray qualification. Prior eight measured field widths also pass through the new
retained matrices and the existing qualified leaf-twip visitor, without binding
that visitor to a partial field population.

Pinned SHA256 inputs:

| Input                 | SHA256                                                             |
| --------------------- | ------------------------------------------------------------------ |
| Original SWF          | `f5827841c682f988f23dcf470ab4ab59c1ffc497acb4ca0f21077d03f942c153` |
| BTAGameWorld.pcode    | `eda20420933f4bd87fe9dce652428c3dde3a4bc6e0ee31702325fcdb3c9dba0b` |
| AvatarInterface.pcode | `d5878da5caacba0ec2b83c02283a828036a5d83d22c88ae1d05d332fc7426e05` |
| _‑0D.pcode            | `5b30ed4cca2a726a56569c8da70a24c652282c92836692cdbd6fd1f97fc8b5ae` |
| TankData.pcode        | `4f1eec91c07616eaa1895078047c1423a21ce0253192d61161dfdc8f120491f0` |
| Extended probe        | `d5aea9119ed4a2cc7e421b676e053d1d1121d108f279565227c28304219c3061` |

REA evidence is
`ev_815ac08f9df90df5e68e9a3136d2866bc6e6b124e6424ea83737d1d1f14a24e7`.
All declared actions complete; independent REA DOM equals the collector's new13
rows and prior87 rows. Preservation verification retains all3022 original tags,
their payloads/order, both original ABCs, header and non-document bindings;
only the document binding changes and one new ABC is appended. Loaded viewer and
three Ruffle module byte identities match installed bytes. Re-emission is
byte-identical. Missing/changed field rows and changed module digests are rejected.
No page or AVM errors occurred; retired-service CSP errors remain visible.
REA marks missing event coverage and `equality_eligible=false`, so this is not a
whole-runtime equality certificate.

## Reproduction, regression and remaining composition

The read-only repeatable importer writes numeric placement metadata only:

```sh
bun tools/import-field-display.ts /home/ian/Projects/ianwijma/documented-bubble-tank-3
bun run format
bun run check
```

No shape paths, images, audio, SWFs, dependency/build output or runtime captures
are committed. Private artifacts are confined to
`test-results/field-wrapper-state/`: source hashes, private probe extension and
verifier, emissions, capture/scenario/trace/payload proof, rejected mutations,
fail-before/final tests, build/E2E logs, isolated configuration and process records.
The probe extension/verification copy changes no tracked browser-capture tool.

Against the prepared World's implementation, new wrapper regressions fail on11
missing-owner contracts while five independent numeric-model controls pass.
The complete suite retains all prior assertions. Tests cover source setter order,
first/new/cache identities, tutorial parent/frame, immutable shared metadata,
ordinary/transit motion, retained mask latch, orphan/detached stage clocks,
captured-reference sizing, ordered unresolved requests and collapse ancestry.

The parent must still compose actual ordered actors/pickups/effects, retained
native caption/child poses and exact text/shape geometry for both supplied/mock
paths, then enforce completeness and bind the width/hit consumers. The model's
`'world'` parent marker must be combined with the actual World/Main transform
chain by that adapter; it is not a parent-to-stage matrix. Renderer integration
is unchanged. Root placement currently records the existing caller's legacy
separation values; the source's two live field width reads and subsequent mask
width/height separation require the complete parent service. No claim is made
that these legacy spacing numbers are qualified exact, or that the prior finite
415-versus421 beam discrepancy has been repaired.

## Validation and cleanup

`bun run format` and `bun run check` pass:1,029 tests /9,030 assertions,
zero failures. The16 new regressions add149 assertions and preserve all8,881
prior assertions. The before-World run records5 passes/11 failures; the final
model/World suite passes16/16.

TypeScript/rule checks finish before the serial production build. The literal
affected browser gate is:

```sh
BT3_SWF_FILE=/home/ian/Projects/ianwijma/documented-bubble-tank-3/re/bt3/uncompressed.swf bun run test:e2e --config test-results/field-wrapper-state/playwright.config.mjs
```

Production build `kWiT8YiF-HwkW-D4SkQL9` and all12 cases pass, with zero skips,
retries or page errors. Existing crossing, collapse, actor-behavior, screen-effect
and accelerated boss/win specs run in both mock and supplied-SWF modes on private
3465/3466. Private `.spec.mts` copies differ only in fixture URL3102→3466; all
assertions are retained. These accelerated seeded control-frame galleries are
not an ordinary-input original playthrough or new renderer fidelity evidence.
An initial harness launch failed because Playwright used the private config
folder as the fixture command cwd; the corrected private config explicitly uses
the checkout cwd, then the whole literal build/E2E gate passes.

The original control uses only3475/9475. Its recorded server3325542, browser
launcher3327559, Chrome root3327588 and recorded renderer children have exited.
Playwright stopped its production/fixture servers, and3465/3466/3475/9475 are free.
All nine pinned research source inputs are unchanged; protected master/legacy
refs match the task's pinned hashes. The temporary dependency link is removed before
local commit. The initial short-name ref inventory was empty because this
repository has no local master/legacy names; the corrected inventory verifies
origin/master and the three existing legacy aliases against the task hashes.
No renderer, TankView, tracked capture tool, protected ref, remote,
PR, deployment or merge is changed by this slice.
