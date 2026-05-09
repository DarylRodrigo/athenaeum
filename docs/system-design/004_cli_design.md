# Athenaeum — CLI Design

The `athenaeum` CLI is **the interface a background agent uses to add things to the knowledge-db**. The human sometimes runs it from a terminal, but that is the secondary mode. Every design decision in this doc resolves in favor of the agent when the two pull in different directions.

The CLI sits beside the FastAPI server and the dashboard — all three call into `server/lib/`. The CLI is preferred over direct API calls when the caller is a Claude Code skill or scheduled job, because it works without the daemon, has stable subprocess semantics, and is language-agnostic.

Companion specs:
- `001_system_design.md` — overall architecture, frontmatter schema, layer model.
- `002_dashboard_design.md` — UX language for the web UI.
- `003_mvp_server.md` — MVP server contract.

When this doc conflicts with the philosophy, philosophy wins.

---

## 1. Design philosophy

### 1.1 The agent is the primary caller

Background tasks (Claude Code skills, scheduled jobs, source ingesters) use the CLI to write to the knowledge-db. That means:

- **Non-interactive.** Never open `$EDITOR`, never prompt. A subprocess that blocks on stdin breaks the agent.
- **Structured I/O by default.** JSON in, JSON out. Human-readable text is a flag, not the default.
- **Predictable exit codes.** Success is `0`. Each non-zero code maps to one well-defined failure class so the calling agent can branch on it without parsing stderr.
- **Idempotent where possible.** Agents retry. The CLI must make double-write safe — same input, same outcome, no duplicate files.
- **Provenance recorded.** Every write records which agent did it, with what input, so the human can audit and the system can revert.

### 1.2 The human path is a thin layer on top

Human convenience features (`--text` output, the bare `ath capture "..."` shorthand, opening files in `$EDITOR` via a separate `ath edit` command) are wrappers over the same underlying operations the agent uses. They never change behavior — they only change presentation.

### 1.3 Capture is the hottest path

The agent will call `ath capture` orders of magnitude more than anything else. Sources of inbox items: a browser-history scraper, an arXiv watcher, an email-to-inbox processor, a Slack/Discord bridge, a "summarize this PDF and capture key claims" pipeline. Capture latency, throughput, and dedup correctness all matter more than they do for the rest of the surface.

### 1.4 The CLI does not run skills

`ath capture` writes a file. It does not invoke any LLM. The agent that calls `ath capture` may itself be an LLM, but that's the agent's problem, not the CLI's. Skills (`inbox-triage`, `thinking-spar`, `digest-weekly`) are invoked by the human or by the scheduler — see Section 8.

### 1.5 The journal is sacred — agents cannot write to it

`knowledge-db/projects/*/journal.md` is human-only. The CLI hard-refuses any write to it from a non-human identity. This is enforced in `server/lib/`, not just in the CLI, so it can't be bypassed.

---

## 2. I/O conventions

### 2.1 Input

Three input modes on every write command:

1. **Argument** — `ath capture --body "text"`. Fine for one-off invocations.
2. **JSON on stdin** — `echo '{"body": "...", "source": "twitter"}' | ath capture`. The standard agent path.
3. **JSONL batch** — `ath capture --batch < items.jsonl`. One JSON object per line. The CLI processes each, emits one result line per input. Errors on individual lines do not abort the batch.

Input fields use the API's request shape exactly. The CLI is, in this respect, a thin local transport for the same payloads the API accepts.

### 2.2 Output

Default: **JSON to stdout, one object per result.**

```
$ ath capture --body "Goodhart's Law applies to RLHF too" --source twitter
{"id":"i-114230-twitter","path":"knowledge-db/inbox/2026/04/26/114230_twitter.md","commit":"a3f81e9","deduplicated":false}
```

Batch mode emits NDJSON (one line per input):

