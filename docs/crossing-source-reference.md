# Crossing frames, wrappers and cached actors

This audit covers the recovered base game's crossing and callback ownership. It does not establish a complete original playthrough, Adobe equivalence or the cause of the retained original/Ruffle `MoveAvatarToNewBubblefieldLocation` error.

The source is the sibling research repository's `re/bt3/export_scripts/scripts/` and `export_pcode/scripts/`, exported from the supplied SWF with SHA256 `f5827841c682f988f23dcf470ab4ab59c1ffc497acb4ca0f21077d03f942c153`. Read the bytecode when the exported control flow is malformed. Captures, source extracts and private diagnostics remain outside the committed tree.

## Ownership contracts

| Owner | Recovered behavior | Implementation |
| --- | --- | --- |
| Logical coordinates | Attachment saves the previous logical coordinates and advances the destination before arrival. A second attachment starts from that logical destination, while placement still measures the current wrapper. | `World.mapPosition` and the separately saved previous position |
| Current and next wrappers | Every attachment creates a fresh Bubblefield and guide clip, including cache hits. Only the current and latest next wrapper receive explicit field Run calls. | Fresh `Field`, `FieldRuntime` and `FieldVisit` instances |
| Superseded next wrappers | Replacing the next reference does not remove its previous wrapper or layers. Subsequent camera motion only moves the referenced current/latest wrappers. The abandoned wrapper retains its last stage-relative position. | `attachedFields()` includes retained wrappers; `activeFields()` identifies combat invocations |
| Enemy cache | Cache entries contain ordered actor references and captured x/y/rotation, not live wrappers. Arrival stores the current wrapper's raw enemy array under the saved previous logical coordinates. | `FieldCache` restores actors and poses into a new wrapper |
| Actor parent and callback | Reattachment reparents each actor and replaces its field callback. Older arrays can still reference that actor. Those arrays do not reparent it again when Run is called. | Persistent `ActorParents` links and explicit callback ownership |
| Deactivated actor display | TankData owns the actual live actor. Its WipeTank removes every child before the outer container is removed by a later field callback. A retained parent does not imply retained paint. | Empty `displayChildren`, protection children and collision paint; parentage remains separate |

`BTAGameWorld.AttachNewBubblefield` saves/advances coordinates at AS1647–1666. It constructs a wrapper and guide at1667–1671, restores cached enemies at1729–1735, and attaches/replaces references at1835–1871. The only `removeChild` in this method removes the screen layer (`_-Uy`), not a previous next wrapper. The corresponding pcode starts at7716; the coordinate operations are7746–7826.

`_-0D._-G0` restores each actor's pose, adds it to the new enemy layer, replaces its callback and appends it to the array before testing nullable primary weapons. The malformed decompiled weapon loop is an ordinary ordered loop in pcode (`ofs010e → ofs0040`, then `ofs005a → ofs007f → ofs0073`). A null primary array skips that loop; attachment does not call actor Setup or resurrect it.

`BTAGameWorld._-4j` captures raw actors and pose scalars at AS335–353 and writes the record under the saved logical coordinates at356–378. It does not filter queued deaths. `_‑0D.Deactivate` only clears a completed wrapper: an uncleared detached wrapper retains its collections. A completed wrapper deactivates/removes its shots and pickups before caching. Destination collections survive promotion. Global effect-engine clearing remains a separate operation.

For example, two rightward attachments can advance logical coordinates `(0,0) → (1,0) → (2,0)` while the current wrapper remains the original one. The first next wrapper becomes an attached orphan. Completion can then cache the original current wrapper's enemies under `(1,0)`. This is a conditional source trace, not a claim that the recorded original crash followed that path.

`MoveAvatarToNewBubblefieldLocation` updates only current/latest references and referenced layers at AS1232–1302. `SnapBackAllObject` at1334–1340 updates the avatar-under position and radius; it does not rebase all wrappers. Native camera-relative rendering must compensate for later avatar motion to retain an orphan's stage pose.

## Frame selection and dialogs

`BTAGameWorld.Run` selects its switch case once. In case2 it invokes the interface, current field, latest next field, effects and crossing movement without rechecking the mode between those calls. Pcode follows `ofs00fe → ofs00e5 → ofs00cf → ofs00b9 → ofs00af`. An interface callback that opens a dialog does not cancel the rest of that already selected frame.

The raw execution state and saved return state are separate from whether a dialog remains attached:

| Callback | State writes |
| --- | --- |
| Start crossing (`_-1E`) | Save the current state, then select2 |
| Open upgrade (`_-3F`) | Save the current state, then select1 |
| Complete crossing | Clear the next reference, then restore the shared saved state |
| Replace avatar with first secondary help | Assign both state and saved state to1 |
| Close secondary help | Write state0, leaving a pending attachment intact |
| Destroy upgrade menu (`_-7x`) | Restore the shared saved state and remove that menu |

