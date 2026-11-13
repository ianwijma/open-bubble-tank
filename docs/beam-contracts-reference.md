# Damage beam candidates, carrier indices and avatar lifetime

This local fourth layer starts at corrected PR142 head
`9ccf27d1eac7cd0a34058c7befb0f7ec33d432a1` on `t3/integrate-beam-contracts-layer`.
It cherry-picks original local commit `b0c570b4b8777c2bd9b2430496aff145d932c938`
from `t3/beam-contracts-draft`, whose original base was
`945d2ec9f23210ada2691b9bed5193d6aacf9fb5`. The corrected canonical
`movementEnabled` gate and post-Setup setter, eleven target regressions and
all corrected PR142 reference documents are preserved.
It corrects bounded source contracts, not complete beam or game parity. No original
SWF was patched or run for this layer. Supplied-art browser results exercise the
recreation's production geometry and renderer, not the original AVM2 simulation.

## Source and bytecode audit

Paths below are relative to
`/home/ian/Projects/ianwijma/documented-bubble-tank-3/re/bt3/`.
The audit uses `export_scripts/scripts` and the matching qualified
`export_pcode/scripts`, rather than treating a decompiled loop as executable truth.

- `_‑14/_‑CO.TestForCollision` calls `_‑L2(_‑W.arrEnemies)` after checking its own
  parent. `_‑L2` copies the **raw** array with `slice`; `_‑GA` applies only its
  geometric filter. There is no dead/data/parent population prefilter. Pcode
  lines501–508 store the array copy in local3 and pass it to the private selector.
- `_‑GA` converts both the beam's actual parent Point and each candidate's actual
  parent Point to global coordinates before Number subtraction. `_‑KM.GetLength`
  uses `sqrt(dx*dx + dy*dy)` and `_‑Gs` uses `360*atan2/(2*PI)`. The selector retains
  its signed sine and behind-origin radius test. It computes one shared MIN/MAX;
  local8 is converted to int once before the ray's6px increments. The source
  MIN/MAX defaults are99999/-1, with0/99999 when no candidates remain.
- The ActionScript export misleadingly omits the forward branch's assignment to
  `_loc9_` in its displayed control structure. Qualified `_‑GA` pcode
  `ofs0113 → ofs00f4 → ofs00d8 → ofs00c3 → ofs00ae` explicitly computes both
  distance-minus-radius and distance-plus-radius for surviving forward candidates.
  The implementation preserves that bytecode behavior.
- `_‑L2` pixel contact uses **local3[local11]** (`ofs033e`, lines880–890), while
  carrier count/contact, primary splice, trigger, deactivation and removal use
  **_‑W.arrEnemies[local11]** (`ofs035b`, lines895–903, and `ofs0315`, lines862–877).
  Package-qualified `getlex _‑W → getproperty arrEnemies → getlocal11 →
  getproperty MultinameL` establishes the raw-array lookup. This is a shipped
  index mismatch, not permission to associate the carrier with the filtered actor.
  Ordinary damage still calls `_‑Mb(local3[local11])` at lines936–940.
- The carrier path splices the raw actor's primary list **before**
  `PartCallTrigger`. `_‑ct/_‑Ng` emits six seekers before `Weapon.Deactivate` and
  `removeChild`; only then is its carrier reference removed. The shared release
  helper now preserves that primary/display order. Its existing field-axis births,
  source artwork, Setup and rejected-birth contracts remain covered.
- Each sample resizes line/mask/end cap before wall/contact tests. A non-carrier
  hit increments `intDamageCounter`; on exactly2 it calls Damage and resets the
  counter **after** the call (`ofs03a2 → ofs0397`). Misses preserve partial contact.
  Beam length is display state, not movement speed: source Setup supplies speed0.
