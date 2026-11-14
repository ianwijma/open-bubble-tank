#!/usr/bin/env python3
"""Export one T3 thread's projected activity without modifying its database."""

import argparse
import collections
import json
from pathlib import Path
import sqlite3
import sys
import uuid


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--database", required=True, type=Path)
    parser.add_argument("--thread", required=True, help="Source thread UUID")
    parser.add_argument("--start", type=int, default=0, help="First zero-based position")
    parser.add_argument("--end", type=int, required=True, help="Last position, inclusive")
    parser.add_argument("--output", required=True, type=Path, help="New output directory")
    parser.add_argument("--page-size", type=int, default=100)
    args = parser.parse_args()
    try:
        uuid.UUID(args.thread)
    except ValueError:
        parser.error("--thread must be a UUID")
    if args.start < 0 or args.end < args.start or not 1 <= args.page_size <= 1000:
        parser.error("require 0 <= start <= end and 1 <= page-size <= 1000")
    database = args.database.expanduser().resolve(strict=True)
    output = args.output.expanduser().absolute()
    if output.exists() or output.is_symlink():
        parser.error("--output must not already exist; existing archives are never overwritten")
    if not output.parent.is_dir() or output.parent.is_symlink():
        parser.error("--output parent must be an existing directory")
    output = output.parent.resolve() / output.name
    count = args.end - args.start + 1
    # A read transaction gives the count and pages one consistent snapshot.
    with sqlite3.connect(database.as_uri() + "?mode=ro", uri=True) as connection:
        connection.execute("PRAGMA query_only=ON")
        connection.execute("BEGIN")
        available = connection.execute(
            "SELECT COUNT(*) FROM orchestration_v2_turn_item_positions WHERE thread_id=?",
            (args.thread,),
        ).fetchone()[0]
        if args.end >= available:
            parser.error(f"requested end exceeds thread's {available} available items")
        rows = connection.execute(
            "SELECT p.ordinal, i.payload_json "
            "FROM orchestration_v2_turn_item_positions p "
            "JOIN orchestration_v2_projection_turn_items i "
            "ON i.turn_item_id=p.turn_item_id AND i.thread_id=p.thread_id "
            "WHERE p.thread_id=? ORDER BY p.ordinal LIMIT ? OFFSET ?",
            (args.thread, count, args.start),
        )
        output.mkdir()  # Exclusive creation also prevents concurrent overwrite.
        pages, types, ids = [], collections.Counter(), set()
        position = args.start
        while batch := rows.fetchmany(args.page_size):
            items = []
            first = position
            for ordinal, raw in batch:
                payload = json.loads(raw)
                item_id = payload["id"]
                if item_id in ids:
                    raise ValueError("duplicate item ID in projection")
                ids.add(item_id)
                types[payload["type"]] += 1
                items.append({
                    "position": position, "itemId": item_id,
                    "sourceThreadId": args.thread, "storageOrdinal": ordinal,
                    "text": payload.get("text"), "textTruncated": False,
                    "payload": payload,
                })
                position += 1
            name = f"page-{first:05d}-{position - 1:05d}.json"
            write_json(output / name, {
                "source": "read-only local T3 SQLite projection", "items": items,
            })
            pages.append(name)
        if len(ids) != count:
            raise ValueError("projection join returned fewer rows than requested")
        write_json(output / "manifest.json", {
            "threadId": args.thread, "range": [args.start, args.end],
            "itemCount": len(ids), "pages": pages, "gaps": [], "errors": [],
            "typeCounts": dict(types),
            "source": {
                "database": str(database), "mode": "read-only snapshot",
                "positionMapping": "zero-based row index ordered by positions.ordinal",
                "tables": ["orchestration_v2_turn_item_positions",
                           "orchestration_v2_projection_turn_items"],
                "fullPayloadPreserved": True,
            },
            "limitations": [
                "Only locally projected data is exported; private reasoning is not reconstructed.",
                "No credential redaction is performed. Review exported data before publishing.",
                "API-specific metadata and recentRuns require a separate API capture.",
            ],
        })
    print(f"Exported {len(ids)} items in {len(pages)} pages to {output}")


def write_json(path, data):
    with path.open("x", encoding="utf-8") as stream:
        json.dump(data, stream, ensure_ascii=False, indent=2)
        stream.write("\n")


if __name__ == "__main__":
    try:
        main()
    except (OSError, sqlite3.Error, ValueError) as error:
        print(f"Export failed: {error}", file=sys.stderr)
        sys.exit(1)
