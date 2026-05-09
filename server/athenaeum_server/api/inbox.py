import shutil
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from athenaeum_server.lib import frontmatter
from athenaeum_server.lib.git_ops import append_flow_log, commit
from athenaeum_server.lib.graph import rebuild, write_index
from athenaeum_server.lib.ids import slugify
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
    out = []
    for n in items:
        summary = frontmatter.to_summary(n)
        # Surface fields the dashboard needs in the list view.
        summary["source"] = n.extra.get("source")
        summary["raw_url"] = n.extra.get("raw_url")
        out.append(summary)
    return out


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

    # Rebuild graph, append flow log, commit together
    graph_data = rebuild(config)
    graph_path = write_index(config, graph_data)
    meta_dir = config.resolve_path(config.paths.meta)
    flow_path = append_flow_log(meta_dir, "capture", f"Captured from {req.source}")
    commit_hash = commit(config.repo_path, [file_path, graph_path, flow_path], f"inbox: capture from {req.source}")

    # Schedule push
    if hasattr(request.app.state, "push_debouncer"):
        request.app.state.push_debouncer.schedule()

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

    meta_dir = config.resolve_path(config.paths.meta)
    flow_path = append_flow_log(meta_dir, "archive", f"Archived {node_id}")
    commit_hash = commit(config.repo_path, [path, dest, flow_path], f"inbox: archived {node_id}")
    return {"id": node_id, "archived": True, "commit": commit_hash}


class RouteRequest(BaseModel):
    space: str


class DevelopConnection(BaseModel):
    to: str
    kind: str


class ThoughtSpec(BaseModel):
    space: str
    body: str
    connect_to: list[DevelopConnection] | None = None


class DevelopRequest(BaseModel):
    thoughts: list[ThoughtSpec]


@router.post("/{node_id}/develop")
def develop_inbox_item(node_id: str, req: DevelopRequest, request: Request):
    """Atomic: file inbox as source, create N thoughts from it, wire edges. One commit."""
    config = request.app.state.config

    inbox_node = read_node(node_id, config)
    if inbox_node is None:
        raise HTTPException(404, f"Inbox item {node_id} not found")

    if not req.thoughts:
        raise HTTPException(422, "at least one thought is required")

    valid_spaces = {s.id for s in config.spaces}
    allowed_kinds = set(config.llm.edge_kinds)

    # Validate every thought up front before writing anything.
    plans = []  # list of (title, rest, space, connect_to)
    seen_thought_ids: set[str] = set()
    for i, t in enumerate(req.thoughts):
        if t.space not in valid_spaces:
            raise HTTPException(422, f"thought {i}: unknown space: {t.space}")
        body_text = t.body.strip()
        if not body_text:
            raise HTTPException(422, f"thought {i}: body is empty")
        parts = body_text.split("\n", 1)
        title = parts[0].strip().lstrip("# ").strip()[:80]
        rest = parts[1].strip() if len(parts) > 1 else ""
        if not title:
            raise HTTPException(422, f"thought {i}: title (first line) is empty")

        thought_id = f"t-{slugify(title)}"
        if thought_id in seen_thought_ids:
            raise HTTPException(422, f"thought {i}: duplicate id {thought_id} (titles slugify identically)")
        seen_thought_ids.add(thought_id)

        if t.connect_to:
            for c in t.connect_to:
                if c.kind not in allowed_kinds:
                    raise HTTPException(422, f"thought {i}: unknown edge kind: {c.kind}")

        plans.append((thought_id, title, rest, t.space, t.connect_to or []))

    # Build the source first (shared by all thoughts).
    sources_dir = config.resolve_path(config.paths.sources) / "notes"
    sources_dir.mkdir(parents=True, exist_ok=True)
    source_id = "s-" + node_id[2:]
    source_path = sources_dir / f"{source_id}.md"

    source_fm: dict = {
        "id": source_id,
        "type": "source",
        "kind": inbox_node.extra.get("kind", "note"),
        # The source's primary space is the first thought's space (it can be referenced from any).
        "spaces": [plans[0][3]],
        "created": inbox_node.created.isoformat() if inbox_node.created else None,
        "ingested_at": inbox_node.extra.get("captured_at"),
        "tags": inbox_node.tags,
    }
    if inbox_node.extra.get("raw_url"):
        source_fm["url"] = inbox_node.extra["raw_url"]
    source_fm = {k: v for k, v in source_fm.items() if v is not None}
    frontmatter.write(source_path, source_fm, inbox_node.body)

    # Now write each thought. Roll back on conflict.
    written_paths = [source_path]
    thought_results = []
    now = datetime.now(timezone.utc).isoformat()

    for thought_id, title, rest, space, connect_to in plans:
        thought_dir = config.resolve_path(config.paths.thinking) / space
        thought_path = thought_dir / f"{thought_id}.md"

        if thought_path.exists():
            # Roll back everything we wrote in this call.
            for p in written_paths:
                if p.exists():
                    p.unlink()
            raise HTTPException(409, f"Thought {thought_id} already exists")

        edges: list[dict] = [{"to": source_id, "kind": "supported_by"}]
        for c in connect_to:
            edges.append({"to": c.to, "kind": c.kind})

        thought_fm = {
            "id": thought_id,
            "type": "thought",
            "status": "drafting",
            "spaces": [space],
            "created": now,
            "updated": now,
            "edges": edges,
            "tags": [],
        }
        thought_body = f"# {title}\n\n{rest}".rstrip() + "\n"
        frontmatter.write(thought_path, thought_fm, thought_body)
        written_paths.append(thought_path)
        thought_results.append({
            "id": thought_id,
            "space": space,
            "path": str(thought_path.relative_to(config.repo_path)),
        })

    # Remove the inbox file.
    inbox_path = inbox_node.path
    inbox_path.unlink()

    # Rebuild graph + flow log + commit.
    graph_data = rebuild(config)
    graph_path = write_index(config, graph_data)
    meta_dir = config.resolve_path(config.paths.meta)
    thought_ids = ", ".join(t["id"] for t in thought_results)
    flow_path = append_flow_log(
        meta_dir,
        "develop",
        f"Developed {node_id} → {len(plans)} thought(s): {thought_ids} (source: {source_id})",
    )
    commit_hash = commit(
        config.repo_path,
        [inbox_path, *written_paths, graph_path, flow_path],
        f"develop: {node_id} → {len(plans)} thought(s)",
    )

    if hasattr(request.app.state, "push_debouncer"):
        request.app.state.push_debouncer.schedule()

    return {
        "from_inbox": node_id,
        "source": source_id,
        "source_path": str(source_path.relative_to(config.repo_path)),
        "thoughts": thought_results,
        "commit": commit_hash,
    }


