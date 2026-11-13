# Projectile movement through display coordinates

This local follow-up starts from the final field-generation batch head
`c5fb4ed9e1f48887ecd85bf81e62109c6e79e562`. It is separate from that frozen
five-layer PR and its hosted gate; no sixth PR or preview deployment is created.

## Recovered writes

The original `_‑BL.MoveBullet` at AS lines356–379 performs wall/target/contact
work and then writes `this.x += this.moveX` and `this.y += this.moveY`. Exported
pcode starts at line1692: `ofs001e` reads X, adds moveX, sets X, then `ofs000e`
does the separate Y write. `_‑BL.Run` at lines411–438 likewise writes both
coordinates in state2 before its virtual wall test. These are MovieClip display
properties, not private accumulated Number vectors.

The existing `displayPixel` models the truncating signed-twip display assignment
used by actor movement and the measured creator controls. Applying it to each
position write prevents fractional residue from accumulating across frames.
For speed3 at45°, the retained movement components remain approximately
2.121320343559643. Each displayed step is2.1px, so ten steps end at21/21,
where the preceding implementation accumulated21.213203435596423/21.213203435596423.
Negative coordinates truncate toward zero; they do not floor toward−∞.

The generic projectile movement tail serves the following recovered paths:

| Path | Source |
| --- | --- |
| Basic shells and builder inheritance | `_‑U7` / `EnemyTurretBuilder` inherit `_‑BL.MoveBullet` |
| Piercing / Massive Cannon | `_‑14/_‑Un.MoveBullet:16`, `_‑dp.MoveBullet:19` |
| Bubble Buster | `_‑14/_‑c4.MoveBullet:14` |
| Ricochet | `_‑14/_‑bk.Move:15` |
| Rocket | `_‑14/_‑Kk.MoveBullet:26` |
| Apocalypse moving phase | `_‑14/_‑6.MoveBullet:24` |
| Infection's final queued-removal movement | `_‑14/_‑U4.MoveBullet:27` |

Each inspected method ends its moving path with separate X/Y display writes.
This change preserves the existing branch/callback order. It also applies those
writes to the shared Buster-deflected state2 path, retaining the copied vector
without rounding or recomputing it. A normal projectile still tests contact
before moving; a deflected projectile moves before testing its boundary.

## Regression evidence

Six trajectory cases cover shells, piercing, Buster, ricochet, a straight
zero-wobble rocket and the moving Apocalypse phase in all four diagonal
quadrants. A seventh requires the original deflection vector to remain exact
while the displayed pose truncates. Two further cases verify that the next
contact uses the preceding displayed pose and that both display writes precede
the strict deflected wall test. A length10 deflection from414.95/−10 reaches
415/0 and survives the first boundary check, then expires on the next frame;
the old floating accumulator expires immediately at415.01/approximately0.

All nine fail against unchanged committed source in an isolated ignored source
snapshot and pass with the correction. No production source was swapped while
browser validation ran. The snapshot was subsequently moved to
`/tmp/bt3-projectile-display-before-c5fb4ed` because the repository's broad
TypeScript include glob picked up its copied sources and conflicting `@/`
aliases. No compiler setting was changed to bypass that validation setup error.

The existing infection regression keeps its acquisition/removal/effect checks
and now requires exact final coordinates12.9/0.45. Its imported emitter is
8.5/0.5, the starter mount is−1/0 with scale71/76, and Run still writes its6px
motion after failed acquisition. The old approximate assertion retained raw
fractional display coordinates.

## Validation and scope

```sh
bun run format
bun run check
BT3_SWF_FILE=/home/ian/Projects/ianwijma/documented-bubble-tank-3/re/bt3/uncompressed.swf bun run test:e2e --config test-results/projectile-display-validation/playwright.config.ts
```

Ignored logs, before/after evidence and the private config are under
`test-results/projectile-display-validation/`. The nine private spec copies
retain all assertions and change only fixture URL3102→3166. Owned3165/3166
servers disable reuse. Formatting, TypeScript and941 unit tests /8,607 assertions
pass. Build `l1GDmFV_l6IP0da_bwNna` and all20 affected mock/supplied-art browser
cases pass in3.2minutes, with no skips, flaky results or page errors. Both seeded
accelerated pilots reach six upgrades, boss defeat, badge and Continue
(mock72,657 / supplied-art70,626 frames). Both Buster galleries and native win
paint were inspected. The private servers exited and no listener remains on
3165/3166. Source/test/tool digests still match the built-code manifest;
`provenance.json` and `validation-summary.json` preserve the identities/results.
The preceding PR139 validation captures were preserved in
`test-results/wave-final-validation/captures/` before this follow-up ran.

This is source/pcode-backed numerical modeling, not a new observed original
projectile trajectory or an Adobe differential. Full birth-pose/rotation
setter semantics, custom subtype movement outside this shared tail, arbitrary
non-finite values, full constructor/event/RNG order and whole-game parity
remain open. Existing private vectors, speed, force and cached constructor
choices are not display coordinates and must not receive blanket rounding.

| Local research source | SHA-256 |
| --- | --- |
| `export_scripts/scripts/_-BL.as` | `21f55ae5f710002b5c9bc24e81fedc4e611d7ceeac493fa44fd86016bb9e1133` |
| `export_pcode/scripts/_-BL.pcode` | `3b365d3e31350a90d69f814b9692c88af83e600ae957e3bea3645c69114fb64f` |
| `export_scripts/scripts/_-14/_-Kk.as` | `6e41bd3740b43c375050e4d4db56d6531f8466877688fdac8d9c96d06e76530a` |
| `export_scripts/scripts/_-14/_-Un.as` | `ca10a3208bd5b5a6615c113f3f224987ab9588249981326461f638bdedf5c7de` |
| `export_scripts/scripts/_-14/_-U4.as` | `9135cb670e0aa70a7e1ad26e5ed334c928603a94a47d430fb6b22f54753f99f7` |
