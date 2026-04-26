# Athenaeum — v1 System Design

This document is the implementation companion to `docs/philosophy/001_design_philosophy.md`. The philosophy answers *why* — what knowledge work this system supports and how it should feel. This document answers *how* — what runs where, what files live in what shape, what the LLM is allowed to do, and how to bootstrap from an empty repo.

When the two conflict, philosophy wins and this doc is what changes.

---

## 1. Contract

### What v1 must do

- Capture an idea from a phone or browser to a file in the repo in under 10 seconds.
- Triage inbox items into thinking spaces with an LLM-suggested route the human confirms.
- Hold a "thinking space" as a directory of markdown files whose frontmatter forms a graph.
- Surface the graph (queryable, traversable) without forcing the human to look at JSON.
- Run the LLM as one-shot CLI tasks: triage, source processing, graph maintenance, digests, sparring.
- Make every LLM-driven write reversible: distinct git author, daily snapshot tags, sidecar proposals for risky edits.
- Sync to GitHub as off-site backup.

### What v1 explicitly does not do

- No long-running ambient agent. The LLM runs when invoked or scheduled.
- No model-agnostic abstraction layer. Claude Code is the engine; skills are the portable artifact.
- No multi-user, no auth dance for the human, no collaboration features.
- No proprietary database. Everything is markdown + JSON + git.
- No automatic graduation from thinking space to wiki, no automatic edits to project journals.

---

## 2. Architecture overview

```
                        ┌──────────────────────────────┐
                        │        Self-hosted server    │
                        │                              │
  iOS Shortcut ─────┐   │  ┌────────────────────────┐  │
  Browser/bookmarklet ─→│  │  Capture API (HTTPS)   │  │
  Email-to-inbox ───┘   │  │  ↓ writes file + commit│  │
                        │  └────────────────────────┘  │
                        │            │                 │
                        │            ▼                 │
                        │  ┌────────────────────────┐  │
                        │  │     Git repository     │  │
                        │  │  (the data + history)  │  │
                        │  └────────────────────────┘  │
                        │     ▲              │         │
                        │     │              ▼         │
                        │  ┌──┴─────┐   ┌────────────┐ │
   Web UI (chat/browse) │  │ skills │   │ scheduler  │ │
   ←──────────────────→ │  │ + CC   │   │ (cron/sys.)│ │
                        │  │headless│   │ digest,    │ │
                        │  └────────┘   │ snapshot,  │ │
                        │     ▲         │ push       │ │
                        │     │         └────────────┘ │
                        │  CLI (`athenaeum …`)         │
                        └──────────────┬───────────────┘
                                       │
                                       ▼
                              GitHub (off-site backup)
```

Three things to notice:

1. **Capture has zero LLM dependency.** A capture writes a file and commits. If the LLM layer is broken, expired, or rate-limited, you can still drop ideas into the system.
2. **The CLI is the lingua franca.** Web UI, scheduler, and you-on-SSH all call the same `athenaeum` commands. The commands wrap Claude Code skill invocations.
3. **The git repo is the data, the history, and the audit log.** No external database to keep in sync.

---

## 3. Repository layout

The top-level repo separates **documentation**, **front-end**, **back-end**, and **data**. Each could be backed up, deployed, or replaced independently — though for v1 they all live in one git repo with one shared history.

