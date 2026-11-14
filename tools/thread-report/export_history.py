#!/usr/bin/env python3
"""Export the public history of a T3 thread (and its child threads) to an archive.

Reads the T3 state database strictly read-only, inside one snapshot-consistent
read transaction, and writes deterministic gzip JSONL shards, markdown
transcript shards, a README and a manifest.

Safety model
------------
* Only ``orchestration_v2_projection_turn_items`` (plus run, usage and plan metadata)
  is read. The raw messages projection is never touched.
* Every payload kind has an explicit key allowlist. Unknown kinds and unknown
  keys are dropped; the manifest lists which kinds were seen.
* Private reasoning is never emitted: ``reasoning`` rows carry no content at
  all, and ``<thinking>``-style blocks or reasoning-named fields embedded in
  other payloads are replaced by a marker.
* Compaction items, system notifications, injected system/instruction
  prompts and secret requests are metadata-only.
* Credential-like values (tokens, keys, passwords, PEM blocks, URL userinfo,
  bearer headers, ...) are replaced by ``[REDACTED:...]`` markers, and inline
  ``data:`` URIs (images etc.) are replaced by a size/hash placeholder.
* Nothing else is truncated; oversize single rows get a shard of their own.

Only the Python standard library is used.
"""

from __future__ import annotations

import argparse
import collections
import gzip
import hashlib
import json
import os
import re
import sqlite3
import sys
from urllib.parse import unquote
from pathlib import Path

FORMAT_VERSION = 1
DEFAULT_THREAD = "93d9eb80-8a0a-44ac-8262-07b1ceb7992a"
DEFAULT_DB = Path.home() / ".t3" / "userdata" / "statev2.sqlite"
DEFAULT_OUTPUT = Path(__file__).resolve().parents[2] / "docs" / "thread-report" / "history"
DEFAULT_SHARD_BYTES = 2_000_000
DEFAULT_TRANSCRIPT_BYTES = 1_000_000

ROW_FIELDS = ("thread_id", "run_id", "item_id", "type", "status", "updated_at", "payload")

# --------------------------------------------------------------------------
# Scrubbing
# --------------------------------------------------------------------------

PRIVATE_TAGS = r"thinking|antthinking|antml:thinking|reasoning|think|private|scratchpad|analysis|chain_of_thought"
RE_PRIVATE_BLOCK = re.compile(rf"<({PRIVATE_TAGS})\b[^>]*>.*?</\1\s*>", re.DOTALL | re.IGNORECASE)
RE_PRIVATE_OPEN = re.compile(rf"<({PRIVATE_TAGS})\b[^>]*>.*\Z", re.DOTALL | re.IGNORECASE)

# Injected instruction/system wrappers. Whole elements are removed from text.
INTERNAL_TAGS = (
    "system-reminder",
    "environment_context",
    "user_instructions",
    "user_info",
    "instructions",
    "permissions instructions",
    "permissions_instructions",
    "collaboration_mode",
    "turn_aborted",
    "skill",
    "project_context",
    "developer_instructions",
)
_tag_alt = "|".join(re.escape(t) for t in INTERNAL_TAGS)
RE_INTERNAL_BLOCK = re.compile(rf"<({_tag_alt})\b[^>]*>.*?</\1\s*>", re.DOTALL | re.IGNORECASE)
RE_INTERNAL_START = re.compile(rf"\A\s*(?:<(?:{_tag_alt})\b|# AGENTS\.md instructions)", re.IGNORECASE)

