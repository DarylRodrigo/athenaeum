from fastapi import APIRouter, Request

from athenaeum_server.lib.git_ops import get_last_commit
from athenaeum_server.lib.nodes import list_nodes

router = APIRouter(prefix="/api/status", tags=["status"])


@router.get("")
def get_status(request: Request):
    config = request.app.state.config
    return {
        "counts": {
            "inbox": len(list_nodes("inbox", config)),
            "thinking": len(list_nodes("thought", config)),
            "sources": len(list_nodes("source", config)),
            "wiki": len(list_nodes("wiki", config)),
            "projects": len(list_nodes("project", config)),
        },
        "last_commit": get_last_commit(config.repo_path),
    }
