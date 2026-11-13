# Live-field display population and ownership: local audit

Prepared on `12ff5b0115688be1a81ed4d3a8c598e2d391a38e`, above final PR144
`1ca0d1d91ac8bc4614e1565d62a3f50a5c9790e5`. This is a source/design audit,
not a complete field query or production repair. It changes no bounds arithmetic,
game rules, renderer, test assertions, original input, protected branch or published
stack. There is no push, PR, merge, deployment or sixth layer.

**Use one authoritative display owner, then project its current population into
two traversals.** Damage candidates, renderer filtering and effect request queues
are not display ownership. The existing `ActorParents` is the correct seam to
deepen, but its array reconciliation currently prevents it from being that sole
authority. A second array-derived tree would preserve that defect twice.

Read this with [the wrapper design audit](beam-wrapper-query-design-audit.md),
[original controls](beam-wrapper-geometry-reference.md),
[crossing contracts](crossing-source-reference.md),
[architecture](architecture.md) and [remaining fidelity work](fidelity.md).
Exact Script-bounds/setter arithmetic belongs to the separate arithmetic task.
This audit specifies inputs and phase ownership; it does not choose width rounding.

Later implementation status: [ordered actor ownership and renderer follow-up](actor-display-ownership-reference.md) supersede this audit's actor array-reconciliation and tank-renderer objections. Other field populations, exact transforms and complete queries remain open. The observations below describe the pinned audit base.

## Evidence and scope

Original paths below are relative to
`/home/ian/Projects/ianwijma/documented-bubble-tank-3/re/bt3`.
`P:` means `export_pcode/scripts/`; `AS:` means
`export_scripts_deobf/scripts/`. Pcode QNames and branch labels take precedence
over the decompiler's textual order. AS line numbers make callers easy to find.

The read-only preceding evidence is
`/home/ian/.t3/worktrees/open-bubble-tank/t3-3a822f7f/test-results/beam-wrapper-audit/`.
Its 70 original rows are reused as **prior** evidence, not rerun observations.
This audit's ignored `test-results/field-display-population-audit/` retains:

- `source-inputs.json`: original SWF and 16 qualified-pcode hashes, starting
  branch refs and implementation/test/tool hashes.
- `extract.mts`, `numeric-populations.json`, `extract.log`: repeatable extraction
  from the original through existing `decompressSWF`, `extractSymbols` and
  `buildDisplayList`; 41 population roots and 338 reachable symbol identities.
  Placements/bounds/styles are numerical; no original media is committed.
- `shape-summary.mts`, `shape-paths-private.json`: private contour evidence for
  the seven relevant field leaves. This is ignored source material, not a shipped
  asset or a proposed circle fit.
- `collect-callers.py`, `effect-callers.json`: 98 source scheduling/registration
  sites, including inherited projectile variants and direct engine calls. Local
  variables remain excerpts rather than guessed constructor identities.
- `*-methods.json`: qualified method/setter indices; `ownership-probes.mts` and
  `ownership-probes.json`: five synthetic observations of the current host seam.

No browser, reference server or game server was started. No original method,
frame script, input byte, RNG function or source file was patched. This is not an
Adobe comparison, new original-runtime observation or ordinary-play reachability
claim. The debug helper discussed below is deliberately not promoted to a normal
population.

## Complete field slots and exclusions

Symbol1551/frame1 has the following authored children. Placement translations
are **twips**, not pixels. All matrices are identity except the noted exterior
mask. Authored `cacheAsBitmap` is retained metadata, not permission to substitute
painted alpha or padded raster extents for either geometry traversal.

| Field slot                                     | Authored contents and initial instance state                                                                                                                                                               | Dynamic population / actual owner                                                                                   | Query treatment                                                                                                                                                      |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Depth1 `BF_BG_mc`1537, cached                  | Shape359 at matrix `[-0.995391845703125,-0.092559814453125,0.092559814453125,-0.995391845703125,5434,6972]`, alpha multiplier0.078125; shape1536 at identity.1536 declared bounds±8505twips, 60twip stroke | No discovered runtime insertions                                                                                    | Retain both leaves. Radial fill transparency does not erase geometric fill; bounds include declared stroke                                                           |
| Depth4 `effect_mask_under`1539                 | Shape1538, declared bounds±8475twips                                                                                                                                                                       | Masks depths greater than4 through8, including depth6                                                               | Restricts contributed shape hits; mask geometry still contributes to Script bounds                                                                                   |
| Depth6 `effectLayer_under_mc`1540              | Authored empty clip                                                                                                                                                                                        | Runtime child `_-Rt`117 from World `_-L9`; its registered bottom effects                                            | Field descendant, inside depth4 mask. Empty container alone contributes no leaf                                                                                      |
| Depth10 `_-SQ`1542                             | Shape1541, declared bounds±13919twips; authored scale0.9924774169921875, translation(-1,-1)twips, then World rotation180                                                                                   | Masks depths greater than10 through14, including depth12                                                            | Exterior contour is asymmetric/cut geometry, **not a disk**. Keep its current per-instance rotation and setter state. Script traversal includes the full mask bounds |
| Depth12 `avatarUnderBubble_mc`1544             | Shape1543, declared bounds±1010twips; 20twip stroke                                                                                                                                                        | Authored under-avatar bubble, resized/repositioned by AvatarInterface/World; no discovered runtime actor insertions | Field-owned geometry, masked by `_-SQ`. This is not the avatar or an empty placeholder                                                                               |
| Depth16 `lifeBubbleLayer_mc`1545               | Authored empty clip                                                                                                                                                                                        | `_-Bd`1816/value1, `_-Oh`1817/value5, `_-5A`1820/value50, in actual birth order                                     | Field descendants; outside both field mask ranges                                                                                                                    |
| Depth18 `enemyLayer_mc`1547                    | Shape1546 at depth1, declared bounds±560twips; fill alpha0                                                                                                                                                 | Enemy and allied roots, later-field tutorial1667, conditional debug helper1669                                      | Keep the transparent helper. Dynamic children follow actual add/reparent order; outside both masks                                                                   |
| Depth20 `BF_over_detail_mc`1550, cached        | Four1549 clips, each containing alpha-zero shape1548 with declared bounds±115twips. Named bottom/top/right/left origins at(0,6340),(0,-6340),(6340,0),(-6340,0)twips                                       | Used by nearest-exit selection and transit targeting                                                                | Helpers are retained geometry/bounds, despite being invisible; not just coordinate constants                                                                         |
| Runtime child directly on the first field root | Fresh `bfStartDisplay`1667 at(0,0), selected frame3 `tut_1`                                                                                                                                                | World `PlaceFirstBubblefield`, after the authored children                                                          | Field descendant, above authored slots, outside their mask ranges                                                                                                    |

