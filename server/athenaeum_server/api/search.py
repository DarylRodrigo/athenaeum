import subprocess

from fastapi import APIRouter, Query, Request

from athenaeum_server.lib import frontmatter

router = APIRouter(prefix="/api/search", tags=["search"])


@router.get("")
def search(request: Request, q: str = Query(..., min_length=1)):
    config = request.app.state.config
    kb_path = config.resolve_path(config.paths.knowledge_db)

    try:
        result = subprocess.run(
            ["git", "grep", "-i", "-l", q, "--", str(kb_path)],
            capture_output=True,
            text=True,
            cwd=config.repo_path,
            timeout=5,
        )
    except (subprocess.TimeoutExpired, FileNotFoundError):
        return []

    if result.returncode != 0:
        return []

    matches = []
    for line in result.stdout.strip().split("\n"):
        if not line:
            continue
        path = config.repo_path / line
        if not path.exists() or not path.suffix == ".md":
            continue
        try:
            node = frontmatter.read(path)
            matches.append(frontmatter.to_summary(node))
        except Exception:
            continue

        if len(matches) >= 20:
            break

    return matches
