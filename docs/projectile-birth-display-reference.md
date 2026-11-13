# Projectile birth positions and custom movement

This second local follow-up follows the shared movement correction
`d0af2e990557e78b47ccaf6b17544c35a8a01062`. It stays outside frozen PR139 and
does not add a sixth PR or trigger a deployment.

## Position assignment before virtual Setup

`_‑0D.SpawnNewBullet:1077–1112` checks its bullet layer and crossing gate before
writing X/Y, scale and rotation, attaching the new projectile, calling virtual
Setup, enabling movement, appending and counting the shot. Exported pcode at
line4605 confirms the X/Y setters after both guards, followed by the
`ofs00ac` Setup call and later append/count blocks. A rejected birth returns
the original object without these writes. Keep the controlled original
[rejected-turret evidence](shield-turret-retention-reference.md) intact.

The simulation now applies the existing signed-twip `displayPixel` conversion
inside its accepted birth gate, after the optional raw-state preparation and
before its virtual initializers. This gives Sapper and friendly Seeker aiming
the displayed birth position rather than an unassigned fractional recipe.
The preparation callback remains an implementation detail for the deferred
turret recipe; it is not the source's virtual Setup method.

Four birth tests cover shells, maintained beams, Whip and Healer beams with
their real symbol IDs. Two aiming tests distinguish Setup from0.049/0.099
versus the displayed0/0.05. The target remains100/100; its changed initial
heading is measured before any Run movement. Existing rejected-birth tests
retain their assertions and pass.

## Separate writes in custom movement

| Path | Recovered source writes |
| --- | --- |
| Starburst | `_‑14/_‑Hu.MoveBullet:16`, X/Y at56–57 |
| Repulsor | `_‑14/_‑OE.MoveBullet:16`, X/Y at35–36 |
| Spinner | `_‑14/_‑V3.MoveBullet:43`, X/Y at71–72 |
| Grow | `_‑14/_‑dO.MoveBullet:13`, X/Y at34–35 |
| Flak | `_‑14/_‑cW.MoveBullet:14`, X/Y at42–43 |
| Friendly Seeker | `_‑14/_‑XV` overrides steering and inherits `_‑BL.MoveBullet` |
| Sapper | `_‑14/_‑Jp.MoveBullet:113`, X/Y at139–140 |
| Seeker Mine | `_‑14/_‑XK.MoveBullet:23`, double scatter at47–48, separate homing at66–67 |
| Enemy Turret | `EnemyTurret.MoveBullet:83`, X/Y at108–109; SetMovement reads displayed distance |
| Whip following | `_‑14/_‑Rx.MoveBullet:100`, emitter Point then X/Y at115–116 |

Each simulated position write now goes through `displayPixel`, including
maintained beam repositioning. Mine scatter and homing stay separate: the
homing vector reads the already displayed scatter position, not a combined
floating sum. Turret damping likewise reads its preceding displayed distance;
its Number movement vector is retained. No force, velocity, cached destination
or other private Number vector receives blanket rounding.

Seven custom-kind tests, a mine-scatter case and a two-frame turret-damping
case extend the six birth tests. All15 fail against the unchanged preceding
source in `/tmp/bt3-projectile-birth-before-d0af2e9` and pass after correction.
The symbols match the imported original catalog. Existing Spinner helper
positions, Grow movement, armed-mine two-phase motion, launcher Timer births
and Massive Cannon completion now assert exact source-derived display
coordinates. Their velocity, phase, counter, contact and lifetime assertions
remain. No tolerance is enlarged and no suite is removed.

## Local verification

```sh
bun run format
bun run check
BT3_SWF_FILE=/home/ian/Projects/ianwijma/documented-bubble-tank-3/re/bt3/uncompressed.swf bun run test:e2e --config test-results/projectile-birth-validation/playwright.config.ts
```

Formatting, TypeScript and956 tests /8,637 assertions pass. Ignored evidence is
under `test-results/projectile-birth-validation/`. The private config disables
server reuse on owned3165/3166. Sixteen private spec copies retain all
assertions: fifteen change only the fixture URL, and the homing copy also
relocates its unchanged production-helper import. An initial check ran before
that private import path was adjusted and correctly failed; the full check
after correction passed. No compiler configuration was changed.

Production build `h9y-d9cvkzt9gLT42tF3-` and all34 selected mock/supplied-art
browser cases pass in4.8minutes, with zero skips, flaky results or page errors.
Both seeded pilots reach six upgrades, boss defeat, badge and Continue
(mock76,936 / supplied-art77,268 frames); they remain accelerated fixtures.
Native mine, homing and projectile-clock paint was inspected. Owned3165/3166
servers exited, with no listeners remaining. Source/test/tool hashes match the
build manifest; `provenance.json` and `validation-summary.json` retain the build,
source and result identities. The prior movement draft's captures were
preserved before this run. These fixtures and
source/pcode contracts do not establish a new original-runtime trajectory,
full constructor/rotation/non-finite semantics, sound, pixel equivalence,
ordinary boss/win or original/Adobe/full-game parity.

## Separate carrier birth contradiction

`_‑ct/_‑Ng.PartCallTrigger` first converts the emitter Point, then applies
field-axis offsets−22/+22 X,−22/+22 Y and−9/+9 X before each SpawnNewBullet.
The current release helper rotates those offsets and adjusts the projectile
only after virtual homing Setup. A separate three-case audit confirms the
symbol1809 control already passes, while field-axis positions and independent
initial steering fail. The temporary regression is
`/tmp/bt3-carrier-birth-source.test.ts`; its output is
`test-results/projectile-birth-validation/carrier-pending.log`.

That caller construction/order correction is not included here. Do not
interpret canonical birth assignment as proof of correct recipe generation.
It needs its own source-backed follow-up, including rotated owners and
parent/current-wrapper conversion, rather than post-Setup pose adjustment.