RE_PEM = re.compile(r"-----BEGIN [A-Z0-9 ]*PRIVATE KEY(?: BLOCK)?-----.*?(?:-----END [A-Z0-9 ]*PRIVATE KEY(?: BLOCK)?-----|\Z)", re.DOTALL)
RE_DATA_URI = re.compile(r"data:([A-Za-z0-9.+-]+/[A-Za-z0-9.+-]+)?(?:;[A-Za-z0-9=._+-]+)*;base64,([A-Za-z0-9+/=_-]{64,})")
TOKEN_PATTERNS = [
    ("github-token", re.compile(r"\bgh[pousr]_[A-Za-z0-9]{20,}")),
    ("github-token", re.compile(r"\bgithub_pat_[A-Za-z0-9_]{20,}")),
    ("api-key", re.compile(r"\bsk-[A-Za-z0-9_-]{20,}")),
    ("aws-key", re.compile(r"\b(?:AKIA|ASIA)[0-9A-Z]{16}\b")),
    ("google-key", re.compile(r"\bAIza[0-9A-Za-z_-]{35}")),
    ("slack-token", re.compile(r"\bxox[abprs]-[A-Za-z0-9-]{10,}")),
    ("npm-token", re.compile(r"\bnpm_[A-Za-z0-9]{30,}")),
    ("jwt", re.compile(r"\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}")),
    ("bearer", re.compile(r"(?i)\b(bearer|basic)(\s+)[A-Za-z0-9._~+/=-]{16,}")),
    ("url-userinfo", re.compile(r"(?<=://)[^/\s:@]+:[^/\s@]+(?=@)")),
]
CRED_WORD = r"(?:pass(?:word|wd)?|secret|token|api[_-]?key|apikey|access[_-]?key|private[_-]?key|credential|authorization|client[_-]?secret)"
RE_ASSIGN = re.compile(
    rf"(?i)(\b[A-Za-z0-9_.-]*{CRED_WORD}[A-Za-z0-9_.-]*)([\"']?\s*[=:]\s*)([\"']?)([^\s\"',;&<>{{}}\[\]()]{{12,}})"
)
RE_CRED_KEY = re.compile(rf"(?i)^[A-Za-z0-9_.-]*{CRED_WORD}[A-Za-z0-9_.-]*$|^cookie$|^set-cookie$")
RE_PRIVATE_KEY_NAME = re.compile(
    r"(?i)^(reasoning|reasoning_?content|reasoning_?text|thinking|thought|thoughts|chain_?of_?thought|"
    r"encrypted_?content|scratchpad|private\w*|hidden\w*)$"
)


class Stats:
    """Counters that end up in the manifest (all deterministic)."""

    def __init__(self) -> None:
        self.redactions: collections.Counter[str] = collections.Counter()
        self.omissions: collections.Counter[str] = collections.Counter()

    def red(self, kind: str, n: int = 1) -> None:
        self.redactions[kind] += n

    def omit(self, kind: str, n: int = 1) -> None:
        self.omissions[kind] += n


def _looks_secret(value: str) -> bool:
    return any(c.isdigit() for c in value) and any(c.isalpha() for c in value)


def scrub_text(text: str, stats: Stats, row_counter: list[int]) -> str:
    """Scrub one string. ``row_counter[0]`` accumulates the number of edits."""

    def bump(kind: str, n: int = 1) -> None:
        stats.red(kind, n)
        row_counter[0] += n

    for kind, regex, marker in (
        ("private-block", RE_PRIVATE_BLOCK, "[REDACTED:private-block]"),
        ("private-block", RE_PRIVATE_OPEN, "[REDACTED:private-block]"),
        ("internal-block", RE_INTERNAL_BLOCK, "[OMITTED:internal-prompt-block]"),
        ("pem-private-key", RE_PEM, "[REDACTED:pem-private-key]"),
    ):
        text, n = regex.subn(marker, text)
        if n:
            bump(kind, n)

    def data_uri(match: re.Match[str]) -> str:
        mime = match.group(1) or "unknown"
        payload = match.group(2)
        digest = hashlib.sha256(payload.encode()).hexdigest()
        stats.omit("inline-data-uri")
        row_counter[0] += 1
        return f"[OMITTED:data-uri mime={mime} chars={len(payload)} sha256={digest}]"

    text = RE_DATA_URI.sub(data_uri, text)

    for kind, regex in TOKEN_PATTERNS:
        if kind == "bearer":
            hits = [0]

            def bearer(m: re.Match[str]) -> str:
                if not _looks_secret(m.group(0).split()[-1]):
                    return m.group(0)  # ordinary prose such as "basic implementation-details"
                hits[0] += 1
                return f"{m.group(1)}{m.group(2)}[REDACTED:bearer]"

            text = regex.sub(bearer, text)
            n = hits[0]
        else:
            text, n = regex.subn(f"[REDACTED:{kind}]", text)
        if n:
            bump(kind, n)

    def assign(match: re.Match[str]) -> str:
        value = match.group(4)
        if value.startswith("[REDACTED") or not _looks_secret(value):
            return match.group(0)
        bump("credential-assignment")
        return f"{match.group(1)}{match.group(2)}{match.group(3)}[REDACTED:credential]"

    return RE_ASSIGN.sub(assign, text)


