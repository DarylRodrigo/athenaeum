# CLAUDE.md

Guidance for Claude (and any other AI collaborator) working in this repository.

## What this project is

**Athenaeum** is a Personal Knowledge Operating System — a single-user environment for the full lifecycle of intellectual work: capturing ideas, developing thinking, crystallizing knowledge, and applying it in projects. It is *not* a note-taking app, search engine, or project manager. It is the connective tissue between how its user discovers, thinks, and builds.

The full design rationale lives in `docs/philosophy/001_design_philosophy.md`. Read that file before making any non-trivial change — it is the source of truth for how the system should behave. The implementation companion is `docs/system-design/001_system_design.md`, which translates the philosophy into concrete architecture (repo layout, frontmatter schema, capture API, skill catalog, bootstrap plan).

> Note on names: the product is **Athenaeum**, but the repository folder is still `anthanaeum/` (misspelled). The folder rename is pending — once it's done, update any external references (clones, bookmarks, CI paths) accordingly.

## Repository layout

```
.
├── README.md                          # currently a stub ("### Learning System")
├── CLAUDE.md                          # this file
└── docs/
    ├── philosophy/
    │   ├── 001_design_philosophy.md   # design philosophy — the canonical doc
    │   └── 002_ux_design.md           # currently a duplicate of 001 (placeholder)
    ├── system-design/
    │   ├── 001_system_design.md      # v1 implementation spec
    │   └── 003_mvp_server.md         # MVP server (no LLM yet)
    └── ui-design/
        ├── 002_dashboard_design.md   # dashboard design spec
        └── claude-design-v1/          # interactive HTML/React prototype
            ├── Knowledge OS.html      # entry point — open in a browser
            ├── app.jsx                # root component, page routing, tweaks
            ├── shell.jsx              # sidebar, topbar, command palette
            ├── page-inbox.jsx         # Layer 1 — Inbox
            ├── page-thinking.jsx      # Layer 2 — Thinking Space (cross-space)
            ├── page-thinking-v2.jsx   # Layer 2 — Focus mode
            ├── page-wiki.jsx          # Layer 3 — Wiki
            ├── page-project.jsx       # Layer 4 — Project
            ├── tweaks-panel.jsx       # in-app aesthetic/density/accent controls
            ├── data.js                # sample data (DATA global)
            ├── styles.css             # base styles
            ├── styles-v2.css          # layered overrides
            └── styles-focus.css       # focus-mode styles
```

## Core vocabulary

These terms have specific meanings throughout the codebase and docs. Use them precisely.

- **Inbox** — Layer 1. Friction-free capture buffer. Ephemeral by design.
- **Thinking Space** — Layer 2. A living graph of thoughts, sources, and meta-ideas. Soft-bounded regions of one unified graph.
- **Reading Space** — a temporary sub-region of the graph, dissolves when a book/course is finished.
- **Wiki** — Layer 3. Crystallized, reference-quality articles. Articles maintain provenance back to thinking-space thoughts.
- **Project** — Layer 4. Convergent, goal-oriented work. The **project journal** is human-only.
- **Meta layer** — global index, reading list, flow log, periodic digest. LLM-maintained.
- **Node types** — *thought*, *source*, *meta-idea*. Edges are first-class.
- **Modes** — *Mode A* (graph maintenance, background), *Mode B* (source processing, on ingestion), *Mode C* (intellectual sparring, on demand, primary).

## Design beliefs Claude must respect

These are the load-bearing principles from the philosophy doc. Treat any proposed change against them as a red flag and surface the conflict before proceeding.

1. **The human thinks, the LLM maintains.** Never generate thoughts, opinions, or wiki content unprompted. Claude's job is to surface, structure, challenge, and connect — not to author.
2. **Connections matter more than content.** Anything that strengthens edge-discovery, contradiction-detection, or cross-space surfacing is favored over anything that just adds more nodes.
3. **Knowledge matures, it doesn't just accumulate.** Inbox → Thinking Space → Wiki is a maturation pipeline, not a filing system. No skipping layers.
4. **Friction proportional to commitment.** Capture is near-zero friction; graduation to wiki and project creation are deliberate.
5. **Cross-pollination is a feature.** Soft space boundaries exist on purpose — don't propose hard silos.
6. **Plain text, git-versioned.** Markdown + JSON in a git repo. No proprietary formats. No database that can corrupt. The user must be able to read everything with a text editor.
7. **Surface what the user has forgotten.** Stale-but-relevant sources, contradictions, orphan thoughts — these are first-class outputs.
8. **The project journal is sacred.** Never auto-edit it. Suggest only.

## Information flow (do not bypass)

```
INBOX ──→ THINKING SPACE ──→ WIKI
                       └──→ PROJECT
PROJECT ──→ THINKING SPACE   (human-initiated only)
WIKI    ──→ PROJECT
READING SPACE ──→ THINKING SPACES   (on completion)
```

Nothing flows directly from inbox to wiki or inbox to project. Everything passes through a thinking space.

## Target top-level structure (per the v1 spec)

The system-design spec defines four root folders. These do not all exist yet — Phase 0 of the bootstrap creates them:

- **`docs/`** — design docs, philosophy, this file (exists)
- **`dashboard/`** — front-end (doesn't exist; the prototype at `docs/ui-design/claude-design-v1/` will be promoted here)
- **`server/`** — back-end: API, CLI, scheduler, skills (doesn't exist)
- **`knowledge-db/`** — the knowledge graph data: inbox, thinking, sources, wiki, projects, meta (doesn't exist)

Until Phase 0 runs, the only thing in the repo is `docs/`. Don't create the other three speculatively — wait for the bootstrap step that calls for it.

## Working with the prototype

`docs/ui-design/claude-design-v1/` is a static prototype. There is no build step. It will be promoted into `dashboard/` during Phase 0; until then, it stays where it is.

- **To run:** open `Knowledge OS.html` directly in a browser. React 18, ReactDOM, and Babel standalone are loaded from `unpkg.com`; JSX is transpiled in-browser.
- **No bundler, no package manager, no Node dependencies.** Don't introduce them without an explicit ask.
- **State management:** plain `useState`/`useEffect`. No Redux, Zustand, etc.
- **Styling:** hand-written CSS in three layered files (`styles.css` → `styles-v2.css` → `styles-focus.css`). CSS variables drive the aesthetic/density/accent system from the tweaks panel. Theme variables to know: `--accent`, `--accent-soft`, `--accent-tint`, `data-aesthetic`, `data-density`, `data-focus`.
- **Data:** mock content lives on `window.DATA` in `data.js`. There is no backend.
- **Page routing:** `page` state in `app.jsx` switches among `inbox | thinking | thinking2 | wiki | project`.
- **Command palette:** `Cmd/Ctrl+K`.

When editing the prototype, keep it self-contained — the value here is that the user can open one HTML file and see the whole thing.

## Conventions

- **Markdown for prose, JSX/JS for the prototype, JSON for structured data.**
- **Filenames already in the repo are intentionally numbered** (`001_…`, `002_…`). Continue the pattern when adding new philosophy docs.
- **Prefer adding a new file over rewriting an existing one** when the content is meaningfully different — past versions are useful context for future thinking.
- **Don't introduce framework lock-in.** Vanilla React + CSS is a deliberate choice; a future port to a different stack should remain cheap.
- **Don't add tracking, analytics, or third-party SaaS dependencies.** Single-user, local, plain-text is the model.


## When in doubt

Re-read `docs/philosophy/001_design_philosophy.md`. If a request seems to conflict with it, raise the conflict explicitly rather than silently resolving it.