- `_‑ct/ABeamCannon` (catalog part2017, symbol1993) stores its `_‑CO` instance in
  `beam_mc` before calling `SpawnNewBullet`. It checks `beam_mc == null`, not its
  presence in a live bullet array. A later trigger writes directly to that object
  even when it is unparented. Pcode `ofs00eb → ofs00c2` distinguishes construction
  from the retained-object branch `ofs00b4 → ofs00a1 → ofs008e`.
  `StopFiring` asks **currentBFTarget** to remove the object, then clears its ref
  (`ofs0017 → ofs000d`); it does not search all attached or retained layers.

## Real callers and reproductions

`_‑0D.Run:616–686` drains the prior enemy-removal queue, runs live enemies/allies,
then runs the live ordered bullet vector. `_‑BL.TestForCollision` can synchronously
Damage an enemy. `_‑Zx.Damage → Deactivate` clears data through
`TankData.Deactivate → WipeTank`, which removes its display children; it retains
its parent, x/y and gameplay radius. `_‑0D.TankCallback` only queues that enemy for
next-frame removal. Therefore an earlier ordinary shell can leave an empty raw
candidate for a later avatar beam in the same real field Run. The regression uses
that chain with actual geometric contact, observing the healthy target's first
sample at30 before next-frame removal changes it to80. The native browser fixture
uses ordinary constructed body radius22.5 (no forced radius): its samples are27
and77 and its rendered contact endpoints differ.

The filtered/raw index divergence is reachable with an ordinary excluded enemy
behind the beam followed by a carrier-only enemy in front. Its actual carrier
pixels are the filtered actor's contact, but the source consults raw index0,
which has no carrier references; the carrier takes ordinary two-contact damage
and stays mounted. The new mock/SWF browser fixture uses production contact for
this case. The separate unit fixture which forces a raw actor's carrier hit is
an isolated dispatch/order contract; it is not evidence that a distant excluded
carrier naturally contacts the ray.

The avatar callers are `AvatarInterface.AvatarShootTest → _‑1r → PartCallTrigger`
and `mouseUp → _‑Uz → StopFiring`. `_‑Zx.Damage:969–974` at interface level0 writes
life1 and calls `BTAGameWorld._‑1E(true)` directly. This bypasses the ordinary
`_‑ZY` caller's shooting suppression and `_‑1J` final callbacks. `_‑0D.SpawnNewBullet`
rejects births during the crossing. Thus holding the real avatar trigger can
retain a newly constructed, unparented beam through arrival; release clears it
and the next press creates a working beam. A preexisting beam can instead survive
in an uncleared detached outgoing wrapper; StopFiring after arrival asks the new
current wrapper and leaves the old object's parent intact. Tests reach both via
actual lethal damage and field attachment, without inventing enemy2017 callers.
No enemy beam encounter is claimed or introduced as evidence.

## Regression and browser evidence

`tests/beam-contracts.test.ts` adds nine regressions: same-frame raw death/grid,
filtered-contact carrier suppression, raw carrier dispatch, primary-before-trigger
membership, reparented candidate Points, fractional global Point/counter/paint
order, direct detached-beam refresh, rejected death-crossing birth retention and
old-wrapper retention after a real death crossing. All nine fail against the
unchanged corrected PR142 implementation. The fresh before harness temporarily
restores only the four production simulation files from `9ccf27d1`, records their
SHA-256 values, runs the final test file, then restores the corrected bytes in
`finally`. It never rewrites protected refs or existing assertions.

The existing damage-accounting fixture now attaches its beam before collision,
then removes it before the independent turret assertion. All its assertions and
the preceding eleven target cases remain intact.

```sh
bun run format
bun run check
BT3_SWF_FILE=/home/ian/Projects/ianwijma/documented-bubble-tank-3/re/bt3/uncompressed.swf bun run test:e2e --config test-results/beam-validation/playwright.config.ts
```