The depth-mask ranges do not extend to later runtime root children. A dynamic
child added inside a masked slot inherits that slot's mask; a world sibling does
not. Masks themselves are not unconditionally OR-ed into a shape hit. Invisible,
zero-alpha and masked leaves still belong in the Script-bounds traversal. Preserve
declared shape/morph bounds and empty frames independently of paint.

| Object / engine layer                                                         | Actual parent and constructor                                                     | Include in the field receiver?                                                                         | Source                                                                                                                            |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| Bullet `_-00` / next `_-Hm`                                                   | Empty `_-dl`1781, added to **World** by `_-Ii`; `_-0D._-CH` is a reference to it  | **No**, including beams, mines, turrets, builders and helper fragments                                 | `P:BTAGameWorld.pcode:7573–7625`; `P:_-0D.pcode` `_-54`, `SpawnNewBullet`; `AS:_-0D.as:1077–1088`                                 |
| Top `currEffectLayer` / next `_-68`                                           | Empty `_-My`1718, added to **World** by `_-XS`                                    | **No**                                                                                                 | `P:BTAGameWorld.pcode:3694–3748`                                                                                                  |
| Bottom `currEffectLayer2` / `nextEffectLayer2`                                | Empty `_-Rt`117, added to **the chosen field's `effectLayer_under_mc`** by `_-L9` | **Yes**, only for that actual wrapper                                                                  | `P:BTAGameWorld.pcode:2732–2820`, especially `ofs0067 → ofs0056 → ofs0046` for next and `ofs0039 → ofs0027 → ofs0018` for current |
| Screen `_-Uy`                                                                 | New MovieClip added to **World**, moved to the top on attachment                  | **No**                                                                                                 | `P:BTAGameWorld.pcode:1551–1570,8769–8773`; `AS:BTAGameWorld.as:418–423,1808,1855`                                                |
| Avatar `myAvatar`                                                             | World child, replaced by PlaceAvatar                                              | **No**, including its shields/status/forcefield. Only the distinct1544 under-bubble belongs to a field | `AS:BTAGameWorld.as:1024–1097`                                                                                                    |
| Highlight `_-JZ` / next `_-Qd`                                                | `_-Zs`1780, World child                                                           | **No**                                                                                                 | `AS:BTAGameWorld.as:1092–1095,1841–1849`                                                                                          |
| Radar, enemy bars, ally rings, HUD, minimap, dialogs, Main flashes/background | Interface/World/Main siblings or separate browser services                        | **No**                                                                                                 | `AS:_-ct/AInterfaceRadar.as:83`, `_-ct/_-Yb.as:90`; existing architecture/service boundaries                                      |

Qualified pcode proves the lower-layer exception. Saying that all effects are
World siblings is as incorrect as including every `FieldRuntime.effects` entry.

## Runtime population and lifecycle matrix

