# Retained seeker/Sapper targets and display-parent aiming

This third projectile layer follows retained Sapper shot/master lifetime on
`dad4de68146b3bbbb6f548f8c1c60bcdf014da78`. It keeps the source's target object
separate from numeric compatibility IDs and from the collision/damage avatar.

## Source contracts

All source paths are under the sibling research repository's `re/bt3`.

- `_‑14/_‑XV.RotateTowardTarget` tests `movTarget == null || !_-W.contains(movTarget)`.
  Its package-qualified pcode `ofs004b → ofs0026 → ofs0030` confirms the object
  and owning Bubblefield containment test. Reacquisition keeps the first raw
  array candidate through its broken array-level coordinate scan; it is not
  a UID lookup or an invented nearest-enemy selector.
- The same method transforms the projectile through its actual parent and
  calls the target's `GetHitLocation`. `_‑Zx.GetHitLocation:658–661` converts
  its cached `pntHitDetailLocation` to global. `_‑Zx.Setup:1148` chooses that
  cached detail from the source data. Existing ActorParents Point conversion
  supplies signed-twip and float32-matrix boundaries, separately from Number
  subtraction and angle/vector arithmetic.
- Failed friendly acquisition queues the projectile for removal, writes
  `_‑PJ=false`, invokes its collision callback and returns the preceding
  rotation. `_‑BL.Setup` calls this before a first Run. `_‑BL.MoveBullet`
  checks `_‑PJ` only at entry: a failure inside a Run still reaches that
  already selected contact/movement tail once. Direct Setup leaves it disabled,
  but canonical `_‑0D.SpawnNewBullet:1087–1090` unconditionally writes
  `blnMoveTank=true` **after** virtual Setup, then appends the projectile.
  An empty-target canonical birth therefore queues once during Setup, runs
  once and queues again, then stops. Pcode lines4712–4725 retain this order. `_‑XV.BulletCallCollisionDetected` queues one seeker explosion
  and applies the existing global hit-sound timer gate.
- `_‑BL.Run:415–420` refreshes `objAvatar` when its parent disappears, without
  assigning `movTarget`. `_‑Jp`'s outbound steering and hit test read that
  retained target. Its damage/shield branch reads the separately refreshed
  avatar. `_‑Jp._‑L4` switches target to the captured master on the outbound
  contact, then to the current `objAvatar` after return contact. Pcode retains
  those distinct properties and ordered assignments.
- `_‑Jp._‑T‑` checks the creating mount's actual parent before converting its
  registration. A removed emitter returns zero without writing rotation;
  `_‑BL.SetMovement` still installs the corresponding horizontal vector.
  Its normal aiming result is assigned to rotation, but raw Number movement
  components remain separate from subsequent twip position writes.

The original-frame investigation in the preceding layer remains bounded
constructor/frame evidence. No accepted-shot RNG adapter or registration
schedule changes are included here.

## Implementation and regressions

`Projectile.homing` now carries the source's retained target/avatar fields for
friendly seekers and Sappers as well as the existing enemy homing roots.
Converter passes its selected target object directly through canonical Setup.
A UID search remains only an initial compatibility fallback for manually
constructed callers that do not supply the object; subsequent selection uses
object/parent ownership. Numeric `targetId` remains compatibility metadata.

Friendly aiming converts the actual parent and cached detail to the same
global space. It keeps the private movement vector computed from the returned
source angle. `movementEnabled` models `_‑PJ` separately from the queued-removal
flag. Canonical birth re-enables it after Setup without clearing the removal
queue. A failure in the selected Run completes its tail; later disabled Runs do
not replay callbacks. Direct virtual Setup alone has no canonical re-enable.
Sapper retains target and refreshed avatar separately and transforms hit-test
samples back into the existing numeric tank-hit adapter. Return aiming uses
physical mount-child membership; guarded zero returns preserve visible rotation.

The original nine source cases were checked against preceding `dad4de6`.
The corrected suite now has eleven cases; two canonical-birth cases
also fail against published `945d2ec`, which incorrectly conflated removal and
movement. The source contracts are:

1. A same-UID replacement does not inherit an old friendly target's identity;
   a detached target reacquires the first array candidate.
2. A target still physically contained remains held despite raw-array absence.
3. A stale array target reparented to another wrapper is rejected.
4. Friendly Setup aims using transformed fractional cached detail points.
5. Sapper Setup uses the same Point boundaries and global subtraction order.
6. Canonical empty-target births at0° and123° re-enable after Setup, move once
   and queue a second explosion. Direct Setup alone stays stopped. The existing
   hit-sound timer still permits only one sound event.
