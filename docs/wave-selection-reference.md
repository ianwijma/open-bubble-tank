# Wave preparation and unit-table sampling

Evidence is `WaveOption.as` and `_-3y.as` in the sibling research export, checked
against their matching pcode. This is a recovered source contract, not a synchronized
original-runtime or complete random-stream comparison.

## Counts precede choosing an option

`WaveOption.AddInstruction` immediately stores a rounded inclusive count as NUM.
Every available option is constructed before `_-3y.ChooseWaveOption` runs. Counts
for options that are not chosen still consume their random draws, including fixed
min/max counts. The imported numerical templates retain those min/max inputs; the
simulation now prepares every available template in order before selecting one.

`ChooseWaveOption` (`_-3y.as`2242 onward; matching pcode9273 onward) calls
`_-Wq(0, sumChance)`, searches half-open cumulative intervals, and falls back to the
last option when the rounded ticket equals the total. `_‑Wq` uses
`Math.round(random * (max - min + 0.8) + min - 0.4)`.

With distance1's two50-chance options and raw draws fixed to0.499, the preceding
implementation chose the first option and emitted four enemies using five draws in
a singleton-table fixture. Source preparation draws all five instruction counts,
then ticket50 chooses the second option: five enemies, six draws. The fixture uses
builtin entries satisfying the corresponding imported RULE predicates. It is a
finite sampling witness, not evidence of an ordinary encounter or runtime seed.

## Repetition belongs to an index within one KEY

`Search4RandomUnitWithKey` (`_-3y.as`1627 onward; pcode6762 onward) returns a singleton
without drawing randomness. For a multi-entry KEY range it repeatedly draws the
rounded inclusive index until it differs from the preceding index. It does not
filter IDs into a smaller uniformly sampled pool or cap the number of retries.

`_-Wd` (1835 onward) resets that preceding index when KEY changes, and resolves each
instruction even when its prepared count is zero. Selection therefore retains its
draws and repetition state independently of the number of spawned copies.

The regression cases distinguish preparation/ticket order, the rounded boundary,
singleton draw suppression, repeated-index retry consumption and KEY-change reset
even for equal IDs. Existing lifecycle fixtures pin combat randomness; their
unrelated arrival destinations are now explicitly cached instead of sending a
constant entropy stream into the source rejection loop. Their assertions remain
unchanged. The screen-effects browser gallery uses the same explicit destination.

## Adapter and verification boundaries

The existing offline roster-construction policy, available-option condition importer,
standalone fallback pools and per-enemy construction remain separate. In particular,
this change does not establish their entire original draw/constructor ordering or
variant order after Flash `sortOn`. Source `_Wd` returns an empty Array for a missing
KEY; its caller reads SCALE and ENEMIES from that result. The current offline adapter
still retains a resolved prefix. That failure path requires a separate caller/error
audit rather than inventing an empty valid field from the source return value.

All three new regressions fail against the preceding sampling implementation.
Formatting, TypeScript and912 unit tests/8,401 assertions pass after the lifecycle
fixture correction. A bounded pre-correction run confirms that a constant-draw
fixture hangs in repeat rejection; no production retry cap was added.

Production build `mUCWF5vrdmqGB4Mr0Uz0S` at
`938bb7426a6d22bfba584c30de207f695d957ec7` passes this literal command:

```sh
BT3_SWF_FILE=/home/ian/Projects/ianwijma/documented-bubble-tank-3/re/bt3/uncompressed.swf bun run test:e2e --config test-results/wave-selection-validation/playwright.config.ts actor-behaviors.spec.ts crossing.spec.ts screen-effects.spec.ts playthrough.spec.ts
```

All ten mock/supplied-art cases pass, with zero skips, flaky cases or page errors.
Private spec copies retain every assertion and change only the fixture URL. All
server/baseURL settings point to owned3165/3166; both servers stopped afterward.
The accelerated seeded pilots reach boss defeat and Continue in70,287 mock/72,573
supplied-art frames. They use the existing upgrade adapter and do not establish
ordinary progression or original execution. Local evidence is ignored under
`test-results/wave-selection-validation/` and `reference-captures/wave-selection-audit/`.
Original/Adobe comparison, the complete random stream and full-game parity remain
unproved. This validation was completed locally before publication of the layer.

## Port onto the combined loading/ownership/win batch

The local port onto `2f3d3a16e4aefe946d6ecdb4c8f3cf9c5d75b849`
passes formatting, TypeScript and918 unit tests/8,464 assertions. The existing
Shield Turrets caller proof now uses seed10 for its unchanged two-copy assertion;
seed6 selects one copy under the restored wave draw order. A finite search using
the normal `World`/`rollWave` RNG found the replacement; no entropy override or
production change was added for that fixture.

Production build `ckodAIOD7oeC2cdkw_yRT` passes:

```sh
BT3_SWF_FILE=/home/ian/Projects/ianwijma/documented-bubble-tank-3/re/bt3/uncompressed.swf bun run test:e2e --config test-results/wave-selection-validation/ported.config.ts
```