```
athenaeum/                          # repo root (currently `anthanaeum/` — rename pending)
├── README.md
├── CLAUDE.md                       # AI collaborator guidance
├── athenaeum.config.yaml           # spaces, paths, server settings (system-wide)
│
├── docs/                           # design docs, specs, philosophy
│   ├── philosophy/
│   │   └── 001_design_philosophy.md
│   ├── system-design/
│   │   └── 001_system_design.md    # this doc
│   └── ui-design/
│       ├── 002_dashboard_design.md # dashboard design spec
│       └── claude-design-v1/       # frozen reference prototype
│
├── dashboard/                      # front-end (web UI)
│   ├── index.html                  # entry point (was "Knowledge OS.html")
│   ├── app.jsx                     # root component, page routing
│   ├── shell.jsx                   # sidebar, topbar, command palette
│   ├── pages/
│   │   ├── inbox.jsx
│   │   ├── thinking.jsx
│   │   ├── thinking-focus.jsx
│   │   ├── wiki.jsx
│   │   └── project.jsx
│   ├── styles/
│   │   ├── base.css
│   │   ├── overrides.css
│   │   └── focus.css
│   └── tweaks-panel.jsx
│
├── server/                         # back-end (API, CLI, skills, scheduler)
│   ├── api/                        # HTTPS endpoints
│   │   └── capture.py              # POST /inbox
│   ├── cli/                        # `athenaeum` command implementation
│   │   └── athenaeum
│   ├── scheduler/                  # cron / systemd hooks
│   │   ├── snapshot.sh             # daily snapshot tag + push
│   │   ├── push.sh                 # debounced auto-push
│   │   └── digest.sh               # Sunday digest
│   ├── skills/                     # Claude Code skills
│   │   ├── inbox-triage/
│   │   │   └── SKILL.md
│   │   ├── source-process/
│   │   ├── graph-maintain/
│   │   ├── thinking-spar/
│   │   ├── wiki-graduate/
│   │   └── digest-weekly/
│   ├── lib/                        # shared utilities (frontmatter parser, git wrapper, etc.)
│   └── README.md                   # how to run the server
│
└── knowledge-db/                   # the knowledge graph — the actual data
    ├── inbox/
    │   └── 2026/04/26/             # YYYY/MM/DD
    │       ├── 114230_twitter.md
    │       └── 103017_arxiv.md
    ├── thinking/
    │   ├── ai-research/
    │   │   └── t-rlhf-reward-hacking.md
    │   ├── economics/
    │   ├── philosophy/
    │   ├── meta/                   # meta-idea nodes that span spaces
    │   └── reading/                # reading spaces (temporary)
    │       └── scott-seeing-like-state/
    │           ├── _manifest.md
    │           └── t-legibility-control.md
    ├── sources/                    # all ingested external material
    │   ├── papers/
    │   │   └── s-2210-10760_gao-scaling-laws.md
    │   ├── articles/
    │   ├── tweets/
    │   └── books/
    ├── wiki/
    │   ├── concepts/
    │   │   └── proxy-target-collapse.md
    │   ├── methods/
    │   ├── frameworks/
    │   └── meta-essays/
    ├── projects/
    │   └── mechanism-spec/
    │       ├── journal.md          # human-only, sacred
    │       ├── README.md           # goals, scope, status
    │       └── notes/
    └── meta/                       # LLM-maintained index + logs
        ├── graph.json              # derived from frontmatter; rebuildable
        ├── reading-list.md
        ├── flow-log.md
        └── digests/
            └── 2026-W17.md
```

### Notes on layout

