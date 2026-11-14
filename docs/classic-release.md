# Classic release closeout

On 2026-11-14 the user chose this finish line: **faithful release: fix visible and
gameplay bugs, verify a full playthrough, and document remaining rare differences**.
The classic stays available for playing and experimentation. Modernization,
rebranding and new platform features are separate work.

The [fidelity ledger](fidelity.md) and [fixed seven-package checklist](completion-checklist.md)
retain their stricter original-comparison criteria. Open parity checkpoints are
not silently completed by this release decision. They describe the remaining
comparison work and known limits; closing every one is no longer a prerequisite
to the user-selected classic release.

## Release gates

1. The combined artwork stack is delivered through the authorized single master merge after current-head quick PR checks and review inspection.
2. The resulting master build passes the complete applicable offline browser suite, formatting, TypeScript and rule checks. Missing supplied-file cases are explicit; source-file coverage is verified locally.
3. A recorded supplied-art complete progression route verifies earned upgrades through boss defeat, the win screen and Continue. The full accelerated browser pilot is the release's progression integration test. Ordinary public-page checks retain their separate scope: a partial ordinary-input run is not described as a full normal-time playthrough.
4. Visible/gameplay defects found in release acceptance are fixed and affected checks pass. Concrete release blockers take priority over further edge-case instrumentation.
5. Original and mock asset entry, creator/library/save/code routes, controls, pause/settings and local progression are usable. Actual browser audio output and mute controls are checked; decoded buffers and muted headless callbacks alone do not satisfy that check. Subjective/synchronized original-audio comparison remains disclosed.
6. Player-facing run/file instructions and the remaining-differences record agree with the shipped build. No SWF, extracted media or dependency/build output is committed. Retired online services stay disabled.

A successful PR smoke permits merging under the user's revised CI policy; the
full master run is still a release gate. See [delivery](delivery.md) for the exact
commands and post-merge budget. A release is not claimed while these gates remain
open. [Classic validation](classic-validation.md) records the evidence and its
scope. These are criteria, not a live checkbox counter: the final `classic-v1`
annotated tag is created only after the resulting master full-suite gate passes,
and records its exact commit and CI run. It preserves the classic source while
modernization proceeds separately.

## Differences to disclose at release

The complete technical evidence remains in the fidelity ledger. The player-facing
release notes must identify applicable remaining differences, including:

- Mock paint and synthesized audio are approximations of the supplied artwork/audio.
- Exact antialiasing, filters/device fonts and some menu/transition pixels differ.
- Complete physical World sibling order, unusual overlapping/replaced fields and
  some constructor/event/Timer/RNG edges are not fully qualified.
- Remaining advanced-part/collision, audio synchronization and medal edge
  comparisons have bounded evidence rather than complete Adobe/runtime parity.
- Retired community/accounts/sharing/parts-pack/portal services are omitted;
  documented offline tools and usability additions retain their existing scope.

These are disclosure categories, not permission to leave a demonstrated ordinary
play defect unresolved. New observations should distinguish reproducible game
failures from test-tool errors and incomplete observations.
