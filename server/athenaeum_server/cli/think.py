"""`ath think` — thoughts: new, connect, list, show, update."""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
from typing import Any

from athenaeum_server.cli import idempotency, identity, output
from athenaeum_server.config import Config
from athenaeum_server.lib import frontmatter
from athenaeum_server.lib.git_ops import append_flow_log, commit
from athenaeum_server.lib.graph import rebuild, write_index
from athenaeum_server.lib.ids import slugify
from athenaeum_server.lib.nodes import list_nodes, read_node


def add_parser(subparsers: argparse._SubParsersAction) -> None:
    parent = subparsers.add_parser("think", help="Thinking-space operations")
    sub = parent.add_subparsers(dest="think_cmd", required=True, metavar="SUBCOMMAND")

    # think new
    p_new = sub.add_parser("new", help="Create a new thought")
    p_new.add_argument("--title", required=True)
    p_new.add_argument("--space", required=True, help="Primary space id")
    p_new.add_argument("--body", default="", help="Initial body markdown")
    p_new.add_argument(
        "--connect",
        action="append",
        default=[],
        metavar="ID:KIND",
        help="Add an outbound edge (repeatable, e.g. t-rlhf:extends)",
    )
    p_new.add_argument("--status", default="drafting", choices=["drafting", "developing", "mature", "graduated"])
    p_new.add_argument("--tag", action="append", dest="tags", default=[])
    p_new.add_argument("--idempotency-key", dest="idempotency_key")
    p_new.add_argument("--replace", action="store_true", help="Overwrite existing thought with same id")
    p_new.set_defaults(func=cmd_new)

    # think connect
    p_con = sub.add_parser("connect", help="Add an edge between two nodes")
    p_con.add_argument("--from", dest="from_id", required=True)
    p_con.add_argument("--to", dest="to_id", required=True)
    p_con.add_argument("--kind", required=True)
    p_con.add_argument("--note", help="Optional edge note")
    p_con.add_argument("--idempotency-key", dest="idempotency_key")
    p_con.set_defaults(func=cmd_connect)

    # think list
    p_list = sub.add_parser("list", help="List thoughts")
    p_list.add_argument("--space", help="Filter by space")
    p_list.add_argument("--status", choices=["drafting", "developing", "mature", "graduated"])
    p_list.add_argument("--orphan", action="store_true", help="Only thoughts with no edges")
    p_list.add_argument("--limit", type=int, default=50)
    p_list.set_defaults(func=cmd_list)

    # think show
    p_show = sub.add_parser("show", help="Show a thought by id")
    p_show.add_argument("id")
    p_show.set_defaults(func=cmd_show)

    # think update
    p_upd = sub.add_parser("update", help="Update a thought's metadata (not body)")
    p_upd.add_argument("id")
    p_upd.add_argument("--title")
    p_upd.add_argument("--status", choices=["drafting", "developing", "mature", "graduated"])
    p_upd.add_argument("--space", action="append", dest="spaces", help="Replace spaces (repeatable)")
    p_upd.add_argument("--add-tag", action="append", dest="add_tags", default=[])
    p_upd.add_argument("--remove-tag", action="append", dest="remove_tags", default=[])
    p_upd.set_defaults(func=cmd_update)


# ---------------------------------------------------------------------------
# Commands
# ---------------------------------------------------------------------------

