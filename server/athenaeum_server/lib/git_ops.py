"""Git operations: commit, push, tag, last commit info."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

from git import Actor, Repo

logger = logging.getLogger(__name__)


@dataclass
class Identity:
    name: str
    email: str

    def actor(self) -> Actor:
        return Actor(self.name, self.email)


BOT = Identity(name="Athenaeum Bot", email="bot@athenaeum.local")


def commit(
    repo_path: Path,
    paths: list[Path],
    message: str,
    author: Identity = BOT,
) -> str:
    """Stage *paths* and commit. Returns the commit hash.

    Paths that exist on disk are added (created or modified). Paths that have
    been deleted on disk are staged as removals.
    """
    repo = Repo(repo_path)
    to_add: list[str] = []
    to_remove: list[str] = []
    for p in paths:
        try:
            rel = str(p.relative_to(repo_path))
        except ValueError:
            rel = str(p)
        if p.exists():
            to_add.append(rel)
        else:
            to_remove.append(rel)

    if to_add:
        repo.index.add(to_add)
    if to_remove:
        # working_tree=False: the file is already gone from disk; just untrack.
        repo.index.remove(to_remove, working_tree=False)

    actor = author.actor()
    c = repo.index.commit(message, author=actor, committer=actor)
    logger.info(
        "Committed %s: %s (+%d -%d)",
        c.hexsha[:7], message, len(to_add), len(to_remove),
    )
    return c.hexsha


def push(repo_path: Path, remote: str = "origin", branch: str = "main") -> None:
    """Push to remote. Logs errors but does not raise."""
    try:
        repo = Repo(repo_path)
        repo.remotes[remote].push(branch)
        logger.info("Pushed to %s/%s", remote, branch)
    except Exception:
        logger.warning("Push failed", exc_info=True)


def get_last_commit(repo_path: Path) -> dict | None:
    """Return info about the latest commit, or None."""
    try:
        repo = Repo(repo_path)
        c = repo.head.commit
        return {
            "hash": c.hexsha[:7],
            "message": c.message.strip(),
            "author": str(c.author),
            "at": c.committed_datetime.isoformat(),
        }
    except Exception:
        return None


def append_flow_log(meta_dir: Path, event_type: str, message: str) -> Path:
    """Append a timestamped entry to flow-log.md. Returns the path."""
    flow_log = meta_dir / "flow-log.md"
    now = datetime.now(timezone.utc)
    date_str = now.strftime("%Y-%m-%d")
    time_str = now.strftime("%H:%M")

    entry_line = f"- **{time_str}** — {event_type}: {message}\n"

    if flow_log.exists():
        existing = flow_log.read_text(encoding="utf-8")
        # Check if today's date header exists
        if f"## {date_str}" not in existing:
            existing = f"## {date_str}\n\n{entry_line}\n{existing}"
        else:
            # Insert after the date header
            existing = existing.replace(
                f"## {date_str}\n",
                f"## {date_str}\n\n{entry_line}",
                1,
            )
        flow_log.write_text(existing, encoding="utf-8")
    else:
        flow_log.parent.mkdir(parents=True, exist_ok=True)
        flow_log.write_text(f"# Flow Log\n\n## {date_str}\n\n{entry_line}\n", encoding="utf-8")

    return flow_log
