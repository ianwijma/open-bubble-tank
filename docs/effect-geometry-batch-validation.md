# Effect and geometry batch validation

The fifth combined layer includes the exact published heads of PRs155–158:
`8a0b055`, `8ec5406`, `03d935f` and `bfc5fa6`. Master remains
`897d2e741b8a1d23f563f8bb8a2e6bd684932b9b`; the preserved recreation checkpoint
remains `22d9def7321bada8a2148a69a79a3392682bb390`. The final combined PR and its
fresh hosted gate are still pending. No intermediate success substitutes for it.

## Combined local failure and measured repair

The first full combined run on `fcb6c4f`, build
`BC0mvze5TCs3YDSAQ_vbZ`, passed70 of71 mock/supplied-file cases with zero skips.
The SWF accelerated pilot exceeded its unchanged280-second readiness limit at
frame64,000, level6, life968 and1,040 kills. It was still advancing. All917 tracked
prebuild hashes matched afterward, and owned4275/4276 were free. Both orbital-width
cases passed, including PR158's locally repaired physical-shield fixture. The
actual failed run remains under `test-results/fifth-integration/`; its report,
trace, build identity and hash verification are preserved, not relabeled green.

The actor delegate's production and fixture code is identical to this source.
Its earlier SWF pass took279,574ms, leaving only426ms below the same limit. A
fresh diagnostic with CPU sampling also timed out, at frame61,000. The profile
attributes12.37% of samples to the generic-effect live-reference generator,
16.08% to clip reconciliation and13.93% to clip entry. Profiling overhead means
these are diagnostic observations, not a directly comparable uninstrumented
acceptance duration. The profile, progress samples and unchanged test budgets
are preserved under `test-results/fifth-pilot-profile/`.

The repair replaces only the effect owner's yielded weak-reference traversal
with direct Set iteration. Both frame phases still dereference and prune in the
same order, include the same constructions, retain the same weak ownership and
advance every surviving timeline. No lifetime culling, seed, input, frame cap,
clock phase, provider, assertion or timeout changes are made. A five-round local
300-effect/2,000-frame timing control retains identical full tree/placement,
frame and age digests before and after. Its median588.42→572.09ms is a finite
Bun measurement, not a browser speed guarantee. All46 effect/registration tests
pass9,737 assertions. The actual browser gate still needs to demonstrate margin.

The literal combined browser command is:

```sh
BT3_SWF_FILE=/home/ian/Projects/ianwijma/documented-bubble-tank-3/re/bt3/uncompressed.swf \
  bun run test:e2e --config test-results/fifth-integration-final/playwright.config.mts
```

Private specs preserve current source assertions and budgets; only their imports
and owned localhost ports are routed. Results of the repaired combined run and
the eventual exact-head hosted gate must be recorded before merging.

## Remaining boundaries

This batch does not close complete field-query consumers, the missing
[under-avatar paint layer](under-avatar-render-audit.md), the concrete existing
[actor constructor/EXIT phase discrepancy](actor-artwork-lifetime-reference.md),
lazy artwork entropy/construction ownership, status/protection lifetime coverage,
ordinary public-input progression, synchronized audio or original/Adobe/full-game
parity. Accelerated pilot wins remain distinct from ordinary-play acceptance.
