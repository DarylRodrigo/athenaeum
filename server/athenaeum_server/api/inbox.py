import shutil
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from athenaeum_server.lib import frontmatter
from athenaeum_server.lib.git_ops import commit
from athenaeum_server.lib.nodes import list_nodes, read_node, resolve_path

router = APIRouter(prefix="/api/inbox", tags=["inbox"])


class CaptureRequest(BaseModel):
    source: str
    kind: str
    body: str
    raw_url: str | None = None
    captured_at: str | None = None
    meta: dict | None = None


@router.get("")
def list_inbox(request: Request):
    config = request.app.state.config
    items = list_nodes("inbox", config)
    return [frontmatter.to_summary(n) for n in items]


@router.get("/{node_id}")
def get_inbox_item(node_id: str, request: Request):
    config = request.app.state.config
    node = read_node(node_id, config)
    if node is None:
        raise HTTPException(404, f"Inbox item {node_id} not found")
    return frontmatter.to_detail(node)


@router.post("", status_code=201)
def capture(req: CaptureRequest, request: Request):
    config = request.app.state.config
    now = datetime.now(timezone.utc)
    captured = datetime.fromisoformat(req.captured_at) if req.captured_at else now
    time_str = captured.strftime("%H%M%S")
    date_path = captured.strftime("%Y/%m/%d")

    node_id = f"i-{time_str}-{req.source}"
    filename = f"{time_str}_{req.source}.md"
    file_path = config.resolve_path(config.paths.inbox) / date_path / filename

    fm: dict = {
        "id": node_id,
        "type": "inbox",
        "source": req.source,
        "captured_at": captured.isoformat(),
        "created": captured.isoformat(),
        "spaces": [],
        "edges": [],
        "tags": [],
    }
    if req.raw_url:
        fm["raw_url"] = req.raw_url

    body = f"# {req.body.split(chr(10))[0][:80]}\n\n{req.body}"
    if req.meta:
        meta_str = " · ".join(f"{k}: {v}" for k, v in req.meta.items())
        body += f"\n\n*{meta_str}*"

    frontmatter.write(file_path, fm, body)
    commit_hash = commit(config.repo_path, [file_path], f"inbox: capture from {req.source}")

    return {"id": node_id, "path": str(file_path.relative_to(config.repo_path)), "commit": commit_hash}


@router.delete("/{node_id}")
def archive_inbox_item(node_id: str, request: Request):
    config = request.app.state.config
    path = resolve_path(node_id, config)
    if path is None:
        raise HTTPException(404, f"Inbox item {node_id} not found")

    archive_dir = config.resolve_path(config.paths.inbox) / "_archive"
    archive_dir.mkdir(parents=True, exist_ok=True)
    dest = archive_dir / path.name
    shutil.move(str(path), str(dest))

    commit(config.repo_path, [dest], f"inbox: archived {node_id}")
    return {"id": node_id, "archived": True}
