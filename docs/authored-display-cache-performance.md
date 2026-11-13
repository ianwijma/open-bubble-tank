# Authored display-list lookup performance

The hosted exact-head jobs for PR161 (`43464683553/132020519726`) and PR163
(`43466555189/132027117925`) each failed only the unchanged mock playthrough
readiness deadline. They were advancing at frame64,000/level6/life971 and
frame62,000/level6/life868 respectively;150 other browser cases passed and4
were skipped in each. PR162's run was cancelled. These logs are preserved under
`test-results/artwork-stack-ci/`. No stopped progression or causal regression
is inferred merely from those timing failures.

## Baseline and one-variable candidate

A fresh current combined-source mock pilot at base `d7f27bf` passes locally with
all original inputs/assertions/deadlines intact. The passive10ms CPU sampler
locates a substantial share of self time in display-list lookup. Rendering only
occurs at milestones in this accelerated harness, so a per-frame mask-drawing
theory does not fit that caller. The local baseline does not reproduce the
hosted deadline failure; its timing is diagnostic evidence, not a hosted pass.

The sole candidate change replaces the authored `id:frame` string-map cache with
`DisplayListCache`: a WeakMap from actual SpriteInfo metadata objects to numeric
frame-indexed arrays. It stores only authored DisplayPlacement data, never live
clips, ages, parents, random streams or physical memberships. AssetPack, generic
effects and pickup numeric providers share the same helper. Existing frame
normalization and buildDisplayList remain; clear drops lookup rows only. No live
clock, object-retention, event-yield, input, entropy/provider, frame-cap, assertion
or timeout policy changes. There is no direct-WeakRef-loop or MessageChannel
experiment in the candidate.

An isolated actual-AssetPack comparison runs the exact old cache method against
the new method, with warmed queries and alternating order across five samples
each. Three million lookups per sample have identical placement checksums. Median
old/new times are237.04ms/75.01ms (ratio0.316). This microbenchmark alone does not
prove full-game timing. Its private code, raw rows and checksums remain under
`test-results/artwork-cache-performance/`.

The full mock pilot with the same passive profiler improves from147.25s to
110.37s (ratio0.7495), one fresh game per variant. **The entire serialized gameplay
proof is identical**, including all milestones/statistics, frame65,976, all six
upgrades, boss/badge/Continue and input digest3425647555. Both profiles, complete
reports and proof files are retained separately under
`test-results/artwork-pilot-profile/`; this finite sample does not establish
universal timing, original/Adobe, global-event/RNG or ordinary-input parity.

## Build/check attempts retained separately

The first private timing benchmark had an implicit-array type annotation error;
it is corrected without changing the workload. A concurrent Next build removed
generated .next/types during a rule-check attempt. Another Bun typecheck launcher
terminated with SIGSEGV before tests ran. Neither attempt is a passing rule gate.

The first unprofiled-pilot build reported an unhandled `ReferenceError: B is not
defined` before compilation completed and remained live. Its log, Next trace and
PID/start-time records were saved. Only that identified owned build tree was
terminated, and only this checkout's generated .next/cache was removed. A clean-
cache retry compiled successfully. No source/configuration, assertion, dependency
version or account setting was changed as a build workaround. Remaining checks
run sequentially after browser jobs to avoid generated-type races and timing
contention.

Commands:

```sh
bun test-results/artwork-cache-performance/benchmark.ts
bun run test:e2e --config test-results/artwork-pilot-profile/playwright.config.mts --grep 'mock fresh game'
bun run test:e2e --config test-results/artwork-pilot-profile/candidate.config.mts --grep 'mock fresh game'
BT3_SWF_FILE=ORIGINAL.swf bun run test:e2e --config test-results/artwork-cache-pilots/playwright.config.mts
bun run check
bun run format
```

The two profile specs add only passive CPU/progress observation and private URL
routing. The unprofiled specs change only the fixture URL. No original test
assertion, source frame loop, input sequence or deadline is altered. Browser
progression here is the existing accelerated adapter, not checkpoint6.2's
normal-time public-input acceptance. The supplied-art and sequential rule outcomes
are recorded below; a pending hosted result is never counted as green.

## Final local checks

The clean-cache production build is `OeDq6Mv8QjISX6YXv_BZi`. Both unprofiled
pilots pass with zero skips or retries: mock in93.512s and supplied artwork in
198.105s. They finish at65,976/64,639 frames with input digests3425647555 /
2562933773, all six upgrades, boss defeat, Boss Badge and Continue. The complete
unprofiled mock proof equals both previously profiled baseline/candidate proofs.
All850 recorded source/test/tool inputs still match after these checks.

The sequential `bun run format` and `bun run check` pass; rules report1,299
tests /81,252 assertions, zero failures. The original failed/raced attempts above
remain separate. The private JSON record is
`test-results/artwork-cache-performance/final-verification.json`. These results
qualify the existing accelerated adapter only. The final combined hosted job and
remaining fidelity acceptance gates are still required.

The additional26 affected mock/native rendering cases pass on the same build,
zero skips/flaky results. This includes actor clocks/ownership, field crossings,
collapse, combat effects, lower/under-avatar paint, pickup ownership and screen
ink. These private specs retain the earlier fixture routing and unchanged
assertions. All850 recorded inputs still match, and owned4596/4636 are free.
This rendering report is separate from the two accelerated-pilot results.