- **Top-level separation is by concern, not by tier.** `docs/` is what humans read about the system; `dashboard/` is what humans interact with; `server/` is the operational machinery; `knowledge-db/` is the data the system exists to hold.
- **One git repo, one history.** Code, data, and docs all version together. A daily snapshot tag captures the whole system state — useful when an LLM-driven change cascades across both data and a skill prompt.
- **`knowledge-db/` is what gets the most churn.** If we ever need to split it into its own repo (separate sync cadence, sharing the engine with someone else's data), it's already isolated.
- **Skills live in `server/skills/`, not in `knowledge-db/`.** Skills are how the engine operates *on* knowledge — they're functional artifacts, not knowledge themselves. Editing a skill is a code change, not a thinking change.
- **Spaces are directories under `knowledge-db/thinking/`.** A thought's primary home is one space, but its frontmatter can list multiple if the thought spans (cross-pollination).
- **Sources live in `knowledge-db/sources/`, not in spaces.** A source is reusable across spaces; thoughts reference sources by ID.
- **Reading spaces are subdirectories under `knowledge-db/thinking/reading/`.** When a reading space dissolves, files are `git mv`'d into permanent space directories. A `_manifest.md` records what the reading space was for.
- **`knowledge-db/meta/` is LLM-maintained.** Treat it as derived state — rebuildable from frontmatter and history. Don't hand-edit `graph.json`.
- **`knowledge-db/projects/<name>/journal.md` is human-only.** Skills must refuse to write to it.
- **Proposals live as sidecars.** A proposed edit to `knowledge-db/wiki/concepts/proxy-target-collapse.md` is `proxy-target-collapse.proposed.md` next to it. No `proposals/` directory.
- **The existing prototype** at `docs/ui-design/claude-design-v1/` stays as a frozen reference. Its contents become the seed for `dashboard/` during Phase 0 (see section 13).

---

## 4. Node and frontmatter schema

Every node in the system is a markdown file with YAML frontmatter. The frontmatter is the structural source of truth; the body is the content.

### Common fields (all node types)

```yaml
---
id: t-proxy-target-collapse        # type-prefix + slug, stable forever
type: thought                       # thought | source | meta-idea | wiki | inbox | project
created: 2026-04-12T09:30:00Z
updated: 2026-04-26T14:22:00Z
spaces: [ai-research, philosophy]   # one or more; first is primary home
edges:                              # outbound only; inbound derived in graph.json
  - to: t-rlhf-reward-hacking
    kind: extends
  - to: s-2210-10760
    kind: supported_by
  - to: t-markets-aggregate-priors
    kind: contradicts
    note: "tension on whether feedback erodes or sharpens priors"
tags: [optional, free-form]
---
```

### ID format

`<type-prefix>-<slug>`:

- `t-` thought
- `s-` source
- `m-` meta-idea
- `w-` wiki article
- `i-` inbox item (transient — IDs may not survive triage)
- `p-` project
- `k-` task (if we keep tasks as nodes)

Slugs are kebab-case, derived from the title or a meaningful identifier (`s-2210-10760` for an arxiv paper). IDs are immutable — files can be moved, titles can change, but the ID stays. This makes edges stable across reorganizations.

### Edge ontology (v1)

Keep small. Adding edge types is cheap; removing them is hard.

| kind            | meaning                                                  |
|-----------------|----------------------------------------------------------|
| `supports`      | A claim that backs B                                     |
| `contradicts`   | A claim in tension with B                                |
| `extends`       | A builds on or generalizes B                             |
| `questions`     | A is a question about B                                  |
| `instance_of`   | A is a specific case of pattern B                        |
| `supported_by`  | thought ← source (use on the thought)                   |
| `relates_to`    | catch-all; LLM should prefer a specific kind             |

The LLM's instruction must include "prefer specific edge kinds over `relates_to`." Otherwise everything becomes `relates_to`.

### Type-specific fields

**Thought**
```yaml
type: thought
status: drafting | developing | mature | graduated
graduated_to: w-proxy-target-collapse   # if graduated
```

**Source**
```yaml
type: source
kind: paper | article | tweet | podcast | book | doc | voice
url: https://...
authors: [Name]
ingested_at: 2026-04-26T10:17:00Z
```

**Meta-idea**
```yaml
type: meta-idea
spans: [ai-research, philosophy, economics]   # the spaces it bridges
```

**Wiki**
```yaml
type: wiki
section: concepts | methods | frameworks | meta-essays
provenance: [t-proxy-target-collapse, t-rlhf-reward-hacking, s-2210-10760]
last_revised: 2026-04-26
```

**Project**
```yaml
type: project
status: active | paused | shipped | abandoned
goals: |
  Multi-line description of intent.
```

**Inbox item**
```yaml
type: inbox
source: twitter | arxiv | voice | substack | bookmarklet | email
captured_at: 2026-04-26T11:42:30Z
raw_url: https://...
```

---

## 5. The graph

### Source of truth: frontmatter on each file
### Derived index: `knowledge-db/meta/graph.json`

`graph.json` is rebuilt by a deterministic script (parsing frontmatter is not LLM work) every time the repo changes. It is a fast lookup, not a source of truth. If it is deleted, it can be regenerated from the markdown files. The `graph-maintain` skill operates on top of this index — its job is *suggesting new edges and flagging patterns*, not building the index itself.

Shape:

```json
{
  "version": 1,
  "rebuilt_at": "2026-04-26T15:00:00Z",
  "nodes": {
    "t-proxy-target-collapse": {
      "type": "thought",
      "spaces": ["ai-research", "philosophy"],
      "path": "thinking/ai-research/t-proxy-target-collapse.md",
      "title": "Proxy–Target Collapse",
      "created": "2026-04-12T09:30:00Z",
      "outbound": [
        {"to": "t-rlhf-reward-hacking", "kind": "extends"},
        {"to": "s-2210-10760", "kind": "supported_by"}
      ],
      "inbound": [
        {"from": "t-markets-aggregate-priors", "kind": "contradicts"}
      ]
    }
  },
  "edges_by_kind": {
    "contradicts": [["t-markets-aggregate-priors", "t-proxy-target-collapse"]]
  },
  "spaces": {
    "ai-research": ["t-proxy-target-collapse", "t-rlhf-reward-hacking"]
  },
  "orphans": []
}
```

### Why frontmatter + rebuilt index

- The markdown files remain readable in any text editor (philosophy belief #6).
- A human can hand-edit edges without breaking anything — the next index rebuild picks them up.
- The index gives the LLM and any UI fast graph queries without re-parsing every file.
- The index is regeneratable, so it can be `.gitignored` if it churns too much, or committed as an audit trail (recommend committing).

---

## 6. The LLM as engine

### Runtime

Claude Code in headless mode, invoked per task:

```
claude -p "Triage inbox items captured today" \
  --skill inbox-triage \
  --output-format json
```

Each invocation is stateless. Skills are responsible for reading the repo state they need. The `athenaeum` CLI wraps these invocations with the right working directory, environment, and post-processing (commit the result, run `graph-maintain` after a structural change).

### Author identity

LLM-authored commits use:

```
git -c user.name="Athenaeum Bot" \
    -c user.email="bot@athenaeum.local" \
    commit -m "..."
```

This makes `git log --author=Athenaeum` your filter for "everything the LLM has done." Bulk revert is a one-liner.

### Risk tiers and write policy

| Tier | Operation                                                          | Write policy                  |
|------|--------------------------------------------------------------------|-------------------------------|
| Low  | Append-only writes (digest, new index, suggestion)                 | Direct to main, autocommit    |
| Med  | New thought file from inbox triage                                 | Direct to main, autocommit    |
| High | Mutating an existing thought, wiki, or project                     | Sidecar `.proposed.md`        |
| Forbidden | Any write to `knowledge-db/projects/*/journal.md`             | Refuse                        |

The skill's system prompt enforces this. The human approves a `.proposed.md` by running `athenaeum accept <path>`, which `git mv`'s the proposed file over the original.

---

## 7. Skill catalog

Each skill is a directory under `server/skills/` with a `SKILL.md` that specifies its purpose, inputs, outputs, and write policy.

### v1 (build first)

- **inbox-triage** — Read unprocessed `knowledge-db/inbox/` files, propose a route (space + kind + suggested edges) for each, write proposals to a triage manifest the human approves.
- **source-process** (Mode B) — On a new file in `knowledge-db/sources/`, summarize, extract concepts, suggest edges to existing thoughts, propose space membership.
- **graph-maintain** (Mode A) — After any commit that changes a node's frontmatter, surface orphans on top of the rebuilt `knowledge-db/meta/graph.json`, propose new edges, flag potential meta-ideas (cross-space edge clusters), detect contradictions. (The index rebuild itself is a deterministic script in `server/lib/`, not an LLM task.)
- **thinking-spar** (Mode C) — Interactive. Reads the relevant subgraph, plays Socratic interlocutor over a thought. The dashboard's chat surface invokes this.
- **digest-weekly** — Sunday digest of the week's activity, surfacing forgotten sources, contradictions, and orphan thoughts.

### v2 (after v1 settles)

- **wiki-graduate** — Given a mature thought, draft a wiki article from the thought + its connected sources, write as proposal.
- **wiki-maintain** — Wikilinks, index, overlap detection between articles.
- **contradiction-watch** — Dedicated skill to find and surface contradictions across the graph (graph-maintain does this lightly; this is the deep pass).
- **meta-detect** — Identify clusters of cross-space edges that suggest a new meta-idea node.

### v3 (when projects exist)

- **project-brief** — When you sit down to a project, generate a context briefing of what's changed in relevant spaces.
- **orphan-watch** — Surface thoughts with no edges that have been around for a while.

### Build order rationale

Triage gates everything (without it, the inbox grows unbounded). Source-process makes ingested material useful. Graph-maintain keeps the index honest. Sparring is the reason to use the system day-to-day. Digest is high-leverage and low-risk — a great early skill that makes the system feel alive.

---

## 8. Capture API

The capture endpoint runs on the self-hosted server. Single static bearer token (env var) for auth. Single endpoint.

```
POST /inbox
Authorization: Bearer <ATHENAEUM_CAPTURE_TOKEN>
Content-Type: application/json

{
  "source": "twitter",
  "kind": "tw",
  "body": "Goodhart's Law applies to RLHF reward models too...",
  "raw_url": "https://x.com/kanjun/status/...",
  "captured_at": "2026-04-26T11:42:30Z",
  "meta": {
    "author": "@kanjun",
    "context": "selection from page"
  }
}
```

Response:

```
201 Created
{
  "id": "i-114230-twitter",
  "path": "knowledge-db/inbox/2026/04/26/114230_twitter.md"
}
```

### Server behavior

The capture handler lives in `server/api/capture.py`. It:

1. Validates token, fields.
2. Composes a markdown file with frontmatter (above schema, `type: inbox`) and body.
3. Writes to `knowledge-db/inbox/YYYY/MM/DD/HHMMSS_<source>.md`.
4. Commits as `Athenaeum Bot <bot@athenaeum.local>` with message `inbox: capture from <source>`.
5. Triggers a debounced push (see section 9).

The capture endpoint never invokes the LLM. Triage is a separate, scheduled or manually-triggered step.

### Capture clients (v1)

- **iOS Shortcut**: "Athenaeum Capture" — accepts text, URL, or selection, prompts for an optional source kind, POSTs to `/inbox`.
- **Browser bookmarklet**: highlights selection + page URL → POST. Lighter than a full extension; no install dance.

Email-to-inbox, voice memos with Whisper, and a real browser extension are out of scope for v1.

---

## 9. Backup and rollback

Three layers, in order of how often they fire.

### Layer 1: distinct author identity

Every LLM commit is signed `Athenaeum Bot <bot@athenaeum.local>`. `git log --author=Athenaeum` filters its work; `git revert` over a range is one command.

### Layer 2: daily snapshot tags

A cron job at midnight server-time:

```
git tag snapshots/$(date +%Y-%m-%d) main
git push origin snapshots/$(date +%Y-%m-%d)
```

Rollback to yesterday: `git reset --hard snapshots/2026-04-25`. Tags are pushed to GitHub for off-site safety. Weekly tags (`snapshots/2026-W17`) on Sunday give coarser markers without merge work.

### Layer 3: sidecar proposals for high-risk writes

Per the table in section 6. The proposal sits in the repo as `<path>.proposed.md`. Approve via `athenaeum accept <path>`; reject by deleting the file.

### GitHub push

Auto-push to `origin/main` on commit, debounced to once every N minutes (suggest 5) to avoid hammering. Capture commits trigger the debounce timer; the timer fires and pushes whatever has accumulated. Tags push immediately when created.

### What this protects against

- *Bad LLM edit on a single file*: revert the commit, or restore from the sidecar approval flow if it was high-risk.
- *Bad LLM edit across many files*: revert by author, or `git reset --hard snapshots/yesterday`.
- *Server dies*: `git clone` from GitHub onto a new box, restart services.
- *Repo corruption*: git's content-addressed storage makes silent corruption unlikely; the daily snapshot is the canary.

What it doesn't protect against: a determined adversary, or a bug in the capture endpoint that drops data before it's written. Both are out of scope for v1.

---

## 10. The CLI

Top-level commands (each wraps a Claude Code skill invocation or a deterministic script):

```
athenaeum capture <text>           # local capture, equivalent to the HTTPS endpoint
athenaeum triage                   # invoke inbox-triage on unprocessed items
athenaeum process <path>           # source-process on a specific source file
athenaeum maintain                 # rebuild graph.json + run graph-maintain
athenaeum spar <thought-id>        # interactive sparring on a thought
athenaeum graduate <thought-id>    # invoke wiki-graduate (v2)
athenaeum digest [--week N]        # generate the periodic digest
athenaeum accept <proposal-path>   # approve a .proposed.md sidecar
athenaeum reject <proposal-path>   # delete a .proposed.md sidecar
athenaeum status                   # what's pending: inbox count, proposals, orphans
athenaeum snapshot                 # manual snapshot tag
```

The web UI shells out to these. Scheduled jobs invoke them. SSH-in usage is the same commands.

---

## 11. Dashboard (front-end)

`dashboard/` is where the v1 front-end lives. It is the prototype at `docs/ui-design/claude-design-v1/` promoted into a real frontend: same five screens (Inbox, Thinking, Thinking Focus, Wiki, Project), same Cmd+K palette, same tweaks panel — but reading from the real repo via `server/api/*` and shelling out to the CLI for actions.

Stack: keep it boring. The prototype already runs on React 18 + Babel standalone via CDN. v1 dashboard can stay that way, served as static files by `server/` with a small `/api/*` that wraps `athenaeum` CLI calls. No bundler, no build step until we have a reason.

The `docs/ui-design/claude-design-v1/` directory remains as a frozen reference once `dashboard/` exists. Future iterations (`claude-design-v2`, alternate explorations) can land back in `docs/design/`.

---

## 12. Configuration

`athenaeum.config.yaml` at the repo root:

```yaml
spaces:
  - id: ai-research
    label: AI Research
    accent: oklch(0.62 0.13 28)
  - id: economics
    label: Economics
    accent: oklch(0.55 0.10 145)
  - id: philosophy
    label: Philosophy
    accent: oklch(0.50 0.11 270)

reading_spaces: []     # populated when one is created

server:
  capture_port: 7878
  push_debounce_seconds: 300
  snapshot_cron: "0 0 * * *"

paths:
  knowledge_db: knowledge-db/
  inbox: knowledge-db/inbox/
  thinking: knowledge-db/thinking/
  sources: knowledge-db/sources/
  wiki: knowledge-db/wiki/
  projects: knowledge-db/projects/
  meta: knowledge-db/meta/
  skills: server/skills/
  dashboard: dashboard/

llm:
  bot_name: Athenaeum Bot
  bot_email: bot@athenaeum.local
  edge_kinds: [supports, contradicts, extends, questions, instance_of, supported_by, relates_to]
```

Spaces are configured here, not inferred from directory names — this lets us attach metadata (color, label, description) to each.

---

## 13. Bootstrap plan

Order of operations to go from empty repo to a system that does something useful.

### Phase 0 — Skeleton (no LLM)

1. Create the four top-level directories: `docs/`, `dashboard/`, `server/`, `knowledge-db/`.
2. Promote the existing prototype: copy `docs/ui-design/claude-design-v1/` into `dashboard/`. Rename `Knowledge OS.html` → `index.html`. Reorganize `page-*.jsx` into `pages/` and `styles*.css` into `styles/`. Leave `docs/ui-design/claude-design-v1/` in place as a frozen reference.
3. Write `athenaeum.config.yaml` at the repo root.
4. Set up Athenaeum Bot identity for system commits.
5. Stand up the capture API in `server/api/capture.py`. Test with curl.
6. Build the iOS Shortcut and browser bookmarklet pointing at the capture endpoint.
7. Wire auto-commit + debounced push + daily snapshot tag (cron scripts in `server/scheduler/`).

At this point: capture works end-to-end. `knowledge-db/inbox/` accumulates files. No LLM yet. Dashboard is reachable but mostly inert.

### Phase 1 — First skill

8. Write `server/skills/inbox-triage/SKILL.md` with input/output contract.
9. Write `server/cli/athenaeum` with a `triage` subcommand that invokes Claude Code with the skill.
10. Run triage manually a few times against accumulated inbox. Iterate on the prompt.

At this point: capture → triage → thinking spaces works.

### Phase 2 — Graph

11. Write `server/lib/graph.py` (deterministic frontmatter parser → `knowledge-db/meta/graph.json`).
12. Write `server/skills/graph-maintain/SKILL.md` (the LLM half — suggesting edges, flagging meta-ideas, detecting contradictions, on top of the rebuilt index).
13. Hook the index rebuild into the post-commit flow.
14. Add `athenaeum status` and `athenaeum maintain`.
15. Wire the dashboard's Inbox / Thinking / Wiki pages to read live data via `server/api/*`.

At this point: the graph is real and queryable, and the dashboard reflects it.

### Phase 3 — Sparring

16. Write `server/skills/thinking-spar/SKILL.md`.
17. Wire the dashboard's chat surface to it via the API layer.

At this point: the system has a soul. You can talk to it about your own thinking.

### Phase 4 — Digest

18. Write `server/skills/digest-weekly/SKILL.md`.
19. Schedule it for Sunday evenings via `server/scheduler/digest.sh`.

At this point: the system surfaces what you've forgotten. This is the moment it stops feeling like a filing system.

### Phase 5+ — Wiki, projects, meta-detection

Per section 7's v2 list. By this point we'll know which to prioritize.

---

## 14. Open questions

These are real decisions that should be made before or during the relevant phase. They are not blocking v1.

1. **Reading-space dissolution mechanics.** When a reading space dissolves, do we `git mv` files into permanent spaces, or leave them in `knowledge-db/thinking/reading/<book>/` forever and just mark the space as "completed"? Moving preserves the philosophy ("dissolves") but loses the temporal-arc context; not moving keeps context but bloats the directory tree.
2. **Inbox item retention.** Once triaged into a thinking space, does the inbox file get deleted (its content becomes a source node elsewhere), archived (`knowledge-db/inbox/_archive/`), or kept in place with a `triaged_to` field? Affects how we measure "inbox is ephemeral."
3. **Source vs. inbox-item distinction.** A captured tweet starts in `knowledge-db/inbox/` as type `inbox`. After triage, does it become a `source` in `knowledge-db/sources/tweets/`, or stay in inbox with frontmatter changes? I lean toward "becomes a source on triage" — but that's a `git mv` per item.
4. **Graph index: committed or gitignored?** Committing makes it visible in diffs (audit trail) but it churns on every change. Gitignoring keeps history clean but you lose the audit. Lean toward committing for v1; revisit if churn is painful.
5. **Server stack.** Python + Flask is boring and works. Node + Express is also boring and works. Pick the one that matches the host. (Defer until Phase 0.)
6. **Authentication for the dashboard.** v1 is single-user on a self-hosted server. Bind to `localhost` and access via SSH tunnel? Nginx with basic auth? Tailscale-only? All viable; depends on the host setup.
7. **Editing surface for thoughts.** Dashboard editor (in-browser markdown), or just open the file in the user's editor of choice via a `file://` link? The latter respects "everything is plain text" most fully.
8. **Should `knowledge-db/` become its own git submodule?** Splitting code from data means knowledge can be cloned/synced independently of the engine. v1 keeps them in one repo (one history, one snapshot). Worth revisiting once the system is real.

---

## 15. Future work (out of scope for v1)

- Long-running ambient agent (the "always-on background presence" mode).
- Multi-device sync beyond git (currently: pull from GitHub on each device).
- Mobile-native UI beyond capture.
- Federation between multiple users' Athenaeum instances (nope — design is single-user).
- Local-only LLM fallback for capture-time enrichment.
- Rich media: images, audio, video as first-class node types.
- Whisper-based voice capture pipeline.
- Search beyond grep + graph traversal (vector embeddings, semantic search).

---

## Appendix A — Worked example: capture to thinking space

1. **11:42** — User reads a tweet, taps the iOS Shortcut. The shortcut POSTs to `/inbox`. `server/api/capture.py` writes `knowledge-db/inbox/2026/04/26/114230_twitter.md` with frontmatter and body, commits as Athenaeum Bot.

2. **End of day** — User runs `athenaeum triage` (or it's run on a schedule). The skill reads unprocessed inbox files, proposes routings, writes a triage manifest:

   ```
   knowledge-db/meta/triage/2026-04-26.proposed.md
   ```

   listing each item with suggested space, kind, and any obvious edges to existing nodes.

3. **User reviews** the manifest, edits as needed, runs `athenaeum accept knowledge-db/meta/triage/2026-04-26.proposed.md`. The CLI:
   - For each accepted item, creates the appropriate node file (a source, typically) under `knowledge-db/sources/...` or `knowledge-db/thinking/<space>/...`
   - `git mv`s the inbox file to `knowledge-db/inbox/_archive/` (or deletes it — see open question 2)
   - Commits.

4. **Post-commit hook** runs `athenaeum maintain`:
   - Rebuilds `knowledge-db/meta/graph.json` (deterministic, in `server/lib/`)
   - Invokes `graph-maintain` to suggest new edges based on content similarity (writes `knowledge-db/meta/edge-suggestions.proposed.md`)
   - Flags any orphans

5. **User**, later, opens the new source in the dashboard. The Thinking Space shows the new node with its suggested neighbors. The user adds a thought node connected to it: a new file in `knowledge-db/thinking/<space>/t-<slug>.md` with frontmatter pointing at the source.

6. **Saturday evening** — `athenaeum digest` runs, surfaces:
   - "You added 4 thoughts this week, 2 of them in AI Research."
   - "This new thought (t-foo) connects to a source you ingested 6 weeks ago that you haven't revisited (s-bar) — relevant?"
   - "These two thoughts (t-foo, t-baz) seem to contradict — worth resolving?"

That last one is the system earning its keep.