| Population                          | Creation / attachment and pose                                                                                                                                                                                          | Active and retained lifetime                                                                                                                                                                                   | Removal / ownership transition                                                                                                                                                                           |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fresh wave actors                   | World `AttachNewBubblefield` invokes `_-WZ → _-Ar`; `TankData._-Tr(3,world)` completes before X/Y/rotation assignment. `_-Ar` adds the root to enemyLayer, sets callback, appends raw array                             | Raw arrays drive Run/acquisition, actual parent drives display. Enemy and ally births interleave in the same layer                                                                                             | Explicit RemoveEnemy / `_-aT` removes the root; array replacement is not removeChild                                                                                                                     |
| Runtime enemies                     | World `SpawnEnemy` and spawner `_-ct/_-1k.PartCallTrigger` call **currentBFTarget** `SpawnNewEnemy`; construct, assign emitter X/Y, addChild, callback, state1, append                                                  | Birth has no projectile crossing gate; setup may consult outgoing populations even when another wrapper is running                                                                                             | Same callback/removal contract as wave actors; retain source current-wrapper choice                                                                                                                      |
| Runtime allies                      | `_-ct/_-Va` and `_-ct/_-AW` call currentBFTarget `SpawnNewAlly`; same add-before-array order, imported life forced15                                                                                                    | Display membership begins synchronously at addChild, including interface-phase births before a field Run                                                                                                       | `_-aT` flushes the ally callback queue at field head and again after pickup Run; no dead-flag display filter                                                                                             |
| Cached enemy references             | World `_-4j` caches raw `mc,xLoc,yLoc,rot` and background scale; future attachment creates a **fresh field**, then `_-G0` writes saved pose and reparents existing roots                                                | Old arrays may still reference the same actor. `_-G0` changes callback and offensive primary target; does not reconstruct TankData or restore cleared children                                                 | addChild removes from old actual layer and moves to the end of the new layer. Previously queued removal remains in its old queue and can fail on the wrong parent                                        |
| Raw queued deaths                   | Damage/finals run while data is live; `_-Zx.Deactivate → TankData.Deactivate → WipeTank` removes **every actor child**, then clears data/movement, sets death latch, invokes callback                                   | Empty outer root remains parented and may enter raw cache. A host `dead=true` without WipeTank is a different synthetic state                                                                                  | Queue flush explicitly removes outer root. Never resurrect body geometry from design, and never use `!dead` as the ownership predicate                                                                   |
| Actor parts                         | `TankData._-Tr` adds authored part instances in detail order, applying X/Y, scaleY then scaleX, rotation and name before registering weapons/behaviors                                                                  | Hull rotation plus per-mount live aim and independent clip clocks; hidden degraded bodies remain children; carrier detach removes its actual child                                                             | Explicit carrier removal, WipeTank or actor removal; `removedParts` and `displayChildren` retain separate meanings                                                                                       |
| Status decorations                  | `_-Zx.EffectMeCrazy` removes prior set, chooses positions/rotation/variants, adds each mark to the actor                                                                                                                | Sticky1832, stun1761, jam2226, weaken2407; stopped root variants still have independent child clocks, stun can play. Suppressed by `blnHasForcefield`                                                          | `_-JJ` removes marks on replacement/expiry; WipeTank removes them on teardown                                                                                                                            |
| Infection                           | `_-14/_-U4.BulletCallCollisionDetected` sets infection, adds1738 under **the contacted actor**, assigns scale `radius*1.5/36` and rotation, changes cache/filter                                                        | Independent retained nested1737 animation; parent status/filter alpha does not define geometric membership                                                                                                     | WipeTank / actual root removal. Do not confuse with the hidden infection projectile in the sibling bullet layer                                                                                          |
| Shield film and hit clips           | `AGunShield` adds1773 hit once per mount initialization, then1774 film under owner; `_-ct/_-DO` adds367 hit and2452 film for a mature turret                                                                            | Size and generation belong to actual created clips. Final-frame hit clip remains attached; immunity ending does not necessarily detach film                                                                    | KillShield removes film; turret false-shield transition removes film but can leave old hit children after clearing its pointer. WipeTank removes all. Engine clearing skips callbacks and can leave film |
| Forcefield                          | `APassiveForcefield.Setup` constructs2207 under owner, adds a fresh complete `_-Tr(0)` clone inside it and sets `splash_mc.mask=clone`                                                                                  | Clone parts have independent poses, unaffected by subsequent body degradation/detachment. Splash width then scaleY follows source sizing; Run can move the entire forcefield to top                            | FinalPartCall physically removes field. Runtime mask cuts splash shape, but Script traversal includes splash and silhouette geometry                                                                     |
| Life pickups                        | Every SpawnLifeBubbles branch constructs denomination, assigns X/Y/rotation, **adds to lifeBubbleLayer**, then Setup(callback,avatar), then `_-Ym` append                                                               | Scatter/attract/latch Run plus separate retained stage animation;1816/1817 frame1 select rounded-random0–10;1820 has31 frames. Current renderer's `stats.frames+uid` is not a retained pickup constructor pose | `_-PL` collection, `_-8A` outside callback, `_-Yz` bulk cleanup explicitly remove. Forced collection only changes movement flags. UpdateAvatarRef changes reference, not parent                          |
| Tutorial                            | First field direct-root frame3; subsequent fresh wrapper **enemyLayer** child before enemies. Select before incrementing unique-field counter:1→frame4 `tut_2`,2→frame5 `tut_3`,3→frame6 `tut_4`, otherwise frame2 `ag` | Fresh clip on **every attachment**, including revisits. Frames1–6 stop; frame1 arena text and empty frame7 are authored but have no selected base-game caller here. Nested artwork retains identity            | Dies with wrapper detachment, not completion. Do not put it into actor membership or the raw enemy array                                                                                                 |
| Conditional debug look-ahead helper | `_-Zx._-B4` can add `_-F9`1669 to `this.parent`, positioning30×speed+radius ahead                                                                                                                                       | Private `_-QE` is set false in Setup, with no true assignment in inspected base AS/pcode. Field child if enabled on NPC, World sibling if enabled on avatar                                                    | No discovered removeChild for `_-LA`; Deactivate only clears the pointer. Keep as conditional/unreached evidence, not an ordinary required spawn                                                         |