```
$ cat items.jsonl | ath capture --batch
{"id":"i-114230-twitter","commit":"a3f81e9","deduplicated":false}
{"id":"i-114231-arxiv","commit":"b2c47ee","deduplicated":false}
{"error":"missing field: body","input_index":2}
```

`--text` switches to human-readable output (columns, ANSI when stdout is a TTY). All commands support both.

### 2.3 Exit codes

| Code | Meaning |
|------|---------|
| `0` | Success. All operations succeeded. |
| `1` | Usage error — bad flags, missing required field. The CLI emits `{"error": "..."}` and exits before any write. |
| `2` | Repo state error — not a git repo, file conflict, lock contention, journal-write refused. The state is unchanged. |
| `3` | Partial batch failure — at least one input in `--batch` succeeded, at least one failed. Each result line is in stdout. |
| `4` | Daemon-required operation failed and daemon is not running. Falls back to direct mode where possible; this code is reserved for cases where the fallback isn't safe. |

The agent decides what to do on each. Exit-code semantics are **stable** — adding a new code is a breaking change.

### 2.4 Idempotency

Every write command accepts `--idempotency-key <key>`. If the CLI sees a previous successful write with the same key in the last 24 hours (recorded in `knowledge-db/meta/idempotency.jsonl`), it skips the write and returns the prior result with `"deduplicated": true`.

Agents that may retry should generate a stable key — typically a hash of the source URL, message ID, or content. The CLI does not generate idempotency keys automatically; the agent owns the key.

A separate, weaker dedup applies to capture without a key: if an inbox item with the same `raw_url` was captured in the last 24 hours, the CLI returns the existing record with `"deduplicated": true`. This catches naive double-captures (a browser shortcut fired twice) but isn't relied on by serious agents.

---

## 3. Capture commands (Layer 1 — Inbox)

The dominant path. ~90% of CLI calls will be one of these.

### 3.1 `ath capture`

Single-item capture.

```
ath capture --body "text" [--source SRC] [--kind KIND] [--raw-url URL] [--tag TAG]... [--idempotency-key KEY]
echo '{"body": "...", "source": "...", "raw_url": "..."}' | ath capture
```

Required fields (one of):
- `--body "..."` (CLI flag).
- `body` field on stdin JSON.

Optional fields (CLI flags or stdin JSON):

| Field | Default | Purpose |
|-------|---------|---------|
| `source` | `cli` | Where the capture came from (`twitter`, `arxiv`, `voice`, `substack`, `cli`, `agent:<name>`). Used in filename and frontmatter. |
| `kind` | derived from source | Item kind (`tw`, `pa`, `vo`, `ar`, `do`, `po`, `no`). |
| `raw_url` | — | Source URL. Used for weak dedup. |
| `tags` | `[]` | Free-form tags. |
| `meta` | `{}` | Arbitrary metadata dict (author, replies, context, etc.). Stored verbatim in frontmatter. |
| `captured_at` | now (UTC) | ISO-8601 timestamp. Override only when ingesting historical items. |
| `idempotency_key` | — | See §2.4. |

Behavior:

1. Validate input.
2. If `idempotency_key` matches a recent prior call, return that result, exit 0.
3. Otherwise: generate `id = i-HHMMSS-<source>`, write the markdown file, commit as the bot identity (or the agent identity if `--agent-id` is set — see §6), schedule a debounced push, append to the flow log, return result.

Latency target: <100ms when the daemon is running, <250ms direct (cold Python startup dominates).

### 3.2 `ath capture --batch`

Bulk ingest. Reads NDJSON from stdin, processes each line, emits one NDJSON result per line.

```
cat scrape_results.jsonl | ath capture --batch
```

The CLI commits in chunks (every N items, configurable, default 50) rather than per-item, so a 10,000-item ingest doesn't produce 10,000 commits. Each chunk's commit message names the source: `inbox: bulk capture from agent:arxiv-watcher (50 items)`.