The original draft's985-test /8,782-assertion run and build
`lhZpuc68_OBV0znfWoB8U` belong only to its original945d2ec base and worktree.
They do not validate this corrected-base tree. The fresh joint run passes
formatting, TypeScript and987 tests /8,791 assertions, including all eleven
corrected target cases and all nine beam regressions. The nine beam cases also
fail against corrected PR142 before integration (0pass /9fail); the before
harness restores the integrated bytes in `finally` and verifies their hashes.

The fresh production build `_yDSVPnyZ-mmBRewsOJj0` and all17 affected browser cases
pass in1.50minutes, with zero skips, unexpected failures, flaky results or
page errors. The current supplied-art beam gallery was inspected. Mock and SWF
raw-grid/carrier contact, both crossing flows, Healer lifecycle, homing,
production paused-beam input/timers, projectile contact order and special
projectiles all run with their existing assertions intact.

Validation details remain ignored under `test-results/beam-validation/` in this
checkout. `source-before-validation.json` records692 tracked-file SHA-256 values;
all692 match immediately after the literal e2e command. The private specification copies are
byte-identical to the old beam-validation copies after port normalization, and
match the current repository specifications after URL/import normalization.
`beam-art.spec.ts` retains the complete selected beam/turret test from
`e2e/fixtures.spec.ts`. `assertion-preservation.json` records that comparison.
Final edits after validation change only the three scoped documentation files;
production and test files retain their validated hashes.
No assertion or skip condition is removed; the supplied original input is present
and every supplied-file case executes.

The explicit private config uses one worker, `reuseExistingServer=false`, only
ports3285/3286 and this checkout's own `.next`; no parent build output is used.
`server-identities.json` and `process-identities.json` record PID, parent PID,
start ticks, executable, command and cwd. Playwright stopped both owned servers;
`run-result.json` records their exit and both free ports. There was no inherited
server-config failure in this fresh run. `research-inputs.json` rechecks all23
source/pcode/SWF hashes below. `report.md` and `provenance.json` record the final
build, source identity, check/browser summaries and cleanup.

No dependency was installed or upgraded. The existing main-checkout node_modules
was temporarily linked locally and removed before handoff. No dependency, build,
capture or original media is committed. Protected master, legacy and published
layer refs remain unchanged. This is local joint validation; the parent owns
publication and the final combined current-head hosted Actions/review gate before
the single master merge.

## Limits and objections for the parent

The corrected branches are supported by source/pcode and failing-before evidence.
The following existing approximations are deliberately **not repaired by inference**:

- `_‑L2` uses dynamic `_‑W.width` for its loop ceiling and calls the wrapper's
  `_‑W.hitTestPoint(..., true)` **after** resizing its own beam children. The
  recreation still uses its existing425×scale circular wall and fixed diameter
  adapter. Own-beam/other-child contributions to the wrapper's width and geometric
  hit result need a controlled original-runtime comparison before changing that
  fundamental boundary. Static circular-wall tests do not prove equivalence.
- Actual-parent candidate/sample Point conversions use the existing ActorParents
  translation/float32/twip model. The shared mounted-emitter conversion, arbitrary
  nested matrices/scale, negative-MIN width setter behavior and exact native
  geometric boundary rounding are not comprehensively validated here. The new
  browser fixture fixes its emitter to isolate the confirmed grid contract.
- Raw-index carrier dispatch is retained even when it disagrees with the filtered
  contact. A naturally contacting distant excluded carrier has not been observed;
  the source-qualified dispatch test is explicitly synthetic at its hit callback.
- Constructor/frame registration and the complete RNG/event stream remain open;
  accepted-shot entropy consumption is retained. No original runtime replay,
  Adobe comparison, ordinary earned boss/win, pixel/audio equivalence or full-game
  parity is inferred from the passing tests.

## Source identities

SHA-256 values identify unchanged research inputs; no original payloads are copied
into this repository.

