# Shield Turrets: caller proof and implementation objections

This is a bounded audit of part4032 against local base `c20e0db91437c868ce2fe07324bbbf1c2972ef77`.
No simulation correction is included. Two matching AS/pcode contracts contradict the
proposed cached-target and rejected-birth expectations; changing parent filtering
alone would leave those contracts wrong.

This audit is a historical checkpoint. The later [retention/runtime follow-up](shield-turret-retention-reference.md)
observes the missing-member read in original code and implements both objections
together with retained parent/home and trigger contracts. Its evidence and limits
supersede the unresolved runtime status below; the source objections themselves stand.

## Supported offline caller

No builtin avatar, enemy or boss design contains4032. This is protected by
`tests/shield-turret-reachability.test.ts`, not inferred from artwork or indicator
codes. The supported recreation caller is the optional saved-enemy adapter:

1. `_‑HJ.as1996–2013` registers4032 in `_‑Oc`, with minimum class3, GP3 and BP3.
   `PlayerProfile.as100–103` pushes **every** `_‑Oc` ID into ordinary
   `arrUnlockedObjects`. The corresponding PlayerProfile pcode contains the same
   `UnlockEnemyWeapons` closure. No cheat or parts-pack inference is needed.
2. `TankCreatorScreen._‑ay` (1105–1164) unlocks matching library IDs.
   `_‑1X` (4669) uses `intCode` only as `indicatorClip.gotoAndStop(intCode)`.
   The4032 value3 is an indicator frame, not evidence of a paid-pack gate.
3. The recreation accepts a class3 design made from Cruiser's bodies, one4032
   mount and manual life20/reward5/speed2. It costs GP3/BP31, passes aggregate
   edit/save validation, and saves as a new local nonavatar record. The browser
   check measures its body class with mock and supplied artwork; importing a
   body layout is explicit setup, not proof of drawing that layout by hand.
4. GameShell's public **My enemy tanks** option starts unchecked. Only enabling
   it passes saved nonavatar records into `World`. `UnitRoster.load` evaluates
   the literal strict rules, then may choose a matching local record. The design
   matches `Balanced`; the recorded audit base uses an unmodified seed6 World
   whose distance7 wave selects two copies. With source count preparation and
   table rejection restored, the same two-copy witness uses seed10 (seed6 now
   produces one). No forced roster injection or RNG override is used, and every
   two-copy assertion is retained. This demonstrates a supported adapter route,
   not an earned ordinary encounter or a builtin original route.

The companion public browser case imports that valid layout, opens the real
creator, checks its measured class and validation, saves a fresh local record,
enables the public source checkbox and starts a game. Its menu/game controls are
real; the subsequent random encounter is covered separately by the seeded unit
proof rather than claimed from a canvas screenshot.

## Confirmed part-local contracts

Evidence paths are relative to the sibling research repository's
`re/bt3/export_scripts_deobf/scripts/` and `re/bt3/export_pcode/scripts/`:

- `_‑ct/_‑DO.as26–69`, matching pcode81–300: BehaviorRun retains the direct
  `_‑BC` references while their `parent` is nonnull. A frame4 turret shields its
  owner even when its parent is an older detached layer. Actual removal is
  observed on the next owner weapon Run, subject to jam/stun suspension.
- `_‑DO.as101–131`, pcode489–647: EnemyAim uses the direct `movTarget`, tests its
  parent, and recursively retries after clearing a frame4 target. An unfinished
  target's parent converts its x/y to global; the mount's parent separately
  converts the mount point. Their difference supplies the vector heading.
- The no-target branch converts the mount through outgoing `currentBFTarget`,
  then calls `Scale(-Math.random())`. `_‑KM.as35–39,137–141` and its pcode219–262,
  698–731 confirm component multiplication followed by
  `360 * atan2(y,x) / (2 * PI)`. Zero and signed-zero cases must retain that
  arithmetic, including the draw. An origin-angle shortcut is insufficient.
- `_‑DO.as73–88`, pcode327–433: PartCallTrigger uses the **existing** rotation;
  it does not aim or reacquire. With no target it stores SpawnNewBullet's return
  in `_‑BC` and `movTarget`; otherwise it fires a builder.

