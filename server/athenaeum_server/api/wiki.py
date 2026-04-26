from fastapi import APIRouter, HTTPException, Request

from athenaeum_server.lib import frontmatter
from athenaeum_server.lib.nodes import list_nodes, read_node

router = APIRouter(prefix="/api/wiki", tags=["wiki"])


@router.get("")
def list_wiki(request: Request):
    config = request.app.state.config
    items = list_nodes("wiki", config)
    # Group by section
    sections: dict[str, list] = {}
    for n in items:
        section = n.extra.get("section", "uncategorized")
        summary = frontmatter.to_summary(n)
        summary["section"] = section
        sections.setdefault(section, []).append(summary)
    return sections


@router.get("/{node_id}")
def get_wiki_article(node_id: str, request: Request):
    config = request.app.state.config
    node = read_node(node_id, config)
    if node is None:
        raise HTTPException(404, f"Wiki article {node_id} not found")
    return frontmatter.to_detail(node)
