from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from athenaeum_server.lib import frontmatter
from athenaeum_server.lib.git_ops import append_flow_log, commit
from athenaeum_server.lib.graph import rebuild, write_index
from athenaeum_server.lib.nodes import resolve_path

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

    graph_data = rebuild(config)
    graph_path = write_index(config, graph_data)
    meta_dir = config.resolve_path(config.paths.meta)
    flow_path = append_flow_log(meta_dir, "update", f"Updated {node_id}")
    commit_hash = commit(config.repo_path, [path, graph_path, flow_path], f"update: {node_id}")

    if hasattr(request.app.state, "push_debouncer"):
        request.app.state.push_debouncer.schedule()

    node = frontmatter.read(path)
    detail = frontmatter.to_detail(node)
    detail["commit"] = commit_hash
    return detail