def scrub_value(value, stats: Stats, row_counter: list[int]):
    """Deep-scrub arbitrary JSON; drops private-named fields, redacts credential fields."""
    if isinstance(value, str):
        # MCP results often wrap another JSON document in a text block. Apply
        # the same policy inside it, rather than trusting the outer envelope.
        if value.lstrip().startswith(("{", "[")):
            try:
                nested = json.loads(value)
            except (ValueError, RecursionError):
                pass
            else:
                if isinstance(nested, (dict, list)):
                    clean = scrub_value(nested, stats, row_counter)
                    if clean != nested:
                        return json.dumps(clean, ensure_ascii=False, separators=(",", ":"))
        return scrub_text(value, stats, row_counter)
    if isinstance(value, list):
        return [scrub_value(v, stats, row_counter) for v in value]
    if isinstance(value, dict):
        if value.get("type") in {"reasoning", "agent_reasoning", "redacted_thinking", "thinking", "compaction", "secret_request"} or value.get("role") in {"system", "developer"} or value.get("channel") == "analysis":
            stats.omit("embedded-private-record")
            row_counter[0] += 1
            return {"type": value.get("type", "internal"), "content_omitted": True}
        if value.get("type") in {"image", "audio"} and "data" in value:
            raw = str(value["data"]).encode()
            stats.omit("embedded-binary")
            row_counter[0] += 1
            return {"type": value["type"], "content_omitted": True, "sha256": hashlib.sha256(raw).hexdigest(), "encoded_bytes": len(raw)}
        out = {}
        for key, val in value.items():
            if RE_PRIVATE_KEY_NAME.match(key):
                stats.red("private-field")
                row_counter[0] += 1
                out[key] = "[REDACTED:private-field]"
            elif RE_CRED_KEY.match(key) and isinstance(val, str) and val:
                stats.red("credential-field")
                row_counter[0] += 1
                out[key] = "[REDACTED:credential]"
            else:
                out[key] = scrub_value(val, stats, row_counter)
        return out
    return value


# --------------------------------------------------------------------------
# Allowlists per payload kind
# --------------------------------------------------------------------------

COMMON_KEYS = ("id", "nodeId", "parentItemId", "ordinal", "title", "startedAt", "completedAt", "providerTurnId")
# kind -> keys copied (and deep-scrubbed) from the payload.
KIND_KEYS: dict[str, tuple[str, ...]] = {
    "user_message": ("messageId", "inputIntent", "createdBy", "creationSource", "senderThreadId"),
    "assistant_message": ("messageId",),
    "command_execution": ("input", "output", "exitCode"),
    "dynamic_tool": ("toolName", "input", "output"),
    "file_change": ("fileName", "diffStr", "changes"),
    "todo_list": ("planId", "steps", "explanation"),
    "web_search": ("patterns",),
    "user_input_request": ("requestId", "questions", "questionAnswer", "responseMode"),
    "subagent": ("subagentId", "origin", "driver", "childThreadId", "prompt", "result"),
    "error": ("failure",),
    "checkpoint": ("checkpointId", "scopeId", "files"),
    "run_interrupt_request": ("message",),
    "run_interrupt_result": ("message",),
}
TEXT_KINDS = {"user_message": "text", "assistant_message": "text"}
# Kinds whose content is never emitted: only the listed metadata is kept.
METADATA_ONLY: dict[str, tuple[str, ...]] = {
    "reasoning": (),
    "compaction": ("driver",),
    "secret_request": ("delivery", "secretStatus"),
}
SECRET_TOOLS = {"request_secret", "t3-code.request_secret"}


def pick(src: dict, keys, dst: dict) -> None:
    for key in keys:
        if key in src:
            dst[key] = src[key]


def subset(src, keys) -> dict:
    return {k: src[k] for k in keys if isinstance(src, dict) and k in src}


def match_run(runs: list[dict], node_id: str, attempt_id: str | None) -> dict:
    """Join a provider turn without confusing run 1 with run 11."""
    attempt = unquote(attempt_id or "")
    candidates = [run for run in runs if run.get("rootNodeId") == node_id or attempt.startswith("run-attempt:run:" + unquote(run["id"]) + ":attempt:")]
    return candidates[0] if len(candidates) == 1 else {}


