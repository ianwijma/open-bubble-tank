# Completion checklist

This is the persistent status overview for the offline recreation goal. Keep the
seven work packages and their checkpoint IDs stable across updates. The
[fidelity ledger](fidelity.md) remains the technical evidence source. Retired
online services and existing documented usability additions retain their current
scope.

## Current snapshot

- Checked: 2026-11-14 02:56 AEDT, Australia/Sydney.
- Inspected master: `e01a7fe403b1fb1dc5c31ada8ce732206b3d5439`, identical tested tree `e41154b62b78bffea9e5036f61b69b9f62f2b12e`; local draft starts from this merge.
- Dirty state at inspection: clean before this delivery/status metadata update. No uncommitted production changes.
- Live source: [merged PR160](https://github.com/ianwijma/open-bubble-tank/pull/160) and [main thread](t3-thread://v2/a713d3ff-a5f3-472b-97bd-83fd799395a5/93d9eb80-8a0a-44ac-8262-07b1ceb7992a). Local drafts remain separate from delivered code.
- Delivery: PRs155–158 and160 are merged through one master merge after exact-head run43449089556/attempt1/job131966365335 success and fresh review/ref checks. All five heads are ancestors, the tested tree is delivered and their watches are stopped. Legacy `22d9def` remains unchanged. Hosted rules:1,286 passed/5 source-SWF skips; browser selection:150 passed/4 skips. The manual native accelerator timeout remains open.
- Packages complete: **0/7**.
- Checkpoints complete: **7/21**. These are completion gates of unequal size, not a percentage of effort or a PR estimate.
- Changes since previous update: delivered the five-layer effect/geometry batch. Native under-avatar and actor-phase repairs have returned as local drafts. Fresh home capture rejected8/8 scaled-ancestor frames; capture qualification is next. No checkpoint changes: subsequent required fidelity changes and whole-game acceptance remain unfinished.

## Fixed overview

Always return these columns, rows, names and order when the user requests an
update. Update the statuses, checkpoint counts and remaining-work text from the
evidence below. Keep this table as the concise user-facing report.

| ID  | Work package                   | Status             | Checkpoints done | Remaining to cross off                                                                                   |
| --- | ------------------------------ | ------------------ | ---------------- | -------------------------------------------------------------------------------------------------------- |
| 1   | Advanced weapons and collision | In progress        | 1/3              | Finish production geometry integration and remaining original weapon/damage comparisons.                 |
| 2   | Field crossings and timing     | In progress        | 1/3              | Finish actor/part/status/protection clocks and combined callback/crossing comparisons.                |
| 3   | Visual accuracy                | In progress        | 1/3              | Integrate the under-avatar draft, finish mock/full layer order and remaining screen comparisons.     |
| 4   | Creator and HUD                | Needs verification | 1/3              | Close remaining creator control/font/input differences and HUD/transition comparisons.                   |
| 5   | Audio and medals               | Needs verification | 1/3              | Verify synchronized audio behavior and all retained medal edge conditions against the original.          |
| 6   | Full ordinary playthrough      | Needs verification | 1/3              | Record normal-input progression through boss/win and compare the ending with the original.               |
| 7   | Final integration              | In progress        | 1/3              | Deliver remaining fidelity changes and reconcile complete-game acceptance evidence. |

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
      Evidence so far: [actor clock qualification](actor-clock-original-reference.md), [local retained effects](retained-effect-playback-reference.md). The actor lifetime correction is delivered; the constructor/EXIT repair8d31935 remains a local draft, and status/protection clock coverage and manual pilot performance remain open.
- [ ] **2.3** Controlled original crossing comparisons cover initiation, both active fields, arrival, cached return, nested pause/upgrade/help/death and relevant Timer/event/RNG ordering; unresolved differences are fixed or explicitly accepted.
      Evidence gap: source/scoped controls exist, while complete crossing-runtime acceptance remains open in the ledger.

### 3. Visual accuracy

- [x] **3.1** Supplied-file artwork/font loading, native sprite/morph playback and mock fallback are implemented and have scoped rendering/browser checks.
      Evidence: [presentation contracts and verification](fidelity.md).
- [ ] **3.2** Remaining retained effect/field-layer rendering and animation fixes are integrated and validated on the combined build.
      Evidence so far: retained effects are delivered through [PR160](effect-geometry-batch-validation.md). Native under-avatar repair5e5ce20 is local; its mock counterpart and complete cross-field order remain open.
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
      Evidence so far: [ordinary-input observation](ordinary-input-validation.md) remains partial; its observer repair is not a completed live playthrough. Human play can satisfy this checkpoint with recorded build/result evidence.
- [ ] **6.3** Earned boss/win timing, presentation and exit behavior are compared with the original, with runtime/build provenance and remaining deliberate differences recorded.
      Evidence gap: synthetic win fixtures and accelerated victories do not close this original ending comparison.

### 7. Final integration

- [x] **7.1** The preceding five-layer retained-display batch has passed its final combined hosted gate and landed on master with merge/tree evidence.
      Evidence: [PRs 150–154 delivery record](retained-display-batch-validation.md).
- [ ] **7.2** All subsequent required changes are included in the final combined head, required checks/reviews are resolved and the tested tree is delivered to master under the existing delivery policy.
      Evidence so far: [PR155–158/160 delivery](effect-geometry-batch-validation.md) has the exact successful named job and identical fetched master tree. Further required actor phases, under-avatar/mock/order and full-field/provider work remain local or unimplemented, so this all-subsequent-changes gate stays open.
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
