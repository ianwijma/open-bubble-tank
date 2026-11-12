# Retained cross-field weapon objects

Evidence is the sibling `re/bt3/export_scripts/scripts/` plus matching exported pcode.
These are source-derived contracts, not a synchronized original-runtime comparison.

## Cached Healer beam

`_-ct/EBehaviorHealer.PartCallTrigger` (152 onward; pcode around715) keeps `beam_mc`
as an object reference. An existing reference is usable while `beam_mc.parent` is
nonnull, independently of the currently stepped wrapper's bullet array. Reentering
an uncleared field reparents cached actors into a fresh wrapper but leaves the old
beam under the old detached layer (`_-0D.Deactivate`,1117 onward).

The mount therefore retains its beam and patient and updates the same beam using
outgoing `currentBFTarget` coordinates. It does not create a replacement in the fresh
wrapper. Actual parent removal is observed at the next ready trigger, not immediately
on an arbitrary intervening active call.

`StopFiring` deliberately asks currentBFTarget.RemoveBullet and then clears its beam
reference. `_‑0D.RemoveBullet` (1155 onward; pcode equality check before025f) only acts
on a matching object in its own array. A retained beam belonging to an older layer can
survive that request. Routing removal automatically to the object's old owner would
change source behavior.

The simulation stores the direct gun reference and explicit projectile-parent metadata.
Owned layer replacement/removal updates that metadata; detaching an uncleared wrapper
does not. Numeric beam IDs remain fixture metadata. Browser/display references stay
outside simulation.

## Incoming boss spawner

`_-ct/_-1k.PartCallTrigger` (26 onward; pcode145) converts its emitter through
outgoing currentBFTarget and invokes that wrapper's SpawnNewEnemy. `_‑0D.SpawnNewEnemy`
(474 onward) immediately attaches the actor, binds the callback and appends it without
the projectile crossing birth gate.

An incoming built-in boss can therefore spawn a fighter in the outgoing wrapper,
after that wrapper's actor pass. Its first gameplay Run waits until the next frame.
A normal outgoing spawner still appends to its active live loop and its newborn runs
in that same pass. The built-in boss contains two part4003 mounts; this requires no
custom design or parts-pack extension.

## Spawner Setup and retained choice

`_-Zx.RegisterPrimaryWeapon` (1125 onward) registers each clip and immediately calls
its Setup before the next tank detail is constructed. `Weapon.Setup` (179 onward)
acquires its target, then invokes SeperatePartSetup. The matching pcode follows
0039 →0021 →0017 (acquisition) →000d (separate Setup).

`_-ct/_-1k.SeperatePartSetup` (21 onward; matching pcode method) stores the result of
GetRandomDataByKey("SmallFighter"). It is not deferred until PartCallTrigger. That
trigger uses the retained code without another selection. Later roster additions
therefore cannot alter the pending fighter or consume this selection's random draw.

`_-3y.GetRandomDataByKey` (2284 onward; pcode method at9455) finds the contiguous
key range and calls `_‑Wq` once, including a one-entry range. `_‑Wq` (48–50) uses
`Math.round(random * (max - min + 0.8) + min - 0.4)`, rather than a uniform floor
index. Selection now runs after acquisition in the existing per-detail construction
loop, before a later Phasing constructor can draw its initial counter. Each mount
keeps its own selection.

The normal offline roster initializes SmallFighter twice before any boss is built.
The preexisting fallback pool for standalone tank tools remains an explicit adapter;
missing-key/empty-code import behavior is not established by this correction. The
shared pseudorandom generator and complete display-constructor draw order are not
claimed to match the original runtime.

## Verification limits

Unit regressions preserve the actual old beam/patient, translate emitter positions
across wrappers, distinguish parentage from fresh-array membership, retain the scoped
StopFiring no-op and verify the boss newborn's owner/position/age. Both primary
regressions failed against the preceding code. Original execution, complete constructor
selection/RNG ordering, arbitrary reparented projectile combinations and Adobe parity
remain unproved. Affected browser fixture validation is pending at this local draft.
