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

The follow-up at `0f6e7d2ca4c0af8530f9baf9ef46b8841aa2b484` passes formatting,
TypeScript and909 unit tests/8,395 assertions. Its production build
`S0tdGEMwWaxoYQ9RqHNGA` passes this literal browser command:

```sh
BT3_SWF_FILE=/home/ian/Projects/ianwijma/documented-bubble-tank-3/re/bt3/uncompressed.swf bun run test:e2e --config test-results/spawner-setup-validation/playwright.config.ts actor-behaviors.spec.ts weapon-targets.spec.ts playthrough.spec.ts
```

All six mock/supplied-art cases pass, without skips or page errors. The private
config owns3165/3166; spec copies change only the fixture URL and retain every
assertion. Actor/targeting fixtures cover adjacent behavior. The accelerated pilots
reach six upgrades, boss defeat, badge and Continue (82,489 mock/77,617 native frames).
They use seeded accelerated simulation and an upgrade-selection adapter, so they are
not ordinary-input or original-runtime evidence. Supplied-art history and win paint
were inspected. All owned servers stopped. Local evidence remains uncommitted under
`test-results/spawner-setup-validation/` and the deployment-controls capture directory.

## Field births finish construction before their display pose

`_-0D._-Ar` (`_-0D.as`1460 onward) imports each instruction's tank, calls
`TankData._-Tr(3, gWorldRef)`, then draws X, Y and rotation, parents the result,
installs its callback and appends it. The matching pcode's `ofs0032` path calls
`_-Tr` before the first rounded−200..200 draw; `ofs00b8` assigns Y and `ofs00a1`
assigns rotation before attachment. TankData registers each weapon/behavior during
`_-Tr`, and registration synchronously calls Setup. Those modeled constructor and
Setup draws therefore precede all three field-pose draws.

The previous `World.jump` evaluated random X/Y arguments before entering
`createTank`, moving acquisition/part/spawner randomness later in the shared
stream. Fresh fields now construct at the default origin first, then draw and
assign X, Y and rotation. Source `SpawnNewEnemy` (`_-0D.as`474 onward and matching
pcode2061 onward) also calls `_-Tr` before assigning its supplied X/Y. That route
now follows the same zero-origin construction boundary, retaining its final
emitter coordinates, parent/callback owner and immediate live-array behavior.

The new regression triggers the builtin boss with explicit eligibility, preserves
both cached fighter choices and final pose, and requires all acquisition/selection
draws before the X/Y/rotation suffix. It fails against the previous ordering and
passes after the correction. This is an instrumented construction contract, not
ordinary boss reachability or a synchronized source entropy trace. The regression
and existing Setup/cross-field ownership cases pass together (seven tests).

Formatting, TypeScript and 919 unit tests / 8,471 assertions pass. Production
build `UrmN28T1hGK2VdbDJckqv` passes this literal browser command:

```sh
BT3_SWF_FILE=/home/ian/Projects/ianwijma/documented-bubble-tank-3/re/bt3/uncompressed.swf bun run test:e2e --config test-results/wave-selection-validation/birth-order.config.ts
```

All 14 mock/supplied-art cases pass with zero skips, flaky results or page errors:
actor behavior, active/cached crossing, accelerated progression, ink, mounted
targeting and the public creator/save/local-source route. Private fixture copies
change only URL3102 to3166; the caller uses its original spec/helpers. Both owned
3165/3166 servers stopped. Accelerated pilots reach all six upgrades, boss defeat,
badge and Continue in 72,034 mock / 71,183 supplied-art frames. Native history,
win and targeting paint were inspected. These seeded accelerated fixtures do not
establish ordinary earned progression. The ignored browser report and pilot
proofs are under `test-results/wave-selection-validation/birth-order-*`.

Source AS/pcode hashes and the failing-before/focused logs are ignored under
`reference-captures/wave-selection-audit/birth-order-*`. The `_‑0D.pcode` identity
is `5b30ed4cca2a726a56569c8da70a24c652282c92836692cdbd6fd1f97fc8b5ae`;
`TankData.pcode` is
`4f1eec91c07616eaa1895078047c1423a21ce0253192d61161dfdc8f120491f0`.
Art frame scripts, the complete source constructor draw stream, display-setter
precision and original/Adobe/full-game equivalence remain unproved.

## Shield Turrets: bounded audit, no simulation correction

[The4032 caller/source audit](shield-turret-source-audit.md) proves a valid
creator/save/optional-local-roster route, distinct from builtin encounters. The
normal source profile unlocks the enemy-weapon catalog; `intCode3` is only the
creator indicator frame.

The requested cached unfinished-target retention assumption conflicts with
`_-0D._-G0`: matching pcode resets every primary `movTarget` to the avatar on
reattachment, including4032. The retained `_‑BC` list and its frame4 shield check
are separate from that overwritten target. Also SpawnNewBullet returns its input
object even when the crossing gate declines attachment; it does not return null.
The new unparented reference is cleared by the next relevant poll. The audit
records both bytecode paths and leaves production unchanged rather than asserting
source-incompatible regression expectations. Current-wrapper removal stays scoped.

## Verification limits

Unit regressions preserve the actual old beam/patient, translate emitter positions
across wrappers, distinguish parentage from fresh-array membership, retain the scoped
StopFiring no-op and verify the boss newborn's owner/position/age. Both primary
regressions failed against the preceding code. The local validation of
`f61dfa6660e362178ed411d13cc8b36b2c645a51` passes
`bun run check`: 907 unit tests/8,390 assertions, zero failures. No production or
fixture repair was required; source-scoped StopFiring removal remains unchanged.

Literal browser command (from the isolated checkout):

```sh
BT3_SWF_FILE=/home/ian/Projects/ianwijma/documented-bubble-tank-3/re/bt3/uncompressed.swf bun run test:e2e --config test-results/layer2-validation/playwright.config.ts healer-lifecycle.spec.ts healer-targets.spec.ts actor-behaviors.spec.ts
```

The private config replaces all webServer/baseURL settings with owned ports 3145
(production Next server) and 3146 (fixture server), with reuse disabled. Temporary
copies of the three specs change only the hardcoded fixture URL from 3102 to 3146;
all assertions are identical. Production build and all six mock/supplied-SWF cases
pass, with zero skips and no page errors. Ports were free before the run and both
owned servers were stopped by Playwright afterward. `bun run format` also passes.

All six paint captures were inspected. Lifecycle same-pose beam omission changes
4,302 mock pixels and 3,529 supplied-SWF pixels for each healthy/killed/jammed owner;
each patient reaches life 51 with the retained direct home and counter 0. Dead
patients have zero children/no contact paint, then detach on the next frame while
live-array removal and later Run recovery retain their asserted ages. Targeting
captures show healthy beam contact and later recovery after the scoped read error;
actor captures show the six sampled motion/behavior poses through frame 120 and
pause preserves state. These existing browser fixtures exercise adjacent rendering,
contact and lifecycle behavior; they do not directly reproduce a cached-field beam
or incoming boss fighter birth. Those two ownership paths remain unit/source-checked.

Local, uncommitted evidence is under `test-results/layer2-validation/` (private config,
URL-only spec copies, report, logs and lifecycle PNG/JSON pairs), with targeting and
actor mock/native PNGs directly under `test-results/`. No SWF or extracted media is
committed. Original execution, complete constructor selection/RNG ordering,
arbitrary reparented projectile combinations, ordinary-input reachability and
synchronized original/Adobe/full-game parity remain unproved.
