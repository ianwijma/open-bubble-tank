# Fresh-field population before background scaling

This bounded correction follows the [live-field ownership audit](live-field-display-ownership-audit.md#setup-movement-arrival-and-collapse-phases)
and the earlier [construction-before-pose correction](cross-field-weapons-reference.md#field-births-finish-construction-before-their-display-pose).
It changes only fresh-wave X/Y assignment in `World.jump`. It does not implement
the broader display ownership/query design or claim original-runtime parity.

## Independently checked source order

Paths below are relative to
`/home/ian/Projects/ianwijma/documented-bubble-tank-3/re/bt3`.
`P:` denotes `export_pcode/scripts/`; `AS:` denotes
`export_scripts_deobf/scripts/`. Qualified names and branch targets take
precedence over the decompiler's textual order.

- `BTAGameWorld.AttachNewBubblefield` constructs a fresh `Bubblefield`, adds its
  guide to `enemyLayer_mc` and assigns the world reference before population
  (`AS:BTAGameWorld.as:1667–1671`; `P:BTAGameWorld.pcode:7893–7910`,
  `ofs0162 → ofs0153 → ofs0148`). Cached enemies use `_-G0`
  (`P:8073`), while fresh normal/boss and deadhead branches synchronously set
  `PackageNamespace("")._-WZ` (`P:8145` and `P:8116`).
- The `_-0D._-WZ` setter invokes `PrivateNamespace("","15")._-Ar`
  (`AS:_-0D.as:966–973`; `P:_-0D.pcode:4117–4142`). `_‑Ar` imports each design,
  calls `TankData._-Tr(3,gWorldRef)` and then samples X, Y and rotation.
  `P:_-0D.pcode:6413–6429` multiplies the X draw by
  `PackageNamespace("").BF_BG_mc.scaleX`; its jump to `ofs00b8`
  (`P:6462–6473`) does the same for **Y using scaleX**, then jumps to
  `ofs00a1` for rotation. Attachment, callback and raw-array append follow.
- Only later does `AttachNewBubblefield` write the selected wave scale to
  `effect_mask_under`, `_-SQ`, `BF_over_detail_mc` and `BF_BG_mc`
  (`AS:BTAGameWorld.as:1812–1815`; `P:8433–8478`, `ofs0591`). The earlier wave
  `SCALE` read stores local 5; it does not scale the background before population.
- A fresh read-only extraction of original symbol 1551/frame1 independently
  confirms that depth 1 `BF_BG_mc`1537 has matrix `[1,0,0,1,0,0]`; field 1551
  has one frame. Thus these fresh births multiply coordinates by authored 1,
  rather than the future wave scale. EnemyLayer is not one of the four scaled
  children. No generalized display setter or parentage rewrite is needed here.

Pinned SHA256 inputs:

| Input                | SHA256                                                             |
| -------------------- | ------------------------------------------------------------------ |
| `uncompressed.swf`   | `f5827841c682f988f23dcf470ab4ab59c1ffc497acb4ca0f21077d03f942c153` |
| `BTAGameWorld.pcode` | `eda20420933f4bd87fe9dce652428c3dde3a4bc6e0ee31702325fcdb3c9dba0b` |
| `_-0D.pcode`         | `5b30ed4cca2a726a56569c8da70a24c652282c92836692cdbd6fd1f97fc8b5ae` |
| `_-3y.pcode`         | `c7f4520c2c57aee210df3f8e352a7954be6656fa55130656085341bce9f3aeb4` |

## Supported normal-wave witness and independent positions

The regression starts `World([],[],5)` with builtin catalogs, no saved enemies,
no injected roster and no overridden random results. Two eastward crossings
complete through ordinary `World.step(emptyInput())` frames; a third eastward
attachment reaches `(3,0)` without satisfying the boss gate.

`AS:_-3y.as:659–679` supplies two distance 3 options. The first has chance 50,
scale 1.2 and instructions `TinyDeadHead(0,2)`, `EarlyHeavy(1,2)`,
`SmallDeadHead(2,5)`, `SmallDeadHead(1,1)`. The second has chance 50, scale 1,
and three instructions. Both options' seven count draws occur before ticket 15
selects the first option. Counts 2/1/4/1 resolve to two Whispy (`E10000034`),
one Sticky Again (`E10000037`) and five Squirt (`E10000018`) through the
unmodified initial roster. Singleton lookups draw nothing.

The fixture pins all 33 integer calls including ranges/results: eight wave calls,
24 pose calls and Sticky Again's one weapon-acquisition coin immediately before
its pose. The expected positions below are literal integer draws times the
independently extracted authored scale1; they are not computed by calling the
production placement code or multiplying by its returned field scale.

| Tank index | Original-source expected X, Y, rotation | Previous host X, Y          |
| ---------- | --------------------------------------- | --------------------------- |
| 0          | `147, -10, 46`                          | `176.4, -12`                |
| 1          | `104, 169, -102`                        | `124.8, 202.79999999999998` |
| 2          | `139, -160, 14`                         | `166.79999999999998, -192`  |
| 3          | `52, 15, 126`                           | `62.4, 18`                  |
| 4          | `-94, -2, -58`                          | `-112.8, -2.4`              |
| 5          | `147, -131, 146`                        | `176.4, -157.2`             |
| 6          | `-21, 172, 94`                          | `-25.2, 206.4`              |
| 7          | `71, -103, -7`                          | `85.2, -123.6`              |

On the preceding production code the roster, scale 1.2, full RNG trace and Setup
target assertions pass, then the position assertion fails on all 16 coordinates.
The correction removes only the two `* wave.scale` operations. All three
birth-order tests then pass, preserving the original boss/Setup assertions.
A separate already-passing cache control restores the same actor at
`315.25,-71.5,43.75` in a scale 1.6 field with zero random calls. Cached poses,
final field scale, rotation, roster selection and constructor ordering are retained.

This is a deterministic simulation/source witness. It does not claim an ordinary
keyboard/mouse encounter, an original seeded run, complete constructor/frame-script
entropy equivalence, display ownership/query completeness, pixels/audio or
Adobe/full-game parity. The prior ownership audit remains a historical audit;
its wider objections are still unresolved.

## Local verification

Ignored evidence is under `test-results/scaled-field-spawn/`: pinned input/ref
manifest, read-only extraction script/output, before/after regression logs,
format/check logs, isolated browser configuration and assertion-preservation
manifest. Private browser copies use `.spec.mts` so the repository's `**/*.ts`
TypeScript include does not accidentally compile copies; their only content
change is fixture URL 3102→3416. They have no relative helper imports to resolve.
TypeScript completes before the production build starts. No research file is
modified and no original media, dependency or build output belongs in the commit.

`bun run format` and `bun run check` pass: 1009 tests / 8848 assertions, zero failures.
Browser validation uses this literal command:

```sh
BT3_SWF_FILE=/home/ian/Projects/ianwijma/documented-bubble-tank-3/re/bt3/uncompressed.swf bun run test:e2e --config test-results/scaled-field-spawn/playwright.config.mjs
```

The isolated configuration selects existing actor-behavior, crossing, screen-effect
and accelerated playthrough specs in both mock and supplied-SWF modes on private
ports 3415/3416, retaining every assertion and disabling retries/server reuse.
Production build `CRpPQCN87ZniwQjDfA7ib` and all ten cases pass, with zero skips,
flaky cases or page errors. Mock/supplied-art pilots reach boss defeat, badge and
Continue in 71,931/73,315 frames. These are accelerated seeded control-frame
fixtures with the existing upgrade adapter, not ordinary earned gameplay or an
original-runtime comparison. Supplied-art active-crossing, progression-history
and win captures were inspected; this is paint inspection, not a pixel diff.
`browser-report.json` (relocated from the reporter's nested relative output),
`e2e.log`, per-case `browser-results/` and `ports-after.txt` retain the result.
Stage captures are `test-results/swf-active-crossing.png`,
`test-results/swf-playthrough-history.png` and `test-results/swf-playthrough-win.png`.
Playwright stopped its own servers; both recorded server PIDs exited and
ports 3415/3416 are free. The original input hashes/research working-tree status
and protected master/legacy refs are checked again before local commit.
