# Retained combat ancestry and avatar coordinate bridge

This continuation follows repaired PR152 `1f28a46`. The original inverse
qualification is a separate evidence ancestor; this layer consumes its finite
controls in simulation. It does not implement the complete native field query.

## Source operations

The source remains the supplied original SWF, SHA256
`f5827841c682f988f23dcf470ab4ab59c1ffc497acb4ca0f21077d03f942c153`, and its
qualified exports in the sibling research repository. Read
[the original Point qualification](actor-point-original-reference.md) and
[World/collapse oracle](world-layer-original-reference.md) for exact source,
probe, runtime, binary-word and preservation identities. In particular:

- `BTAGameWorld.AdjustBubblefieldObjects` (AS1348) writes current root and
  under-avatar coordinates before background callbacks, sibling copies and masks.
- `MoveAvatarToNewBubblefieldLocation` (AS1201), `_‑0Z` (AS1008) and `_‑VS`
  (AS232) convert the next detail marker through its actual global Point and
  World inverse, compare the avatar's own World coordinates, then calculate
  angle, distance/10×0.9 and trigonometric components in source order.
- `SnapBackAllObject` (AS1334) projects the avatar parent's Position into the
  promoted field; it does not subtract a map offset. Qualified World pcode
  SHA256 is `eda20420933f4bd87fe9dce652428c3dde3a4bc6e0ee31702325fcdb3c9dba0b`.
- `_‑Zx._‑QH` (AS728), `_‑0D` avatar reads (AS320/382), root `Weapon.as` aim,
  and `_‑14/_‑Jp` Sapper reads use actual parents. Avatar detail-local Points
  and its parent's Position transfer are separate operations.

## Implementation boundary

`ActorParents` retains ordered physical actor membership. `sync` only binds its
World/avatar owner; it cannot move a wrapper from Run arrays or scalar map data.
Queries read the retained root, actor slot, separate World and Main transforms.
Detached wrappers lose ancestors while retaining their own poses. Avatar clips
are retained by Tank identity, including replaced detached clips. Bullet global
Points use the distinct bullet sibling, not the actor layer. `FieldDisplays.readPose`
reads current ancestry without cloning the entire display tree or sizing history;
it introduces no cache across callbacks, RNG or clock updates.

The shared Tank's x/y values bridge receivers in the existing simulation. They
now come from actual parent-to-field Point conversion on movement, field entry,
field return and promotion. They no longer independently accumulate velocity or
map offsets. Number velocities and acceleration/friction remain unchanged. Teleport3011/3012 also invokes the shared source camera operation (`_‑ct/_‑1W.as54`, matching pcode216), so its destination-origin displacement survives the following field projection; changing Tank scalars alone would undo the jump. The
field's compound DisplayObject writes still truncate separately. A 10-frame
right/down input followed by 30 release frames previously produced logical171.15
versus actual170.55; the corrected bridge reads170.55 on both axes. This is a
native public-step regression, not an original World.Run capture.

Crossings read the retained next detail marker and source arithmetic. The legacy
`Transit.target`/offset metadata remains available to existing host adapters;
it is not the authoritative marker Point. Live width/height and initial wrapper
separation still use the existing legacy field geometry boundary. Collapse
finish resets the actual avatar first, then projects its receiver-local bridge.

Artificial tests/galleries now explicitly supply omitted avatar attachment and
camera operations after direct scalar replacements/teleports. These tools never
run from production rendering or query reads. Camera fixture moves touch current
and latest-next only, preserving superseded rooted wrappers. Two crossing
expectations now pin source setter results96.35/483.1 instead of an untruncated
Number sum. The field-generation regression preserves all33 construction draws
and eight spawn poses with the captured PR152 pre-construction RNG state612916067;
its route's travel duration/Main entropy is deliberately outside that isolated
construction control. Gameplay RNG and artwork entropy providers are unchanged.

## Verification and limits

`tests/retained-ancestry.test.ts` consumes independently frozen original Numbers
at collapse0/1/2/51/119, separate fractional Main, actual detach, supplied inverse
Points and avatar rotations30/60/90. It preserves the measured lossy result:
field(100,40) → stage(176.65,311.65) → local(99.95,39.95).
Seven original-number controls fail against the preceding actual ActorParents/
World conversion code and pass after migration. Two additional movement/order
regressions fail before their bridge repair. A separate retained-marker control
rejects stale scalar map targets. The eighteen focused cases pass213 assertions.

Parent independent verification of a caller-owned original capture copy passes
all112 rows/2,576 Numbers; comparison matches112 inverse and84 forward controls,
with36 non-identity round trips. REA events remain incomplete/equality-ineligible.
Original files and the child capture are not rewritten.

Formatting, TypeScript and the complete unit suite pass1,129 tests /16,312
assertions. The first bridge browser run was stopped after the source reviewer found the teleporter regression:50 cases passed, four gallery fixture cases failed, one pilot was interrupted and21 cases did not run. This is not a completed progression result. The omitted gallery alias moves and real teleporter caller are repaired. Browser verification for this corrected final draft is still in progress;
its final result must be recorded before publication. Local ignored provenance,
negative controls and logs are under `test-results/retained-ancestry/`.

An earlier draft's76-browser run passed71 and failed four artificial fixture
layouts plus a supplied-art pilot that exhausted200,000 frames at level4/life8.
The unchanged published PR152 baseline separately won in its first fresh
supplied-art run (boss frame71,967, win73,315). These observations do not isolate
causality or qualify the independent artwork entropy stream. No pilot, seed,
collision provider, frame cap, assertion or timeout is weakened for this repair.

Complete native field composition, dynamic width/hit geometry, retained effect
playback, arbitrary affine/singular transforms, global event/RNG equality,
ordinary earned full progression and original/Adobe/pixel/audio/full-game parity
remain unresolved. Finite original Point arithmetic and accelerated browser
progression cannot establish those broader claims.
