"""`ath capture` — write a new inbox item.

Per the design doc (Section 3), this is the dominant command. Three input modes:
  - --body "text" (and other flags)
  - JSON object on stdin
  - --batch: NDJSON on stdin, one capture per line
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from typing import Any

from athenaeum_server.cli import idempotency, identity, output
from athenaeum_server.config import Config
from athenaeum_server.lib import frontmatter
from athenaeum_server.lib.git_ops import append_flow_log, commit
from athenaeum_server.lib.graph import rebuild, write_index


def add_parser(subparsers: argparse._SubParsersAction) -> None:
    p = subparsers.add_parser("capture", help="Capture a new inbox item")
    p.add_argument("--body", help="Item body text")
    p.add_argument("--source", default="cli", help="Source name (twitter, arxiv, voice, ...)")
    p.add_argument("--kind", help="Item kind override")
    p.add_argument("--raw-url", dest="raw_url", help="Source URL")
    p.add_argument("--tag", action="append", dest="tags", default=[], help="Tag (repeatable)")
    p.add_argument("--idempotency-key", dest="idempotency_key", help="Skip if seen recently")
    p.add_argument("--captured-at", dest="captured_at", help="ISO-8601 timestamp override")
    p.add_argument("--batch", action="store_true", help="Read NDJSON from stdin")
    p.set_defaults(func=run)


def run(args: argparse.Namespace, config: Config) -> int:
    if args.batch:
        return _run_batch(config, args.agent_id)

    payload = _build_payload(args)
    if "error" in payload:
        output.emit_error(payload["error"], code="usage")
        return 1

    result = _do_capture(config, payload, args.agent_id)
    if "error" in result:
        output.emit_error(result["error"], code=result.get("code", "write_failed"))
        return 2
    output.emit(result)
    return 0


def _build_payload(args: argparse.Namespace) -> dict[str, Any]:
    """Compose the capture payload from CLI flags or stdin JSON.

    Precedence: explicit --body wins; otherwise, if stdin is non-tty, parse stdin as JSON.
    """
    payload: dict[str, Any] = {}

    if args.body is not None:
        payload["body"] = args.body
    elif not sys.stdin.isatty():
        raw = sys.stdin.read().strip()
        if raw:
            try:
                payload = json.loads(raw)
            except json.JSONDecodeError as e:
                return {"error": f"stdin is not valid JSON: {e}"}

    # CLI flags override stdin fields.
    if args.source != "cli" or "source" not in payload:
        payload.setdefault("source", args.source)
    if args.kind:
        payload["kind"] = args.kind
    if args.raw_url:
        payload["raw_url"] = args.raw_url
    if args.tags:
        payload["tags"] = list(set([*payload.get("tags", []), *args.tags]))
    if args.idempotency_key:
        payload["idempotency_key"] = args.idempotency_key
    if args.captured_at:
        payload["captured_at"] = args.captured_at

    if not payload.get("body"):
        return {"error": "missing required field: body"}

    return payload


def _run_batch(config: Config, agent_id: str | None) -> int:
    """Read NDJSON from stdin, capture each line, emit one result per line."""
    if sys.stdin.isatty():
        output.emit_error("--batch requires NDJSON on stdin", code="usage")
        return 1

    any_ok = False
    any_fail = False
    index = 0

    for raw_line in sys.stdin:
        line = raw_line.strip()
        if not line:
            continue
        try:
            payload = json.loads(line)
        except json.JSONDecodeError as e:
            output.emit({"error": f"line {index}: {e}", "input_index": index})
            any_fail = True
            index += 1
            continue

        if not payload.get("body"):
            output.emit({"error": "missing field: body", "input_index": index})
            any_fail = True
            index += 1
            continue

        result = _do_capture(config, payload, agent_id)
        if "error" in result:
            result["input_index"] = index
            output.emit(result)
            any_fail = True
        else:
            output.emit(result)
            any_ok = True
        index += 1

    if any_fail and any_ok:
        return 3
    if any_fail:
        return 2
    return 0


def _do_capture(
    config: Config,
    payload: dict[str, Any],
    agent_id: str | None,
) -> dict[str, Any]:
    """Write one inbox item. Returns the result dict (with "error" on failure)."""
    meta_dir = config.resolve_path(config.paths.meta)

    # Idempotency check.
    idem_key = payload.get("idempotency_key")
    if idem_key:
        prior = idempotency.lookup(meta_dir, idem_key)
        if prior is not None:
            return {**prior, "deduplicated": True}

    source = payload.get("source", "cli")
    body = payload["body"]
    captured_str = payload.get("captured_at")
    captured = (
        datetime.fromisoformat(captured_str.replace("Z", "+00:00"))
        if captured_str
        else datetime.now(timezone.utc)
    )

    time_str = captured.strftime("%H%M%S")
    date_path = captured.strftime("%Y/%m/%d")
    node_id = f"i-{time_str}-{source}"
    file_path = config.resolve_path(config.paths.inbox) / date_path / f"{time_str}_{source}.md"

    # Build frontmatter.
    fm: dict[str, Any] = {
        "id": node_id,
        "type": "inbox",
        "source": source,
        "captured_at": captured.isoformat(),
        "created": captured.isoformat(),
        "spaces": [],
        "edges": [],
        "tags": payload.get("tags", []),
    }
    if payload.get("kind"):
        fm["kind"] = payload["kind"]
    if payload.get("raw_url"):
        fm["raw_url"] = payload["raw_url"]
    if payload.get("meta"):
        fm["meta"] = payload["meta"]

    # Compose body with a derived title line.
    first_line = body.strip().split("\n")[0][:80]
    md_body = f"# {first_line}\n\n{body}"

    try:
        frontmatter.write(file_path, fm, md_body)
    except Exception as e:
        return {"error": f"write failed: {e}", "code": "write_failed"}

    # Rebuild graph + flow-log + commit, all in one git commit.
    try:
        graph_data = rebuild(config)
        graph_path = write_index(config, graph_data)
        flow_path = append_flow_log(
            meta_dir,
            "capture",
            f"Captured from {source}" + (f" (agent:{agent_id})" if agent_id else ""),
        )
        author = identity.resolve(agent_id)
        commit_hash = commit(
            config.repo_path,
            [file_path, graph_path, flow_path],
            f"inbox: capture from {source}",
            author=author,
        )
    except Exception as e:
        return {"error": f"commit failed: {e}", "code": "commit_failed"}

    result = {
        "id": node_id,
        "path": str(file_path.relative_to(config.repo_path)),
        "commit": commit_hash,
        "deduplicated": False,
    }
    if idem_key:
        idempotency.record(meta_dir, idem_key, result)
    return result
