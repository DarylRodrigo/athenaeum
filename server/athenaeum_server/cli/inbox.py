"""`ath inbox` — list, show, archive, route inbox items."""

from __future__ import annotations

import argparse
import shutil

from athenaeum_server.cli import identity, output
from athenaeum_server.config import Config
from athenaeum_server.lib import frontmatter
from athenaeum_server.lib.git_ops import append_flow_log, commit
from athenaeum_server.lib.graph import rebuild, write_index
from athenaeum_server.lib.nodes import list_nodes, read_node, resolve_path


def add_parser(subparsers: argparse._SubParsersAction) -> None:
    parent = subparsers.add_parser("inbox", help="Inbox operations")
    sub = parent.add_subparsers(dest="inbox_cmd", required=True, metavar="SUBCOMMAND")

    p_list = sub.add_parser("list", help="List inbox items")
    p_list.add_argument("--source", help="Filter by source")
    p_list.add_argument("--limit", type=int, default=50)
    p_list.set_defaults(func=cmd_list)

    p_show = sub.add_parser("show", help="Show an inbox item by id")
    p_show.add_argument("id")
    p_show.set_defaults(func=cmd_show)

    p_arch = sub.add_parser("archive", help="Move an inbox item to inbox/_archive/")
    p_arch.add_argument("id")
    p_arch.set_defaults(func=cmd_archive)

    p_route = sub.add_parser(
        "route",
        help="Manual triage: convert inbox item to a source under thinking/<space>/",
    )
    p_route.add_argument("id")
    p_route.add_argument("--to", dest="space", required=True, help="Destination space id")
    p_route.set_defaults(func=cmd_route)


def cmd_list(args: argparse.Namespace, config: Config) -> int:
    items = list_nodes("inbox", config)
    if args.source:
        items = [n for n in items if n.extra.get("source") == args.source]
    items = items[: args.limit]
    output.emit_list([frontmatter.to_summary(n) for n in items])
    return 0


def cmd_show(args: argparse.Namespace, config: Config) -> int:
    node = read_node(args.id, config)
    if node is None:
        output.emit_error(f"inbox item not found: {args.id}", code="not_found")
        return 2
    output.emit(frontmatter.to_detail(node))
    return 0


def cmd_archive(args: argparse.Namespace, config: Config) -> int:
    path = resolve_path(args.id, config)
    if path is None:
        output.emit_error(f"inbox item not found: {args.id}", code="not_found")
        return 2

    archive_dir = config.resolve_path(config.paths.inbox) / "_archive"
    archive_dir.mkdir(parents=True, exist_ok=True)
    dest = archive_dir / path.name
    shutil.move(str(path), str(dest))

    meta_dir = config.resolve_path(config.paths.meta)
    flow_path = append_flow_log(meta_dir, "archive", f"Archived {args.id}")
    author = identity.resolve(args.agent_id)
    commit_hash = commit(
        config.repo_path,
        [dest, flow_path],
        f"inbox: archived {args.id}",
        author=author,
    )

    output.emit({"id": args.id, "archived": True, "commit": commit_hash})
    return 0


def cmd_route(args: argparse.Namespace, config: Config) -> int:
    """Move inbox item to thinking/<space>/, change type to 'source'.

    This is the deterministic, manual-triage path. The LLM-driven `inbox triage`
    skill (Phase 1) does this for many items at once; until then, agents and
    humans use this for one item at a time.
    """
    node = read_node(args.id, config)
    if node is None:
        output.emit_error(f"inbox item not found: {args.id}", code="not_found")
        return 2

    valid_spaces = {s.id for s in config.spaces}
    if args.space not in valid_spaces:
        output.emit_error(
            f"unknown space: {args.space} (valid: {sorted(valid_spaces)})",
            code="usage",
        )
        return 1

    # Move to sources/notes/ as a source. The id changes from i- to s- to reflect promotion.
    old_path = node.path
    sources_dir = config.resolve_path(config.paths.sources) / "notes"
    sources_dir.mkdir(parents=True, exist_ok=True)
    new_id = "s-" + args.id[2:]  # strip "i-", prepend "s-"
    new_path = sources_dir / f"{new_id}.md"

    # Update frontmatter: type → source, add primary space.
    new_fm: dict = {
        "id": new_id,
        "type": "source",
        "kind": node.extra.get("kind", "note"),
        "spaces": [args.space],
        "created": node.created.isoformat() if node.created else None,
        "ingested_at": node.extra.get("captured_at"),
        "tags": node.tags,
        "edges": [{"to": e.to, "kind": e.kind} for e in node.edges],
    }
    if node.extra.get("raw_url"):
        new_fm["url"] = node.extra["raw_url"]
    new_fm = {k: v for k, v in new_fm.items() if v is not None}

    frontmatter.write(new_path, new_fm, node.body)
    old_path.unlink()  # remove the inbox file

    # Rebuild graph + flow-log + commit.
    graph_data = rebuild(config)
    graph_path = write_index(config, graph_data)
    meta_dir = config.resolve_path(config.paths.meta)
    flow_path = append_flow_log(
        meta_dir,
        "route",
        f"Routed {args.id} → {new_id} ({args.space})",
    )
    author = identity.resolve(args.agent_id)
    commit_hash = commit(
        config.repo_path,
        [old_path, new_path, graph_path, flow_path],
        f"inbox: route {args.id} → {args.space}",
        author=author,
    )

    output.emit({
        "from": args.id,
        "to": new_id,
        "space": args.space,
        "path": str(new_path.relative_to(config.repo_path)),
        "commit": commit_hash,
    })
    return 0
