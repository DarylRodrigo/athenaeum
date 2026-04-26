# Athenaeum — MVP Server Design

The smallest server that turns the static prototype into a real, single-user system. **No LLM.** No skills, no Claude Code subprocess, no triage, no sparring. Just: serve the dashboard, serve the data in `knowledge-db/`, accept captures, commit changes to git, and push to GitHub.

This is the Phase 0 (and partially Phase 2's index rebuild) deliverable from the system-design spec (`001_system_design.md`). Once this ships, capture works end-to-end, the dashboard reflects the real repo, and the user can hand-edit thoughts via the UI. The LLM layer plugs in on top later.

---

## 1. What this MVP does

- **Serves `dashboard/`** as static files at `/`.
- **Reads `knowledge-db/`** through a small REST API at `/api/*`.
- **Accepts captures** at `POST /api/inbox` and writes a markdown file.
- **Accepts hand edits** to thoughts, sources, wiki articles, and project journals via `PUT /api/nodes/:id`.
- **Builds and serves `knowledge-db/meta/graph.json`** by parsing frontmatter — deterministic, no LLM.
- **Auto-commits** every write under the Athenaeum Bot identity.
- **Auto-pushes** to GitHub on a debounced timer.
- **Tags a daily snapshot** via a scheduled task.

## 2. What this MVP explicitly does not do

- Does not invoke Claude Code, OpenAI, or any LLM.
- Does not run skills (`server/skills/` will not yet exist as a meaningful directory).
- Does not propose edges, summarize sources, generate digests, or write wiki articles.
- Does not do triage suggestions. The inbox accumulates; the user routes manually for now.
- Does not provide chat / sparring endpoints. The sparring panel in the dashboard is hidden or shows an "LLM not connected" placeholder.
- Does not handle file uploads beyond plain-text capture (no images, audio, PDFs yet).
- Does not multi-user. Single bearer token, single user, single process.

The point of this scope is to ship a working knowledge tool *without* depending on the LLM integration. Once running, the system is already useful: capture, read, edit, search, version. Every later phase plugs in additively.

---

## 3. Stack

**Python 3.11+ with FastAPI**, served by uvicorn.

Why this and not the alternatives:

- **vs. Flask** — FastAPI gives type-checked request/response models for free, async file IO, and OpenAPI docs at `/api/docs`. Roughly the same line count, more correctness.
- **vs. Node + Express** — same-language-as-frontend is a real upside, but Python wins on YAML parsing, git tooling, and the existing skill ecosystem (when LLM phases land, Python's Anthropic SDK is the path of least resistance).
- **vs. Go / Rust** — overkill. The server is IO-bound, not CPU-bound, and ergonomics matter more than throughput for a single-user tool.

Dependencies (kept tight):

```
fastapi          # web framework
uvicorn          # ASGI server
pydantic         # request/response models (comes with FastAPI)
pyyaml           # frontmatter parsing
python-frontmatter   # convenience wrapper around pyyaml + markdown body
gitpython        # git operations (subprocess wrapper with sane API)
python-dotenv    # env loading from .env
```

That's it. No ORM, no auth library, no template engine, no message queue. The repo is the database.

---

## 4. Directory layout (`server/`)

```
server/
├── README.md                  # how to run it
├── pyproject.toml             # dependencies, entry points
├── .env.example               # template for env vars
│
├── athenaeum_server/
│   ├── __init__.py
│   ├── main.py                # FastAPI app, route registration
│   ├── config.py              # loads athenaeum.config.yaml + env
│   ├── auth.py                # bearer token middleware
│   │
│   ├── api/
│   │   ├── __init__.py
│   │   ├── inbox.py           # POST /api/inbox (capture), GET list, GET id
│   │   ├── nodes.py           # PUT /api/nodes/:id (generic node update)
│   │   ├── thinking.py        # GET thoughts list, GET thought
│   │   ├── sources.py         # GET sources list, GET source
│   │   ├── wiki.py            # GET wiki articles list, GET article
│   │   ├── projects.py        # GET projects, GET project, POST journal entry
│   │   ├── graph.py           # GET /api/graph
│   │   ├── spaces.py          # GET /api/spaces (from config)
│   │   └── status.py          # GET /api/status (counts, pending)
│   │
│   ├── lib/
│   │   ├── frontmatter.py     # parse / write frontmatter
│   │   ├── nodes.py           # node CRUD (resolve id → path, read, write)
│   │   ├── git_ops.py         # commit, push, tag, author identity
│   │   ├── graph.py           # rebuild graph.json from frontmatter
│   │   └── ids.py             # ID conventions, slugify, type prefixes
│   │
│   └── static.py              # mount dashboard/ as static files
│
├── scheduler/
│   ├── snapshot.sh            # daily snapshot tag (cron)
│   ├── push.sh                # debounced auto-push (called by app)
│   └── athenaeum-server.service   # systemd unit
│
└── tests/
    ├── test_capture.py
    ├── test_nodes.py
    ├── test_graph.py
    └── fixtures/
        └── sample-knowledge-db/
```

A small CLI command (`server/cli/athenaeum`) is referenced by the system-design spec for invocation by humans and (future) skills. For the MVP, the CLI can be a thin script that calls the same `lib/` modules — no need for a separate process model.

---

## 5. Configuration

Two layers: environment for secrets, YAML for everything else.

### Environment (`.env`)

```
ATHENAEUM_REPO_PATH=/path/to/athenaeum
ATHENAEUM_TOKEN=<a long random string>
ATHENAEUM_HOST=127.0.0.1
ATHENAEUM_PORT=7878
ATHENAEUM_PUSH_REMOTE=origin
ATHENAEUM_PUSH_BRANCH=main
GIT_AUTHOR_NAME=Athenaeum Bot
[email protected]
```

`ATHENAEUM_TOKEN` is the bearer token for write endpoints. Generate with `openssl rand -hex 32`. Bind by default to `127.0.0.1`; access from outside the host via SSH tunnel or Tailscale (see deployment).

### Repo config (`athenaeum.config.yaml`)

Already specified in `001_system_design.md` section 12. The MVP reads `spaces`, `paths`, `server.capture_port`, `server.push_debounce_seconds`, `server.snapshot_cron`, and `llm.bot_name` / `bot_email` (used for git identity). The `llm.edge_kinds` field is read but only used for validation in `PUT /api/nodes/:id` — the MVP rejects edges with unknown kinds.

---

## 6. API contract

All read endpoints return JSON. All write endpoints require `Authorization: Bearer <ATHENAEUM_TOKEN>`. Errors follow FastAPI defaults: `4xx` with a `{"detail": "..."}` body.

### Static

| Method | Path                  | What it serves                              |
|--------|-----------------------|---------------------------------------------|
| GET    | `/`                   | `dashboard/index.html`                      |
| GET    | `/dashboard/*`        | files under `dashboard/`                    |
| GET    | `/api/docs`           | FastAPI auto-generated OpenAPI UI (dev)     |

### Capture

| Method | Path             | Auth | Description                              |
|--------|------------------|------|------------------------------------------|
| POST   | `/api/inbox`     | yes  | Capture an item — writes a file in `knowledge-db/inbox/YYYY/MM/DD/` and commits |

Request body (matches `001_system_design.md` section 8):

```json
{
  "source": "twitter",
  "kind": "tw",
  "body": "Goodhart's Law applies to RLHF reward models too...",
  "raw_url": "https://x.com/kanjun/status/...",
  "captured_at": "2026-04-26T11:42:30Z",
  "meta": {"author": "@kanjun"}
}
```

Response (201):

```json
{
  "id": "i-114230-twitter",
  "path": "knowledge-db/inbox/2026/04/26/114230_twitter.md",
  "commit": "a8f321a..."
}
```

### Reads

| Method | Path                       | Description                                            |
|--------|----------------------------|--------------------------------------------------------|
| GET    | `/api/spaces`              | List spaces from `athenaeum.config.yaml`               |
| GET    | `/api/inbox`               | List inbox items (summary form)                        |
| GET    | `/api/inbox/{id}`          | Full inbox item (frontmatter + body)                   |
| GET    | `/api/thinking`            | List thoughts; filter via `?space=ai-research`         |
| GET    | `/api/thinking/{id}`       | Full thought                                           |
| GET    | `/api/sources`             | List sources; filter via `?kind=paper`                 |
| GET    | `/api/sources/{id}`        | Full source                                            |
| GET    | `/api/wiki`                | List wiki articles                                     |
| GET    | `/api/wiki/{id}`           | Full wiki article                                      |
| GET    | `/api/projects`            | List projects                                          |
| GET    | `/api/projects/{id}`       | Full project (README + journal + tasks)                |
| GET    | `/api/graph`               | The rebuilt graph index                                |
| GET    | `/api/status`              | Counts, pending proposals, last commit                 |
| GET    | `/api/search?q=…`          | Naive text search across all nodes (grep-equivalent)   |

**Summary vs. full** — list endpoints return summary records (id, type, title, space, created, updated, edge count). Detail endpoints include the full body and all frontmatter. This keeps list views fast and the dashboard happy.

### Writes (non-capture)

| Method | Path                            | Auth | Description                                   |
|--------|---------------------------------|------|-----------------------------------------------|
| PUT    | `/api/nodes/{id}`               | yes  | Update a node (frontmatter + body); commits   |
| POST   | `/api/projects/{id}/journal`    | yes  | Append an entry to a project journal          |
| DELETE | `/api/inbox/{id}`               | yes  | Discard an inbox item (archive or delete — see open question)  |

`PUT /api/nodes/{id}` is the catch-all write. The body is the full intended state of the file:

```json
{
  "frontmatter": {
    "id": "t-proxy-target-collapse",
    "type": "thought",
    "spaces": ["philosophy", "ai-research"],
    "edges": [
      {"to": "s-2210-10760", "kind": "supported_by"},
      {"to": "t-rlhf-reward-hacking", "kind": "extends"}
    ],
    "tags": ["mature"]
  },
  "body": "# Proxy–Target Collapse\n\n..."
}
```

The server validates:
- Frontmatter has required fields for the type.
- Edge `kind` values are in the allowed set from config.
- Edge `to` IDs resolve to existing nodes (warn but allow if not — the user might be writing forward-references; the graph rebuild flags as orphans).

Then it writes the file, commits with a message like `update: t-proxy-target-collapse`, triggers a graph rebuild, and returns the new node + commit hash.

**No `POST` for new nodes in MVP.** New nodes are created either by the capture endpoint (inbox) or by the user creating a file directly in their text editor and the dashboard picking it up on next read. When the LLM phases land, triage will be the path for "captured item → real node." For now the user can `vim knowledge-db/thinking/ai-research/t-foo.md` and it just shows up.

### Status response shape

```json
{
  "counts": {
    "inbox": 47,
    "thinking": 132,
    "sources": 87,
    "wiki": 28,
    "projects": 2
  },
  "pending_proposals": [],
  "last_commit": {
    "hash": "a8f321a",
    "message": "inbox: capture from twitter",
    "author": "Athenaeum Bot",
    "at": "2026-04-26T11:42:30Z"
  },
  "last_push": "2026-04-26T11:45:00Z",
  "last_snapshot_tag": "snapshots/2026-04-25"
}
```

The dashboard's sidebar counts come from this endpoint. So does any "system status" indicator.

---

## 7. Frontmatter handling

A small, opinionated wrapper in `server/lib/frontmatter.py`:

```python
def read(path: Path) -> Node:
    """Parse a markdown file with YAML frontmatter into a Node."""

def write(path: Path, frontmatter: dict, body: str) -> None:
    """Write a markdown file with YAML frontmatter. Preserves trailing newline."""

def validate(node: Node, config: Config) -> list[ValidationError]:
    """Return a list of validation issues. Empty list = valid."""
```

The `Node` dataclass mirrors the schema in `001_system_design.md` section 4:

```python
@dataclass
class Node:
    id: str
    type: Literal["thought", "source", "meta-idea", "wiki", "inbox", "project"]
    path: Path
    spaces: list[str]
    created: datetime
    updated: datetime | None
    edges: list[Edge]
    tags: list[str]
    body: str
    extra: dict   # type-specific fields (status, kind, url, ...)
```

Validation rules are deliberately lenient for MVP — warn rather than reject for missing optional fields. We can tighten later.

---

## 8. Graph index

`server/lib/graph.py` walks `knowledge-db/`, parses every markdown file's frontmatter, and emits `knowledge-db/meta/graph.json` per the shape in `001_system_design.md` section 5.

```python
def rebuild(repo_path: Path) -> Graph:
    """Walk knowledge-db/, parse frontmatter, build the graph index."""

def write_index(repo_path: Path, graph: Graph) -> None:
    """Write knowledge-db/meta/graph.json."""

def is_orphan(node_id: str, graph: Graph) -> bool:
    """A node with no inbound or outbound edges."""
```

**When it runs.** After every write (capture, node update, journal append). Inline, synchronous, in the same request — for v1 scale (hundreds of nodes), this completes in well under a second. If it ever gets slow, push to a `BackgroundTasks` queue inside FastAPI.

**What it produces.** The full graph.json: nodes (each with type, path, title, spaces, outbound edges, inbound edges), edges_by_kind, spaces, and orphans. The dashboard's Thinking Space page reads this directly.

**No LLM.** This is pure parsing. Edges are whatever the frontmatter says they are. No suggestion, no inference. The "graph-maintain" *skill* (LLM-driven) lives on top of this in a future phase.

---

## 9. Git operations

`server/lib/git_ops.py` wraps GitPython with a tight surface:

```python
def commit(repo, paths: list[Path], message: str, author: Identity) -> str:
    """Stage paths, commit. Returns commit hash."""

def push(repo, remote: str = "origin", branch: str = "main") -> None:
    """Push to remote. Logged, errors logged but not raised — MVP keeps serving."""

def tag(repo, name: str, ref: str = "HEAD") -> None:
    """Create a tag, push it."""

BOT = Identity(name="Athenaeum Bot", email="bot@athenaeum.local")
```

### Commit policy

Every write commits immediately. Commit messages follow a small convention:

- `inbox: capture from <source>` — captures
- `update: <node-id>` — node edits
- `journal: <project-id> entry <date>` — journal appends
- `graph: rebuild` — index rebuilds (these can be squashed during cleanup; see below)
- `snapshot: <tag-name>` — snapshot tag commits (only if snapshot.sh needs to commit anything before tagging; usually it just tags)

### Graph rebuild noise

If we commit a graph rebuild after every write, the history fills with `graph: rebuild` commits. Two ways to handle:

**Option A** (MVP default): commit the graph rebuild *as part of* the original commit — i.e., write the user's change *and* rebuild *and* stage both, then a single commit. Cleaner history, slightly slower writes.

**Option B**: don't commit graph.json at all (gitignore it). Rebuild on server start and after every write. The graph index becomes runtime state, not history.

**Recommendation**: Option A. We get the audit trail and the diffs; rebuilds are fast.

### Push debouncing

After every commit, schedule a push for `now + push_debounce_seconds` (default 300s). If another commit lands within that window, the push is rescheduled — net effect: pushes happen at most every 5 minutes during active use, immediately after activity stops.

Implementation: a single `asyncio.Task` that gets canceled and rescheduled. Lives in `main.py` startup. Falls back to "push on shutdown" via FastAPI's `lifespan` handler so we don't lose a final batch.

### Daily snapshot

`server/scheduler/snapshot.sh`:

```bash
#!/bin/sh
set -eu
cd "$ATHENAEUM_REPO_PATH"
TAG="snapshots/$(date +%Y-%m-%d)"
git tag "$TAG" main
git push origin "$TAG"
```

Run via cron at server-local midnight: `0 0 * * *`. The systemd unit ships a timer alternative.

---

## 10. Auth

Single static bearer token. Required for all `POST`, `PUT`, `DELETE`. Optional for `GET` when the host binds to `127.0.0.1`.

Implementation: a tiny FastAPI dependency that checks `Authorization: Bearer <token>` against `ATHENAEUM_TOKEN`. Constant-time comparison. Rate limiting is not in the MVP — single user, local network, not a real concern.

CSRF is also not in the MVP — the dashboard and the API live on the same origin, the dashboard uses same-origin fetches, and all writes are token-gated. If we ever expose the dashboard to the open internet, revisit.

---

## 11. Dashboard mounting

The server mounts `dashboard/` as static files at `/`. `index.html` is served at `/`; everything else under `dashboard/*` is served as-is.

```python
app.mount("/", StaticFiles(directory=repo / "dashboard", html=True), name="dashboard")
```

The dashboard's existing `data.js` mock data stays as a fallback. Pages should fetch `/api/*` on mount and only fall back to `window.DATA` on fetch failure (helps the prototype keep working when the server is down).

For dev iteration, run uvicorn with `--reload` and edit dashboard files directly — they're served fresh on each request.

---

## 12. Errors and logging

### Errors

FastAPI's defaults work. A small set of custom exceptions:

```python
class NodeNotFoundError(HTTPException):  # 404
class InvalidFrontmatterError(HTTPException):  # 422
class GitError(HTTPException):  # 500
class AuthError(HTTPException):  # 401
```

Validation errors include a list of issues so the dashboard can display them inline:

```json
{
  "detail": [
    {"loc": ["edges", 2, "kind"], "msg": "unknown edge kind 'supports_loosely'"},
    {"loc": ["spaces"], "msg": "space 'random-space' not in config"}
  ]
}
```

### Logging

Standard library `logging`, configured in `main.py`:

- INFO for every request (path, status, duration).
- INFO for every commit (hash, message, files touched).
- WARN for git push failures (don't fail the request).
- ERROR for unhandled exceptions.

Logs go to stdout (systemd captures them). One rotating file in `~/.athenaeum/logs/server.log` for grep-by-hand.

A separate audit log (`knowledge-db/meta/flow-log.md`, per the system spec) records *content-meaningful* events — captures, edits, snapshot tags. Format is plain markdown so the user can read it. The MVP appends to this log on every commit; future phases (digest skill) read from it.

---

## 13. Deployment

### Local dev

```
cd server
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env  # edit token, repo path
uvicorn athenaeum_server.main:app --reload --port 7878
```

Access at `http://127.0.0.1:7878/`.

### Self-hosted server

systemd unit (`server/scheduler/athenaeum-server.service`):

```ini
[Unit]
Description=Athenaeum MVP server
After=network.target

[Service]
Type=simple
User=athenaeum
WorkingDirectory=/srv/athenaeum
EnvironmentFile=/srv/athenaeum/.env
ExecStart=/srv/athenaeum/.venv/bin/uvicorn athenaeum_server.main:app --host ${ATHENAEUM_HOST} --port ${ATHENAEUM_PORT}
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Plus a systemd timer for the snapshot:

```ini
[Unit]
Description=Daily Athenaeum snapshot

[Timer]
OnCalendar=daily
Persistent=true

[Install]
WantedBy=timers.target
```

### Network access

The recommended setup binds uvicorn to `127.0.0.1`. Reach the server from outside via:

- **SSH tunnel** — `ssh -L 7878:localhost:7878 server`. Most secure, works from anywhere SSH does.
- **Tailscale** — bind to the Tailscale interface; access from any device on the tailnet. Easier on mobile.
- **Cloudflare Tunnel** — if you want public access without opening ports. Adds Cloudflare's auth in front of the bearer token.

The capture endpoint specifically needs to be reachable from the iOS shortcut. Tailscale is the cleanest answer; SSH tunnel works if the iOS device has Tailscale-or-equivalent.

---

## 14. Bootstrap order (build sequence)

1. **Skeleton.** `server/` directory, `pyproject.toml`, empty `main.py` that returns "Athenaeum MVP, hello".
2. **Config + env loading.** Load `athenaeum.config.yaml` and `.env`; validate.
3. **Frontmatter library.** Parser, writer, dataclass. Tests against fixture files.
4. **Node read endpoints.** GET `/api/inbox`, `/api/thinking`, etc. — read-only, no auth needed yet.
5. **Static mount.** Serve `dashboard/` at `/`. Verify the prototype loads with `window.DATA` fallback.
6. **Wire dashboard pages to `/api/*`** — replace `window.DATA.thoughts` with `fetch('/api/thinking')` etc.
7. **Auth middleware.** Bearer token, applied to writes only.
8. **Capture endpoint.** `POST /api/inbox` — write file, commit. Test with curl.
9. **Build iOS Shortcut and browser bookmarklet** pointing at `/api/inbox`.
10. **Git ops library.** Commit, push, tag. Tests against a temp repo.
11. **Push debouncer.** Background task in `main.py` lifespan. Verify pushes happen.
12. **Snapshot cron.** Install systemd timer; verify a tag lands.
13. **Graph index.** Build, write, commit. Wire dashboard to `/api/graph`.
14. **Node update endpoint.** `PUT /api/nodes/{id}`. Wire dashboard's edit affordances to it.
15. **Status endpoint.** `GET /api/status`. Wire sidebar counts.
16. **Search endpoint.** `GET /api/search?q=` — `git grep` wrapper. Wire command palette.
17. **Logs.** Make sure stdout is informative; flow-log is being written.
18. **Production deploy.** systemd service, secret token, Tailscale, smoke test.

By step 9, capture works end-to-end and the data accumulates. By step 17, the dashboard is fully functional against the real repo. Total scope: 1–2 weeks for a focused build.

---

## 15. Open questions

These can be deferred without blocking MVP work, but they shape the implementation:

1. **Inbox archive vs. delete.** When the user discards an inbox item via `DELETE /api/inbox/{id}`, do we move it to `knowledge-db/inbox/_archive/` or `git rm` it? Archive preserves the audit trail; delete keeps the inbox truly ephemeral. Archive feels right.
2. **Whether to gitignore `knowledge-db/meta/graph.json`.** This spec recommends committing (Option A in section 9). If commits start to feel noisy, switch.
3. **Hand-edited files outside the API.** The user might `vim` a file directly. The next API request (or a file watcher) should detect the change and rebuild the index. MVP can do this lazily — rebuild on any GET that lands after a file mtime newer than the index. A real watcher (e.g., `watchdog`) is nicer but optional.
4. **Multiple captures racing.** If two POSTs to `/api/inbox` arrive at the exact same second from two devices, file paths collide (`HHMMSS_source.md`). Add a counter suffix on collision (`114230_twitter.md`, `114230_twitter_1.md`). Single-user makes this very rare but not impossible.
5. **What happens when push fails.** Network blip, GitHub down, auth expired. MVP logs and continues — the local repo is fine, push retries on next debounce. Worth surfacing in `/api/status` so the user can see "push hasn't succeeded in 2 hours."
6. **Editor surface for thoughts.** A real markdown editor in the dashboard, or just open `file://` links into the user's editor of choice? See open question 7 in `001_system_design.md`. For MVP, a textarea on `PUT /api/nodes/{id}` is fine; promote to a real editor later.
7. **Search implementation.** `git grep -i` is fast for the v1 corpus and is correct ("plain text, you can read everything with grep" — the philosophy doc agrees). Future: vector search, semantic search. MVP: shell out to `git grep`.

---

## 16. What plugs in later (and where)

The MVP is designed so the LLM phases bolt on additively. Sketch of what each later phase touches:

- **Phase 1 (inbox-triage skill).** A new module `athenaeum_server/skills/runner.py` that invokes Claude Code in subprocess. A new endpoint `POST /api/triage` that runs the skill and writes proposals. The MVP's data model already accommodates `.proposed.md` sidecars — they're just files.
- **Phase 2 (graph-maintain skill).** Same skill runner, plus a `POST /api/maintain` endpoint that runs the LLM half on top of the deterministic index.
- **Phase 3 (thinking-spar).** A new endpoint `POST /api/spar` (or WebSocket — sparring is interactive). Streams Claude's responses back to the dashboard's sparring panel.
- **Phase 4 (digest-weekly).** A scheduled task that invokes the digest skill and writes `knowledge-db/meta/digests/YYYY-WNN.md`.

None of these require the MVP to change shape. The endpoints are additive; the data model is unchanged; auth and git ops are reused.

---

## Appendix A — A working day, in HTTP

What the MVP looks like during normal use:

```
11:42  POST /api/inbox            (iOS Shortcut, captured tweet)
       → writes knowledge-db/inbox/2026/04/26/114230_twitter.md
       → commits "inbox: capture from twitter"
       → schedules push (push at 11:47)

11:43  POST /api/inbox            (browser bookmarklet, arxiv link)
       → writes 114310_arxiv.md
       → commits, push rescheduled to 11:48

11:48  background push fires      (no new commits in last 5 min)
       → git push origin main

13:15  GET /api/inbox             (dashboard, user opens Inbox page)
       → returns 47 items in summary form

13:16  GET /api/inbox/i-114230-twitter
       → returns full item + body

13:17  PUT /api/nodes/t-rlhf-reward-hacking
       → user edited frontmatter, added an edge to a new source
       → server validates edge.kind, edge.to (warns: target doesn't exist yet)
       → writes file, rebuilds graph.json, commits both
       → schedules push

13:22  push fires
       → git push

00:00  systemd timer fires → snapshot.sh
       → git tag snapshots/2026-04-27 main
       → git push --tags
```

That's the whole MVP, from the outside.
