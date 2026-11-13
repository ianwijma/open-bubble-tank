# Local actor mounted-artwork phase correction

Prepared on `58bd67415b97ef5cc630f0471b78ad0ef234f0de`. This is local work;
PR160 and the parent checkout are untouched. The
[actor lifetime correction](actor-artwork-lifetime-reference.md) remains the
ownership prerequisite. This follow-up repairs a measured phase discrepancy,
not the entire constructor, entropy or actor-query package.

## Source and phase authority

The unchanged [two original captures](actor-clock-original-reference.md) are the
oracle. Original input SHA256 is
`f5827841c682f988f23dcf470ab4ab59c1ffc497acb4ca0f21077d03f942c153`.
`actor-clock-source.mjs` is rerun read-only into this checkout's ignored
`test-results/actor-phase/source-audit.json`. It agrees with both frozen source
audits, including the AS/deobfuscated-AS/qualified-pcode identities.

`TankData._-Tr` constructs each mounted instance before setting X/Y, scales,
rotation and name, then adds it and registers its role. The `_‑MQ` constructor
registers frame1/50/100 scripts after `constructsuper`; it does not synchronously
select51. Its frame1 reads its own Y, frame50 jumps to1, and frame100 branches to
51 or1. `_‑ct::_‑KE` stops the rotor at1; its40-frame children remain independent.
No generated data, imported frame actions or shared `SwfClip` scheduler changes.

The actual emitter is audited as well: F8 constructs the two before-ENTER trees,
then registers the listeners. `onProbeEnter` increments `ptick`, constructs the
inside tree at tick1, then samples ENTER. EXIT is a separate listener. All repeated
original EXIT rows for a compared coordinate must agree; no preferred duplicate
or window is selected. These captures retain their recorded REA Evidence IDs,
loaded JS/WASM identities and **incomplete/equality-ineligible** restrictions.
There is no new original execution or claim of Adobe/global event equality.

The parent's diagnostic is a useful localization input, but its
`before-host-art-tick` label is not an entered World/Main phase. Here the tests
observe World.step through its `advanceTime` callback, after actual stage entry
and before Main work, and sample EXIT after the method returns. The standalone
control observes the actual `ActorArtwork.enterFrame` call inside
`World.advanceArtwork`, then its return. Neither substitutes pre-step paint for
ENTER.

## Implemented scheduling

Explicit `ActorArtwork.construct` gives the actual Tank a separate numerical
mounted stage clock. It starts at constructor frame0 (the SwfClip presents its
authored frame1 with scripts deferred), rather than deriving a pose from
`artAge + 1`. Existing trees enter before Main; scripts run in the final artwork
pass using the current mounted record's own Y. New inside-Main actors initialize
in that final pass and hold through the following entry. Before/inside births
therefore remain distinct even when their numeric compatibility ages coincide.

The AssetPack bridge has two phases, visiting only already materialized owners.
Constructor getters call `SwfClip.construct`; entering calls `enterFrame` and
post-Main presentation calls `runFrameScripts`. Constructor positive and negative
Wiggle roots both read1. ENTER1 reads1/1, EXIT1 reads1/51; ENTER50 reads50/100,
EXIT50 reads1/51. All deterministic root windows in both frozen captures through
550 agree for both cohorts. A separate Main-time consumer reads1/1 before its
explicit Y edits; the same roots present51/1 afterward. Compatibility artAge edits
cannot seek or replace an owned root. ArtAge/status/protection telemetry retains
its preceding lifetime policy.

Retained removed/cached actors, stopped mounts, children and replaced avatars
remain owned by the same weak registrations and object identities. No Run/paint
array, UID, parent lookup or dead flag discovers constructors. Ticks add no
simulation random draws, UIDs, timers or gameplay Run work. The new test's
intentional inside constructor still makes its existing gameplay phase draw;
that draw is accounted separately rather than attributed to the artwork clock.

