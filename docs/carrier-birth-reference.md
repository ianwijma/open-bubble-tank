# Carrier field offsets and seeker initialization

This local correction follows projectile birth/display work at
`760fffb7bc2a393ffbdb35607d6133ca5bd7a2a6`. It remains outside frozen PR139;
no sixth layer or deployment is created.

`_‑ct/_‑Ng.PartCallTrigger` converts `emitter1` through localToGlobal and the
outgoing `currentBFTarget.globalToLocal`, then calls SpawnNewBullet six times:

```text
emitter + (−22,0), (+22,0), (0,−22), (0,+22), (−9,0), (+9,0)
```

These offsets are field axes. The source adds the mount and owner rotations
only to the birth rotation argument; it does not rotate the six offsets.
Matching pcode has the two Point conversions, six `_‑QM` constructors and six
SpawnNewBullet calls. Each call supplies its final X/Y before virtual Setup.
The inherited Setup immediately steers toward the supplied current avatar.

The original symbol696's `emitter1` was independently re-read from the local
research SWF through the existing parser. It is at depth16 with identity
matrix and zero translation. The numeric importer records the same0/0
emitter for part4013, so the owner-to-global mount-origin conversion is valid
without adding a rotated emitter offset. No generated metadata is changed.

The preceding implementation spawned/initialized at the emitter first, then
rotated and added each offset afterward. Consequently all six initial
movement vectors used the same emitter origin, and a rotated mount changed
the source's field-axis formation. The correction converts the emitter once,
constructs each final recipe, then passes it through the canonical birth
gate/initializers. There is no post-Setup pose adjustment.

## Reachability and regressions

The shipped imported enemy catalog includes Carrier Fighter `E10000032`,
Plan B `E10000050` and Biomass `E10000042` with4013. They match loaded roster
keys including SmallFighter/OpenEarlyUnit/OpenFighter, HeavyFighter and
HeavyMiniBoss/OpenMiniBoss. This establishes builtin offline catalog callers,
not an observed ordinary encounter in the separate public-input playthrough.

Three regressions fail against the preceding committed source:

- Owner100/50 at90° with mount20/10 at30° converts its emitter to90/70. The
  six births must be68/70,112/70,90/48,90/92,81/70 and99/70 in that order.
- Each initial heading must use its own final position toward avatar200/0,
  rather than the emitter position. The new direct recipes retain independent
  original enemy-seeker initialization.
- A crossing trigger still attempts all six births, while the gate declines
  attachment/counting. Part removal still completes. The old generic volley
  returned before those attempts.

A fourth, already passing control retains original symbol1809 for all six
shots. Existing only-carrier death, mounted-part removal, Massive hit memory
and same-frame live-array processing assertions remain. The unchanged-source
snapshot is `/tmp/bt3-carrier-before-760fffb`; logs are retained under
`test-results/carrier-birth-validation/`.

The previous accepted-shot RNG adapter is explicitly retained, including its
unused `orbit` field; declined births do not add adapter draws. This is not a
claim of original constructor/frame-script entropy equivalence. Original
`_‑QM` registers its frame1 before super, while `_‑BL` also registers a
frame1 callback. Their effective binding, execution timing and full random
stream need original-runtime verification before changing this shared model.

## Local validation

```sh
bun run format
bun run check
BT3_SWF_FILE=/home/ian/Projects/ianwijma/documented-bubble-tank-3/re/bt3/uncompressed.swf bun run test:e2e --config test-results/carrier-birth-validation/playwright.config.ts
```

Formatting, TypeScript and960 tests /8,659 assertions pass. Seven private
specs keep all assertions: only transport URL3102→3166 changes, plus the homing
spec's unchanged helper import relocation. The config owns3165/3166 and
disables server reuse. Production build `jo5kt5S2UB3qlLwQz7-F4` and all16
selected mock/supplied-art browser cases pass in2.9minutes, with no skips,
flaky results or page errors. Both accelerated pilots reach six upgrades,
boss defeat, badge and Continue (mock75,299 / supplied-art75,029 frames).
Native contact/deflection and win paint were inspected. Both owned servers
exited; no listener remains on3165/3166. `provenance.json` and
`validation-summary.json` retain source digests, parent/build identity and
results. Previous birth-layer captures were preserved before this run.

The source Point model and caller ordering are covered here; arbitrary
transformed parents, full constructor/event/RNG scheduling, original/Adobe
runtime trajectories, ordinary boss/win and whole-game parity remain open.

| Source under local research `re/bt3` | SHA-256 |
| --- | --- |
| `export_scripts/scripts/_-ct/_-Ng.as` | `6417338863a1bf10682182a189be0f5de0f0b80d22b345e96fee21c8aacb7741` |
| `export_pcode/scripts/_-ct/_-Ng.pcode` | `83d00b23ff8370d669c3430d3f5414514e6e87330bc80e734cb22e8604db13c2` |
