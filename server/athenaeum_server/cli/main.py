"""Top-level CLI dispatcher.

Usage shape (see docs/system-design/004_cli_design.md):

    ath capture [--body TEXT] [--source SRC] ...
    ath inbox list|show|archive|route ...
    ath think new|connect|list|show|update ...

Global flags:
    --text          Human-readable output instead of JSON.
    --repo PATH     Override repo path (else $ATHENAEUM_REPO_PATH or pwd-walk).
    --agent-id ID   Identity for the commit author.
"""

from __future__ import annotations

import argparse
import os
import sys
import traceback
from pathlib import Path

from athenaeum_server.cli import capture, inbox, output, think
from athenaeum_server.config import Config, load_config


def _resolve_repo_path(explicit: str | None) -> Path | None:
    """Walk up from $PWD looking for athenaeum.config.yaml. Honors --repo / env."""
    if explicit:
        return Path(explicit).resolve()
    env = os.environ.get("ATHENAEUM_REPO_PATH")
    if env:
        return Path(env).resolve()

    current = Path.cwd()
    for parent in [current, *current.parents]:
        if (parent / "athenaeum.config.yaml").exists():
            return parent
    return None


def cli() -> None:
    parser = argparse.ArgumentParser(
        prog="ath",
        description="Athenaeum CLI — write to the knowledge-db from agents and scripts.",
    )
    parser.add_argument("--text", action="store_true", help="Human-readable output")
    parser.add_argument("--repo", help="Repo path (overrides $ATHENAEUM_REPO_PATH)")
    parser.add_argument("--agent-id", help="Commit author identity (default: Athenaeum Bot)")
    parser.add_argument("--debug", action="store_true", help="Print stack traces on error")

    subparsers = parser.add_subparsers(dest="command", required=True, metavar="COMMAND")
    capture.add_parser(subparsers)
    inbox.add_parser(subparsers)
    think.add_parser(subparsers)

    args = parser.parse_args()

    output.set_text_mode(args.text)

    repo_path = _resolve_repo_path(args.repo)
    if repo_path is None:
        output.emit_error(
            "no athenaeum.config.yaml found; set --repo or $ATHENAEUM_REPO_PATH",
            code="config_not_found",
        )
        sys.exit(2)

    # Load config with the resolved repo path.
    os.environ["ATHENAEUM_REPO_PATH"] = str(repo_path)
    try:
        config: Config = load_config()
    except Exception as e:
        output.emit_error(f"failed to load config: {e}", code="config_load_failed")
        sys.exit(2)

    try:
        exit_code = args.func(args, config)
    except SystemExit:
        raise
    except Exception as e:
        if args.debug:
            traceback.print_exc(file=sys.stderr)
        output.emit_error(str(e), code="unhandled")
        sys.exit(2)

    sys.exit(exit_code or 0)


if __name__ == "__main__":
    cli()