Massive Cannon's existing source `bullet_mc.play()` episode now records an
optional mounted-stage frame alongside its unchanged compatibility age. This
keeps sparse and dense retained playback from applying that command one frame
late after the clock split. Existing callers and unowned explicit-age fixtures
retain the old API. The manually aged/rewound numeric controls explicitly use
that legacy fixture path, while the pause/crossing test and browser gallery use
explicit construction ownership and initialize the stopped frame before firing.
All existing charge pose, empty-frame, clone and contact assertions remain.

## Host assumptions and fail-before evidence

Eight new phase tests fail against actual prepared-base production modules via
an import-time Bun preloader: **0 pass/8 fail/5,258 assertions**. Production files
are never swapped. The final candidate passes **8/8,5,296 assertions**. Those
assertions cover constructor reads, every frozen deterministic ENTER/EXIT window
through550 in both captures, actual World.step and standalone boundaries, stopped
rotor/child identities, final-Y script reads and compatibility-age independence.
Random descendants are checked for identity, age advancement and retained
parentage; their frames are never fitted to the independent original RNG.

A separate78-sample actual-World diagnostic has45 differing samples on the actual
base and zero on the candidate, comparing each coordinate to both frozen runs.
The original fixtures and emitter are read-only. No writing verifier runs against
original or parent-owned capture directories.

The prior lifetime tests sampled the previous EXIT before calling World.step.
Their frozen ENTER windows are preserved by observing actual entry instead.
Their after-tick host expectations become actual EXIT poses: EXIT110=12,
EXIT149=2/52 and EXIT199=3. The gallery likewise labels EXIT149/199/399/440 and
expects1/2/3/7/47/48 at its unchanged six sample ages. On the first candidate
browser build all four unchanged actor/mounted gallery cases fail, preserving
the concrete expectation differences in `first-browser-report.json`.
The initialized-charge gallery adds one explicit artwork initialization before
its source play call; its numeric pose sequence is unchanged, with telemetry
firstPlayAge2/artAge42. It is not presented as evidence for an ordinary
first-frame trigger. No assertions are removed or clock repairs hidden in reads.

## Boundaries and integration overlap

AssetPack still creates mounts lazily, owns host-seeded artwork entropy, and
replays omitted frames using the currently supplied Y and command record.
Neither the initial construction time nor historical placement/entropy
interleaving is thereby authenticated. This is not a pure actor geometry provider.
A complete source constructor owner would need eager numerical mounted instances,
source setter placement histories and source-backed entropy ownership; importing
browser assets into simulation would not justify that redesign.

The measured constructor/phase contract applies to the captured parts/cohorts.
It does not authenticate every part constructor, a first-ever weapon trigger
before pending constructor scripts, source-global random ordering, unmeasured
status/protection birth phases, arbitrary/naked descendant ownership, collection
behavior, general timer/listener scheduling or complete physical pose composition.
No full-game/checkpoint or ordinary original-playthrough equivalence is claimed.
The existing generic-effect660 comparisons and exact numeric controls remain
separate authorities; no generic effect clock or scheduler is changed.

Parent integration overlaps: `assets/asset-pack.ts`, `assets/part-playback.ts`,
`core/actor-artwork.ts`, `simulation/actor-artwork.ts`; the optional play stamp also
touches `core/types.ts`, `core/mounted-art.ts`, `simulation/weapons.ts`.
Tests/fixtures overlap in actor-artwork and initialized mounted-art galleries.
No under-avatar implementation/resources, global AGENTS, completion checklist,
handoff, parent/master/legacy refs, remote or account configuration are changed.

## Local validation and artifacts

Ignored evidence lives in `test-results/actor-phase/`. `final-fail-before.log`,
`pass-after.log`, `diagnostic-{base,candidate}.json`, `base-modules.json` and
`base-preload.ts` retain the actual-base control. `source-audit.json` and the
input manifests identify read-only inputs. Setup failures (artifact import
routing, server cwd and an isolated test-design leak) remain separate from
behavioral results. Browser expectation failures are preserved separately from
the final corrected gallery run.