def sanitize_item(item_type: str, status: str, payload: dict, stats: Stats):
    """Return (sanitized_payload, notes, scrub_count, child_thread_ids)."""
    notes: list[str] = []
    counter = [0]
    out: dict = {}
    children: list[str] = []

    # Child-thread discovery reads only these key names, never free text.
    for cand in (payload.get("childThreadId"), (payload.get("source") or {}).get("childThreadId") if isinstance(payload.get("source"), dict) else None):
        if isinstance(cand, str) and cand:
            children.append(cand)

    if item_type == "reasoning":
        stats.omit("reasoning-content")
        notes.append("content_omitted:private_reasoning")
        return {"content_omitted": True}, notes, 0, children

    pick(payload, COMMON_KEYS, out)
    if "nativeItemRef" in payload and isinstance(payload["nativeItemRef"], dict):
        out["nativeItemRef"] = subset(payload["nativeItemRef"], ("driver", "strength"))

    if item_type in METADATA_ONLY:
        pick(payload, METADATA_ONLY[item_type], out)
        out["content_omitted"] = True
        # Titles of these items may echo private content; keep none.
        out.pop("title", None)
        stats.omit(f"{item_type}-content")
        notes.append(f"content_omitted:{item_type}")
        return out, notes, 0, children

    if item_type == "notification":
        source = payload.get("source") if isinstance(payload.get("source"), dict) else {}
        out["source"] = subset(source, ("kind", "taskIds", "childThreadId"))
        pick(payload, ("outcome",), out)
        if source.get("kind") == "system":
            out["content_omitted"] = True
            out.pop("title", None)
            stats.omit("system-notification-content")
            notes.append("content_omitted:system_notification")
        else:
            pick(payload, ("summary", "detail"), out)
    elif item_type in KIND_KEYS:
        pick(payload, KIND_KEYS[item_type], out)
        if item_type == "dynamic_tool":
            src = payload.get("toolSource")
            if isinstance(src, dict):
                out["toolSource"] = subset(src, ("key", "name", "kind"))
            if payload.get("toolName") in SECRET_TOOLS:
                out.pop("input", None)
                out.pop("output", None)
                out["content_omitted"] = True
                stats.omit("secret-tool-payload")
                notes.append("content_omitted:secret_request_tool")
        if item_type in ("user_message", "assistant_message"):
            if "streaming" in payload:
                out["streaming"] = payload["streaming"]
        if item_type == "user_message":
            attachments = payload.get("attachments")
            out["attachmentCount"] = len(attachments) if isinstance(attachments, list) else 0
            ctx = payload.get("context")
            if isinstance(ctx, dict):
                records = ctx.get("records")
                out["contextRecordCount"] = len(records) if isinstance(records, list) else 0
    else:
        stats.omit("unknown-kind-content")
        notes.append("content_omitted:unknown_kind")
        out["content_omitted"] = True
        return out, notes, 0, children

    text_key = TEXT_KINDS.get(item_type)
    if text_key and isinstance(payload.get(text_key), str):
        text = payload[text_key]
        if RE_INTERNAL_START.match(text):
            out["text_omitted"] = True
            out["text_chars"] = len(text)
            out["text_sha256"] = hashlib.sha256(text.encode()).hexdigest()
            stats.omit("internal-prompt-message")
            notes.append("content_omitted:internal_prompt")
        else:
            out[text_key] = text

    out = scrub_value(out, stats, counter)
    return out, notes, counter[0], children


# --------------------------------------------------------------------------
# Output writers
# --------------------------------------------------------------------------

def dump(obj) -> str:
    return json.dumps(obj, sort_keys=True, ensure_ascii=False, separators=(",", ":"))


class FileRecord:
    def __init__(self, path: str, fmt: str, group: str) -> None:
        self.path, self.format, self.group = path, fmt, group
        self.records = 0
        self.uncompressed_bytes = 0
        self.sha256 = ""
        self.bytes = 0


class JsonlShards:
    """Deterministic gzip JSONL shard writer (mtime 0, no filename in header)."""

    def __init__(self, directory: Path, rel: str, group: str, max_bytes: int, files: list[FileRecord]) -> None:
        self.dir, self.rel, self.group, self.max_bytes, self.files = directory, rel, group, max_bytes, files
        self.current: FileRecord | None = None
        self.raw = None
        self.gz = None
        self.index = 0

    def _open(self) -> None:
        self.index += 1
        name = f"{self.group}-{self.index:04d}.jsonl.gz"
        self.current = FileRecord(f"{self.rel}/{name}", "jsonl.gz", self.group)
        self.dir.mkdir(parents=True, exist_ok=True)
        self.raw = open(self.dir / name, "wb")
        self.gz = gzip.GzipFile(filename="", mode="wb", fileobj=self.raw, mtime=0, compresslevel=9)

    def _close(self) -> None:
        if self.current is None:
            return
        self.gz.close()
        self.raw.close()
        full = self.dir / Path(self.current.path).name
        data = full.read_bytes()
        self.current.sha256 = hashlib.sha256(data).hexdigest()
        self.current.bytes = len(data)
        self.files.append(self.current)
        self.current = self.raw = self.gz = None

    def write(self, line: str) -> None:
        blob = (line + "\n").encode("utf-8")
        if self.current is not None and self.current.records and self.current.uncompressed_bytes + len(blob) > self.max_bytes:
            self._close()
        if self.current is None:
            self._open()
        self.gz.write(blob)
        self.current.records += 1
        self.current.uncompressed_bytes += len(blob)

    def close(self) -> None:
        self._close()


