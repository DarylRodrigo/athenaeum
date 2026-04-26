from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from athenaeum_server.lib import frontmatter
from athenaeum_server.lib.git_ops import commit
from athenaeum_server.lib.nodes import read_node, resolve_path

router = APIRouter(prefix="/api/nodes", tags=["nodes"])


class NodeUpdateRequest(BaseModel):
    frontmatter: dict
    body: str


@router.put("/{node_id}")
def update_node(node_id: str, req: NodeUpdateRequest, request: Request):
    config = request.app.state.config

    path = resolve_path(node_id, config)
    if path is None:
        raise HTTPException(404, f"Node {node_id} not found")

    # Validate edge kinds
    allowed_kinds = set(config.llm.edge_kinds)
    edges = req.frontmatter.get("edges", [])
    for edge in edges:
        if isinstance(edge, dict) and edge.get("kind") not in allowed_kinds:
            raise HTTPException(422, f"Unknown edge kind: {edge.get('kind')}")

    # Ensure updated timestamp
    fm = dict(req.frontmatter)
    fm["updated"] = datetime.now(timezone.utc).isoformat()

    frontmatter.write(path, fm, req.body)
    commit_hash = commit(config.repo_path, [path], f"update: {node_id}")

    node = frontmatter.read(path)
    detail = frontmatter.to_detail(node)
    detail["commit"] = commit_hash
    return detail
