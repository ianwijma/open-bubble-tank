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
unproved. This next-batch draft remains local and unpublished.

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
remain unproved. No PR, push or deployment was created for the local port.
