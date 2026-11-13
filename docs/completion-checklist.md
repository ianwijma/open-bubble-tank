# Completion checklist

This is the persistent status overview for the offline recreation goal. Keep the
seven work packages and their checkpoint IDs stable across updates. The
[fidelity ledger](fidelity.md) remains the technical evidence source. Retired
online services and existing documented usability additions retain their current
scope.

## Current snapshot

- Checked: 2026-11-14 10:42 AEDT, Australia/Sydney.
- Current finish line: the user selected a faithful classic release (fix visible/gameplay bugs, verify a full playthrough, document rare remaining differences), then instructed quick PR checks and the longer suite on master after merging. [Classic release gates](classic-release.md) track that closeout. The fixed parity checkpoints below retain their criteria and are not silently marked complete.
- Inspected master: `e01a7fe403b1fb1dc5c31ada8ce732206b3d5439`; the preceding delivered batch remains separate from the open artwork stack.
- Inspected local HEAD: `899b29d2abafac00959c9a5b06241425bc2a5ec0`, published fifth combined artwork head, containing exact PR161–164 heads. Dirty state: the user's CI scheduling change, explicit post-merge pilot budget and classic release/delivery documentation. No gameplay source, original media, dependency or build output changes are included in this follow-up.
- Published stack: [PR161](https://github.com/ianwijma/open-bubble-tank/pull/161) `fea1917`, [PR162](https://github.com/ianwijma/open-bubble-tank/pull/162) `318cc88`, [PR163](https://github.com/ianwijma/open-bubble-tank/pull/163) `856683b`, [PR164](https://github.com/ianwijma/open-bubble-tank/pull/164) `d7f27bf`, [PR165](https://github.com/ianwijma/open-bubble-tank/pull/165) `899b29d`, all open at inspection. PR165 targets master and includes all four exact ancestors. No final merge has occurred.
- Current hosted result: PR165 run43524294793/job132226086587 failed only the accelerated mock readiness deadline at frame63,000/level6/life921/1,001 kills;151 other browser cases passed and4 were skipped. This remains failed evidence. Earlier PR161/163 deadline failures and PR162 cancellation remain separate. The independent old-head review found no concrete cache regression, zero reviews/inline threads and only informational CodeRabbit skips across161–165.
- Local CI-policy validation: YAML/event routing parsed and checked; the quick selection runs the production startup/creator/settings/exploration/pause flow, while the full selection retains156 cases in114 files. An isolated production build `5yHBRhSNE0V3bC6JMuW6y` passes the quick browser flow; formatting/TypeScript/rules pass1,299 tests /81,252 assertions. The held normal-play build `OeDq6Mv8QjISX6YXv_BZi` remains unchanged for acceptance work. A new hosted head and its quick PR gate are still required, followed by full master validation after merge.
- Public-input smoke: a fresh supplied-art game using only public controls reached displayed position(3,0),4 fields/3 paths and Basic Tank2/50 health. It did not earn an upgrade or reach boss/win. Pauses, intro/closing-dialog input suppression and unidentified console404s are recorded in ignored evidence; no crossing freeze was demonstrated. A separate public-input acceptance worker owns the longer playthrough attempt.
- Packages complete: **0/7**.
- Checkpoints complete: **7/21**. These are stricter fidelity gates of unequal size, not a release percentage or PR estimate.
- Changes since previous update: PR165 is published; its exact hosted failure and independent review are known. The user-approved release finish line and CI split are now explicit. Bounded original medal comparisons are retained separately without a production contradiction or checkpoint completion claim. No checkpoint changes.

## Fixed overview

Always return these columns, rows, names and order when the user requests an
update. Update the statuses, checkpoint counts and remaining-work text from the
evidence below. Keep this table as the concise user-facing report.

| ID  | Work package                   | Status             | Checkpoints done | Remaining to cross off                                                                             |
| --- | ------------------------------ | ------------------ | ---------------- | -------------------------------------------------------------------------------------------------- |
| 1   | Advanced weapons and collision | In progress        | 1/3              | Finish production geometry integration and remaining original weapon/damage comparisons.           |
| 2   | Field crossings and timing     | In progress        | 1/3              | Finish remaining construction/status/protection clocks and original callback/crossing comparisons. |
| 3   | Visual accuracy                | In progress        | 1/3              | Finish complete layer order and remaining screen comparisons.                |
| 4   | Creator and HUD                | Needs verification | 1/3              | Close remaining creator control/font/input differences and HUD/transition comparisons.             |
| 5   | Audio and medals               | Needs verification | 1/3              | Verify synchronized audio behavior and all retained medal edge conditions against the original.    |
| 6   | Full ordinary playthrough      | Needs verification | 1/3              | Record normal-input progression through boss/win and compare the ending with the original.         |
| 7   | Final integration              | In progress        | 1/3              | Pass quick PR and full master CI, deliver remaining fidelity changes and pass final acceptance.         |

Statuses: **In progress** = implementation or repair remains; **Needs
verification** = the remaining gate is comparison or acceptance evidence;
**Blocked** = a named dependency prevents progress; **Done** = all three
checkpoints have evidence and the package's changes are delivered. List a
blocker's reason in the remaining-work field. A checked checkpoint stays checked
unless a specific regression invalidates it; record that reason when reopening.

## Fixed checkpoints and evidence

Checked items establish the stated bounded result, not complete parity for their
package. Check an open item only after its implementation/comparison evidence
exists. Reference the tested build or commit and the result in its evidence note.
Distinguish local, published and merged work.

### 1. Advanced weapons and collision

- [x] **1.1** Core weapon, damage, protection and targeting behavior is implemented with source-backed regressions.
      Evidence: [implemented contracts and source corrections](fidelity.md), [Shield Turret correction](shield-turret-retention-reference.md).
- [ ] **1.2** Required field/actor/effect geometry consumers use the qualified current native/mock ownership, mask, text and coordinate paths; affected rule/browser checks pass.
      Evidence so far: [retained native geometry](retained-native-geometry-reference.md), [text integration](native-static-text-integration.md). Full gameplay field consumers remain open.
- [ ] **1.3** Remaining advanced-part, projectile, infection, damage/degradation and healing comparisons listed in the fidelity ledger have recorded original-runtime results; discrepancies are fixed or explicitly accepted by the user.
      Evidence gap: the ledger still lists incomplete part/combat comparisons.

### 2. Field crossings and timing

- [x] **2.1** Retained field, actor, projectile and pickup ownership/position behavior has source-backed implementation and scoped browser coverage.
      Evidence: [crossing contracts](crossing-source-reference.md), [delivered retained-display batch](retained-display-batch-validation.md).
- [ ] **2.2** Remaining detached actor/part/status/protection and generic-effect clock/constructor/callback repairs are integrated and pass affected checks.
      Evidence so far: [actor clock qualification](actor-clock-original-reference.md), [retained effects](retained-effect-playback-reference.md), [actor phase repair](actor-artwork-phase-reference.md). Actor lifetime correction is delivered; constructor/ENTER/EXIT separation is published through PR162 `318cc88`, with1,299 rule tests /81,252 assertions and24 affected mock/native browser cases on build `H96NgJsILo0CzxuxWl2PP`. Lazy source construction, first-trigger scheduling, status/protection clocks and the preserved native pilot timeout remain open. Published CI is not green; the whole checkpoint remains unchecked.
- [ ] **2.3** Controlled original crossing comparisons cover initiation, both active fields, arrival, cached return, nested pause/upgrade/help/death and relevant Timer/event/RNG ordering; unresolved differences are fixed or explicitly accepted.
      Evidence gap: source/scoped controls exist, while complete crossing-runtime acceptance remains open in the ledger.

### 3. Visual accuracy

- [x] **3.1** Supplied-file artwork/font loading, native sprite/morph playback and mock fallback are implemented and have scoped rendering/browser checks.
      Evidence: [presentation contracts and verification](fidelity.md).
- [ ] **3.2** Remaining retained effect/field-layer rendering and animation fixes are integrated and validated on the combined build.
      Evidence so far: retained effects are delivered through [PR160](effect-geometry-batch-validation.md). [Native/mock under-avatar rendering](under-avatar-paint-reference.md) is published as PR161 `fea1917`; actor phases are published through PR162 `318cc88`. [Lower-effect masks](field-lower-effect-mask-reference.md) are published through PR164 `d7f27bf`: two original captures agree on1,620 paint values and eight rejectors pass; its final26-case mock/native gate passes. The [cache follow-up](authored-display-cache-performance.md) independently passes those26 cases and both unchanged accelerated pilots on build `OeDq6Mv8QjISX6YXv_BZi`, with850 input hashes unchanged. Complete physical World/cross-field group order and final combined delivery remain open.
- [ ] **3.3** The ledger's catalog, masks/filters/antialiasing, nested animation/morph and menu/pause/settings/upgrade/win comparisons are recorded and discrepancies resolved or explicitly accepted.
      Evidence gap: full visual and transition comparison remains open; a numeric geometry match alone does not close it.

### 4. Creator and HUD

- [x] **4.1** Creator editing, selection, symmetry, saved library/code paths and authored HUD are implemented with scoped rule/browser coverage.
      Evidence: [creator reference](creator-ui-reference.md), [local tools/HUD contracts and later creator corrections](fidelity.md).
- [ ] **4.2** Remaining creator selection bounds, typography, snap/twin behavior and input/release/save/code ordering are compared with the original and discrepancies resolved or explicitly accepted.
      Evidence gap: existing precision/release comparisons close specific cases; the ledger retains broader comparison gaps.
- [ ] **4.3** Remaining HUD/device-font, row-limit, edit/help motion and HUD/gameplay ordering comparisons are complete, with affected mock/supplied-file browser checks passing.
      Evidence gap: complete HUD runtime comparison remains open in the ledger.

### 5. Audio and medals

- [x] **5.1** Source-derived music fades/seek windows/mute requests, sound-slot/cooldown behavior and retained local medals are implemented with scoped regressions.
      Evidence: [audio and statistics corrections](fidelity.md); this does not certify synchronized playback.
- [ ] **5.2** Original audio route/loop/transition timing and audible effect behavior are compared in synchronized runs; remaining discrepancies are fixed or explicitly accepted.
      Evidence gap: headless muted play and callback tests do not establish this result.
- [ ] **5.3** All retained local medal conditions, including their threshold/removal/boss/win edges, have recorded original comparisons and passing regressions for corrections.
      Evidence gap: the ledger retains runtime medal edge comparisons.

### 6. Full ordinary playthrough

- [x] **6.1** Accelerated mock and supplied-art pilots have reached all six upgrades, boss defeat, Boss Badge and Continue.
      Evidence: [retained-display integration](retained-display-batch-validation.md), [later local effect validation](retained-effect-playback-reference.md). This checkpoint specifically allows the documented accelerated adapter.
- [ ] **6.2** A recorded current-build supplied-art playthrough uses normal elapsed time and public player controls to earn upgrades, defeat the boss and exercise the ending without injected progression/clock/game state.
      Evidence so far: [ordinary-input observation](ordinary-input-validation.md) remains partial; its observer repair is not a completed live playthrough. [Responsive capture qualification](browser-capture-scaling-reference.md), published through PR163 `856683b`, passes30/30 synthetic controls with25 rejection controls,46 independently decoded PNGs and84 valid video frames. Its home-only/overlap/controller limitations remain explicit; no new normal-input boss playthrough is established. Human play can satisfy this checkpoint with recorded build/result evidence.
- [ ] **6.3** Earned boss/win timing, presentation and exit behavior are compared with the original, with runtime/build provenance and remaining deliberate differences recorded.
      Evidence gap: synthetic win fixtures and accelerated victories do not close this original ending comparison.

### 7. Final integration

- [x] **7.1** The preceding five-layer retained-display batch has passed its final combined hosted gate and landed on master with merge/tree evidence.
      Evidence: [PRs 150–154 delivery record](retained-display-batch-validation.md).
- [ ] **7.2** All subsequent required changes are included in the final combined head, required checks/reviews are resolved and the tested tree is delivered to master under the existing delivery policy.
      Evidence so far: [PR155–158/160 delivery](effect-geometry-batch-validation.md) has the successful named job and identical fetched master tree. PRs161–165 are published/open and the complete fifth head includes all ancestors. PR165's old full PR job failed only the still-advancing pilot deadline, with151 other browser passes/4 skips; its independent cache/review inspection found no actionable issue. The user now requires quick PR checks and full master validation after merging, as recorded in [delivery](delivery.md); local routing/rules/quick-browser checks pass, with the new hosted head still pending. The broader geometry/provider/World-order parity criteria are unchanged and remain open.
- [ ] **7.3** Packages 1–6 are Done; the final delivered build passes formatting, rule checks and the full applicable offline browser suite, with supplied-file coverage and any unavailable cases explicitly recorded. Fidelity/handoff documents agree with this checklist.
      Evidence gap: final whole-game acceptance is pending. Historical test totals from different builds are not a single final passing run.

## Repeatable update procedure

1. Read this file first. Read `goals.markdown`, the fidelity ledger's remaining-work list and entries added since the recorded snapshot, then the linked evidence for any claimed checkpoint change. Later explicit corrections supersede older ledger summaries.
2. Record the local HEAD, dirty state and checked date/time. Read the latest main-thread messages and current PR states; when available, use `gh pr view`/`gh pr checks` for delivery claims. Report unavailable evidence as unverified. A status request authorizes inspection and this checklist update, not starting repairs, full test runs or new playthroughs.
3. Match each finding to an existing checkpoint. Preserve package/checkpoint IDs and completion criteria. Additional technical tasks belong beneath that checkpoint; changing the fixed checklist scope requires the user's agreement. Record new disagreements as remaining work rather than silently declaring an old gate complete.
4. Change a checkbox only with linked evidence for its entire stated result. Record build/commit, result and evidence limits; identify original runtime/emulator versus Adobe evidence accurately. Recompute package and checkpoint counts. Mark a package Done only when its three checkpoints are checked and required changes are delivered.
5. Update the snapshot and append a dated change-log entry naming changed checkpoint IDs, or `No checkpoint changes`. Keep completed items visible. Do not convert test counts, PR counts or checkpoint ratios into effort percentages or a new completion forecast.
6. Reply with the snapshot date, package/checkpoint totals, the exact seven-row overview above, and a short `Changes since last update` note. Keep the same fields even when nothing changes. Link this file so the user can inspect the evidence.

## Change log

- **2026-11-14 — Baseline:** established fixed packages 1–7 and checkpoints 1.1–7.3. Checked 1.1, 2.1, 3.1, 4.1, 5.1, 6.1 and 7.1 from existing bounded evidence. All final package acceptance gates remain open. Earlier chat PR forecasts are superseded by this checklist.

- **2026-11-14 00:41 AEDT — No checkpoint changes:** local source `5c5919b` includes retained effects/text and the explicit orbital shield attachment repair. Joint check:1,285 tests /75,912 assertions. The focused production build passes4 mock/SWF cases; the effect child separately passed69 cases on its identified build. These are not one final combined acceptance run. PRs155–158 remain open, actor clocks remain in progress, and the final fifth PR/master gate remains pending.

- **2026-11-14 02:56 AEDT — No checkpoint changes:** merged PRs155–158/160 once as `e01a7fe`, with exact-head successful named job and tested-tree equality. Native paint and actor-phase drafts remain local; current home capture is rejected for scaled ancestry. This delivered batch does not complete all subsequent fidelity changes or whole-game acceptance.

- **2026-11-14 04:21 AEDT — No checkpoint changes:** inspected local `856683b`, direct GitHub states for PRs160–163 and main-thread messages through33564. Published native/mock under-avatar, actor-phase and capture-tooling progress updates evidence under2.2,3.2,6.2 and7.2. PR161/163 CI failed and PR162 CI was cancelled; final combined delivery is pending. Lower-effect masking's four-case rerun passed, with26-case validation underway. Counts remain7/21 checkpoints and0/7 packages complete. Updated row2/3/7 remaining-work wording without changing IDs or completion criteria.

- **2026-11-14 10:03 AEDT — No checkpoint changes:** recovered the interrupted build and verified the clean-cache retry. Lower-effect masking is published through PR164 `d7f27bf`; its original26-case result remains separate. The local fifth cache layer passes1,299 rules /81,252 assertions, both unchanged accelerated pilots and26 affected rendering cases on `OeDq6Mv8QjISX6YXv_BZi`, with850 input hashes unchanged. PR164 CI is still in progress; earlier hosted readiness failures are preserved. Updated evidence under3.2/7.2 without changing checkpoint criteria or counts (7/21,0/7). Original ordinary-input/whole-game acceptance remains open.

- **2026-11-14 10:42 AEDT — No checkpoint changes:** recorded published combined PR165 `899b29d`, exact hosted readiness failure and completed old-head review. Applied the user's faithful-release finish line and fast-PR/full-master CI policy without completing stricter parity gates. The isolated quick production flow and1,299 rules /81,252 assertions pass; the long selection still includes156 browser cases. Current ordinary-input evidence remains partial. Counts stay7/21 checkpoints and0/7 packages; classic release gates are tracked separately.