All twelve mock/supplied-art cases pass with zero skips, flaky results or page
errors: the preceding ten cases and the public creator/save/local-source pair.
Private fixture copies preserve every assertion and change only URL3102 to3166;
the caller project uses the original spec and helpers. Both owned3165/3166 servers
stopped. The accelerated pilots retain70,287 mock/72,573 supplied-art frames.
Native win, creator and ink-gallery paint were inspected. Logs, report and pilot
proofs remain ignored under the existing evidence directories (`ported-*`). These
are scoped recreation checks; ordinary earned boss/win and original/Adobe parity
remain unproved. No PR, push or deployment was created during that local validation.

## Bounded availability/template bytecode audit

`tools/audit-wave-templates.ts` independently follows the labels, stack and local
values in the four exported template methods. It records each `WaveOption`
constructor's literal chance/scale and each `AddInstruction` key/min/max, without
executing that constructor or its random draws. It then compares the complete
ordered results with `availableWaves`. Unsupported instructions, missing values,
nontermination and unvisited constructor sites fail the audit.

```sh
bun tools/audit-wave-templates.ts /home/ian/Projects/ianwijma/documented-bubble-tank-3
```

The recovered `_‑3y.pcode` SHA256 is
`c7f4520c2c57aee210df3f8e352a7954be6656fa55130656085341bce9f3aeb4`.
All1,344 cases pass: distances−1 through40 and every boolean combination of the
five source flags `_-TO`, `_-T2`, `_-WG`, `_-YZ` and `_-2H`. They visit all99
WaveOption constructor sites (90 distinct literal templates). Source's builtin-only
condition is `TO && !T2 && !WG && !YZ && !2H`; the audit explicitly maps its
complement to the recreation's `includeLocal` argument. It does not equate the
current saved-enemy option with every original service/parts-pack configuration.

Controlled mutations of the15→14 threshold and30→31 chance are rejected at
distance15 and10 respectively. An unknown opcode is also rejected. Original
exports remain untouched; the ignored `template-audit.json` and
`template-mutations/results.json` retain the results. This establishes bounded
agreement of the imported template payload/order/conditions with the walked
bytecode. It is not AVM2 execution, a proof beyond the supplied domain, verification
of `_‑Wd`'s caller, the full RNG stream or original/Adobe/full-game parity.

## Roster candidate indices and boss selection

`GetLocalTank` (`_-3y.as`2044–2205; matching pcode8301 onward) gathers matching
records and selects with `_‑Wq(0, candidates.length - 1)`. The pcode at the end
of that method loads zero and the decremented candidate count before calling
`_-Wq`. The recreation's `UnitRoster.load` previously used `rng.pick`, whose
floor-based choice has a different distribution. Candidate selection now uses
the rounded inclusive index within the existing offline pool. With three Balanced
candidates and raw 0.33, the source formula chooses index 1; the floor pick chose 0.
Separate regressions exercise builtin and saved pools and fail before this change.

The pool construction policy is unchanged: the optional saved/builtin choice,
catalog order, deduplication and empty-pool handling remain explicit offline
adapters. This correction does not reproduce the retired server request/fallback
schedule or every original profile/source combination. The full constructor and
random stream are not established merely by correcting this index formula.

`_-De` (`_-3y.as`2207 onward; pcode9029 onward) calls
`_-Wq(1, PlayerProfile._-Ri.length - 1)`, even when there is only one boss.
PlayerProfile initializes a sentinel at index 0, then appends builtin boss records
(`PlayerProfile.as`408–447). The imported boss catalog omits that sentinel. The new
`rollBossWave` therefore draws 1 through the compact catalog's length and subtracts 1
for lookup, retaining scale 1 and the existing eligibility/once-per-session gate.
Previously selecting `BOSSES[0]` consumed no entropy and shifted following Setup
and pose draws.

The new World-level regression observes the leading 1..1 draw and verifies that it
consumes entropy before the builtin boss's Setup. The existing birth-order fixture
now accepts that source selection prefix while preserving its complete Setup-before-
pose assertions. All three new encounter-selection regressions fail against the
preceding layer and pass after the correction. The original AS/pcode files remain
unchanged; source digests and logs are ignored under
`reference-captures/wave-selection-audit/encounter-*`.

Formatting, TypeScript and 922 unit tests / 8,478 assertions pass. The independent
template audit still passes all 1,344 cases and visits all 99 constructor sites.
Production build `8p5RuFKcBRNGaYCOHVVsR` passes this literal command:

```sh
BT3_SWF_FILE=/home/ian/Projects/ianwijma/documented-bubble-tank-3/re/bt3/uncompressed.swf bun run test:e2e --config test-results/wave-selection-validation/encounter.config.ts
```

All 14 mock/supplied-art cases pass, with zero skips, flaky results or page errors.
Private fixture copies preserve every assertion and change only the transport
URL; the creator/save/source-option pair uses its original spec and helpers.
The accelerated pilots reach six upgrades, boss defeat, badge and Continue in
80,162 mock / 81,551 supplied-art frames. Native history, win and mounted-target
paint were inspected. Both owned 3165/3166 servers stopped. The ignored report
and pilot proofs remain under `test-results/wave-selection-validation/encounter-*`.
These are scoped recreation checks, not ordinary-input or original/Adobe parity.
