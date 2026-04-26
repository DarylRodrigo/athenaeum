from fastapi import APIRouter, HTTPException, Query, Request

from athenaeum_server.lib import frontmatter
from athenaeum_server.lib.nodes import list_nodes, read_node

router = APIRouter(prefix="/api/sources", tags=["sources"])


@router.get("")
def list_sources(request: Request, kind: str | None = Query(None)):
    config = request.app.state.config
    items = list_nodes("source", config, kind_filter=kind)
    return [frontmatter.to_summary(n) for n in items]


@router.get("/{node_id}")
def get_source(node_id: str, request: Request):
    config = request.app.state.config
    node = read_node(node_id, config)
    if node is None:
        raise HTTPException(404, f"Source {node_id} not found")
    return frontmatter.to_detail(node)
