"""Debounced git push: schedules a push N seconds after the last commit."""

from __future__ import annotations

import logging
import threading
from pathlib import Path

from athenaeum_server.lib.git_ops import push

logger = logging.getLogger(__name__)


class PushDebouncer:
    def __init__(self, repo_path: Path, delay_seconds: int = 300,
                 remote: str = "origin", branch: str = "main"):
        self.repo_path = repo_path
        self.delay = delay_seconds
        self.remote = remote
        self.branch = branch
        self._timer: threading.Timer | None = None
        self._pending = False
        self._lock = threading.Lock()

    def schedule(self) -> None:
        """Schedule a push. If one is already pending, reset the timer."""
        with self._lock:
            self._pending = True
            if self._timer is not None:
                self._timer.cancel()
            self._timer = threading.Timer(self.delay, self._do_push)
            self._timer.daemon = True
            self._timer.start()

    def flush(self) -> None:
        """Push immediately if there are pending changes."""
        with self._lock:
            if self._timer is not None:
                self._timer.cancel()
                self._timer = None
            if self._pending:
                self._do_push()

    def _do_push(self) -> None:
        try:
            push(self.repo_path, self.remote, self.branch)
            self._pending = False
            logger.info("Debounced push completed")
        except Exception:
            logger.warning("Debounced push failed", exc_info=True)