def cmd_new(args: argparse.Namespace, config: Config) -> int:
    meta_dir = config.resolve_path(config.paths.meta)

    if args.idempotency_key:
        prior = idempotency.lookup(meta_dir, args.idempotency_key)
        if prior is not None:
            output.emit({**prior, "deduplicated": True})
            return 0

    valid_spaces = {s.id for s in config.spaces}
    if args.space not in valid_spaces:
        output.emit_error(
            f"unknown space: {args.space} (valid: {sorted(valid_spaces)})",
            code="usage",
        )
        return 1

    # Validate edge kinds.
    allowed_kinds = set(config.llm.edge_kinds)
    edges = []
    for spec in args.connect:
        if ":" not in spec:
            output.emit_error(f"--connect must be ID:KIND (got: {spec})", code="usage")
            return 1
        target, kind = spec.split(":", 1)
        if kind not in allowed_kinds:
            output.emit_error(
                f"unknown edge kind: {kind} (valid: {sorted(allowed_kinds)})",
                code="usage",
            )
            return 1
        edges.append({"to": target.strip(), "kind": kind.strip()})

    # Build the file.
    slug = slugify(args.title)
    node_id = f"t-{slug}"
    target_dir = config.resolve_path(config.paths.thinking) / args.space
    target_path = target_dir / f"{node_id}.md"

    if target_path.exists() and not args.replace:
        output.emit_error(
            f"thought already exists: {node_id}",
            code="exists",
            id=node_id,
            path=str(target_path.relative_to(config.repo_path)),
        )
        return 2

    now = datetime.now(timezone.utc).isoformat()
    fm: dict[str, Any] = {
        "id": node_id,
        "type": "thought",
        "status": args.status,
        "spaces": [args.space],
        "created": now,
        "updated": now,
        "edges": edges,
        "tags": args.tags,
    }
    body_md = f"# {args.title}\n\n{args.body}".rstrip() + "\n"

    try:
        frontmatter.write(target_path, fm, body_md)
    except Exception as e:
        output.emit_error(f"write failed: {e}", code="write_failed")
        return 2

    graph_data = rebuild(config)
    graph_path = write_index(config, graph_data)
    flow_path = append_flow_log(meta_dir, "think:new", f"Created {node_id} in {args.space}")
    author = identity.resolve(args.agent_id)
    commit_hash = commit(
        config.repo_path,
        [target_path, graph_path, flow_path],
        f"think: new {node_id}",
        author=author,
    )

    result = {
        "id": node_id,
        "path": str(target_path.relative_to(config.repo_path)),
        "commit": commit_hash,
        "deduplicated": False,
    }
    if args.idempotency_key:
        idempotency.record(meta_dir, args.idempotency_key, result)
    output.emit(result)
    return 0


def cmd_connect(args: argparse.Namespace, config: Config) -> int:
    meta_dir = config.resolve_path(config.paths.meta)

    if args.idempotency_key:
        prior = idempotency.lookup(meta_dir, args.idempotency_key)
        if prior is not None:
            output.emit({**prior, "deduplicated": True})
            return 0

    allowed_kinds = set(config.llm.edge_kinds)
    if args.kind not in allowed_kinds:
        output.emit_error(
            f"unknown edge kind: {args.kind} (valid: {sorted(allowed_kinds)})",
            code="usage",
        )
        return 1

    node = read_node(args.from_id, config)
    if node is None:
        output.emit_error(f"source node not found: {args.from_id}", code="not_found")
        return 2

    # Dedup: if the same (to, kind) edge exists, return without writing.
    for e in node.edges:
        if e.to == args.to_id and e.kind == args.kind:
            result = {
                "from": args.from_id,
                "to": args.to_id,
                "kind": args.kind,
                "deduplicated": True,
            }
            output.emit(result)
            return 0

    # Append edge.
    new_edges = [
        {"to": e.to, "kind": e.kind, **({"note": e.note} if e.note else {})}
        for e in node.edges
    ]
    new_edge: dict[str, Any] = {"to": args.to_id, "kind": args.kind}
    if args.note:
        new_edge["note"] = args.note
    new_edges.append(new_edge)

    fm = _node_to_frontmatter(node)
    fm["edges"] = new_edges
    fm["updated"] = datetime.now(timezone.utc).isoformat()

    frontmatter.write(node.path, fm, node.body)

    graph_data = rebuild(config)
    graph_path = write_index(config, graph_data)
    flow_path = append_flow_log(
        meta_dir,
        "think:connect",
        f"{args.from_id} --{args.kind}--> {args.to_id}",
    )
    author = identity.resolve(args.agent_id)
    commit_hash = commit(
        config.repo_path,
        [node.path, graph_path, flow_path],
        f"think: connect {args.from_id} --{args.kind}--> {args.to_id}",
        author=author,
    )

    result = {
        "from": args.from_id,
        "to": args.to_id,
        "kind": args.kind,
        "commit": commit_hash,
        "deduplicated": False,
    }
    if args.idempotency_key:
        idempotency.record(meta_dir, args.idempotency_key, result)
    output.emit(result)
    return 0


