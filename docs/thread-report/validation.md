# Report validation

Validated on 2026-11-15 against frozen archive SHA-256 `283cf74b8c5faec5eb804bc8bae8903cf046d2e11838a13a7678f7ac1800ab38`.

- `python3 -m unittest discover -s tools/thread-report -p 'test_*.py'`: **12 tests pass**. Accounting regressions cover cache/reasoning subsets, duplicate/scoped/missing usage, complete run identities, fallback model metadata and metadata-only thread coverage. Export regressions cover private record omission, nested serialized results, binary metadata and secret tools.
- `python3 tools/thread-report/analyze.py`: validates all shard/transcript hashes, per-shard and total record counts, record identities, thread timeline coverage, record kinds and declared shard inventory before regenerating all reports.
- `bun tools/thread-report/browser-check.mjs`: **24 assertions pass** at 1100px and 390px, with **zero JavaScript/console errors and zero network requests**. Exercises root/all-agent counts, dataset search, cost recalculation, calendar gaps and layout.
- `bun run format` and focused Prettier checks pass. Generated HTML follows the formatted template. Diff whitespace checks pass outside literal transcript shards; six historical trailing-whitespace lines are intentionally preserved inside the archived messages.
- Independent Sonnet 5.5 review found no blocking bugs; model attribution, coverage validation, UTF-8 and transcript heading corrections were applied afterward and the final tests rerun.

Validation targets the standalone local report. No game application files or fidelity checkpoints change, and no new game rule, production browser, full-playthrough or parity validation is claimed. The archive/report omit private reasoning contents; usage includes only its reported token counts.