Commands:

```sh
bun run format
bun run check
bun test --preload ./test-results/actor-phase/base-preload.ts tests/actor-artwork-phase.test.ts
bun test tests/actor-artwork-phase.test.ts
bun test tests/effect-playback.test.ts tests/effect-clock-correspondence.test.ts tests/actor-clock-original.test.ts
BT3_SWF_FILE=/home/ian/Projects/ianwijma/documented-bubble-tank-3/re/bt3/uncompressed.swf bun run test:e2e --config=test-results/actor-phase/playwright.config.ts
```

Final browser/build, input-integrity and owned-process cleanup results are
recorded below after that finite run completes. Only owned4475/4476 are used;
10475 was checked free and remains unused. Parent and other-child ports, browsers
and build trees are untouched.

Formatting and the final rule/type check pass **1,299 tests /81,252 assertions**.
The focused original/effect controls pass47 tests /9,759 assertions, including
all660 frozen effect frame/correspondence comparisons and their existing exact
numeric pose checks. All eight new phase regressions pass after the actual-base
rejector fails all eight.

Fresh production build **6GpDre-suR3EQgfHpPPwY** runs74 affected browser cases on
owned4475/4476. The supplied-art progression pilot fails its unchanged280-second
readiness assertion while still advancing: the final reported state is frame57000,
level6, life620 and898 kills. No scheduling, GC, entropy/provider, seed, input,
frame cap, timeout or assertion is changed to obtain a different result. This is
an unresolved native gate, not a completed win or evidence of its cause. Its
trace, full status history and error context remain in `browser-results/` and
`browser-report.json`.

The mock pilot wins at65,976 frames, input digest3425647555, in3.9minutes, with
boss/badge/Continue assertions intact. Those finite numbers match the preceding
local actor validation record; they establish no original/global determinism.
Native has no completed input digest because its readiness assertion fails.

The broad run finishes **72 pass /2 fail**, zero skips/flakes. The other failure
is the tank-art gallery's former native `poseAge13` assertion after12 ticks.
Constructor materialization now has age0 and actual EXIT12 has age12. Its
`poseAge` expectation is corrected to12; every shield, forcefield clone-age13,
geometry, mask, paint and identity assertion remains. The failing old assertion
and trace are retained. This is the only recorded broad-to-final input change,
`e2e/tank-art.spec.ts`; all production inputs are unchanged. A final fresh build
reruns the six actor/mounted/tank gallery cases rather than relabeling the broad
run as green. The native progression timeout remains a genuine failure.

Final production build **LcyWpInE-gJyQP1w_BLDS** passes **6/6** actor/mounted/tank
mock/SWF browser cases, zero skips/flakes, with all828 final recorded inputs
unchanged afterward. The broad build's827 tracked inputs differ only in the
explicit tank-art expectation above; production hashes are identical. The41
broad private spec/helper copies and three final specs are verified port/import
routing copies, preserving controls and assertions except the documented source
host-expectation corrections. The132 repository evidence inputs match both their
recorded hashes and the prepared base; all52 read-only original/source/parent
inputs remain unchanged.

`final-integrity.json` and `cleanup-processes.json` record53 owned process
fingerprints with zero survivors and zero matching live browser/server processes
in this checkout. Ports4475/4476/10475 bind after teardown. The Next build tree
resolves strictly inside this checkout. The temporary local dependency symlink
is removed before handoff; no dependencies, SWF/media/captures/build output enter
the commit. No remote, protected-ref, parent-build, other-browser or other-child
resource operation occurs.

Final follow-up command:

```sh
BT3_SWF_FILE=/home/ian/Projects/ianwijma/documented-bubble-tank-3/re/bt3/uncompressed.swf bun run test:e2e --config=test-results/actor-phase/final-playwright.config.ts
```

This is a reviewable local phase repair with a preserved native pilot timeout.
It is not an assertion that the timing/provider package or the game is complete.