Key proofs: `P:_-0D.pcode:371–554` (`_-G0`),2061–2142
(`SpawnNewEnemy`),2190 onward (`RemoveEnemy`),2641 onward (`Run`),
3316 onward (`TankCallback`),3390 onward (`SpawnLifeBubbles`),
4789–4908 (`Deactivate`),4910 onward (`_-aT`),5904 onward
(`SpawnNewAlly`),6354 onward (`_-Ar`);
`P:TankData.pcode:432` (`Deactivate`),2149 (`_-Tr`),2977–3041
(`WipeTank`); `P:_-Zx.pcode:3514` (`Deactivate`),5876 (`EffectMeCrazy`).
The protection/status callers above have their own package-qualified pcode
files, pinned in the manifest where listed. Do not substitute the similarly
named wrapper classes in other packages.

## Effects: registration owns the clip, not the request

`_-0D.AddEffectToQueue` stores the **actual constructed clip reference**, supplied
X/Y, layer name, random-rotation flag and callback in `_-I4`. It does not add a
display child. Source guard `gWorldRef.blnGameOver == true` means the live-world
latch here: World initializes it true and clears it on game-over; do not invert
the condition based on its name.

`TriggerEffect → _-2c.CreateEffect` selects the currently registered layer by
string through `_-Z7`, applies optional random rotation and X/Y/name, adds the clip,
then registers its completion record. Pcode `CreateEffect` at237–339 follows
`ofs0072 → ofs0069 → ofs0060 → ofs004f → ofs003f → ofs0023 → ofs001b`.
It neither reparents to the queueing wrapper nor converts the supplied X/Y.