Failures on individual lines emit `{"error": "...", "input_index": N}` and do not abort the batch. Final exit code is `0` if all succeeded, `3` on partial failure.

### 3.3 `ath inbox` — read and triage

The agent occasionally needs to read its own captures (e.g., to deduplicate against existing items, or to run its own triage logic).

```
ath inbox list [--since ISO] [--source SRC] [--limit N]
ath inbox show <id>
ath inbox archive <id>
ath inbox route <id> --to <space>          # manual triage: convert to source under thinking/<space>/
```

`route` is the manual triage operation. The LLM-driven `ath inbox triage` skill is a separate command (Section 8); `route` is what the human or a deterministic ingester uses to do triage one item at a time.

---

## 4. Thinking commands (Layer 2)

Agents that *develop* thinking — for example, an autonomous-research skill that writes draft thoughts based on processed sources — use these.

### 4.1 `ath think new`

```
ath think new --title "..." --space SPACE [--body "..."] [--connect ID:KIND]... [--status STATUS] [--idempotency-key KEY]
echo '{"title": "...", "space": "...", "body": "..."}' | ath think new
```

Behavior:
1. Slugify title to `t-<slug>`.
2. Write `knowledge-db/thinking/<space>/t-<slug>.md` with frontmatter (`type: thought`, `status: drafting`, `created`, `spaces: [<space>]`).
3. Add edges from `--connect` flags or `connect` field on stdin (a list of `{to, kind}` objects).
4. Validate every edge kind is in `config.llm.edge_kinds`. Reject the whole call on invalid kind.
5. Commit, rebuild graph, append flow log, return result.

If a thought with the same id already exists, the CLI exits `2` unless `--replace` is passed (in which case it overwrites and records the change). The agent owns the choice.

### 4.2 `ath think connect`

```
ath think connect --from ID --to ID --kind KIND [--note "..."] [--idempotency-key KEY]
```

Adds an outbound edge to `from`. If the edge already exists (same `to` + `kind`), returns `{"deduplicated": true}` without rewriting the file.

### 4.3 `ath think list`, `show`, `tag`, `update`

```
ath think list [--space SPACE] [--status STATUS] [--orphan] [--limit N]
ath think show <id>
ath think tag <id> --add TAG... --remove TAG...
ath think update <id> [--title "..."] [--status STATUS] [--space SPACE]...
```

`update` is conservative: it only changes the named fields and never touches the body. Body edits go through `ath edit <id>` (which opens `$EDITOR` — human-only).

For risky operations (changing the title of a mature thought, dropping all edges), the CLI writes a `<path>.proposed.md` sidecar and exits `0` with `{"proposed": true, "path": "..."}` instead of overwriting. See Section 7.

---

## 5. Wiki commands (Layer 3)

Agents *propose* wiki articles. They never *publish* one outright in the MVP — every wiki write goes through a sidecar.

### 5.1 `ath wiki propose`

```
ath wiki propose --title "..." --section SECTION --body "..." [--from THOUGHT-ID...] [--idempotency-key KEY]
echo '{"title": "...", "section": "...", "body": "...", "provenance": ["t-..."]}' | ath wiki propose
```

Behavior:
1. Compute target path `knowledge-db/wiki/<section>/w-<slug>.md`.
2. Write to `<target>.proposed.md` next to it.
3. Commit (sidecar only — no overwrite).
4. Return `{"proposed": true, "path": "...", "approve_with": "ath accept ..."}`.

The human approves with `ath accept <path>` (Section 8). On approve, the sidecar is `git mv`'d over the target and committed.

### 5.2 `ath wiki list`, `show`

Read-only commands work the same as elsewhere. No agent-write path beyond `propose` in MVP.

---

## 6. Project commands (Layer 4)

Tightly constrained for agents:

- **Allowed**: read project README, list tasks, propose a new task, propose a journal entry as a sidecar.
- **Forbidden**: write directly to `journal.md`. Hard refusal.

