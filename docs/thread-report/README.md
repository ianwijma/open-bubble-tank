# Conversation statistics archive

Open [report.html](report.html) directly in a browser for the interactive dashboard,
or read [report.md](report.md). Both use [stats.json](stats.json), generated from the
frozen [history archive](history/README.md). No server, database, package install,
or network connection is needed to view the report.

The archive is for [Faithful Offline Game Recreation](t3-thread://v2/a713d3ff-a5f3-472b-97bd-83fd799395a5/93d9eb80-8a0a-44ac-8262-07b1ceb7992a)
and its referenced child threads. It excludes private reasoning contents and
internal/secret payloads. Exported text is scrubbed for credential-like values;
the manifest documents exclusions and coverage. Tool input/output bodies are in
deterministic gzip JSONL shards; user/assistant text is also in readable Markdown.
The final usage counters are archived as `provider_usage` rows, separately from
rolling context-window meters. The export uses Sonnet 5.5 work, with subsequent
export-boundary and usage-accounting changes by the orchestrating agent.

Rebuild the reports from checked-in evidence with Python 3.10 or newer:

```sh
python3 tools/thread-report/analyze.py
python3 -m unittest discover -s tools/thread-report -p 'test_*.py'
# Optional browser validation requires repository dependencies and Playwright Chromium:
bun tools/thread-report/browser-check.mjs
```

Refresh from a local T3 installation (optional; replaces existing archive shards):

```sh
python3 tools/thread-report/export_history.py --db /path/to/statev2.sqlite
python3 tools/thread-report/analyze.py
```

Only the exporter needs that local database. It opens it read-only in a single
snapshot transaction. The analyzer validates every manifest hash and JSONL record
count before producing reports. Each archive row preserves a thread/item identity
for tracing statistics back to stored activity. Full rankings are in `stats.json`;
HTML leaderboards show a subset and the searchable explorer shows up to 250 matches.
All totals describe the game thread snapshot, excluding the work to make this report.

Cost figures are current API list-price scenarios for observed token usage. Actual
billing, missing usage, per-request context surcharge mix, subscription pricing,
service-tier premiums and tool fees are not reconstructed. See the report's linked
pricing sources and methodology before interpreting the dollar amounts.
