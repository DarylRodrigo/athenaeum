"""Git operations: commit, push, tag, last commit info."""

from __future__ import annotations

import logging
from dataclasses import dataclass
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
    """Stage *paths* and commit. Returns the commit hash."""
    repo = Repo(repo_path)
    # Make paths relative to repo root
    rel_paths = []
    for p in paths:
        try:
            rel = p.relative_to(repo_path)
        except ValueError:
            rel = p
        rel_paths.append(str(rel))

    repo.index.add(rel_paths)
    actor = author.actor()
    c = repo.index.commit(message, author=actor, committer=actor)
    logger.info("Committed %s: %s (%d files)", c.hexsha[:7], message, len(rel_paths))
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
