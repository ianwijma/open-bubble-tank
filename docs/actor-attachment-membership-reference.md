# Actor attachment geometry follows physical children

The existing public `AssetPack.hitTest` could still hit removed status marks,
infection and forcefield artwork through retained logical records or positive
flags. Legacy shield state could also invent film/impact contact and Script width
after physical removal. `TankView.orderChildren` already excluded those absent
keys, making contact and drawing disagree.

Contact now requires the corresponding `displayChildren` entry in addition to
the existing supported state/pose conditions. Legacy film and impact are distinct
physical children: a film does not imply an attached impact clip. Mounted shield
objects retain their existing independent key checks. Script bounds also require
the actual legacy film/hit keys. Hidden and alpha-zero attached parts keep their
existing geometry; the membership operation is removal, not visibility.

The `legacyShieldFilm` clock compatibility helper remains in `tank-art.ts` for
explicit legacy snapshots. It no longer substitutes for physical membership in
the two geometry providers. The existing attached-shield bounds fixture now
performs its omitted addChild phase explicitly, preserving its100px assertion.
The new removed-child test retains the positive shield scalar and requires the
original52px body bounds before attachment and after removal.

## Source and control boundary

Source paths below are relative to read-only sibling research `re/bt3/`:

- `export_scripts/scripts/_-Zx.as:1323–1334` and qualified
  `export_pcode/scripts/_-Zx.pcode:5803–5868`: `_‑JJ` tests each retained mark's
  parent, calls `removeChild`, then replaces the reference vector. EffectMeCrazy
  at1337–1429 creates, positions and adds actual marks before recording them.
- `export_scripts/scripts/_-ct/AGunShield.as:33–60` and pcode273–313: first use
  adds a separate hit clip, then film. KillShield removes only its film before
  nulling that reference and clearing the shield Boolean. A logical Boolean is
  not the display list, nor does film membership imply impact membership.
- `export_scripts/scripts/_-ct/APassiveForcefield.as:20–25` and pcode60–95:
  FinalPartCall clears readiness then removes its retained wrapper. Run checks
  its actual parent and Setup attaches the recreated wrapper, whose splash uses
  a retained cloned-tank mask. A retained clone alone cannot be actor contact.
- `export_scripts/scripts/_-14/_-U4.as:57–85` constructs `effect_infected`,
  assigns its transform and adds it to the actual victim. TankData.WipeTank's
  physical removal contract is separately recorded in
  [the actor owner reference](actor-display-ownership-reference.md).

The prior [original mask controls](field-mask-runtime-reference.md) independently
distinguish geometric content from attachment, but these new actor controls are
artificial reconstruction states, not fresh original execution or proof of an
ordinary transient encounter. They deliberately retain logical records after
explicit removal to isolate the existing authoritative owner contract.

| Source | SHA-256 |
| --- | --- |
| `_‑Zx.as` | `3a5c16a3f14e1ceae76b93185a8c4a974b9e2b9326b6021526f2320d89522f16` |
| `_‑Zx.pcode` | `2a3d03e2eebf57c8189b5d4e2aea67e48f6dcfb50477271f07dca15b22bf80ea` |
| `AGunShield.as` | `a0b3f807fa35ea83e846b664dfaab4593fb6f13d8c21107f0f8c0efb4d8849fe` |
| `AGunShield.pcode` | `85f5ad7f9d92d0be0567cbe65f8b206ebf6ecff65fec2a51ab52109d1175cd7c` |
| `APassiveForcefield.as` | `27eb90c0d72459e39b94778d8639b16ac6b87bc85cbf65f5cc711666af5f24df` |
| `APassiveForcefield.pcode` | `df14a942079d1f14ba175a82032f4335525fedf4dba600bbf896586f5886d4c3` |

## Failed-before and browser evidence

Four public-provider regressions fail as assertion mismatches at published
PR157 head `03d935f`: removed status, infection, forcefield and absent legacy
film/impact. The separate bounds regression also fails there. The initial
forcefield test lacked its synthetic sprite definition; that setup error is
preserved separately. After correcting only its setup, replaying the unchanged
baseline provider reproduces all four contact assertion failures. The candidate
source is restored byte-for-byte after that controlled replay.

The synthetic unit leaves isolate membership through the existing provider;
they are not original contours and do not authorize raster alpha as native field
geometry. The browser adds genuine supplied-art controls to the existing
shape-contact fixture. Each removes only the physical key, measures zero matching
renderer children while the logical record/flags remain, requires contact false,
then explicitly reattaches and requires contact true. It covers all four native
status kinds, infection and forcefield, plus the mock forcefield. All prior
primitive, protection, projectile,51 mask and36 root-coordinate controls remain.

Final validation:

```sh
bun test tests/attachment-membership.test.ts tests/tank-bounds.test.ts
bun run format
BT3_SWF_FILE=/home/ian/Projects/ianwijma/documented-bubble-tank-3/re/bt3/uncompressed.swf bun run check
BT3_SWF_FILE=/home/ian/Projects/ianwijma/documented-bubble-tank-3/re/bt3/uncompressed.swf bun run test:e2e --config test-results/attachment-membership/playwright.config.mts
```

Formatting/typecheck/full check pass **1220 tests /38816 assertions**. The focused
cohort passes12 cases /50 assertions. The literal E2E builds production and passes
**16 mock/supplied cases**, zero skips/failures/flaky results: contact, actor
ownership, forcefield lifecycle/order, independent shields, valid Shield Turret
creator reachability, tank artwork and turret owner polling. Build ID is
`Ci7L3avYUTRSJpt48ArqF`; all **800 input hashes** remain unchanged. Private spec
copies change only ports/import routing and preserve every assertion.

Ignored `test-results/attachment-membership/` retains before logs, restoration
digest, exact private config, copied specs, final input hashes, proof JSONs,
browser report and verification summary. The separate setup-error log is not
presented as a regression assertion. Owned4075/4076 servers exited and both ports
were free. No other process/browser, research input or protected ref was changed.

This repairs current contact/bounds eligibility, not the complete actor geometry
projection. Existing present-attachment pose/state conditions, lazy asset playback,
part/protection transform precision, complete field queries, ordinary reachability,
global event/RNG, original/Adobe/pixel/audio and full-game parity remain work.