class MarkdownShards:
    def __init__(self, directory: Path, rel: str, group: str, max_bytes: int, files: list[FileRecord]) -> None:
        self.dir, self.rel, self.group, self.max_bytes, self.files = directory, rel, group, max_bytes, files
        self.current: FileRecord | None = None
        self.fh = None
        self.index = 0
        self.thread_in_shard: str | None = None

    def _open(self) -> None:
        self.index += 1
        name = f"{self.group}-{self.index:04d}.md"
        self.current = FileRecord(f"{self.rel}/{name}", "md", self.group)
        self.dir.mkdir(parents=True, exist_ok=True)
        self.fh = open(self.dir / name, "wb")
        self.thread_in_shard = None

    def _close(self) -> None:
        if self.current is None:
            return
        self.fh.close()
        data = (self.dir / Path(self.current.path).name).read_bytes()
        self.current.sha256 = hashlib.sha256(data).hexdigest()
        self.current.bytes = len(data)
        self.current.uncompressed_bytes = len(data)
        self.files.append(self.current)
        self.current = self.fh = None

    def write_message(self, thread_id: str, thread_label: str, entry: str) -> None:
        header = "" if self.thread_in_shard == thread_id else f"\n## Thread {thread_id}\n\n{thread_label}\n"
        blob = (header + entry).encode("utf-8")
        if self.current is not None and self.current.records and self.current.uncompressed_bytes + len(blob) > self.max_bytes:
            continued = self.thread_in_shard == thread_id
            self._close()
            suffix = " (continued)" if continued else ""
            header = f"\n## Thread {thread_id}{suffix}\n\n{thread_label}\n"
            blob = (header + entry).encode("utf-8")
        if self.current is None:
            self._open()
            if not header:
                header = f"\n## Thread {thread_id}\n\n{thread_label}\n"
            blob = (header + entry).encode("utf-8")
            self.fh.write(f"# Transcript shard: {self.group} {self.index:04d}\n".encode())
            self.current.uncompressed_bytes += len(f"# Transcript shard: {self.group} {self.index:04d}\n".encode())
        self.fh.write(blob)
        self.current.records += 1
        self.current.uncompressed_bytes += len(blob)
        self.thread_in_shard = thread_id

    def close(self) -> None:
        self._close()


def fence(text: str) -> str:
    longest = max((len(m.group(0)) for m in re.finditer(r"`+", text)), default=0)
    ticks = "`" * max(3, longest + 1)
    return f"{ticks}text\n{text}\n{ticks}"


def transcript_entry(row: dict) -> str:
    payload = row["payload"]
    if row["type"] == "user_message":
        by = payload.get("createdBy", "user")
        role = "User" if by == "user" else f"Agent-sent message ({payload.get('creationSource', 'unknown')})"
    else:
        role = "Assistant"
    head = f"\n### {role} · ordinal {row['ordinal']} · {row['updated_at']} · {row['item_id']}\n\n"
    if payload.get("text_omitted"):
        return head + f"*[text omitted: internal prompt, {payload.get('text_chars')} chars, sha256 {payload.get('text_sha256')}]*\n"
    text = payload.get("text", "")
    return head + (fence(text) if text else "*[empty]*") + "\n"


# --------------------------------------------------------------------------
# Export
# --------------------------------------------------------------------------

def open_snapshot(db: Path) -> sqlite3.Connection:
    uri = f"file:{db.as_posix()}?mode=ro"
    conn = sqlite3.connect(uri, uri=True, isolation_level=None)
    conn.execute("PRAGMA query_only = ON")
    conn.execute("BEGIN")  # read snapshot is pinned by the first read below
    return conn