@router.post("/{node_id}/route")
def route_inbox_item(node_id: str, req: RouteRequest, request: Request):
    """Manual triage: convert an inbox item to a source under thinking/<space>/."""
    config = request.app.state.config
    node = read_node(node_id, config)
    if node is None:
        raise HTTPException(404, f"Inbox item {node_id} not found")

    valid_spaces = {s.id for s in config.spaces}
    if req.space not in valid_spaces:
        raise HTTPException(422, f"Unknown space: {req.space}")

    old_path = node.path
    sources_dir = config.resolve_path(config.paths.sources) / "notes"
    sources_dir.mkdir(parents=True, exist_ok=True)
    new_id = "s-" + node_id[2:]
    new_path = sources_dir / f"{new_id}.md"

    new_fm: dict = {
        "id": new_id,
        "type": "source",
        "kind": node.extra.get("kind", "note"),
        "spaces": [req.space],
        "created": node.created.isoformat() if node.created else None,
        "ingested_at": node.extra.get("captured_at"),
        "tags": node.tags,
        "edges": [{"to": e.to, "kind": e.kind} for e in node.edges],
    }
    if node.extra.get("raw_url"):
        new_fm["url"] = node.extra["raw_url"]
    new_fm = {k: v for k, v in new_fm.items() if v is not None}

    frontmatter.write(new_path, new_fm, node.body)
    old_path.unlink()

    graph_data = rebuild(config)
    graph_path = write_index(config, graph_data)
    meta_dir = config.resolve_path(config.paths.meta)
    flow_path = append_flow_log(meta_dir, "route", f"Routed {node_id} → {new_id} ({req.space})")
    commit_hash = commit(
        config.repo_path,
        [old_path, new_path, graph_path, flow_path],
        f"inbox: route {node_id} → {req.space}",
    )

    if hasattr(request.app.state, "push_debouncer"):
        request.app.state.push_debouncer.schedule()

    return {
        "from": node_id,
        "to": new_id,
        "space": req.space,
        "path": str(new_path.relative_to(config.repo_path)),
        "commit": commit_hash,
    }