The pinned [Ruffle0.7.1 transform implementation](https://github.com/ruffle-rs/ruffle/blob/v0.7.1/core/src/display_object.rs#L1400-L1437)
includes each retained ancestor's own matrix until the actual parent chain ends.
It does not require stage attachment. Its
[AVM2 Point conversion](https://github.com/ruffle-rs/ruffle/blob/v0.7.1/core/src/avm2/globals/flash/display/display_object.rs#L894-L930)
also crosses twip boundaries. These sources support retaining a detached wrapper's
pose while dropping detached ancestors, not projecting through whichever active
field happens to contain an old array reference. They do not establish arbitrary
parent matrices, Adobe behavior or complete runtime provenance. No new coordinate
interface has been implemented on this audit branch.

## Objection 1: cached attachment replaces the unfinished target

`_‑0D._‑G0` AS130–170 restores the cached actor, reparents it and sets its callback,
then assigns `myAvatar` to **every** `arrPrimaryWeapons[i].movTarget`. The malformed
decompiled loop is resolved by pcode371–542:

```text
ofs00b2 -> ofs0099 -> ofs00a5: nonnull primary array with positive length
ofs005a -> ofs007f: i < primary.length
ofs007f: primary[i].movTarget = mRef._-3J.myAvatar
ofs0073 -> ofs005a: increment and repeat
```

`TankData.as541–546` registers enemy category4 clips as primary weapons, including
4032; `_‑Zx.RegisterPrimaryWeapon` appends them at1125–1133. There is no4032 exemption
in the attachment loop. Its `_‑BC` turret list remains retained, but a cached
leave/revisit cannot be assumed to retain the unfinished turret as `movTarget`.
`_‑DO.EnemyAim` then attempts `movTarget.inner_mc.currentFrame` on the avatar. The
actual runtime outcome of that read has not been observed here and must not be
silently repaired or asserted to be a particular AVM error.

The recreation already resets `gun.targeting.target` on cached attachment in
`World.jump`;4032 instead uses its separate `turretId` path. A regression asserting
old unfinished turret targeting on ordinary cached reattachment would therefore
preserve the wrong source behavior. Resolving the shared target/reset and possible
read-error contract is required before the requested complete correction.

## Objection 2: a rejected birth returns an unparented object, not null

`_‑0D.SpawnNewBullet` AS1077–1109 constructs no replacement return value. It only
sets pose, parents, calls Setup, appends and records a shot inside the open birth
gate; it always returns `param1`. Pcode4605–4765 confirms:

```text
_-CH == null -> ofs0035
gWorldRef._-5d != false -> ofs0035
ofs0035: getlocal1; returnvalue
```

`_‑DO.PartCallTrigger` passes `new EnemyTurret()` and stores that returned object
(pcode393–404). A rejected attempt therefore temporarily retains a newly
constructed **unparented** turret in both `_‑BC` and `movTarget`. BehaviorRun removes
it at the next relevant poll; EnemyAim sees the absent parent and clears it.
No live-array member or shot count is created. Treating the return as null is
incorrect even though attachment is correctly rejected. Constructor/default pose
and side effects before Setup remain distinct from successfully initialized bullets.

The existing `World.addBullet` boolean API cannot alone describe that return-value
contract. This audit leaves it unchanged and does not invent parentage for the
rejected object. Likewise source current-wrapper RemoveBullet stays scoped: a
request on a receiver that does not own the projectile remains a no-op.

## Delivery boundary

The verified changes are caller tests and this evidence record. No source-behavior
fix, parent API, renderer object or private runtime scan is added. Tests do not
claim to recover the blocked cached-target contract. A future bounded implementation
must first incorporate the actual cached primary-target reset and unparented birth
return, then cover shields, parent points, trigger ordering, removal phases and RNG
without changing source-scoped removal.

Original/Adobe execution, arbitrary detached matrices, full constructor RNG/event
ordering, an ordinary earned local encounter and full-game parity remain unproved.

## Local verification

- `bun run format` and `bun run check` pass:911 unit tests/8,411 assertions,
  including two new caller-proof cases. These pass on unchanged production code;
  they are reachability coverage, not failing-before behavior regressions.
- Production build `WF3-OfSw6bpIWATHIwChs` and all eight browser cases pass with
  zero skips: the new public creator/save/source-option path plus existing turret
  protection, active crossing and retained-wrapper galleries in both mock and
  supplied-SWF modes. All existing contact, lifecycle and positive paint
  assertions remain intact. The new spec's initial Node JSON import and Back
  locator errors were corrected in test setup; no production changes were needed.

```sh
BT3_SWF_FILE=/home/ian/Projects/ianwijma/documented-bubble-tank-3/re/bt3/uncompressed.swf bun run test:e2e --config test-results/shield-turret-audit/playwright.config.ts shield-turret-reachability.spec.ts turret-protection.spec.ts crossing.spec.ts
```

The ignored private config replaces every webServer/baseURL with owned3175/3176,
sets their working directory explicitly and disables reuse. Spec copies change
only the fixture URL3102→3176. Both owned servers stopped after the run; the owned
preview tab was closed. Other servers/ports were not stopped or reused.

The mock/native creator captures both show class3, GP3/max24 and Shield Turrets;
the source-option captures show the optional enemy checkbox enabled and checked.
Turret galleries retain the jam-held shield, film loss, separate old hit and rebuilt
pair. Crossing galleries retain both populations and the orphan's fixed pose with
advancing artwork. All ten resulting PNGs were inspected, including both nested
crossing captures. They are recreation fixtures, not original execution comparisons.

Local evidence is under `test-results/shield-turret-audit/`: config and URL-only
copies, source AS/pcode SHA256 identities, final logs, JSON report, validation
metadata and paint copies. No SWF, extracted media, captures or build output enter
the commit. The readonly Ruffle source audit above supplies transform evidence
only; no source-runtime execution or Adobe comparison was performed.
