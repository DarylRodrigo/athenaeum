import re
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from athenaeum_server.lib import frontmatter
from athenaeum_server.lib.git_ops import commit
from athenaeum_server.lib.nodes import list_nodes, read_node

router = APIRouter(prefix="/api/projects", tags=["projects"])


def _parse_journal(journal_path: Path) -> list[dict]:
    """Parse journal.md into a list of entries."""
    if not journal_path.exists():
        return []
    text = journal_path.read_text(encoding="utf-8")
    entries = []
    # Split on ## date headers
    parts = re.split(r"(?=^## \d{4}-\d{2}-\d{2})", text, flags=re.MULTILINE)
    for part in parts:
        part = part.strip()
        if not part:
            continue
        lines = part.split("\n")
        header = lines[0].lstrip("# ").strip()
        body = "\n".join(lines[1:]).strip()
        # Extract date and day from header like "2026-04-24 — THU"
        date_match = re.match(r"(\d{4}-\d{2}-\d{2})\s*[—–-]\s*(\w+)", header)
        if date_match:
            entries.append({
                "date": date_match.group(1),
                "day": date_match.group(2),
                "body": body,
            })
    return entries


def _parse_tasks(tasks_path: Path) -> list[dict]:
    """Parse tasks.md into a list of task dicts."""
    if not tasks_path.exists():
        return []
    text = tasks_path.read_text(encoding="utf-8")
    tasks = []
    for line in text.split("\n"):
        line = line.strip()
        task_match = re.match(r"- \[([ xX])\] (.+)", line)
        if task_match:
            done = task_match.group(1).lower() == "x"
            rest = task_match.group(2)
            # Try to extract due/done date
            due_match = re.search(r"\((?:due|done):\s*(.+?)\)", rest)
            title = re.sub(r"\s*\((?:due|done):\s*.+?\)", "", rest).strip()
            tasks.append({
                "title": title,
                "done": done,
                "when": due_match.group(1) if due_match else None,
            })
    return tasks


@router.get("")
def list_projects(request: Request):
    config = request.app.state.config
    items = list_nodes("project", config)
    return [frontmatter.to_summary(n) for n in items]


@router.get("/{node_id}")
def get_project(node_id: str, request: Request):
    config = request.app.state.config
    node = read_node(node_id, config)
    if node is None:
        raise HTTPException(404, f"Project {node_id} not found")

    detail = frontmatter.to_detail(node)

    # Add journal and tasks from sibling files
    project_dir = node.path.parent
    detail["journal"] = _parse_journal(project_dir / "journal.md")
    detail["tasks"] = _parse_tasks(project_dir / "tasks.md")

    return detail


class JournalEntryRequest(BaseModel):
    title: str
    body: str
    date: str | None = None


@router.post("/{node_id}/journal", status_code=201)
def append_journal_entry(node_id: str, req: JournalEntryRequest, request: Request):
    config = request.app.state.config
    node = read_node(node_id, config)
    if node is None:
        raise HTTPException(404, f"Project {node_id} not found")

    project_dir = node.path.parent
    journal_path = project_dir / "journal.md"

    now = datetime.now(timezone.utc)
    date_str = req.date or now.strftime("%Y-%m-%d")
    day_str = now.strftime("%a").upper()

    entry = f"\n\n## {date_str} — {day_str}\n\n### {req.title}\n\n{req.body}"

    # Prepend new entry after any existing content
    existing = journal_path.read_text(encoding="utf-8") if journal_path.exists() else ""
    journal_path.write_text(entry.strip() + "\n\n" + existing, encoding="utf-8")

    commit_hash = commit(config.repo_path, [journal_path], f"journal: {node_id} entry {date_str}")

    return {"project": node_id, "date": date_str, "commit": commit_hash}
