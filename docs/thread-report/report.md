# A game recreation, in numbers

Source: [Faithful Offline Game Recreation](t3-thread://v2/a713d3ff-a5f3-472b-97bd-83fd799395a5/93d9eb80-8a0a-44ac-8262-07b1ceb7992a). Frozen archive digest: `283cf74b8c5faec5eb804bc8bae8903cf046d2e11838a13a7678f7ac1800ab38`.

Open [the interactive browser report](report.html) directly from disk. It works offline without a server or third-party assets. The [complete statistics](stats.json), [archive manifest](history/manifest.json), and [readable transcript shards](history/transcript/) are included alongside it.

## Headline findings

- **48,752 archive records**, including run/usage/plan metadata; **47,515 timeline items**.
- **180 child agents / threads**; 181 of 181 discovered threads have retrievable timeline records. Discovery covers referenced children, not unrelated threads or unavailable native files.
- **13,662 shell command records**, **4,638 dynamic tool records**, and **96 web-search records**. These are activity records, not shell subprocess or network-request counts.
- **3,260 user/assistant message records**: 25 user, 233 agent-sent, 3,002 assistant. Labels use stored `createdBy`; root/all filters are in HTML.
- **2,682,739,064 input tokens**, **8,842,027 output tokens**; **98.58%** of input was cached. This sums final provider-turn metadata, not words in the transcript or rolling context meters.
- **$428.97 USD** at current short-context Standard API list prices for observed usage; all-long-context Standard scenario **$813.72**. Actual billing is unknown.
- 143 manifest-listed files, 63.9 MB on disk. No private reasoning text is included; its 23,742 records retain metadata only.

## Activity over time

Dates are UTC. Tool records use stored start time, falling back to update time; these timestamps can reflect import/update history rather than exact original execution time.

| UTC date | Tool records | All records |
| --- | ---: | ---: |
| 2026-10-31 | 2,306 | 6,257 |
| 2026-11-01 | 1,466 | 3,677 |
| 2026-11-02 | 4,798 | 11,188 |
| 2026-11-03 | 0 | 0 |
| 2026-11-04 | 0 | 0 |
| 2026-11-05 | 0 | 0 |
| 2026-11-06 | 0 | 0 |
| 2026-11-07 | 0 | 0 |
| 2026-11-08 | 0 | 0 |
| 2026-11-09 | 0 | 0 |
| 2026-11-10 | 0 | 0 |
| 2026-11-11 | 0 | 0 |
| 2026-11-12 | 2,801 | 8,329 |
| 2026-11-13 | 6,571 | 17,594 |
| 2026-11-14 | 454 | 1,493 |

## Tool leaderboard

| Item | Count |
| --- | ---: |
| shell command | 13,662 |
| t3-code.unwatch_pull_request | 517 |
| codex_apps.github.fetch_workflow_run_jobs | 496 |
| codex_apps.github.get_pr_info | 476 |
| t3-code.link_pull_request | 354 |
| t3-code.watch_pull_request | 347 |
| codex_apps.github.fetch_pr_comments | 341 |
| codex_apps.github.list_pull_request_reviews | 302 |
| codex_apps.github.get_commit_combined_status | 256 |
| codex_apps.github.fetch_commit_workflow_runs | 250 |
| codex_apps.github.list_pull_request_review_threads | 215 |
| t3-code.delegate_task | 172 |
| codex_apps.github.create_pull_request | 142 |
| codex_apps.github.update_pull_request | 108 |
| codex_apps.github.merge_pull_request | 98 |

## Named file read/search candidates

One count per named path per matching input record. Inferred from read/search syntax, including mixed shell scripts; these are **not proven filesystem reads**. Relative and checkout-specific paths are normalized. Full input-mention and file-change lists are separate in `stats.json`.

| Item | Count |
| --- | ---: |
| docs/fidelity.md | 1,043 |
| src/game/simulation/world.ts | 590 |
| src/game/assets/asset-pack.ts | 376 |
| docs/architecture.md | 346 |
| AGENTS.md | 304 |
| reference-captures/pr-progress.json | 274 |
| library/SKILL.md | 244 |
| docs/handoff.md | 242 |
| src/components/tank-creator.tsx | 229 |
| src/components/game-shell.tsx | 228 |
| tools/visual-fixtures.ts | 217 |
| src/app/globals.css | 203 |
| package.json | 180 |
| tools/fixtures/browser.ts | 169 |
| src/game/assets/swf-symbols.mjs | 164 |

## Words in user and assistant messages

Case-insensitive English-shaped words of at least three characters; common stop words are removed. Tool outputs, commands, reasoning and metadata do not contribute. Repeated quoted/handoff messages remain and can repeat words.

| Item | Count |
| --- | ---: |
| run | 1,170 |
| open-bubble-tank | 1,131 |
| ianwijma | 1,100 |
| head | 1,098 |
| github | 1,050 |
| https | 976 |
| com | 968 |
| tests | 963 |
| job | 873 |
| pull | 869 |
| build | 867 |
| passed | 852 |
| parent | 775 |
| mock | 731 |
| pending | 696 |

Selected words, with no stop-word filtering:

| Item | Count |
| --- | ---: |
| tests | 890 |
| evidence | 595 |
| test | 450 |
| swf | 392 |
| fix | 378 |
| verify | 286 |
| verified | 248 |
| fidelity | 237 |
| remaining | 224 |
| geometry | 213 |
| mask | 161 |
| clock | 157 |
| ruffle | 152 |
| parity | 113 |
| adobe | 97 |
| rng | 85 |
| random | 48 |
| faithful | 45 |
| bug | 28 |
| bugs | 8 |

## Command goals and failures

Goal labels are heuristic, mutually exclusive categories; validation wins before GitHub, reference work, read/search and edits. A command can contain several operations. Failure status is an execution outcome, not a count of software bugs.

| Item | Count |
| --- | ---: |
| Inspection / search | 7,001 |
| Validation / formatting | 5,930 |
| Reference / runtime research | 3,318 |
| Other | 1,227 |
| GitHub / delivery | 820 |
| Editing / files | 4 |

Timeline statuses:

| Item | Count |
| --- | ---: |
| completed | 46,122 |
| failed | 1,155 |
| running | 136 |
| cancelled | 90 |
| interrupted | 12 |

There were 869 repeat executions of identical command input strings, beyond their first occurrences. Summed tool durations are 70.7 hours and summed completed run intervals are 78.3 hours. Both can overlap and include waiting; neither measures human effort or unique elapsed runtime. 161 distinct project PR URLs were mentioned in messages; mentions do not prove creation or merge.

## Token accounting and price assumptions

| Item | Count |
| --- | ---: |
| inputTokens | 2,682,739,064 |
| cachedInputTokens | 2,644,701,312 |
| cacheCreationTokens | 0 |
| outputTokens | 8,842,027 |
| reasoningTokens | 4,763,741 |
| uncachedInputTokens | 38,037,752 |
| inputPlusOutputTokens | 2,691,581,091 |

Provider-turn coverage: 637 complete, 5 partial, 11 missing out of 653 turns. Partial counters contribute their available values; missing counters contribute nothing. Only `main_agent` scoped `turnTokenUsage` is summed independently across root and child threads. `reasoningTokens` is a subset of output and is not added again. Input includes cached input; cached tokens are not added again either. Models are joined to recorded run selection where possible; unattributed native turns are shown explicitly in `stats.json`.

Current 2026-11-15 [OpenAI pricing](https://developers.openai.com/api/docs/pricing) and [model conditions](https://developers.openai.com/api/docs/models/gpt-6.1-sol) provide USD per million token rates of $2 input, $0.10 cached input, $2.50 cache writes and $10 output. Formula: `(uncached × 2 + cached × 0.1 + writes × 2.5 + output × 10) / 1,000,000`.

The all-long scenario uses $4/$0.20/$5/$15 respectively. The model page applies those rates above 272K input tokens per request and states that subscription usage has no long-context surcharge. Provider-turn totals aggregate requests, so this archive cannot identify the surcharge mix. Service tier, historical prices, actual subscription/API charges, discounts and paid tool fees are not reconstructed. These scenarios are neither invoices nor lower/upper bounds on the complete thread bill. The no-cache counterfactual at short Standard rates is $5,453.90; it assumes identical input and output volume and is not measured savings.

## Coverage, exclusions and reproduction

The exporter reads one read-only SQLite snapshot and follows recorded child references recursively. It exports current projections, not an append-only event log; intermediate streaming revisions, deleted/unrecorded content, native assets and missing attachments cannot be recovered. User/assistant transcripts contain stored text; attachment/context counts preserve metadata without claiming those bodies were exported. Provider final usage was added in the same transaction. The report describes this frozen game thread, not the cost/activity of producing this report.

Private reasoning, compaction/internal prompts and secret-request payloads are omitted. Credential-like values and binary payloads are scrubbed with explicit markers; per-kind counts are in the manifest. Unknown payload keys are excluded by allowlist. No claim of byte-for-byte original recovery is made.

```sh
# Requires the local T3 SQLite database only when refreshing the archive:
python3 tools/thread-report/export_history.py
# Rebuild solely from the checked-in archive, validating all hashes and row counts:
python3 tools/thread-report/analyze.py
python3 -m unittest discover -s tools/thread-report -p 'test_*.py'
```

The report does not reassess game completion or change the fixed fidelity checkpoints in `docs/completion-checklist.md`.
