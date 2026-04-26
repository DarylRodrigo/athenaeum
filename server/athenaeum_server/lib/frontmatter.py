"""Read and write Markdown files with YAML frontmatter.

Uses the ``python-frontmatter`` library to parse/dump.  Node metadata is
represented as a :class:`Node` dataclass so the rest of the codebase never
has to touch raw dicts.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any

import frontmatter as fm


# ---------------------------------------------------------------------------
# Dataclasses
# ---------------------------------------------------------------------------

@dataclass
class Edge:
    """A directed edge from one node to another."""

    to: str
    kind: str
    note: str | None = None


@dataclass
class Node:
    """In-memory representation of a knowledge-db markdown file."""

    id: str
    type: str
    path: Path
    spaces: list[str] = field(default_factory=list)
    created: datetime | None = None
    updated: datetime | None = None
    edges: list[Edge] = field(default_factory=list)
    tags: list[str] = field(default_factory=list)
    body: str = ""
    extra: dict[str, Any] = field(default_factory=dict)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_HEADING_RE = re.compile(r"^#\s+(.+)", re.MULTILINE)


def _extract_title(body: str, fallback: str) -> str:
    """Return the text of the first ``# `` heading in *body*, or *fallback*."""
    m = _HEADING_RE.search(body)
    return m.group(1).strip() if m else fallback


def _parse_edges(raw: list[dict[str, Any]] | None) -> list[Edge]:
    if not raw:
        return []
    edges: list[Edge] = []
    for item in raw:
        if isinstance(item, dict):
            edges.append(Edge(
                to=item.get("to", ""),
                kind=item.get("kind", "relates_to"),
                note=item.get("note"),
            ))
    return edges


# Common frontmatter keys that map directly to Node fields.
_NODE_KEYS = {"id", "type", "spaces", "created", "updated", "edges", "tags"}


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def read(path: Path) -> Node:
    """Parse a Markdown file at *path* and return a :class:`Node`.

    YAML frontmatter fields that correspond to :class:`Node` attributes are
    extracted; everything else goes into ``Node.extra``.
    """
    post = fm.load(path)
    meta: dict[str, Any] = dict(post.metadata)

    # Pull standard fields out of meta, leaving the rest in extra.
    node_id: str = meta.pop("id", path.stem)
    node_type: str = meta.pop("type", "")
    spaces: list[str] = meta.pop("spaces", [])
    created = meta.pop("created", None)
    updated = meta.pop("updated", None)
    raw_edges = meta.pop("edges", None)
    tags: list[str] = meta.pop("tags", [])

    # Ensure datetime objects (YAML may parse dates automatically).
    if isinstance(created, str):
        created = datetime.fromisoformat(created)
    if isinstance(updated, str):
        updated = datetime.fromisoformat(updated)

    edges = _parse_edges(raw_edges)

    return Node(
        id=node_id,
        type=node_type,
        path=path,
        spaces=spaces if isinstance(spaces, list) else [spaces],
        created=created,
        updated=updated,
        edges=edges,
        tags=tags if isinstance(tags, list) else [tags],
        body=post.content,
        extra=meta,  # whatever is left
    )


def write(path: Path, front: dict[str, Any], body: str) -> None:
    """Write a Markdown file with YAML frontmatter to *path*.

    Creates parent directories if they do not exist.  Ensures a trailing
    newline so ``git diff`` stays clean.
    """
    path.parent.mkdir(parents=True, exist_ok=True)
    post = fm.Post(body, **front)
    text = fm.dumps(post)
    if not text.endswith("\n"):
        text += "\n"
    path.write_text(text, encoding="utf-8")


def to_summary(node: Node) -> dict[str, Any]:
    """Lightweight dict for list endpoints."""
    title = _extract_title(node.body, node.id)
    return {
        "id": node.id,
        "type": node.type,
        "title": title,
        "spaces": node.spaces,
        "created": node.created.isoformat() if node.created else None,
        "updated": node.updated.isoformat() if node.updated else None,
        "edge_count": len(node.edges),
        "tags": node.tags,
    }


def to_detail(node: Node) -> dict[str, Any]:
    """Full dict for detail endpoints."""
    title = _extract_title(node.body, node.id)
    detail: dict[str, Any] = {
        "id": node.id,
        "type": node.type,
        "title": title,
        "spaces": node.spaces,
        "created": node.created.isoformat() if node.created else None,
        "updated": node.updated.isoformat() if node.updated else None,
        "edges": [
            {"to": e.to, "kind": e.kind, **({"note": e.note} if e.note else {})}
            for e in node.edges
        ],
        "tags": node.tags,
        "body": node.body,
    }
    # Flatten extra fields into the top level.
    detail.update(node.extra)
    return detail