### 6.1 `ath project show`, `list`

```
ath project list [--status STATUS]
ath project show <id>
```

### 6.2 `ath task add` (allowed for agents)

```
ath task add --project ID --title "..." [--due YYYY-MM-DD] [--idempotency-key KEY]
ath task done --project ID --task NUM-OR-SUBSTRING
```

Tasks live as flat checkboxes in `tasks.md`. Agents may add and complete them; the human reviews via the dashboard or `ath task list`.

### 6.3 `ath journal append` — sidecar only

```
ath journal append --project ID --body "..." [--date YYYY-MM-DD] [--idempotency-key KEY]
```

Writes a `journal.proposed.md` sidecar with the proposed entry. Never touches `journal.md` directly. Returns `{"proposed": true, "path": "...", "approve_with": "..."}`.

The CLI checks the calling identity. If the agent identity is set and the target is the journal, it writes the sidecar. If the human runs `ath journal append` (and is logged in as themselves, not the bot), the CLI prompts to confirm bypass — but in practice the human edits the journal in `$EDITOR`, not via this command.

### 6.4 `ath project new`

Project creation is currently human-only. Agents that want to propose a new project write a sidecar manifest at `knowledge-db/meta/proposals/projects/<slug>.proposed.md`.

---

## 7. Sidecars and the proposal flow

Per `001_system_design.md` Section 6, agent writes are tiered by risk:

| Tier | Operation | CLI behavior |
|------|-----------|--------------|
| Low | Append-only (capture, new task, new edge) | Direct write + commit. |
| Med | New thought, new source from triage | Direct write + commit. |
| High | Mutating an existing wiki/thought, journal append | `.proposed.md` sidecar; human approves. |
| Forbidden | Direct write to `journal.md` | Hard refuse. Exit `2`. |

The CLI implements this tier policy in `server/lib/`. The agent does not get to override it. If the agent has a legitimate reason to mutate an existing wiki article, it must propose, and the human approves.

### 7.1 `ath accept`, `ath reject`

```
ath accept <proposal-path>
ath reject <proposal-path>
```

`accept`: `git mv` the sidecar over the target file, commit, rebuild graph.
`reject`: delete the sidecar, commit.

These are deterministic. They don't invoke the LLM. They're how the human responds to an agent's proposed write.

---

## 8. LLM-driven commands (deferred — not in MVP)

These commands wrap Claude Code skill invocations. They appear here so callers know the eventual shape:

```
ath inbox triage                          # inbox-triage skill         (Phase 1)
ath think spar <id>                       # thinking-spar skill        (Phase 3)
ath think graduate <id>                   # wiki-graduate skill        (post-MVP)
ath digest [--week N]                     # digest-weekly skill        (Phase 4)
ath maintain                              # rebuild graph + graph-maintain skill
```

Each of these is invoked by a human or scheduler, **not by another agent**. The reason: skills produce LLM-authored content, and chaining LLM-generated → LLM-acted-on without human review is the failure mode the design philosophy is built to prevent. If a future skill genuinely needs to call another, the path is "skill A writes a proposal sidecar, skill B is invoked next, B reads A's proposal as input" — never direct chaining.

These commands return tier-3 sidecars on every non-trivial output (e.g. proposed edges, proposed wiki article, proposed meta-idea).

---

## 9. Agent identity and provenance

Every CLI write is committed by a git author. Default: `Athenaeum Bot <bot@athenaeum.local>`. With `--agent-id <name>`, the commit author is `<name> <name>@athenaeum.bot`, e.g. `arxiv-watcher <arxiv-watcher@athenaeum.bot>`.

This makes audit trivial:

```
git log --author=arxiv-watcher
git log --author=@athenaeum
```

In addition to the git author, every write appends one line to `knowledge-db/meta/flow-log.md`:

```
- **11:42** — capture (arxiv-watcher): i-114230-arxiv from arxiv.org/abs/2210.10760
```

