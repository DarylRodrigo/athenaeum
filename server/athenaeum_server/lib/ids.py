"""Type-prefix constants and ID utilities for Athenaeum nodes."""

from __future__ import annotations

import re

PREFIXES: dict[str, str] = {
    "thought": "t",
    "source": "s",
    "meta-idea": "m",
    "wiki": "w",
    "inbox": "i",
    "project": "p",
    "task": "k",
}

TYPE_FROM_PREFIX: dict[str, str] = {v: k for k, v in PREFIXES.items()}


def slugify(text: str) -> str:
    """Convert *text* to a kebab-case slug (lowercase, alphanumeric + hyphens).

    Strips leading/trailing whitespace, lowercases, replaces non-alphanumeric
    characters with hyphens, collapses consecutive hyphens, and strips leading
    and trailing hyphens.
    """
    text = text.strip().lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    text = text.strip("-")
    return text


def make_id(node_type: str, slug: str) -> str:
    """Build a canonical node ID like ``t-rlhf-reward-hacking``.

    *node_type* must be a key of :data:`PREFIXES` (e.g. ``"thought"``).
    *slug* should already be slugified; if not, it will be slugified here.
    """
    prefix = PREFIXES[node_type]
    slug = slugify(slug)
    return f"{prefix}-{slug}"


def parse_id(id_str: str) -> tuple[str, str]:
    """Split an ID string into ``(prefix, slug)``.

    >>> parse_id("t-rlhf-reward-hacking")
    ('t', 'rlhf-reward-hacking')
    """
    prefix, _, slug = id_str.partition("-")
    return prefix, slug


def type_from_prefix(prefix: str) -> str:
    """Return the node type name for *prefix*.

    Raises :class:`KeyError` if the prefix is unknown.
    """
    return TYPE_FROM_PREFIX[prefix]