def cmd_list(args: argparse.Namespace, config: Config) -> int:
    items = list_nodes("thought", config, space=args.space)
    if args.status:
        items = [n for n in items if n.extra.get("status") == args.status]
    if args.orphan:
        items = [n for n in items if not n.edges]
    items = items[: args.limit]
    output.emit_list([frontmatter.to_summary(n) for n in items])
    return 0


def cmd_show(args: argparse.Namespace, config: Config) -> int:
    node = read_node(args.id, config)
    if node is None:
        output.emit_error(f"thought not found: {args.id}", code="not_found")
        return 2
    output.emit(frontmatter.to_detail(node))
    return 0


def cmd_update(args: argparse.Namespace, config: Config) -> int:
    node = read_node(args.id, config)
    if node is None:
        output.emit_error(f"thought not found: {args.id}", code="not_found")
        return 2

    fm = _node_to_frontmatter(node)
    body = node.body

    if args.title:
        # Replace the first `# ...` line in the body.
        lines = body.split("\n")
        for i, line in enumerate(lines):
            if line.startswith("# "):
                lines[i] = f"# {args.title}"
                break
        else:
            lines = [f"# {args.title}", "", *lines]
        body = "\n".join(lines)

    if args.status:
        fm["status"] = args.status

    if args.spaces:
        valid = {s.id for s in config.spaces}
        bad = [s for s in args.spaces if s not in valid]
        if bad:
            output.emit_error(
                f"unknown space(s): {bad} (valid: {sorted(valid)})",
                code="usage",
            )
            return 1
        fm["spaces"] = args.spaces

    tags = list(fm.get("tags", []) or [])
    for t in args.add_tags:
        if t not in tags:
            tags.append(t)
    for t in args.remove_tags:
        if t in tags:
            tags.remove(t)
    fm["tags"] = tags
    fm["updated"] = datetime.now(timezone.utc).isoformat()

    frontmatter.write(node.path, fm, body)

    graph_data = rebuild(config)
    graph_path = write_index(config, graph_data)
    meta_dir = config.resolve_path(config.paths.meta)
    flow_path = append_flow_log(meta_dir, "think:update", f"Updated {args.id}")
    author = identity.resolve(args.agent_id)
    commit_hash = commit(
        config.repo_path,
        [node.path, graph_path, flow_path],
        f"think: update {args.id}",
        author=author,
    )

    output.emit({
        "id": args.id,
        "path": str(node.path.relative_to(config.repo_path)),
        "commit": commit_hash,
    })
    return 0


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _node_to_frontmatter(node: frontmatter.Node) -> dict[str, Any]:
    """Reconstruct a frontmatter dict from a Node, ready to write."""
    fm: dict[str, Any] = {
        "id": node.id,
        "type": node.type,
    }
    if node.spaces:
        fm["spaces"] = node.spaces
    if node.created:
        fm["created"] = node.created.isoformat()
    if node.updated:
        fm["updated"] = node.updated.isoformat()
    if node.edges:
        fm["edges"] = [
            {"to": e.to, "kind": e.kind, **({"note": e.note} if e.note else {})}
            for e in node.edges
        ]
    if node.tags:
        fm["tags"] = node.tags
    fm.update(node.extra)
    return fm
