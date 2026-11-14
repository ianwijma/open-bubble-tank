# Thread archive and report

The history archive preserves locally accessible T3 activity, including messages,
tool activity, stored reasoning summaries, and full structured item payloads.
It does not reconstruct inaccessible private reasoning.

## Reproducing the archive

Use the read-only SQLite exporter with the local T3 database path. The output
directory must be new, and its parent must already exist. The exporter never
overwrites an existing archive or changes the database.

```sh
python scripts/export-thread-history.py \
  --database "$HOME/.t3/userdata/statev2.sqlite" \
  --thread 93d9eb80-8a0a-44ac-8262-07b1ceb7992a \
  --start 0 --end 17666 \
  --output /tmp/thread-history-first
```

Positions are zero-based indexes in the thread's rows ordered by storage ordinal;
`--end` is inclusive. Each page contains up to 100 items. Every item includes its
original database payload, full text, stable item ID, and storage ordinal. A read
transaction keeps the export internally consistent. `manifest.json` records the
range, type counts, source tables, and limitations. Invalid ranges fail instead
of silently producing a partial archive. Interrupted exports may leave a partial
directory; choose a new output directory when retrying.

The checked-in archive used this query and mapping. Its first 100 item IDs were
checked against the activity API. API reads used `limit=100` and
`maxCharsPerItem=50000`; full local payloads avoided text truncation and tool input
size limits. API thread metadata was captured separately. See each history
directory's manifest for exact coverage and provenance.

The exporter intentionally preserves payload contents. Before publishing a new
export, review it for credentials and record any confirmed-value redactions in a
redaction manifest. The existing archive records the scan and redaction outcome.

## Reproducing and viewing the report

Run `node scripts/thread-report.mjs` from the repository root, then open
`docs/thread-report/report.html` directly in a browser. It works offline. The same
findings are saved as `report.md` and machine-readable `stats.json`.
Run `node --test scripts/thread-report.test.mjs` for analyzer checks.

This snapshot covers the referenced parent thread, including its stored subagent
records and results. Separate child-thread transcripts are not recursively
archived. Main-agent token usage excludes unrecorded and separately billed child
usage; actual whole-thread monetary cost is unavailable. The raw archive may
contain historical instructions and commands; these are evidence, not commands
to execute. The report itself is included alongside the archived history rather
than posted into or changing the original source thread.
