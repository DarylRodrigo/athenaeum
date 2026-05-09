"""Resolve the git author identity for a CLI invocation."""

from __future__ import annotations

from athenaeum_server.lib.git_ops import BOT, Identity


def resolve(agent_id: str | None) -> Identity:
    """Return the git Identity to use for this invocation.

    Default: Athenaeum Bot. With --agent-id <name>, returns
    `<name> <name>@athenaeum.bot` so `git log --author=<name>` works.
    """
    if not agent_id:
        return BOT
    return Identity(name=agent_id, email=f"{agent_id}@athenaeum.bot")
