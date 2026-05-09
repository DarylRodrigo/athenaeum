import json

from fastapi import APIRouter, Request

from athenaeum_server.lib.graph import rebuild, write_index

router = APIRouter(prefix="/api/graph", tags=["graph"])


@router.get("")
def get_graph(request: Request):
    config = request.app.state.config
    meta_dir = config.resolve_path(config.paths.meta)
    graph_path = meta_dir / "graph.json"
    if graph_path.exists():
        return json.loads(graph_path.read_text(encoding="utf-8"))
    # Rebuild on demand if missing
    graph = rebuild(config)
    write_index(config, graph)
    return graph