The flow log is the single source for "what wrote what, in order." Skills that surface "this came from agent X, do you trust it?" in the dashboard read from here.

### 9.1 Why bot identities are not authentication

`--agent-id` is provenance, not authentication. Anything running on the server can claim any agent ID. We rely on:

- The server is single-user, on a host the user controls.
- Skills installed in `server/skills/` are reviewed by the human before they're added.
- Bot writes are reversible (per the snapshot/revert plan in `001_system_design.md`).

If we ever multi-tenant Athenaeum (we won't, per the design philosophy), this changes.

---

## 10. Configuration

Standard Unix resolution:

1. `--repo <path>` flag (highest priority).
2. `$ATHENAEUM_REPO_PATH` env var.
3. Walk up from `$PWD` looking for `athenaeum.config.yaml`.
4. `$HOME/.config/athenaeum/repo` (a one-line file pointing at the repo).
5. Error.

Source #4 lets a scheduled job invoke `ath capture --batch` from anywhere on the system without setting an env var.

The CLI never reads any other config — everything flows through `athenaeum.config.yaml`.

---

## 11. Build order

Phase 0 (MVP):
1. `ath capture` (single + `--batch`) — the entire reason this CLI exists.
2. `ath inbox list/show/archive/route` — agents need to read their own captures.
3. `ath think new/connect/list/show/update` — second-most-common agent write.
4. `ath status` — health check; agents call this before bulk operations to verify state.
5. `ath accept/reject` — human-side of the proposal flow.
6. `ath wiki propose` and `ath journal append` (sidecar paths) — high-tier writes.
7. `ath task add/done` — low-friction project hooks.

Phase 1+ (LLM):
8. `ath inbox triage` (needs first skill).
9. `ath maintain`, `ath digest`, `ath think spar`, `ath think graduate`.

`ath capture` is the only command an agent strictly needs to be useful in MVP. Everything else can be added incrementally.

---

## 12. What this CLI is not

- **Not a REST client.** It does not proxy arbitrary requests to the FastAPI server. The server and CLI both call `server/lib/`; that's where the shared logic lives.
- **Not a sync tool.** No remote-state reconciliation. The git repo is the state.
- **Not a scheduler.** Cron / launchd / systemd timers invoke the CLI. The CLI does not schedule itself.
- **Not interactive.** No prompts, no progress bars by default. The agent runs it, parses output, decides next steps.
- **Not opinionated about which LLM is calling it.** Claude Code is the primary client today, but the CLI doesn't know or care.

---

## 13. Open questions

1. **Daemon detection.** Should the CLI auto-detect a running FastAPI daemon (via Unix socket at `~/.athenaeum/daemon.sock`) and route operations through it for speed, falling back to direct mode if absent? Direct mode pays Python startup (~80–250ms) per call; daemon mode pays one socket round-trip (~5ms). For batch mode the difference is negligible, but for high-throughput agents it matters.
2. **Idempotency window.** 24 hours is a guess. Agents that re-process the same source weekly might want longer; agents that re-process every minute might want shorter. Per-call override (`--idempotency-window 7d`) is probably right.
3. **`--agent-id` allow-list.** Should the config declare which agent IDs are recognized, and reject unknown ones? Pro: catches typos. Con: every new agent needs a config edit. Lean toward not enforcing for MVP — flow-log entries are auditable post-hoc.
4. **Batch commit chunk size.** 50 is a guess. Worth tuning once we see real ingest volumes.
5. **Concurrent writes.** Two agents calling `ath capture` at the same instant. Git index lock contention is the failure mode. Solution is probably a Unix file lock (`flock` on `.git/index.lock`) inside the CLI's commit step. Verify this works on macOS (Linux is fine).
6. **Streaming output for batch.** Right now `--batch` emits NDJSON line-by-line as it processes. Some agents may want to emit only after all are done. Add `--buffer-output` if it comes up.
