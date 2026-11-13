# Effect and geometry batch validation

The five-layer batch landed through one
[PR 160 merge](https://github.com/ianwijma/open-bubble-tank/pull/160),
`e01a7fe403b1fb1dc5c31ada8ce732206b3d5439`. Fetched master has the identical tested
tree `e41154b62b78bffea9e5036f61b69b9f62f2b12e`. The exact published heads of
PRs 155–158 (`8a0b055`, `8ec5406`, `03d935f`, `bfc5fa6`) and final head
`58bd67415b97ef5cc630f0471b78ad0ef234f0de` are verified ancestors. GitHub marks
all five PRs merged. Intermediate PRs were retargeted to master for included-commit
accounting before the single merge; no per-layer master merge occurred. All five
parent watches are stopped. The preserved recreation checkpoint remains
`22d9def7321bada8a2148a69a79a3392682bb390`.

## Final hosted gate

Exact-head pull-request [run 43449089556, attempt 1](https://github.com/ianwijma/open-bubble-tank/actions/runs/43449089556)
and named [job 131966365335 — Rules, build and mock browser](https://github.com/ianwijma/open-bubble-tank/actions/runs/43449089556/job/131966365335)
completed successfully. Formatting, frozen install, rule checks, production build
and offline browser smoke passed. Hosted rules: **1,286 passed, 5 skipped** out of
1,291 cases, 67,534 assertions. Those five source-SWF-dependent cases are unavailable
in the hosted checkout. Hosted browser selection: **150 passed,4 skipped**. These
are the workflow's mock/synthetic selection, not a supplied-file whole-game gate.
The full raw job log and local merge/ref verification are retained under
`test-results/final-combined-160/`.

Fresh complete issue/review/inline/thread reads found one informational CodeRabbit
stars-based skip and zero reviews, inline comments or threads. The skip supplied
no approval. Latest-attempt success, clean mergeability, unchanged master base and
exact head were revalidated immediately before the merge. No exact-head Vercel
status existed; suppression remains configured for `stack/**`, without an
authenticated provider-skip claim or quota waiver. The one master merge retains
its normal automatic deployment behavior.

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

The direct-iteration candidate was rejected. Although its five-round local
300-effect/2,000-frame timing control retained identical complete tree, placement,
frame and age digests (median588.42→572.09ms), the actual combined browser run
failed earlier: mock readiness exceeded280 seconds at frame55,000, level6,
life444 and841 kills. It passed53 earlier cases; the remaining17 were deliberately
stopped/not run. This is not a passing71-case run. Its source isce508d2 and build
`Lwt83ZMwJev2lOmpglzJ0`; the report, trace and input hashes remain under
`test-results/fifth-integration-final/`. The effect loop was reverted after the
runner stopped. Fewer generator allocations are not an established browser fix.

An isolated bundle-only per-stage MessageChannel experiment also failed the mock
readiness limit, at frame37,000/level5. No tracked accelerator code was changed.
Its terminal log and exact transformation remain under
`test-results/stage-task-diagnostic/`. A subsequent task-only probe reused that
output directory and overwrote the diagnostic trace/report; those artifacts are
not claimed as preserved. The original combined failure and direct-iteration
failure remain intact. The task-only probe measured1,000 message tasks in5.1ms
and100 nested zero-delay timers in384.9ms; it does not explain the game slowdown.
No GC or scheduler cause is established by these experiments.

Both experiments are discarded. Final `src/` and `tools/` match actor delegate
commit `f5b5bbf373bbe3f5fca40eb1eff4272a3150bf7f` exactly. That source passed62 broad
mock/SWF cases, including both accelerated wins, then six final actor/orbital/
contact cases. The parent70/71 result adds combined text/query coverage but
retains its actual native timeout; it is not relabeled green. All1,291 rule tests
and75,956 assertions pass. A final formatter invocation crashed in the Bun
launcher; the recorded retry completed successfully without code differences. No assertions, timeouts, source inputs, frame caps,
providers, simulation phases or lifetime ownership are weakened.

The local timeout is an unresolved accelerator performance limit, without an
observed gameplay stall or proven functional regression. The final
combined PR documented this limitation before its successful exact-head hosted
gate and single merge. That gate does not certify the manual supplied-file pilot
or complete-game performance. This acceptance work remains open after delivery.

## Remaining boundaries

This batch does not close complete field-query consumers, the missing
[under-avatar paint layer](under-avatar-render-audit.md), the concrete existing
[actor constructor/EXIT phase discrepancy](actor-artwork-lifetime-reference.md),
lazy artwork entropy/construction ownership, status/protection lifetime coverage,
ordinary public-input progression, synchronized audio or original/Adobe/full-game
parity. Accelerated pilot wins remain distinct from ordinary-play acceptance.