7. Target loss inside Run retains the preceding target reference, completes one
   movement tail, then stops until removal.
8. Sapper steering/contact keeps an old avatar object while damage uses the
   refreshed avatar; the return cycle then selects the new avatar.
9. A removed returning emitter preserves rotation and installs the zero-return
   movement vector.

The numerical Point cases retain literal global subtraction, including Number
cancellation, rather than replacing it with a mathematically simplified local
delta. Existing source tests keep every assertion. Two isolated Sapper return
fixtures now set both return-state and target fields; camera-changing fixtures
synchronize their physical parent transforms. Converter fixtures attach and
remove actual display parents before checking reacquisition. No source behavior
is bypassed to satisfy those fixtures.

## Validation and limits

```sh
bun run format
bun run check
BT3_SWF_FILE=/home/ian/Projects/ianwijma/documented-bubble-tank-3/re/bt3/uncompressed.swf bun run test:e2e --config test-results/projectile-target-validation/playwright.config.ts
```

The preceding published head `945d2ec` passed976 tests /8,728 assertions and
16 browser cases (build `SGofqOmsFRu5W1kJLevpv`), but its canonical empty-target
birth assertion was wrong. The [controlled original probe](projectile-target-runtime-reference.md)
exposed the omitted post-Setup setter. The new two-case regression fails on
that exact head (2 failures /9 passing controls), then passes with the repair.
Final repaired-source validation: formatting, TypeScript and978 tests /8,737
assertions pass. Production build `rwZCscLqkfhTFJK-IU9ix` and all16 affected
mock/supplied-art browser cases pass in2.1minutes, with zero skips, unexpected
failures or flaky results. All688 tracked/untracked source/tool/doc digests
match their pre-build snapshot. The native homing gallery was inspected; all
recorded owned test processes exited and3165/3166 are free. The original probe's
owned3295/9295 processes also exited. Canonical before/after logs, build/report,
source manifest and cleanup identities remain under
`test-results/projectile-target-validation/canonical/`. The earlier green local
run does not validate this correction; these results do.

The first private build caught unused copied e2e helper files whose relocated
imports were invalid. Those unused copies were removed; spec assertions,
production code, compiler options and required suites were not weakened.

The tests and bounded original probe establish retained references, selected source phases, Point-based
numeric contracts and adjacent browser behavior. They do not establish an
ordinary original-runtime Sapper encounter, all avatar destruction/display
lifecycle, arbitrary matrices, the complete original callback/constructor/RNG
stream, ordinary earned boss/win, pixels/audio or original/Adobe/full-game
parity. In particular, the seeded optional saved-enemy caller from the preceding
layer is not an ordinary earned encounter claim. Hold master until five layers
are assembled and the final combined current-head Actions/review gate passes.

## Source identities

| Research input | SHA-256 |
| --- | --- |
| `export_scripts/scripts/_-14/_-XV.as` | `00c0e39b9096416274d959afbe3a8d93cae71a7fff274570275df9bfb7594d0d` |
| `export_pcode/scripts/_-14/_-XV.pcode` | `03ef033e33856835955be33d9c6c3a187b7b6095ad612d96cfd05bc485c5b26b` |
| `export_scripts/scripts/_-14/_-Jp.as` | `662433e4ac45a96a1ccec06cb03b318fb14dc68a55d8f59ffe1602a07b3247ce` |
| `export_pcode/scripts/_-14/_-Jp.pcode` | `b13df74ba8b32c00d6d9a3950bbd2498f4fbd7d9f6502a229070cd6aa154fb63` |
| `export_scripts/scripts/_-BL.as` | `21f55ae5f710002b5c9bc24e81fedc4e611d7ceeac493fa44fd86016bb9e1133` |
| `export_pcode/scripts/_-BL.pcode` | `3b365d3e31350a90d69f814b9692c88af83e600ae957e3bea3645c69114fb64f` |
| `export_scripts/scripts/_-Zx.as` | `3a5c16a3f14e1ceae76b93185a8c4a974b9e2b9326b6021526f2320d89522f16` |
| `export_pcode/scripts/_-Zx.pcode` | `2a3d03e2eebf57c8189b5d4e2aea67e48f6dcfb50477271f07dca15b22bf80ea` |
| `export_scripts/scripts/_-0D.as` | `a3cb66e601053b5c615003b01077cfc96752554f85352a62feb278004750ac24` |
| `export_pcode/scripts/_-0D.pcode` | `5b30ed4cca2a726a56569c8da70a24c652282c92836692cdbd6fd1f97fc8b5ae` |
