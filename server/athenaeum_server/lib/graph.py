"""Build and write the graph index from frontmatter."""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from pathlib import Path

from athenaeum_server.config import Config
from athenaeum_server.lib import frontmatter

logger = logging.getLogger(__name__)


def rebuild(config: Config) -> dict:
    """Walk knowledge-db/, parse every .md file, and build graph.json."""
    nodes: dict[str, dict] = {}
    edges_by_kind: dict[str, list] = {}
    spaces: dict[str, list[str]] = {}
    orphans: list[str] = []

    kb_root = config.resolve_path(config.paths.knowledge_db)
    if not kb_root.is_dir():
        return _empty_graph()

    for md_path in kb_root.rglob("*.md"):
        # Skip meta files, archive, and non-node files
        rel = md_path.relative_to(kb_root)
        if rel.parts[0] == "meta" and md_path.name != "reading-list.md":
            continue
        if "_archive" in rel.parts:
            continue

        try:
            node = frontmatter.read(md_path)
        except Exception:
            logger.warning("Failed to parse %s, skipping", md_path, exc_info=True)
            continue

        # Skip files without a proper id/type
        if not node.id or not node.type:
            continue
        # Skip non-node files (journal, tasks, etc.)
        if node.type not in ("thought", "source", "meta-idea", "wiki", "inbox", "project", "meta"):
            continue

        title = frontmatter._extract_title(node.body, node.id)
        rel_path = str(md_path.relative_to(config.repo_path))

        outbound = [
            {"to": e.to, "kind": e.kind, **({"note": e.note} if e.note else {})}
            for e in node.edges
        ]

        nodes[node.id] = {
            "type": node.type,
            "spaces": node.spaces,
            "path": rel_path,
            "title": title,
            "created": node.created.isoformat() if node.created else None,
            "outbound": outbound,
            "inbound": [],  # filled in second pass
        }

        # Track spaces
        for sp in node.spaces:
            spaces.setdefault(sp, [])
            if node.id not in spaces[sp]:
                spaces[sp].append(node.id)

        # Track edges by kind
        for e in node.edges:
            edges_by_kind.setdefault(e.kind, [])
            edges_by_kind[e.kind].append([node.id, e.to])

    # Second pass: compute inbound edges
    for nid, ndata in nodes.items():
        for edge in ndata["outbound"]:
            target_id = edge["to"]
            if target_id in nodes:
                nodes[target_id]["inbound"].append(
                    {"from": nid, "kind": edge["kind"]}
                )

    # Orphan detection
    for nid, ndata in nodes.items():
        if not ndata["outbound"] and not ndata["inbound"]:
            orphans.append(nid)

    return {
        "version": 1,
        "rebuilt_at": datetime.now(timezone.utc).isoformat(),
        "nodes": nodes,
        "edges_by_kind": edges_by_kind,
        "spaces": spaces,
        "orphans": orphans,
    }


def write_index(config: Config, graph: dict) -> Path:
    """Write graph.json to knowledge-db/meta/."""
    meta_dir = config.resolve_path(config.paths.meta)
    meta_dir.mkdir(parents=True, exist_ok=True)
    index_path = meta_dir / "graph.json"
    index_path.write_text(json.dumps(graph, indent=2, ensure_ascii=False), encoding="utf-8")
    return index_path


def _empty_graph() -> dict:
    return {
        "version": 1,
        "rebuilt_at": datetime.now(timezone.utc).isoformat(),
        "nodes": {},
        "edges_by_kind": {},
        "spaces": {},
        "orphans": [],
    }