def export(db: Path, thread: str, output: Path, shard_bytes: int, transcript_bytes: int) -> dict:
    conn = open_snapshot(db)
    conn.row_factory = sqlite3.Row
    stats = Stats()
    files: list[FileRecord] = []

    meta_rows = conn.execute(
        "SELECT projection_name, schema_version, last_sequence, updated_at FROM orchestration_v2_projection_metadata ORDER BY projection_name"
    ).fetchall()
    snapshot_meta = [dict(r) for r in meta_rows]
    root_row = conn.execute("SELECT thread_id FROM orchestration_v2_projection_threads WHERE thread_id=?", (thread,)).fetchone()
    if root_row is None:
        raise SystemExit(f"thread {thread} not found in {db.name}")

    for sub, pattern in (("jsonl", "*.jsonl.gz"), ("transcript", "*.md")):
        for old in (output / sub).glob(pattern) if (output / sub).is_dir() else []:
            old.unlink()
    output.mkdir(parents=True, exist_ok=True)

    writers = {
        "root": JsonlShards(output / "jsonl", "jsonl", "root", shard_bytes, files),
        "children": JsonlShards(output / "jsonl", "jsonl", "children", shard_bytes, files),
    }
    transcripts = {
        "root": MarkdownShards(output / "transcript", "transcript", "root", transcript_bytes, files),
        "children": MarkdownShards(output / "transcript", "transcript", "children", transcript_bytes, files),
    }

    counts_by_type: collections.Counter[str] = collections.Counter()
    counts_by_status: collections.Counter[str] = collections.Counter()
    counts_by_group: collections.Counter[str] = collections.Counter()
    kinds_seen: dict[str, collections.Counter[str]] = collections.defaultdict(collections.Counter)
    coverage: list[dict] = []
    total_rows = 0
    transcript_messages = 0

    # BFS over thread references; the queue order is deterministic.
    queue: list[tuple[str, int, str | None, str | None]] = [(thread, 0, None, None)]
    discovered: set[str] = {thread}
    qi = 0
    while qi < len(queue):
        tid, depth, parent, via = queue[qi]
        qi += 1
        group = "root" if depth == 0 else "children"
        trow = conn.execute(
            "SELECT title, created_at, updated_at, archived_at, deleted_at FROM orchestration_v2_projection_threads WHERE thread_id=?",
            (tid,),
        ).fetchone()
        label = f"*{trow['title']}*" if trow else "*(thread record unavailable)*"
        label = scrub_text(label, stats, [0])
        item_count = 0
        by_type: collections.Counter[str] = collections.Counter()
        child_first_seen: dict[str, str] = {}

        def emit(row: dict) -> None:
            nonlocal total_rows, transcript_messages, item_count
            writers[group].write(dump(row))
            total_rows += 1
            item_count += 1
            counts_by_type[row["type"]] += 1
            counts_by_status[row["status"]] += 1
            counts_by_group[group] += 1
            by_type[row["type"]] += 1
            if row["type"] in ("user_message", "assistant_message"):
                transcripts[group].write_message(tid, label, transcript_entry(row))
                transcript_messages += 1

        # Runs (metadata only) -> type "run"
        thread_runs = []
        for r in conn.execute(
            "SELECT run_id, status, requested_at, completed_at, payload_json FROM orchestration_v2_projection_runs WHERE thread_id=? ORDER BY ordinal, run_id",
            (tid,),
        ):
            p = json.loads(r["payload_json"])
            body = subset(
                p,
                (
                    "id", "ordinal", "providerInstanceId", "providerThreadId", "userMessageId", "rootNodeId", "status",
                    "queuePosition", "requestedAt", "startedAt", "workStartedAt", "completedAt", "queueHeld",
                    "restartContinuationOfRunId",
                ),
            )
            ms = p.get("modelSelection")
            if isinstance(ms, dict):
                body["modelSelection"] = subset(ms, ("instanceId", "model"))
            thread_runs.append(body)
            body["content_omitted"] = ["delegatedCompletion", "workspacePreparation"]
            emit({
                "thread_id": tid, "run_id": r["run_id"], "item_id": r["run_id"], "type": "run",
                "status": r["status"], "updated_at": r["completed_at"] or r["requested_at"],
                "payload": body, "ordinal": p.get("ordinal"), "depth": depth, "source": "projection_runs",
            })

        # Final per-provider-turn totals, not the rolling context-window meter.
        # Never select or copy reasoning text; reasoningTokens is only a count.
        for r in conn.execute(
            "SELECT provider_turn_id, node_id, run_attempt_id, ordinal, status, started_at, completed_at, payload_json FROM orchestration_v2_projection_provider_turns WHERE thread_id=? ORDER BY ordinal, provider_turn_id",
            (tid,),
        ):
            p = json.loads(r["payload_json"])
            run = match_run(thread_runs, r["node_id"], r["run_attempt_id"])
            usage = subset(p.get("turnTokenUsage"), ("usageScope", "usageStatus", "inputTokens", "cachedInputTokens", "cacheCreationTokens", "outputTokens", "reasoningTokens", "hasSubagents", "models"))
            body = {"usage": usage, "usage_available": bool(usage), "startedAt": r["started_at"], "completedAt": r["completed_at"], "model": run.get("modelSelection", {}).get("model"), "model_attribution": "run_selection" if run else "unavailable"}
            reported = usage.get("models", [])
            if not body["model"] and isinstance(reported, list) and len(reported) == 1 and isinstance(reported[0], str):
                body["model"] = reported[0]
                body["model_attribution"] = "usage_models"
            emit({"thread_id": tid, "run_id": run.get("id"), "item_id": r["provider_turn_id"], "type": "provider_usage", "status": r["status"], "updated_at": r["completed_at"] or r["started_at"], "payload": body, "ordinal": r["ordinal"], "depth": depth, "source": "projection_provider_turns"})

        # Turn items
        for r in conn.execute(
            "SELECT turn_item_id, run_id, ordinal, type, status, updated_at, payload_json FROM orchestration_v2_projection_turn_items WHERE thread_id=? ORDER BY ordinal",
            (tid,),
        ):
            try:
                p = json.loads(r["payload_json"])
                if not isinstance(p, dict):
                    raise ValueError("payload is not an object")
            except ValueError:
                stats.omit("unparseable-payload")
                p = {}
            body, notes, scrubbed, kids = sanitize_item(r["type"], r["status"], p, stats)
            kinds_seen[r["type"]][r["status"]] += 1
            row = {
                "thread_id": tid, "run_id": r["run_id"], "item_id": r["turn_item_id"], "type": r["type"],
                "status": r["status"], "updated_at": r["updated_at"], "payload": body,
                "ordinal": r["ordinal"], "depth": depth, "source": "projection_turn_items",
            }
            if notes:
                row["notes"] = notes
            if scrubbed:
                row["scrubbed"] = scrubbed
            emit(row)
            for kid in kids:
                child_first_seen.setdefault(kid, r["turn_item_id"])

        # Plans (final plan state) -> type "plan"
        for r in conn.execute(
            "SELECT plan_id, run_id, kind, status, payload_json FROM orchestration_v2_projection_plans WHERE thread_id=? ORDER BY plan_id",
            (tid,),
        ):
            p = json.loads(r["payload_json"])
            counter = [0]
            body = scrub_value(subset(p, ("id", "nodeId", "kind", "status", "steps", "explanation")), stats, counter)
            row = {
                "thread_id": tid, "run_id": r["run_id"], "item_id": r["plan_id"], "type": "plan",
                "status": r["status"], "updated_at": None, "payload": body, "depth": depth, "source": "projection_plans",
            }
            if counter[0]:
                row["scrubbed"] = counter[0]
            emit(row)

        # Also discover children via the subagent projection (ids only).
        for r in conn.execute(
            "SELECT child_thread_id, subagent_id FROM orchestration_v2_projection_subagents WHERE thread_id=? AND child_thread_id IS NOT NULL ORDER BY subagent_id",
            (tid,),
        ):
            child_first_seen.setdefault(r["child_thread_id"], f"subagent:{r['subagent_id']}")

        new_children = []
        for kid, via_item in child_first_seen.items():
            if kid not in discovered:
                discovered.add(kid)
                new_children.append(kid)
                queue.append((kid, depth + 1, tid, via_item))
        coverage.append({
            "thread_id": tid,
            "depth": depth,
            "parent_thread_id": parent,
            "discovered_via_item": via,
            "group": group,
            "title": (trow["title"] if trow else None),
            "thread_created_at": trow["created_at"] if trow else None,
            "thread_updated_at": trow["updated_at"] if trow else None,
            "thread_deleted": bool(trow and trow["deleted_at"]),
            "retrievable": sum(v for k, v in by_type.items() if k not in {"run", "provider_usage", "plan"}) > 0,
            "thread_record_available": bool(trow),
            "records": item_count,
            "records_by_type": dict(sorted(by_type.items())),
            "children_discovered": new_children,
        })

    for w in (*writers.values(), *transcripts.values()):
        w.close()
    conn.execute("ROLLBACK")
    conn.close()

    files.sort(key=lambda f: f.path)
    file_entries = [
        {
            "path": f.path, "sha256": f.sha256, "records": f.records, "format": f.format,
            "group": f.group, "bytes": f.bytes, "uncompressed_bytes": f.uncompressed_bytes,
        }
        for f in files
    ]
    archive_hash = hashlib.sha256("".join(f"{f['path']}\0{f['sha256']}\n" for f in file_entries).encode()).hexdigest()
    missing = [c["thread_id"] for c in coverage if not c["retrievable"]]
    manifest = {
        "format_version": FORMAT_VERSION,
        "archive_sha256": archive_hash,
        "root_thread_id": thread,
        "source": {
            "database": db.name,
            "tables": [
                "orchestration_v2_projection_turn_items", "orchestration_v2_projection_runs",
                "orchestration_v2_projection_plans", "orchestration_v2_projection_subagents (child ids)",
                "orchestration_v2_projection_provider_turns (usage counts only)",
                "orchestration_v2_projection_threads (titles)",
            ],
            "access": "read-only connection, single read transaction (snapshot)",
            "projection_metadata": snapshot_meta,
        },
        "row_schema": list(ROW_FIELDS) + ["ordinal", "depth", "source", "notes?", "scrubbed?"],
        "shard_max_uncompressed_bytes": shard_bytes,
        "transcript_shard_max_bytes": transcript_bytes,
        "files": file_entries,
        "counts": {
            "records": total_rows,
            "transcript_messages": transcript_messages,
            "threads": len(coverage),
            "by_type": dict(sorted(counts_by_type.items())),
            "by_status": dict(sorted(counts_by_status.items())),
            "by_group": dict(sorted(counts_by_group.items())),
            "kinds_seen": {k: dict(sorted(v.items())) for k, v in sorted(kinds_seen.items())},
        },
        "exclusions": {
            "policy": [
                "reasoning items: type/status/count only, no content, no title",
                "compaction items: driver/status only",
                "secret_request items and request_secret tool calls: delivery/status only",
                "system notifications: source kind/outcome only",
                "injected system/instruction prompts: whole messages become metadata (length+sha256); embedded blocks replaced by marker",
                "raw messages projection and event log: not read",
                "inline data: URIs replaced by mime/size/sha256 placeholder (repo rule: no extracted images committed)",
                "unknown payload kinds and non-allowlisted keys: dropped",
                "run payload fields delegatedCompletion/workspacePreparation: not exported",
            ],
            "omitted_counts": dict(sorted(stats.omissions.items())),
            "redaction_counts": dict(sorted(stats.redactions.items())),
        },
        "coverage": {
            "threads_discovered": len(coverage),
            "threads_with_records": len(coverage) - len(missing),
            "missing_threads": missing,
            "note": "Discovery follows childThreadId in subagent/notification payloads and the subagent projection, recursively.",
            "threads": coverage,
        },
    }
    (output / "manifest.json").write_text(json.dumps(manifest, indent=2, sort_keys=True, ensure_ascii=False) + "\n", encoding="utf-8")
    (output / "README.md").write_text(readme(manifest), encoding="utf-8")
    return manifest