| Registered destination        | Effect roots / concrete callers                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Consequence for the field query                                                                                                                   |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bottom, field descendant      | Explosion1746 (`AvatarStickyBomb`, `_-Un`, `_-dp`, `_-Zx._-b3`); mine1834 (`_-U9`, `_-M1`, `_-QI`, `_-XK`, mine-cap callbacks); damage burst1745 (`EnemyFlakBullet`, `_-JU`, `_-QI`, `_-To`, `LockOnMissileAvatarBullet`); rocket trail2175 (direct engine calls in `_-Kk`, `_-To`, `LockOnMissileAvatarBullet`); area1789 (`_-ct/_-31`, `_-Ko`); teleport1769 (`_-1W`, `_-QQ`); conversion1735 (`AGunConversion`); ripple52 (`_-GG`); neutralize2212 (`EGunNeutralizer`, immediate TriggerEffect); burst2295 (`_-QI`); Phaser impact2291 (`PhaserBeam`) | Include only while physically registered under this wrapper's117 lower container. Retain actual clip transforms and current nested frames         |
| Bottom empty callback carrier | Massive Cannon1801/26 frames (`_-ct/_-YM`, callback `_-AL`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | It is a field descendant even though every authored frame is empty; contributes no geometry but owns completion timing                            |
| Top, World sibling            | Impact1723 (base `_-BL` plus subclasses); seeker explosion1767; leech1740 (`_-El`); shock2378 (`_-6s`) and shock2395 (`_-Ix`)                                                                                                                                                                                                                                                                                                                                                                                                                            | Exclude even when their request came from this field. Shock selected inner frame, width and rotation are per-instance, not static symbol defaults |
| Top empty callback carrier    | Shield1828/25 frames (`AGunShield`, callback KillShield)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Exclude from field. Separate owner-attached film/hit children follow the actor's parent chain                                                     |
| Screen, World sibling         | Ink11 (`_-ar`), Apocalypse2173 (`_-6`, immediate TriggerEffect), collapse flash114 (`_-0D.Destroy`)                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Exclude. Main flash/shake is another separate service, also excluded                                                                              |

Per-instance modifications exist **before queuing**: EnemyFlak scales its burst0.5;
Phaser impact can scale1.5 and rotates to the beam; shock holds an inner random
frame and sets width/rotation; rockets draw a two-pixel segment into retained
`line_mc` with a previous-point offset. A `{symbol,age}` reconstruction loses
these writes. Dynamic drawn line geometry must be part of the same clip snapshot
used by both traversals. Some original effect roots are not represented by
`data/effect-art.json` (notably2291/2295 and top shocks); a table of supported
renderer effects is not the exhaustive source population.

During transit World runs current then latest-next field, then the single effects
engine. The engine's top/bottom layer registration remains outgoing until
promotion, so a request flushed from next can create a **current-field bottom
descendant**, at the supplied next-local numbers. Next's empty lower container
does not acquire that request. Direct rocket trail/neutralizer registration takes
effect synchronously and can be seen by later queries in the same field frame;
queued impact geometry does not appear until the field's tail flush.

`_-2c.Run` polls currentFrame against totalFrames. `_-9p` invokes callback
**before** removing the carrier (`P:_-2c.pcode:1664–1676 → ofs004c`);
`_-8Y` removes registered clips without completion callbacks. Keep clip attachment,
request scheduling, stage advancement and callback polling separate. Arrival
clears the global engine before unregistering old top/bottom layers; only after
promotion are next layers registered. Do not infer global engine ownership from
the current host's per-runtime `effects` or `pending` arrays.

## Setup, movement, arrival and collapse phases

1. **First field:** construct1551; add to World at(0,0); mark first; construct
   tutorial at root; bind World; `_-0D.Setup` only stores Main; assign
   currentBFTarget; rotate `_-SQ`180; create sibling bullet/top, nested bottom
   and sibling screen; bind/register layers; stop tutorial at `tut_1`.
   The authored exterior-mask scale is preserved. Proof:
   `P:BTAGameWorld.pcode:1445–1645`; `P:_-0D.pcode:2575–2606`.
2. **New/revisited attachment:** construct fresh1551 and tutorial; add tutorial
   to enemyLayer; bind World; select tutorial using pre-increment count. Restore
   cache via `_-G0`, or choose wave and invoke `_-WZ → _-Ar`. Population creation
   therefore precedes the four size setters. `_-Ar` samples X/Y using the
   background's **then-current authored** scale, not the future wave scale.
   Proof: `P:BTAGameWorld.pcode:7893–7910,8073,8116,8145,8433–8478`;
   `P:_-0D.pcode:6413–6429,6462–6473`. The current host multiplies fresh spawn
   positions by `wave.scale`; this is a separate source-order contradiction,
   not corrected or promoted to a new runtime finding here.
3. **Four child setters:** scaleY then scaleX on effect_mask_under, `_-SQ`,
   BF_over_detail, BF_BG, in that order. They replace authored child scales;
   root/enemy/pickup/avatar-under layer scale stays independent. Read both live
   field widths to compute separation, then assign X/Y, add field to World,
   rotate `_-SQ`180, call Setup and assign nextBFTarget. Create next highlight
   at next position/scale; `_-Ii` and `_-XS` initially copy **current** field X/Y;
   `_-L9` nests under next; bind bullet layer; reorder; raise screen.
   `P:BTAGameWorld.pcode:8433–8775` supplies setter/attach branch order.
4. **Movement / under-avatar state:** `PlaceAvatar` gives AvatarInterface
   `_-Q0 = TankData._-ZD()*2`; `_-Q0` stores that value+45. UpdateAvatar binds
   `_-0B` to the current under-bubble, then `_-DF` sets **width then height**.
   Transit advances field translations, compensates current under-bubble X/Y,
   projects next under-bubble X/Y and calls `_-DF`. This method sizes its
   retained `_-0B` reference plus next; do not silently rebind the reference at
   promotion. `_-Xa` rotates next mask0/180 from avatar-relative X and current
   mask using `_-WU`'s retained crossing latch. Normal movement invokes it too.
   Preserve the asymmetric contour and -1twip translation. Proof:
   `AS:BTAGameWorld.as:1024–1097,1201–1306,1334–1388,1467–1500`;
   `P:AvatarInterface.pcode:1871,4448–4519,5381–5389`;
   `P:BTAGameWorld.pcode:6828` (`_-Xa`).
5. **Field Run:** flush enemy/ally queues; run live enemies, live allies,
   live bullets; drain bullet removals; pickup collision then pickup Run;
   flush ally callbacks again; completion; effect queue flush; timers. An area
   cleanup can explicitly flush enemies earlier. A query must see all prior
   same-frame attach/remove/reparent writes, not a frame-start paint snapshot.
   World interface precedes field combat; avatar Run and engine polling follow
   the field pass. Branch selection and known listener errors remain intact.
6. **Arrival:** StickyBombReset and CleanUpShield; global effect clear without
   callbacks; unregister top/bottom; outgoing Deactivate; remove outgoing
   bullet/top siblings, nested lower container and field root; cache the raw
   enemy/pose records; promote next and bind its existing bullet/top/bottom;
   register top/bottom; remove old highlight/promote next; then SnapBackAllObject
   positions current under-bubble and `_-Xa` updates masks. Completed Deactivate
   clears bullets/pickups/data queues; uncleared Deactivate does nothing.
   It does not generally remove every enemyLayer child. Cached actors retain
   detached parent chains until later reparent/removal. Superseded next wrappers
   remain stage-attached but are not combat-active. Proof:
   `P:BTAGameWorld.pcode:1055–1443,5290` (arrival branch);
   `P:_-0D.pcode:4789–4908`; existing crossing evidence.
7. **Collapse:** DeathAnimPart2 captures `scaleChange = root.scaleX/204`.
   Each independent ENTER_FRAME performs the chained X writes, then Y writes:
   avatar, **nested bottom**, sibling top, sibling bullet, sibling highlight,
   field root. Every recipient receives the source scalar; do not multiply its
   previous scale or apply one uniform field-scale property to everything.
   Bottom is scaled **twice through ancestry** (root and its own container);
   tutorial/enemy/pickup/under-bubble are scaled through the field root once.
   Four Setup children keep their own transforms. Avatar is a sibling with
   separate X/Y compensation. On completion remove shrink listener, reset
   avatar pose/scale, set field/highlight alpha0, clear bullets and Destroy.
   Destroy damages actors, marks `arrEnemies=["destroyed"]`, invokes Deactivate
   and attaches a new field; do not treat replacing the array or alpha0 as
   removing the old layer's children. `P:_-0D.pcode:590–636,699–906,908`
   and `AS:_-0D.as:1424–1457` are the relevant contracts.

The previous original controls distinguish first authored width1381.4 from
four-child scale1 width1391.9. They also show that multiplying an already measured
width is insufficient for root scaling. None of the above prescribes a new
rounding formula; all width/height setters and traversed leaf transforms must use
the arithmetic child's independently validated rules.

## Concrete architecture and API

The proposed additions are finite field slots and an engine registration boundary,
not an application-wide scene graph. Keep three existing authorities:

- **`ActorParents`** owns actual ordered actor membership, parent/rooted state and
  coordinate ancestry. Expose a synchronous read-only ordered iterator from its
  own membership. `attach` moves to the end even within the same parent; `detach`
  is explicit. Array reads never remove/reparent an already owned clip.
- **Each live wrapper** owns root transform, the eight authored slot instances,
  tutorial instance/selected frame, under-avatar state, pickup attachment order
  and its nested lower-container identity. The map cache stores enemy references
  and pose scalars, not this wrapper state. Keep initial/new/collapsing states
  distinguishable; `Field.scale` alone cannot describe them.
- **One world effects registry** owns registered layer handles and ordered
  attached effect records. Queue records refer to preconstructed effect instances;
  FieldRuntime may keep its request queue. A registered record remembers the
  actual resolved layer handle/field identity, never derives it later from the
  queue's field or currentBFTarget. Pending completion refers to that same record.

An immutable query projection may copy numeric pose data, but it never becomes
a second owner. Read it synchronously at each width/hit operation; do not retain
it through callbacks that can damage, spawn or reparent. A display revision can
invalidate cached projections at every relevant mutation. Queries themselves
must not change ownership, draw gameplay random values or advance a second clock.

Illustrative TypeScript contract (a design, not an implemented export):

```ts
type FieldSlot =
  | 'background'
  | 'underMask'
  | 'underEffects'
  | 'exteriorMask'
  | 'avatarUnder'
  | 'life'
  | 'actors'
  | 'detail';

interface FieldDisplayRead {
  readonly field: Field; // wrapper identity, not map coordinates
  readonly revision: number;
  readonly rooted: boolean;
  readonly root: Readonly<NumericDisplayPose>;
  readonly parentToStage: Readonly<NumericDisplayPose>;
  authored(slot: FieldSlot): Readonly<ClipInstanceRead>;
  tutorial(): Readonly<FieldDecorationRead> | undefined;
  conditionalHelpers(): Iterable<Readonly<FieldDecorationRead>>;
  actors(): Iterable<Readonly<ActorInstanceRead>>; // ActorParents authority
  pickups(): Iterable<Readonly<PickupInstanceRead>>; // actual life slot order
  lower(): Readonly<EffectLayerRead>; // concrete117 instance
}

interface LiveFieldDisplay {
  read<T>(field: Field, visit: (state: FieldDisplayRead) => T): T;
}

interface FieldDecorationRead extends ClipInstanceRead {
  readonly parentSlot: 'root' | 'actors';
  readonly attachmentOrder: number;
}

interface FieldQueries {
  scriptWidth(field: Field): number; // field receiver's parent coordinates
  hitPoint(field: Field, globalPoint: Readonly<Vec>): boolean;
}
```

`NumericDisplayPose` contains current per-instance transform/setter state;
`ClipInstanceRead` identifies symbol, current root/child pose generations, dynamic
drawn geometry and mask bindings. `ActorInstanceRead` references the existing
actor identity plus its retained `displayChildren` and independent part/status/
protection poses. It is **not** a freshly reconstructed tank design or merely a
pre-unioned actor AABB. `EffectLayerRead` reads the engine's physically attached
records and preserves pre-queue transformations and dynamic geometry.

The existing authorities expose ordered read projections without exporting mutable
Sets. Actor reads carry their owner's attachment ordinal. Tutorial/conditional
helper reads carry their actual parent slot and ordinal, so the adapter inserts
the first tutorial after the authored root children and the later tutorial before
subsequent actor births. Reparent/addChild updates that ordinal. Merge these
projections for traversal; do not persist the merged result as another membership
index. A conditional NPC look-ahead marker retains its own sibling handle if that
unreached branch is ever enabled; clearing its actor's pointer does not detach it.

Concrete mutation boundaries are `ActorParents.attach/detach/owned(field)`;
wrapper creation/under-bubble setters/tutorial selection/pickup attach-detach;
and effect-engine `registerLayer`, `unregisterLayer`, `createEffect`,
`clearWithoutCallbacks`, `pollCompletion`. `createEffect` resolves a registered
layer once and records attachment before scheduling completion. The normal
completion path calls back while attached and removes afterward. These operations
update a display revision synchronously, including mutations inside callbacks.
The per-field request queue remains scheduling state and is never enumerated by
`lower()`. Explicit wrapper detach changes rooted ancestry while retaining its
owned children and their last parent transform.

`parentToStage` includes the actual source World/Main translation and transform
chain; field root scale is separate. Browser-only user zoom/pointer conversion
must be an explicit adapter, applied consistently to query coordinates and stroke
transforms. Do not call an unscaled `ActorParents.fieldGlobal` result a complete
collapse transform, or bake zoom into Script width in the receiver's parent space.

AssetPack supplies a `FieldDisplaySource` over these reads: authored placements,
shape/morph/text geometry and timeline definitions, plus the already retained
part/status/infection/forcefield clip identities. The simulation retains only
numeric identity/pose/ownership state; no Pixi, DOM, canvas or AssetPack reference
belongs in `World`/`ActorParents`. Browser composition may use AssetPack's current
canvas geometric leaf adapter. A deterministic mock adapter must read equivalent
numeric imports; a radius fallback cannot be advertised as this complete service.

The adapter recursively enumerates authored children plus only the finite dynamic
slots above. Both traversals consume that **same** instance/ownership read:

- Geometric hit: preserve ancestor transforms, current nested poses, fill/stroke
  contours and depth/runtime mask conjunctions; do not contribute mask paint as
  ordinary content. Preserve alpha-zero/hidden geometric contact contracts.
- Script width: transform every retained leaf with the arithmetic service before
  union; include mask geometry, hidden children and unclipped descendants;
  exclude raster padding/filter growth; distinguish empty from absent. Do not
  transform an already unioned box as a general replacement for leaf traversal.

Store instance overrides separately from cached `DisplayPlacement`/matrix objects:
for example, an instance/depth/birth-generation keyed effective transform owned
by the wrapper/clip instance. Replacing a timeline child invalidates that child's
override; merely querying a shared placement never changes it. A setter applies
to the retained effective instance state via the arithmetic module. Never write
`placement.matrix.a = scale`, multiply away the authored first-field state, or
mutate AssetPack's cached `displayList` result. `SwfClip.sync` currently assigns
shared placements; this is a demonstrated hazard, not a supported override API.

## Actual callers to migrate before integrating a query

| Existing host seam                                                     | Required ownership/pose transition                                                                                                                                                                                                           |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `World` constructor, `jump`, `runtimeFor`                              | Create fresh field display identity and stopped tutorial before population/size setters; retain orphaned wrappers and detached parents separately from map cells                                                                             |
| `World.spawnEnemy`, jump's restored/fresh enemy loops                  | Explicit attach immediately at source addChild phase; callback/array writes remain separate. Preserve construction-before-pose draws and then-current background scale                                                                       |
| `weapons.ts`3007/3016                                                  | Replace raw `world.allies.push(createTank(...))` with a spawn method that applies source addChild/callback/state/append order. Currently attachment can wait until sync/tickActor                                                            |
| `ActorParents.sync`, `World.tickActor`, test fixture setup             | Stop treating arrays as removals or authoritative order. Keep a deliberately separate fixture import path for initial unobserved raw actors, then make every production birth explicit. `sync` should update ancestry/rooted transforms only |
| `flushEnemyRemovals`, both ally flush sites, WipeTank, carrier release | Remove only at explicit source phase; preserve wrong-parent failure before successful detach, empty raw deaths and stale queued callbacks                                                                                                    |
| `spawnPickups`, `collectPickups`, pickup outside callbacks/bulk clear  | Retain instance stage pose at birth and explicit life-layer membership through callbacks; no `stats.frames+uid` substitute                                                                                                                   |
| `addCombatEffect`, `registerEffect`, `pollEffects`, `pending`          | Retain preconstructed clip identity; resolve actual registered parent at registration; callback-before-remove; global clearing skips callbacks. Distinguish next's empty lower container from outgoing registered layer                      |
| `interfaceFrame`, movement/transit, player replacement, collapse       | Record under-bubble width/height/X/Y, mask rotation/latch, four child setter state, root and separate lower/sibling scales at the source phase                                                                                               |
| `advanceArtwork`, `tank-art.ts`, AssetPack clip caches                 | Enumerate actual attached members/registered clips, including display-only actors and orphan wrappers, not filtered raw lists. Advance once on the shared stage and retain pose generation through stopped roots                             |
| `FieldCaptions`, GameRenderer, CombatEffectsView, TankView             | Consume the same owner/projection identities when integrated. Existing flat rendering groups and `!dead` filters are presentation approximations, not a query population specification                                                       |
| `tickDamageBeam`, later field/enemyLayer gates                         | Bind `FieldQueries` through the viewport/numeric service boundary; preserve dynamic per-loop width reads and line/mask/cap writes **before** field hit. Keep raw damage arrays separate, including their source index quirks                 |

## Present contradictions and integration objections

1. **No enumerable authoritative actor owner yet.** `ActorParents.sync` constructs
   `[...field.enemies,...runtime.allies]`, deletes links absent from that set and
   replaces the membership Set, losing explicit display-only members and original
   enemy/ally interleaving. The local probes show attach→sync loses a display-only
   actor; reparenting preserves old raw aliases while next array still contains
   the actor, then a next-array reset erases its actual link. A dead raw member
   stays parented until explicit detach. Those observations do not implement a
   correction. An accessor over the existing private Set alone is insufficient.
2. **The missing pose/population is wider than a background and enemy union.**
   Root tutorial versus enemyLayer tutorial, zero-alpha helper leaves, translated/
   resized under-bubble, rotated exterior mask, pickups, actual bottom effects,
   pre-queue effect writes, actor children and retained protection masks all have
   source callers. Full1551 static bounds or radius425 does not encode them.
3. **Current runtime queues are not parent records.** `registerEffect` pushes to
   current runtime, while `pending` can live on a request field; both need one
   registered-instance identity before a complete query can safely consume them.
   Simply filtering `effectQueue` by `layer === 'bottom'` admits unattached clips
   and assigns next-frame geometry to the wrong wrapper.
4. **Retained poses are incomplete outside actors/projectiles.** Field captions
   and combat effects have renderer-owned SwfSymbolViews; pickup paint derives
   age from global frames and uid. A query cannot manufacture these clips lazily
   with fresh random starts or let query order drive their stage age. Existing
   AssetPack actor pose helpers are useful but need a consistent instance/read
   boundary for dynamic field slots and drawings.
5. **Setup versus wave scale is an additional audit finding.** The source
   populates `_-Ar` before setting its background scale; host jump uses wave.scale
   in the X/Y draws. Fixing spawn ordering or geometry must not quietly change
   RNG count/order, target acquisition or include that unrelated correction as
   evidence of complete ownership parity.
6. **Exact arithmetic and pure mock geometry remain dependencies.** Previous
   native Number bounds disagree with original widths; this task does not repair
   them. Current field-geometry.json contains only raw transitDiameter1391.9;
   tutorial/effect tables are not complete field contact data. Imported numeric
   hierarchy/leaf bounds, exact source curves/strokes or a source-backed numeric
   contact representation, selected text/glyph geometry and reachable timelines
   must cover both mock and supplied paths. Bounds-only mock circles are not
   enough; no original media/dependency/build payload belongs in the commit.

For these reasons no isolated production correction is included. Removing sync
reconciliation alone changes fixture and production birth/removal behavior without
supplying the missing authoritative lifecycle. Publishing only an ownership
iterator would make an incomplete query easy to mistake for the whole receiver.
This audit instead supplies the exact seam and caller work for a coordinated
local draft after the arithmetic result is available.

## Required independent regressions and validation boundary

Before production integration, cover explicit attach absent from damage arrays,
same-parent reorder, enemy/ally interleaving, reparent with old raw aliases,
empty queued death/WipeTank, callback queue on old parent and wrong-parent failure.
Assert attachment immediately after an ally trigger, before another sync. Preserve
cache pose scalars, callbacks and orphan stage clocks independently of raw Run.

For field queries, use all authored leaves with positive omission controls:
background logo; alpha-zero enemy/detail helpers; under-bubble at an asymmetric
mask edge; first versus later tutorial parents/frames; pickup birth/held nested
frame/removal; bottom effect before queue flush versus after registration;
destination request registering under outgoing bottom; direct rocket dynamic line;
empty managed carrier timing; omitted bullet/top/screen/highlight/avatar siblings.
Reparent the same clip among enemy/under-avatar/under-effect slots: geometric hits
must change with masks while Script bounds retain unclipped leaves. Retain prior
finite421 versus415 beam mismatch and1391.9/1381.4 width controls as independent
original evidence, without turning them into fitted constants.

Check initial/new child scalings, `_-Xa`0/180 masks, under-bubble width/height and
movement, collapse's doubly scaled bottom, cached/deactivated wrappers and two
different field instances sharing one immutable authored placement cache. Compare
complete actor status/protection snapshots, including a retained forcefield clone,
an ended shield carrier with film still attached, and empty teardown. Assert that
repeated reads do not consume gameplay RNG, advance clips, mutate authored data or
change ownership. Require equal populations from hit and width projections even
when their geometry outputs differ.

Any integrated flow needs `bun run format`, `bun run check`, and the literal
affected `bun run test:e2e` with both mock and supplied SWF on the authorized
private3405/3406 ports. New original probes, if needed, use only3395/9395 and
preserve original bytes/methods/RNG with independent verification and owned-resource
cleanup. No production/browser flow is changed by this document, so no new
production E2E, original recording or full-game parity is claimed here.

## Local verification

`bun run format`, explicit Prettier formatting/check of this document, and
`bun run check` pass: TypeScript plus987 tests /8,791 assertions, zero failures.
The five ignored host observations pass with the existing ownership losses
recorded as defects, not desired assertions for a future implementation.
Re-extraction covers41 roots and338 reachable symbol identities. Original pinned
input hashes and all tracked implementation/test/tool hashes match the starting
manifest. No production rule or browser flow changed, so no build/E2E or runtime
parity result is claimed. Local reproduction of the retained artifacts:

```sh
bun test-results/field-display-population-audit/extract.mts
bun test-results/field-display-population-audit/shape-summary.mts
python3 test-results/field-display-population-audit/collect-callers.py
bun test-results/field-display-population-audit/ownership-probes.mts
```

Only this audit document is prepared for commit. The temporary dependency link
is removed before committing; no original media, extracted private geometry,
dependency install, capture or build output is included. Protected master/legacy
and final PR144 refs are checked against the starting manifest at handoff.
