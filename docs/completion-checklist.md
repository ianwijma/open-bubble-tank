# Completion checklist

This is the persistent status overview for the offline recreation goal. Keep the
seven work packages and their checkpoint IDs stable across updates. The
[fidelity ledger](fidelity.md) remains the technical evidence source. Retired
online services and existing documented usability additions retain their current
scope.

## Current snapshot

- Checked: 2026-11-14 22:01 AEDT, Australia/Sydney.
- Current finish line: the user selected a faithful classic release (fix visible/gameplay bugs, verify a full progression route, document remaining rare differences). [Classic release criteria](classic-release.md) and [validation](classic-validation.md) track that closeout. The fixed parity checkpoints below retain their stricter criteria and are not silently marked complete.
- Delivered master and current branch base: `e8cfa1e2a47f733b3fbce6e98293c61a15979620`, tree `06ab088ee6147c5662a06bd63356468013e7090f`. PRs161–165 are all merged through the single PR165 merge; every exact layer head is an ancestor. The legacy checkpoint remains `22d9def7321bada8a2148a69a79a3392682bb390`.
- Current inspection: local HEAD and remote master both remain `e8cfa1e2a47f733b3fbce6e98293c61a15979620`. The closeout icon, Playwright configuration, README and release/evidence documents are still uncommitted. Direct GitHub reads confirm PRs161–165 merged and the full-master job successful. [Main-thread messages](t3-thread://v2/a713d3ff-a5f3-472b-97bd-83fd799395a5/93d9eb80-8a0a-44ac-8262-07b1ceb7992a) were read through position34396. No classic closeout PR or remote `classic-v1` tag is present at inspection; unrelated V2 planning PR159 is outside this checklist.
- Hosted evidence: quick PR run43529919667/job132244776924 succeeded on exact head `a9a22ba`. Fully paginated review inspection found no reviews or inline threads across all five layers; CodeRabbit skipped. Full master run43530817562/job132247744169 also succeeded:1,294 rule passes/5 source-file skips and152 offline browser passes/4 skips. All five PR watches are stopped. Earlier deadline failures and the cancelled run remain historical failed/cancelled evidence.
- Current closeout: branch `stack/classic-release-closeout`; uncommitted browser-tab SVG icon, isolated Playwright output path and release/recovery documentation. No game simulation, rendering or component code changed from delivered master. The public-input worker reproduced the missing icon request; the new metadata icon serves200 and its fresh native public session records no HTTP/console/page errors.
- Fresh local validation: build `NeitCZVuN_QLJJaHptjjQ` passes the quick smoke, four supplied-file startup/creator/CWS/code-persistence/saved-heavy cases, and1,299 rules /81,252 assertions. The saved-heavy case is a seeded resume/render test, not earned progression.
- Fresh full pilots:2/2 unchanged accelerated fixture cases pass, including all six earned upgrade levels, boss defeat, Boss Badge, win and Continue. Mock65,976/input digest3425647555; native64,639/digest2562933773.948 frozen inputs match; both videos decode and traces pass integrity checks. This is complete accelerated progression evidence, not a completed ordinary public-input playthrough.
- Supplied-file hosted gaps: the four source-dependent browser cases skipped on master also have a separate fresh4/4 local passing replacement, covering bullet geometry,20 body timelines,31 part timelines and73 catalog silhouettes. This result retains its frozen-fixture identity; it does not change the hosted152-pass/4-skip totals or establish original runtime parity.
- Audio: seven new real-browser, owned-sink controls verify music/restored/game music and firing output, with exact silence for Music Off, idle and Effects Off. No subjective audition or synchronized original/Adobe comparison is claimed. Owned browsers and sink are closed.
- Evidence availability: the default Playwright output cleanup removed earlier ignored records in this checkout's `test-results`. [The recovery record](validation-artifact-recovery.md) distinguishes missing old raw artifacts from fresh replacements. Test output is now isolated to `test-results/playwright`; preservation controls pass. Fresh records are protected under ignored `reference-captures/classic-closeout-recovery/`. Tracked numerical fixtures, research sources and hosted CI were unaffected.
- Packages complete: **0/7**.
- Checkpoints complete: **7/21**. These are strict fidelity gates, not a release percentage or PR estimate.
- Changes since previous update: refreshed the handoff and final closeout delivery scope; reverified the delivered stack and successful full-master gate; reconciled stale pending-CI text in checkpoints2.2,3.2 and7.2. Added fresh real-output audio, complete accelerated-route and supplied-file gap evidence without promoting it to normal-time/original parity. The prepared classic closeout remains unpublished and untagged. No strict checkpoint changes.

## Fixed overview

Always return these columns, rows, names and order when the user requests an
update. Update the statuses, checkpoint counts and remaining-work text from the
evidence below. Keep this table as the concise user-facing report.

| ID  | Work package                   | Status             | Checkpoints done | Remaining to cross off                                                                              |
| --- | ------------------------------ | ------------------ | ---------------- | --------------------------------------------------------------------------------------------------- |
| 1   | Advanced weapons and collision | In progress        | 1/3              | Finish production geometry integration and remaining original weapon/damage comparisons.            |
| 2   | Field crossings and timing     | In progress        | 1/3              | Finish remaining construction/status/protection clocks and original callback/crossing comparisons.  |
| 3   | Visual accuracy                | In progress        | 1/3              | Finish complete layer order and remaining screen comparisons.                                       |
| 4   | Creator and HUD                | Needs verification | 1/3              | Close remaining creator control/font/input differences and HUD/transition comparisons.              |
| 5   | Audio and medals               | Needs verification | 1/3              | Verify synchronized audio behavior and all retained medal edge conditions against the original.     |
| 6   | Full ordinary playthrough      | Needs verification | 1/3              | Record normal-input progression through boss/win and compare the ending with the original.          |
| 7   | Final integration              | In progress        | 1/3              | Publish the classic closeout, verify its master CI/tag and retain remaining strict acceptance work. |

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
      Evidence so far: [actor clock qualification](actor-clock-original-reference.md), [retained effects](retained-effect-playback-reference.md), [actor phase repair](actor-artwork-phase-reference.md). Actor lifetime and constructor/ENTER/EXIT separation are delivered through PR165, with the separate24-case local gate on build `H96NgJsILo0CzxuxWl2PP` and successful full-master run43530817562. Later unchanged accelerated mock/native pilots pass, as recorded in [classic validation](classic-validation.md); the earlier timeout remains historical failed evidence. Lazy source construction, first-trigger scheduling and complete status/protection clocks remain unresolved, so this checkpoint stays unchecked.
- [ ] **2.3** Controlled original crossing comparisons cover initiation, both active fields, arrival, cached return, nested pause/upgrade/help/death and relevant Timer/event/RNG ordering; unresolved differences are fixed or explicitly accepted.
      Evidence gap: source/scoped controls exist, while complete crossing-runtime acceptance remains open in the ledger.

### 3. Visual accuracy

- [x] **3.1** Supplied-file artwork/font loading, native sprite/morph playback and mock fallback are implemented and have scoped rendering/browser checks.
      Evidence: [presentation contracts and verification](fidelity.md).
- [ ] **3.2** Remaining retained effect/field-layer rendering and animation fixes are integrated and validated on the combined build.
      Evidence so far: retained effects are delivered through [PR160](effect-geometry-batch-validation.md). [Native/mock under-avatar rendering](under-avatar-paint-reference.md), [actor phases](actor-artwork-phase-reference.md), [lower-effect masks](field-lower-effect-mask-reference.md) and [authored placement caching](authored-display-cache-performance.md) are delivered through merged PRs161–165 at master `e8cfa1e`. Full-master run43530817562 passes152 browser cases with4 supplied-file skips; the separate fresh local4/4 gap run is recorded in [classic validation](classic-validation.md) and protected recovery records. Historical26-case/original-paint controls retain their bounded scope and artifact-availability limits. Complete physical World/cross-field group order remains unresolved; this checkpoint stays open despite successful batch delivery and CI.
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
      Evidence so far: [classic validation](classic-validation.md) records seven fresh real-browser output-sink controls: four music/firing controls produce PCM and three public Music/Effects-Off controls are digitally silent, with no browser/HTTP/console errors. This establishes actual playback and mute behavior. Subjective audition and synchronized original route/loop/transition/timbre comparisons remain unverified; this checkpoint stays open.
- [ ] **5.3** All retained local medal conditions, including their threshold/removal/boss/win edges, have recorded original comparisons and passing regressions for corrections.
      Evidence gap: the ledger retains runtime medal edge comparisons.

### 6. Full ordinary playthrough

- [x] **6.1** Accelerated mock and supplied-art pilots have reached all six upgrades, boss defeat, Boss Badge and Continue.
      Evidence: [retained-display integration](retained-display-batch-validation.md) and [later local effect validation](retained-effect-playback-reference.md) retain historical scoped results. [Classic validation](classic-validation.md) records fresh replacement pilots passing2/2 at65,976/64,639 frames, with proof JSONs, decoded videos, valid traces and948 unchanged frozen inputs. [Artifact recovery](validation-artifact-recovery.md) identifies removed earlier raw files without presenting replacements as those originals. This checkpoint specifically allows the documented accelerated adapter and remains checked.
- [ ] **6.2** A recorded current-build supplied-art playthrough uses normal elapsed time and public player controls to earn upgrades, defeat the boss and exercise the ending without injected progression/clock/game state.
      Evidence so far: [ordinary-input observation](ordinary-input-validation.md) remains partial; its observer repair is not a completed live playthrough. [Responsive capture qualification](browser-capture-scaling-reference.md), published through PR163 `856683b`, passes30/30 synthetic controls with25 rejection controls,46 independently decoded PNGs and84 valid video frames. Its home-only/overlap/controller limitations remain explicit; no new normal-input boss playthrough is established. Human play can satisfy this checkpoint with recorded build/result evidence.
- [ ] **6.3** Earned boss/win timing, presentation and exit behavior are compared with the original, with runtime/build provenance and remaining deliberate differences recorded.
      Evidence gap: synthetic win fixtures and accelerated victories do not close this original ending comparison.

### 7. Final integration

- [x] **7.1** The preceding five-layer retained-display batch has passed its final combined hosted gate and landed on master with merge/tree evidence.
      Evidence: [PRs 150–154 delivery record](retained-display-batch-validation.md).
- [ ] **7.2** All subsequent required changes are included in the final combined head, required checks/reviews are resolved and the tested tree is delivered to master under the existing delivery policy.
      Evidence so far: [PR155–158/160 delivery](effect-geometry-batch-validation.md) and the subsequent PR161–165 merge are complete. Master `e8cfa1e` has final combined tree `06ab088e`; quick PR job43529919667/132244776924 and full-master job43530817562/132247744169 both succeeded. Fully paginated review inspection found no actionable findings and no submitted approvals. Hosted rules pass1,294 with5 source-file skips; browser cases pass152 with4 skips. Separate fresh source-file coverage passes locally. [Classic validation](classic-validation.md) records this delivery under the user's quick-PR/full-master policy. The icon/output-directory/release-record closeout remains uncommitted with no release tag, while strict geometry/provider/World-order acceptance remains open; this checkpoint is not checked by the delivered batch alone.
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

- **2026-11-14 11:06 AEDT — No checkpoint changes:** verified merged PRs161–165 and exact combined/master tree equality at `e8cfa1e`. The final quick PR job succeeded; resulting-master full-suite job132247744169 is live and remains a release gate. Reconciled the completed partial public-input run, accelerated full-pilot artifacts and real browser audio controls without promoting them to normal-time/original parity. Counts remain7/21 checkpoints and0/7 packages complete. Updated evidence under2.2,3.2 and7.2; strict criteria and all seven overview rows are preserved.

- **2026-11-14 11:28 AEDT — No checkpoint changes:** full master run43530817562 succeeds after the single PR165 merge, with exact-tree/five-head delivery proof. Prepared the concrete tab-icon and test-output protection fixes. Fresh protected native public flows, real browser audio controls and both full accelerated pilots replace recent removed artifacts; ordinary public-input completion and strict original comparisons remain unproved. Counts remain7/21 and0/7; final classic closeout/tag is separate.

- **2026-11-14 22:00 AEDT — No checkpoint changes:** direct GitHub reads confirm merged PRs161–165 and successful full-master run43530817562 on `e8cfa1e`; local HEAD/remote master agree and the classic closeout/tag remain unpublished. Read main-thread messages through34396. Reconciled stale pending-master evidence under2.2,3.2 and7.2, added real-output audio evidence under5.2 and fresh replacement progression evidence under6.1. The4/4 supplied-file gap run supplements hosted skips without changing their totals. Preserved all21 completion criteria and checkbox states (7/21,0/7). Remaining strict comparisons are separate from the selected classic release finish line.

- **2026-11-14 22:01 AEDT — No checkpoint changes:** refreshed the current handoff and coherent final release PR scope following the completed five-layer artwork batch. Preserved the strict criteria and counts; final closeout publication/master gate/tag remain due.