def readme(m: dict) -> str:
    c = m["counts"]
    return f"""# Thread history archive

Archive of the public history of thread `{m['root_thread_id']}` and the {c['threads'] - 1} child
threads reachable from it. Produced by `tools/thread-report/export_history.py`.
It is evidence for the [Markdown report](../report.md) and [browser report](../report.html); it is not application code.

## Layout

- `manifest.json` - file list with `path`, `sha256`, `records` (plus sizes, group, format),
  counts, exclusions/redactions, snapshot metadata and per-thread coverage.
  `archive_sha256` hashes the sorted `path\\0sha256` list.
- `jsonl/root-NNNN.jsonl.gz` - rows of the root thread.
- `jsonl/children-NNNN.jsonl.gz` - rows of all child threads, in discovery order (breadth first).
- `transcript/*.md` - human-readable user/assistant messages from the same rows.

Shards are gzip (mtime 0, no embedded filename), UTF-8 JSON Lines, at most about
{m['shard_max_uncompressed_bytes']:,} uncompressed bytes each. A single row larger than the limit gets its own
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

Private reasoning is never exported: `reasoning` rows contain only `{{"content_omitted": true}}`.
Compaction, system notifications, injected instruction prompts and secret requests are metadata only.
Credential-like values are replaced by `[REDACTED:...]`; inline `data:` URIs by a size/hash
placeholder. See `exclusions` in `manifest.json` for the policy and the counts.

## Reading

```sh
zcat jsonl/root-0001.jsonl.gz | head -n 1
python3 tools/thread-report/export_history.py --help
```
"""


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--db", type=Path, default=DEFAULT_DB, help=f"state database (default: {DEFAULT_DB})")
    ap.add_argument("--thread", default=DEFAULT_THREAD, help="root thread id")
    ap.add_argument("--output", type=Path, default=DEFAULT_OUTPUT, help=f"archive directory (default: {DEFAULT_OUTPUT})")
    ap.add_argument("--shard-bytes", type=int, default=DEFAULT_SHARD_BYTES, help="max uncompressed bytes per JSONL shard")
    ap.add_argument("--transcript-bytes", type=int, default=DEFAULT_TRANSCRIPT_BYTES, help="max bytes per markdown shard")
    args = ap.parse_args(argv)
    if not args.db.is_file():
        print(f"database not found: {args.db}", file=sys.stderr)
        return 2
    manifest = export(args.db, args.thread, args.output, args.shard_bytes, args.transcript_bytes)
    c = manifest["counts"]
    print(
        f"exported {c['records']} records from {c['threads']} threads into {len(manifest['files'])} files; "
        f"missing threads: {len(manifest['coverage']['missing_threads'])}; archive sha256 {manifest['archive_sha256']}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
