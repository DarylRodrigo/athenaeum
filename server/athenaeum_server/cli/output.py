"""Output helpers: JSON by default, human-readable text with --text."""

from __future__ import annotations

import json
import sys
from typing import Any

# Module-level toggle set by main.py before commands run.
_TEXT_MODE = False


def set_text_mode(enabled: bool) -> None:
    global _TEXT_MODE
    _TEXT_MODE = enabled


def is_text_mode() -> bool:
    return _TEXT_MODE


def emit(obj: dict[str, Any]) -> None:
    """Emit a single result. JSON unless text mode."""
    if _TEXT_MODE:
        _emit_text(obj)
    else:
        print(json.dumps(obj, ensure_ascii=False, default=str), flush=True)


def emit_error(message: str, code: str = "error", **extra: Any) -> None:
    """Emit an error to stderr. Always JSON, even in text mode (agents need to parse)."""
    payload = {"error": message, "code": code, **extra}
    print(json.dumps(payload, ensure_ascii=False), file=sys.stderr, flush=True)


def emit_list(items: list[dict[str, Any]]) -> None:
    """Emit a list. JSON array (one shot) unless text mode (one row per item)."""
    if _TEXT_MODE:
        for item in items:
            _emit_text(item)
    else:
        print(json.dumps(items, ensure_ascii=False, default=str), flush=True)


def _emit_text(obj: dict[str, Any]) -> None:
    """Best-effort one-line text rendering. Falls back to JSON for unfamiliar shapes."""
    if "id" in obj and "title" in obj:
        # Node-summary-shaped
        type_ = obj.get("type", "")
        spaces = ",".join(obj.get("spaces") or []) or "-"
        edges = obj.get("edge_count", len(obj.get("edges", []) or []))
        title = obj.get("title", "")
        print(f"{obj['id']:<35} {type_:<10} {spaces:<25} {edges:>3} edges  {title}")
    elif "id" in obj and "path" in obj:
        # Capture/write result
        flag = " [dedup]" if obj.get("deduplicated") else ""
        commit = (obj.get("commit") or "")[:7]
        print(f"{obj['id']}  {obj['path']}  {commit}{flag}")
    elif "proposed" in obj:
        print(f"PROPOSED  {obj.get('path')}  approve: {obj.get('approve_with', '')}")
    else:
        print(json.dumps(obj, ensure_ascii=False, indent=2))