| Input relative to `re/bt3` | SHA-256 |
| --- | --- |
| `export_scripts/scripts/_-14/_-CO.as` | `2947c8c6135c9c6dcaf760dbdc96fc99bcef5b28edbb1d00705a3e48c813840b` |
| `export_pcode/scripts/_-14/_-CO.pcode` | `3f0cd062cedc74c521d0a00daff658963441f4eeda24ac180c177ac18c77593f` |
| `export_scripts/scripts/_-ct/ABeamCannon.as` | `e0996950104927212dd40f61a8bf60989ab3675920e829ef587c61bc7e80f77d` |
| `export_pcode/scripts/_-ct/ABeamCannon.pcode` | `973aae522d4b758abce1423f20423d76df368c5cb5a55b28e9f5c63602291f11` |
| `export_scripts/scripts/_-0D.as` | `a3cb66e601053b5c615003b01077cfc96752554f85352a62feb278004750ac24` |
| `export_pcode/scripts/_-0D.pcode` | `5b30ed4cca2a726a56569c8da70a24c652282c92836692cdbd6fd1f97fc8b5ae` |
| `export_scripts/scripts/_-Zx.as` | `3a5c16a3f14e1ceae76b93185a8c4a974b9e2b9326b6021526f2320d89522f16` |
| `export_pcode/scripts/_-Zx.pcode` | `2a3d03e2eebf57c8189b5d4e2aea67e48f6dcfb50477271f07dca15b22bf80ea` |
| `export_scripts/scripts/_-BL.as` | `21f55ae5f710002b5c9bc24e81fedc4e611d7ceeac493fa44fd86016bb9e1133` |
| `export_pcode/scripts/_-BL.pcode` | `3b365d3e31350a90d69f814b9692c88af83e600ae957e3bea3645c69114fb64f` |
| `export_scripts/scripts/TankData.as` | `20a187f6db832a80b643cfdd8b8acb39c6859b43768dd594b971bf661687d9d8` |
| `export_pcode/scripts/TankData.pcode` | `4f1eec91c07616eaa1895078047c1423a21ce0253192d61161dfdc8f120491f0` |
| `export_scripts/scripts/AvatarInterface.as` | `43300961b5b042e401414d3a7a24d57e0114bd52e1b228d092c5b1ee1d099d3c` |
| `export_pcode/scripts/AvatarInterface.pcode` | `d5878da5caacba0ec2b83c02283a828036a5d83d22c88ae1d05d332fc7426e05` |
| `export_scripts/scripts/BTAGameWorld.as` | `66ae092b31799f36f776f777a576d52e10d3ce5e7901fcedd2716c4fa7be951e` |
| `export_pcode/scripts/BTAGameWorld.pcode` | `eda20420933f4bd87fe9dce652428c3dde3a4bc6e0ee31702325fcdb3c9dba0b` |
| `export_scripts/scripts/_-ct/_-Ng.as` | `6417338863a1bf10682182a189be0f5de0f0b80d22b345e96fee21c8aacb7741` |
| `export_pcode/scripts/_-ct/_-Ng.pcode` | `83d00b23ff8370d669c3430d3f5414514e6e87330bc80e734cb22e8604db13c2` |
| `export_scripts/scripts/Weapon.as` | `b4db02e9d591822c18113c087f41064d328319681ecadd55ff6e43d33f78ac5a` |
| `export_pcode/scripts/Weapon.pcode` | `683846fae3dfcc6b7ce0535119c4fa43f2d0ee439416897420d2de7bc8ef5245` |
| `export_scripts/scripts/_-KM.as` | `8050ae36e47247198de9689b85716ef54011aabae274021d0f60d39f0e28082e` |
| `export_pcode/scripts/_-KM.pcode` | `e2433be9d5c58703374941fd2bc38cf85101881e9acedc2fe363bf789067e16b` |
| `uncompressed.swf` | `f5827841c682f988f23dcf470ab4ab59c1ffc497acb4ca0f21077d03f942c153` |
