# Retained Sapper shot and master lifetime

Part4012 keeps one direct `_‑Jp` reference per `_‑3C` mount. The previous
implementation searched the currently stepped wrapper's bullet array instead.
A source shot retained in an uncleared detached wrapper disappeared from that
search when its owner was restored into a fresh wrapper, so the mount could
create a second shot while the original object still existed.

## Source contracts and bounded caller

Paths below are relative to the sibling research repository's `re/bt3`.

- `export_scripts/scripts/_-ct/_-3C.as:26–39` and corresponding pcode entry
  `ofs001a` retain `_‑5g`, test its `objAvatar` against null, convert the emitter
  through outgoing `currentBFTarget`, construct a fresh `_‑Jp(this)` and store
  it before calling SpawnNewBullet. No current-array search participates.
- `_‑0D.SpawnNewBullet:1077–1112` returns the newly constructed object even
  when crossing declines attachment and Setup. `_‑Jp`'s constructor stops at
  frame3. Its inherited raw pose, speed and damage remain 0/0/0, NaN and1.
  A later ready mount call therefore retries a declined object.
- `_‑BL.Deactivate:168–175` clears `objAvatar`; `_‑0D.RemoveBullet:1239–1241`
  deactivates, splices and removes the child. In these modeled lifecycle paths,
  physical projectile-parent membership distinguishes the initialized retained
  shot from a declined or removed one. A queued dead flag alone does not rearm
  the mount. A detached wrapper's child remains parented.
- `_‑Jp.TestForCollision:175–190`, matching pcode `ofs0049 → ofs0039 → ofs0016`,
  lazily reads the captured `myMaster` object from special data, then caches
  that object's current life before testing **the owning Bubblefield's
  contains(master)**. It does not look up a replacement by ID or use current
  enemy/allied array membership. Existing hit/heal, shield, phase and art
  switches remain unchanged.

No builtin avatar, enemy or boss catalog design contains4012. The supported
recreation caller is the optional saved-enemy adapter, rather than a claimed
builtin encounter: Cruiser bodies plus one4012 mount, class3/life20/reward5/
speed2, pass the production build/save checks. The saved record matches
OpenFighter. An unmodified seed38 World, after `roster.update(10)`, selects one
copy in the distance10 wave. This is a reproducible seeded caller witness;
it is not evidence that the separate ordinary-input session encountered it.

## Implementation and regression boundary

`GunState.sapperRef` owns the exact shot. `fireSapper` retains a raw rejected
birth and prepares accepted pose/recipe fields only inside the canonical birth
gate. The accepted-shot entropy adapter remains unchanged pending complete
original frame/constructor timing and random-stream verification. The emitter
uses the existing numeric muzzle adapter and outgoing-wrapper Point conversion;
arbitrary nested matrices are not newly proved here.

Sapper Setup captures its home object immediately. The source's lazy
`intMaxMasterLife` sample remains at the first collision pass. Actual field
parentage owns containment. Numeric owner-ID lookup remains only a fallback
for manually constructed existing fixtures that omit the explicit home.

Five new regressions fail against unchanged parent `de6ff521992ecfffef7fc2bfbea88d990ece2cdd`:

1. A mount retains the exact shot through a queued-dead interval, rearming
   only after real removal.
2. A living owner leaves an uncleared field and returns in a fresh wrapper;
   its old shot remains in the original runtime and no replacement is born.
3. Crossing creates and retains raw declined objects without counting shots;
   the next ready call retries with a distinct new object.
4. A same-UID array replacement cannot become the original captured master.
5. An old array reference cannot satisfy contains after physical reparenting
   into another field.

Two already passing controls cover valid saved-roster reachability and existing
same-field steering. The external unchanged-source snapshot and complete logs
are identified in `test-results/sapper-retention-validation/`. Existing Sapper,
per-mount and interception tests retain every assertion. Their fixture setup
now registers actual actor parentage before calling isolated simulation entry
points; the Sapper removal test also synchronizes its explicit array removal.
The special-projectile browser fixture likewise attaches its master explicitly.

## Verification and remaining work

```sh
bun run format
bun run check
BT3_SWF_FILE=/home/ian/Projects/ianwijma/documented-bubble-tank-3/re/bt3/uncompressed.swf bun run test:e2e --config test-results/sapper-retention-validation/playwright.config.ts
```

Formatting, TypeScript and967 unit tests /8,694 assertions pass. Production
build `JHyOvZnSfMExJVnzH33x8` and all14 affected mock/supplied-art browser cases
pass in2.1minutes, with zero skips, flaky results or page errors. Six private
spec copies retain every assertion: only fixture URL3102→3166 changes, plus
the homing helper's unchanged relative import relocation. The supplied-art
special-projectile and stage-clock galleries were inspected. Both owned3165/
3166 servers exited and the ports are free. All515 recorded source/test/tool
file digests still match the completed run. `provenance.json`, `report.json`
and logs retain scope, source/pcode hashes and outcomes. The first complete
unit run found two older unsynchronized fixture setups; their corrected full
rerun passed without assertion changes. Hosted Actions remains a separate gate.

The retained shot/master contracts are source/pcode and regression evidence.
They do not prove an original-runtime cached Sapper encounter, ordinary boss/win,
complete target/avatar replacement and cross-wrapper contact coordinates,
arbitrary matrices, constructor/event/RNG scheduling, pixels/audio or
original/Adobe/full-game equivalence. Those remaining contracts must not be
silently inferred from these tests. Hold master for the final combined head of
the five-layer delivery batch.

## Original source identities

| Research input | SHA-256 |
| --- | --- |
| `export_scripts/scripts/_-ct/_-3C.as` | `3afb97c64c581dde141193e8bf477eaacf99b8844119282a6e2f3f143949aa41` |
| `export_pcode/scripts/_-ct/_-3C.pcode` | `11eb40f0fba080820e5234c3add2b933f5af5678296222430cf352dee4f87e07` |
| `export_scripts/scripts/_-14/_-Jp.as` | `662433e4ac45a96a1ccec06cb03b318fb14dc68a55d8f59ffe1602a07b3247ce` |
| `export_pcode/scripts/_-14/_-Jp.pcode` | `b13df74ba8b32c00d6d9a3950bbd2498f4fbd7d9f6502a229070cd6aa154fb63` |
| `export_scripts/scripts/_-BL.as` | `21f55ae5f710002b5c9bc24e81fedc4e611d7ceeac493fa44fd86016bb9e1133` |
| `export_pcode/scripts/_-BL.pcode` | `3b365d3e31350a90d69f814b9692c88af83e600ae957e3bea3645c69114fb64f` |
| `export_scripts/scripts/_-0D.as` | `a3cb66e601053b5c615003b01077cfc96752554f85352a62feb278004750ac24` |
| `export_pcode/scripts/_-0D.pcode` | `5b30ed4cca2a726a56569c8da70a24c652282c92836692cdbd6fd1f97fc8b5ae` |
