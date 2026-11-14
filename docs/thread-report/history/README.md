# Thread history archive

Archive of the public history of thread `93d9eb80-8a0a-44ac-8262-07b1ceb7992a` and the 180 child
threads reachable from it. Produced by `tools/thread-report/export_history.py`.
It is evidence for the [Markdown report](../report.md) and [browser report](../report.html); it is not application code.

## Layout

- `manifest.json` - file list with `path`, `sha256`, `records` (plus sizes, group, format),
  counts, exclusions/redactions, snapshot metadata and per-thread coverage.
  `archive_sha256` hashes the sorted `path\0sha256` list.
- `jsonl/root-NNNN.jsonl.gz` - rows of the root thread.
- `jsonl/children-NNNN.jsonl.gz` - rows of all child threads, in discovery order (breadth first).
- `transcript/*.md` - human-readable user/assistant messages from the same rows.

Shards are gzip (mtime 0, no embedded filename), UTF-8 JSON Lines, at most about
2,000,000 uncompressed bytes each. A single row larger than the limit gets its own
shard; rows are never split or truncated. Output is deterministic: rerunning against the same
snapshot reproduces identical bytes.

## Row schema

Every line is one JSON object with sorted keys:

| field | meaning |
| --- | --- |
| `thread_id` | thread the record belongs to |
| `run_id` | run the item ran in (may be null) |
| `item_id` | turn item id (run id for `run`, plan id for `plan`) |
| `type` | item kind, e.g. `user_message`, `assistant_message`, `command_execution`, `dynamic_tool`, `file_change`, `todo_list`, `subagent`, `notification`, `checkpoint`, `reasoning`, `run`, `provider_usage`, `plan` |
| `status` | item status as stored |
| `updated_at` | stored update timestamp (ISO 8601) |
| `payload` | allowlisted, scrubbed payload for that kind |
| `ordinal`, `depth`, `source` | extra: position in thread, 0 for root / n for nth-level child, source table |
| `notes`, `scrubbed` | extra, only when content was omitted or edited |

Rows per thread are ordered by `run` rows first, then turn items by ordinal, then `plan` rows.

## What is not here

Private reasoning is never exported: `reasoning` rows contain only `{"content_omitted": true}`.
Compaction, system notifications, injected instruction prompts and secret requests are metadata only.
Credential-like values are replaced by `[REDACTED:...]`; inline `data:` URIs by a size/hash
placeholder. See `exclusions` in `manifest.json` for the policy and the counts.

## Reading

```sh
zcat jsonl/root-0001.jsonl.gz | head -n 1
python3 tools/thread-report/export_history.py --help
```
