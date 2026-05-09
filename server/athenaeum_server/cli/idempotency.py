"""Idempotency-key tracking via knowledge-db/meta/idempotency.jsonl.

Each line is a JSON object: {key, at, result}. The CLI checks the file
before a write; if it finds a non-expired entry with the same key, it
returns the prior result with deduplicated=True instead of writing.
"""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

DEFAULT_WINDOW = timedelta(hours=24)


def _log_path(meta_dir: Path) -> Path:
    return meta_dir / "idempotency.jsonl"


def lookup(meta_dir: Path, key: str, window: timedelta = DEFAULT_WINDOW) -> dict[str, Any] | None:
    """Return the prior result for *key* if seen within *window*, else None."""
    log = _log_path(meta_dir)
    if not log.exists():
        return None

    cutoff = datetime.now(timezone.utc) - window
    # Read backward — most recent entries are at the end; we want the latest.
    try:
        lines = log.read_text(encoding="utf-8").splitlines()
    except OSError:
        return None

    for line in reversed(lines):
        line = line.strip()
        if not line:
            continue
        try:
            entry = json.loads(line)
        except json.JSONDecodeError:
            continue
        if entry.get("key") != key:
            continue
        try:
            at = datetime.fromisoformat(entry["at"])
        except (KeyError, ValueError):
            continue
        if at < cutoff:
            return None  # stale
        return entry.get("result")

    return None


def record(meta_dir: Path, key: str, result: dict[str, Any]) -> None:
    """Append a new idempotency entry."""
    log = _log_path(meta_dir)
    log.parent.mkdir(parents=True, exist_ok=True)
    entry = {
        "key": key,
        "at": datetime.now(timezone.utc).isoformat(),
        "result": result,
    }
    with log.open("a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")