Consequently a near-arrival upgrade can complete its crossing in the opening frame while its menu remains attached. The shared saved value can restore state2 with a null next reference. A later case2 still performs its earlier interface/field work before its missing destination ends the World listener. The known source-read boundary skips the hit-timer tail while other stage listeners and attached artwork continue; arbitrary host exceptions are not swallowed.

Secondary help instead closes to ordinary state0. If its opening case2 did not finish the crossing, that attachment remains pending: ordinary Run still reaches the avatar phase but does not call crossing movement. Do not replace these writes with independent dialog-specific return stacks.

Ordinary boundary caller `_‑ZY` calls `_‑1E` first, then sets shooting suppression and invokes interface `_‑1J` final callbacks (BTAGameWorld AS1560–1572; AvatarInterface1634–1653). A direct lethal escape or `_‑0D.Destroy` attachment does not run those caller finals. It preserves the prior shooting gate and wall timers; a nested escape cannot turn shooting back on during an ordinary crossing. The birth gate already rejects new shots when those ordinary-exit finals execute.

The browser already supports pausing during a crossing, unlike the source PauseMenuSetup guard. This existing adapter retains the crossing's saved return value across its own pause/resume so it does not introduce additional return-mode corruption. It is not evidence that Flash accepted that pause route.

## Empty cached containers and Healer contact

`TankData._-Tr(3)` constructs the actual EnemyAI as `movTank` (AS443–460). `_‑Zx.Deactivate` calls TankData.Deactivate, which calls WipeTank (TankData130–135,620–639). WipeTank removes every child, including bodies, and clears `movTank`; its pcode2979–3036 confirms the unconditional child removal. The earlier Healer ledger's inference that a still-parented dead patient retained body paint was incorrect.

A beam retains direct home/patient references and tests parentage. An emptied **home** can therefore still support a beam contacting a healthy patient until actual detachment. An emptied **patient** has no body paint to contact: it does not gain life from the beam, its contact counter remains unchanged, and later bullets/avatar work continue. Direct AddLife still increments signed integer life before failing on cleared data; that independent method contract does not prove that an empty patient's beam can call it.

Enemy and ally field callbacks queue removal. Both queues flush at the next field Run, in enemy-then-ally order. A boundary-deactivated ally therefore remains as an empty parented container through the rest of the current frame. Removing dead allies at the end of that frame was an earlier approximation.

Reparenting also leaves an older queued removal on its original wrapper. RemoveEnemy polls medals before calling that wrapper's `removeChild`, then splices its array only after removal succeeds (`_-0D.as496–554`). The pinned [Ruffle0.7.1 container implementation](https://github.com/ruffle-rs/ruffle/blob/v0.7.1/core/src/avm2/globals/flash/display/display_object_container.rs#L64-L84) rejects a child owned by another parent before detaching it. The scoped callback error therefore retains the newer parent and the old queue/array, rather than silently stealing the actor from its new layer. This is a source-derived conditional path, not a recorded runtime failure attribution.

An ordinary deactivated actor can also enter a raw enemy cache. Reattachment preserves its empty container and cleared data. Base Run does not test `_‑Au` at entry. State1 first advances the hit timer and teleport flag, then movement or later part work reads cleared data/vectors. The first receiver depends on movement/sticky/boss state, so the implementation does not claim a universal failing property. State2 can finish its hit-timer/stun/decoration tail and release frame before a later state1 fails. The scoped listener error preserves that distinction.

After-death explosion is different: `_‑b3` sets `_‑az` and state3 before deactivation, making later Run return immediately. A bounded search of all661 exported AS and661 pcode files found only the false initialization of `blnAfterDeathExplode`, with no exported base-game enabling caller. Dynamic/external reachability is not established, and the presence of this dormant definition does not authorize inventing a base-game trigger.

## Verification boundary

The crossing regressions use isolated deterministic worlds, artificial positions/damage and direct offer selection. Renderer galleries exercise both procedural and supplied artwork, retain stage positions and compare same-pose paint with an omitted body/beam. These are source-derived recreation checks, not ordinary-input original-runtime differentials.

The retained original observation and a fresh continuation both recorded AVM2 #1009 in crossing movement. A separate continuous three-minute run did not reproduce it. Neither establishes the actual null receiver or a second lethal hit in the failing run. The native ordinary-input session earned one upgrade but did not reach a boss or win. Complete event/constructor/RNG alignment, arbitrary nested callback combinations, independent detached-clip timing, whole-frame compositing and Adobe/full-game equivalence remain open.
