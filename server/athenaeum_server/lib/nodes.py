"""High-level helpers for resolving, listing, reading, and writing nodes.

Every function accepts a :class:`~athenaeum_server.config.Config` so callers
never need to construct paths themselves.
"""

from __future__ import annotations

import logging
from pathlib import Path

from athenaeum_server.config import Config
from athenaeum_server.lib import frontmatter
from athenaeum_server.lib.ids import TYPE_FROM_PREFIX, parse_id

logger = logging.getLogger(__name__)

# Maps a node-type prefix to the *config.paths* attribute that holds its base
# directory, plus an optional sub-directory within that base.
_PREFIX_TO_DIR: dict[str, str] = {
    "t": "thinking",
    "s": "sources",
    "i": "inbox",
    "w": "wiki",
    "p": "projects",
    "m": "thinking",  # meta-ideas live under thinking/meta/
}


# ---------------------------------------------------------------------------
# Path resolution
# ---------------------------------------------------------------------------

def resolve_path(node_id: str, config: Config) -> Path | None:
    """Find the markdown file for *node_id* on disk, or return ``None``.

    For most types, the convention is ``<base>/**/{node_id}.md``.
    For projects (``p-…``), the convention is ``<base>/{slug}/README.md``.
    For meta-ideas (``m-…``), search under ``<base>/meta/``.
    """
    prefix, slug = parse_id(node_id)
    dir_attr = _PREFIX_TO_DIR.get(prefix)
    if dir_attr is None:
        return None

    base = config.resolve_path(getattr(config.paths, dir_attr))

    # Meta-ideas are nested under thinking/meta/
    if prefix == "m":
        base = base / "meta"

    if prefix == "p":
        # Projects use README.md inside a directory named after the slug.
        for match in base.rglob("README.md"):
            if match.parent.name == slug or match.parent.name == node_id:
                return match
        return None

    # General case: find {node_id}.md anywhere under base.
    for match in base.rglob(f"{node_id}.md"):
        return match

    return None


# ---------------------------------------------------------------------------
# Listing
# ---------------------------------------------------------------------------

def _walk_md_files(directory: Path) -> list[Path]:
    """Return all ``.md`` files under *directory*, non-recursively safe."""
    if not directory.is_dir():
        return []
    return sorted(directory.rglob("*.md"))


def list_nodes(
    node_type: str,
    config: Config,
    space: str | None = None,
    kind_filter: str | None = None,
) -> list[frontmatter.Node]:
    """List and parse every node of *node_type*.

    *space* narrows thoughts to a specific space sub-directory.
    *kind_filter* narrows sources to a sub-directory (e.g. ``"papers"``).
    """
    nodes: list[frontmatter.Node] = []

    if node_type == "thought":
        base = config.resolve_path(config.paths.thinking)
        if space:
            base = base / space
    elif node_type == "source":
        base = config.resolve_path(config.paths.sources)
        if kind_filter:
            base = base / kind_filter
    elif node_type == "wiki":
        base = config.resolve_path(config.paths.wiki)
    elif node_type == "inbox":
        base = config.resolve_path(config.paths.inbox)
    elif node_type == "project":
        base = config.resolve_path(config.paths.projects)
    elif node_type == "meta-idea":
        base = config.resolve_path(config.paths.thinking) / "meta"
    else:
        logger.warning("Unknown node_type %r", node_type)
        return []

    md_files = _walk_md_files(base)

    for path in md_files:
        # For projects, only consider README.md files.
        if node_type == "project" and path.name != "README.md":
            continue

        try:
            node = frontmatter.read(path)
            # When listing thoughts, skip meta-ideas (they have their own type)
            if node_type == "thought" and node.type == "meta-idea":
                continue
            nodes.append(node)
        except Exception:
            logger.warning("Failed to parse %s, skipping", path, exc_info=True)

    # Sort by created date descending (nodes without dates go to the end).
    nodes.sort(
        key=lambda n: n.created if n.created else frontmatter.datetime.min,
        reverse=True,
    )
    return nodes


# ---------------------------------------------------------------------------
# Single-node read / write
# ---------------------------------------------------------------------------

def read_node(node_id: str, config: Config) -> frontmatter.Node | None:
    """Resolve and read a single node, or return ``None`` if not found."""
    path = resolve_path(node_id, config)
    if path is None:
        return None
    try:
        return frontmatter.read(path)
    except Exception:
        logger.warning("Failed to read node %s at %s", node_id, path, exc_info=True)
        return None


def write_node(node: frontmatter.Node, config: Config) -> Path:
    """Persist *node* to disk at ``node.path``, returning the path written."""
    front: dict = {
        "id": node.id,
        "type": node.type,
    }
    if node.spaces:
        front["spaces"] = node.spaces
    if node.created:
        front["created"] = node.created.isoformat()
    if node.updated:
        front["updated"] = node.updated.isoformat()
    if node.edges:
        front["edges"] = [
            {"to": e.to, "kind": e.kind, **({"note": e.note} if e.note else {})}
            for e in node.edges
        ]
    if node.tags:
        front["tags"] = node.tags

    # Merge type-specific extra fields into frontmatter.
    front.update(node.extra)

    frontmatter.write(node.path, front, node.body)
    return node.path
