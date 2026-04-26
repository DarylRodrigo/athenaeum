# Athenaeum — Dashboard Design Spec

This document is the design companion to the system-design spec (`docs/system-design/001_system_design.md`). It covers what the dashboard *feels like*, *looks like*, and *does* — the principles that govern the front-end, the visual language, and the per-screen specifications.

The reference implementation lives at `docs/ui-design/claude-design-v1/` — a static prototype with React 18 + Babel via CDN, no build step. When this spec describes a pattern, the prototype is the canonical example. When the spec and the prototype disagree, the spec is authoritative *intent*; the prototype is what's been *tried*.

---

## 1. Design philosophy

### The dashboard is a reading room, not a SaaS dashboard

Knowledge work is slow. The dashboard should feel slow in a way that respects that: warm paper, serif body type, generous whitespace, no aggressive contrast, no notification badges, no "engagement" affordances. The aesthetic precedent is the editorial page (a long-form magazine, an academic monograph), not the analytics tool.

The user is the only person who will ever see this UI. There is no need to compete for attention, demonstrate capability, or signal activity. The interface should disappear into the work.

### Show structure, not just content

The system's value is in connections — between thoughts, sources, spaces, and projects. The UI must make those connections *visible*. Edges in the graph are typed and styled. Provenance ("built from") is shown alongside wiki articles. A project's "since you last worked here" panel surfaces what's changed in adjacent spaces. The user should never have to ask "what does this connect to?" — the answer is on the page.

### Friction proportional to commitment (visual edition)

The philosophy doc commits to friction-proportional-to-commitment as a system principle. The UI expresses it visually:

- **Capture** is a single button (large, primary, accent-colored).
- **Triage** is a row of one-click actions (✓ accept, e edit, × archive).
- **Graduation** to wiki is a multi-step affordance (the LLM proposes, the user reviews, an explicit "graduate" button finalizes).
- **Project creation** has a deliberately heavy form (goals, scope, linked spaces).

Easy things look easy. Heavy things look heavy. The visual weight of a control is its commitment cost.

### The LLM is a designated presence, not a hovering assistant

The LLM has a fixed home: the **sparring panel** (right rail, Thinking Space and Focus mode). It does not pop up over the page, take over the input, or insert itself into reading flows. When the user wants to spar, they look right; when they don't, the panel sits quietly and reads. This boundary preserves the philosophical commitment that "the human thinks, the LLM maintains" — the UI never lets the LLM crowd the human's thinking surface.

### Personalization is for taste, not productivity

The tweaks panel exists. It exposes aesthetic (warm / cool / mono), density (spacious / balanced / dense), and accent color. None of these affect functionality — they affect *feel*. This is deliberate: the user spends years inside this tool. The tool should fit them, not the other way around. There are no productivity dials, no "compact mode," no "pro mode" — just the choice of what kind of room to read in.

### What we are explicitly not building

- **Not a notification UI.** No badges, no alert toasts, no "X new things." The system surfaces what's pending in calm, located ways (a count next to "Inbox" in the sidebar; a "ready to graduate?" tag on a thought).
- **Not a real-time collaboration UI.** There are no presence indicators, comment threads, or shared cursors. Single-user, always.
- **Not a mobile UI** beyond capture. Mobile is a capture surface (iOS Shortcut → POST). The dashboard is a desk-and-keyboard tool.
- **Not a graph editor.** The graph is rendered, traversed, and selected. Edges are created and edited via thought frontmatter, not by drag-drop. (Drag-edit may come in v2.)
- **Not a productivity tool.** No timers, no streaks, no "thoughts captured this week" gamification. The weekly digest exists, but it surfaces *substance* (orphans, contradictions, forgotten sources), not metrics.

---

## 2. Visual language

### Typography

Three faces, each with a clear job:

- **Spectral** (serif) — body type for thoughts, wiki articles, and content of any length. Italic Spectral is used for editorial commentary, eyebrow text, and labels that should feel like footnotes ("reading your graph", "graph view", "recently developed").
- **Inter** (sans) — UI chrome: navigation, buttons, tags, table headers, filter pills. Anywhere the text is a label or affordance, not content.
- **JetBrains Mono** — numerical data (counts, dates), IDs, edge specifications, and code. Tabular numerals (`font-variant-numeric: tabular-nums`) for any column of figures.

The body is set in Spectral by default at 15px (balanced density). Increase the body size, never the line-height, when the user picks "spacious." Decrease both for "dense."

### Color — the warm paper palette

The default aesthetic is **warm paper**. The palette is unsaturated, slightly yellow, and explicitly low-contrast.

```
--paper:        #f6f1e7      (background)
--paper-2:      #efe8d8      (secondary surface — side cards, callouts)
--paper-edge:   #e6dec9      (subtle dividers)
--ink:          #1d1b16      (primary text)
--ink-2:        #3a362e      (secondary text — sub-headings, body alts)
--ink-3:        #6b6557      (tertiary — meta, timestamps)
--ink-4:        #9a9384      (quaternary — dim labels, edges)
--rule:         #d9d0bb      (1px dividers)
--rule-soft:    #e6dec9      (whisper-soft dividers)
--card:         #fbf7ee      (raised surface — slightly above paper)
--highlight:    #f3ecd9      (selection / hover)
```

A subtle paper grain (radial-gradient dots at ~3px spacing, 2.5% alpha) is overlaid on the body. It's nearly invisible but it kills the flatness that makes screens feel digital. Don't remove it.

### Accent system

The default accent is **oxblood** (`#8a3a2a`). Five accents ship with v1:

| accent   | hex      | feel             |
|----------|----------|------------------|
| oxblood  | #8a3a2a  | warm, scholarly  |
| ink      | #1d1b16  | austere, neutral |
| forest   | #3f5d3a  | green, grounded  |
| cobalt   | #2e4a7a  | blue, technical  |
| umber    | #7a4a1f  | brown, archival  |

Each accent ships with two derived tokens: `--accent-soft` (a desaturated lighter tint for borders and secondary marks) and `--accent-tint` (an 8–10% alpha for backgrounds).

Accent is used sparingly: meta-idea rings, the active-state of nav, primary buttons, "ready to graduate?" tags, cross-space edges in the graph, and the system's own voice ("Principle" callouts). Never for body text, never for borders that aren't communicating something.

### Space colors (semantic, not decorative)

Each thinking space has its own color, used in the graph, in tags, and in cross-references:

```
AI Research:  oklch(0.62 0.13 28)   /* warm orange-red */
Economics:    oklch(0.55 0.10 145)  /* muted green */
Philosophy:   oklch(0.50 0.11 270)  /* muted purple */
```

Reading spaces get an italic styling and a tertiary tone (`oklch(0.55 0.06 60)`). Meta-ideas use the system accent (`var(--accent)`).

The choice of `oklch` is deliberate — it gives perceptually-uniform color, which matters for a system that overlays soft regions in the graph. New spaces should be assigned colors at similar lightness/chroma so no space dominates visually.

### Density tokens

Three settings: `dense`, `balanced` (default), `spacious`. Each scales padding, gap, row height, and body font-size:

| token        | dense | balanced | spacious |
|--------------|-------|----------|----------|
| `--pad`      | 12px  | 18px     | 26px     |
| `--gap`      | 8px   | 14px     | 20px     |
| `--row`      | 42px  | 56px     | 68px     |
| `--fs-body`  | 13.5  | 15       | 16       |
| `--fs-small` | 11.5  | 12.5     | 13       |

Density is set on `body[data-density]`. New components should consume these tokens, not hard-code spacing.

### Aesthetic variants

- **warm** (default) — the paper palette above.
- **cool** — desaturated greens replace warm yellows. Same ink scale.
- **mono** — both serif and sans collapse to JetBrains Mono. Slightly cooler paper. Use for users who want a typewriter feel; useful while drafting.

Aesthetic is set on `body[data-aesthetic]` and switches via the tweaks panel.

### Iconography

Avoid icon fonts and SVG icon libraries. The prototype uses single-character glyphs (`✉`, `T`, `W`, `P`, `+`, `×`, `↑`, `⌕`, `⊞`, `≡`) rendered in the active typeface. This:

- keeps the bundle tiny (no icon dependencies)
- inherits the page's typographic feel
- makes localization and substitution trivial

Add new "icons" by picking a Unicode character that fits the typeface. If a glyph would benefit from being graphical (the source-kind marks in inbox rows, the AI badge in sparring), use a span with a character + careful styling, not an inline SVG.

---

## 3. Theming system

### CSS variable hierarchy

All theme tokens are CSS custom properties on `:root` or `body[data-*]` selectors. Three layers, in cascade order:

1. **`:root`** — base tokens (paper palette, ink scale, type stack, default density).
2. **`body[data-density="…"]`** — overrides the spacing scale.
3. **`body[data-aesthetic="…"]`** — overrides the palette and (for mono) the type stack.
4. **`document.documentElement`** — accent overrides (set by JS in `app.jsx` based on tweaks state).

Components must consume these variables. Never hard-code a color or spacing value in a page or component.

### The tweaks panel

A draggable, dismissible overlay (`tweaks-panel.jsx`) exposes:

- **Aesthetic** — radio: warm / cool / mono
- **Density** — radio: dense / balanced / spacious
- **Accent** — select: oxblood / ink / forest / cobalt / umber
- **Page** — radio: inbox / thinking / thinking2 / wiki / project (dev convenience; remove in production or hide behind a key shortcut)
- **Show sparring** — toggle (per-page state for hiding the right rail)

The tweaks panel is a *meta* surface — it controls how the dashboard renders, not what's in it. It should never overlap content; it should sit at a fixed corner and be tucked away by default.

### Layered stylesheets

The prototype uses three stylesheets in cascade order:

1. **`base.css`** — root tokens, the app shell, base components, the paper-grain background.
2. **`overrides.css`** — page-level layouts (`.inbox-grid`, `.ts-grid`, `.wiki-grid`, `.proj-grid`), specialized components (sparring panel, journal entries, side cards).
3. **`focus.css`** — overrides for focus mode (full-bleed graph, multi-pane right rail, draggable panes).

Keep this layering on the real frontend. It maps to the conceptual stack: tokens → page layouts → mode overrides. New styles go to whichever layer they belong to.

---

## 4. Layout system

### Shell

Two columns: a fixed 240px sidebar and a fluid main area.

```
┌─────────┬──────────────────────────────────────────────┐
│ Sidebar │ Main                                         │
│ (240px) │ (1fr)                                        │
└─────────┴──────────────────────────────────────────────┘
```

**Sidebar** contains:
- Brand block: a small dot in the accent color, "Athenaeum", "Knowledge OS" in italic Spectral.
- Layers nav (Inbox, Thinking Space, Wiki, Project) — each with a glyph, label, and count.
- Spaces list (AI Research, Economics, Philosophy, Reading: …) — colored swatch + label.
- Projects list — italic, no swatch.

**Topbar** spans the main area:
- Screen label ("01 Inbox", "02 Thinking Space", etc.) in italic Spectral.
- Breadcrumb where: e.g. "Cross-space view" / "Concepts / Proxy–Target Collapse".
- Right side: command palette trigger (⌘K hint), tweaks toggle.

### Page template

Every page (Inbox, Thinking, Wiki, Project) follows the same shape:

```
┌──────────────────────────────────────────────────────┐
│ Page header                                          │
│   Eyebrow ("Layer 1 — Capture buffer")               │
│   Page title (Spectral, large, with italic subtitle) │
│   Page sub (one sentence stating the page's purpose) │
│   Actions (right-aligned button row)                 │
├──────────────────────────────────────────────────────┤
│ Content grid (page-specific — see screen specs)      │
└──────────────────────────────────────────────────────┘
```

The eyebrow is a 9-letter-spaced uppercase Inter caption. The page title pairs an upright Spectral primary with an italic Spectral subtitle ("Inbox *— 47 items pending triage*"). The page sub is a single sentence, Spectral, italic only where editorial.

### Side cards

A recurring component used across screens for ancillary information:

```
┌─────────────────────┐
│ Eyebrow             │
│ H4 title            │
│ ────────────        │
│ content rows        │
└─────────────────────┘
```

Side cards are always in the right rail. Their default surface is `var(--card)`, but a "principle" or "tension" card uses `var(--paper-2)` and an accent-colored eyebrow. They contain stat rows, lists of links, or a single short paragraph — never long-form content.

### Three-column variant

Wiki, Project, and Thinking Space pages add a right rail:

```
┌─────────┬──────────────┬──────────┐
│ Sidebar │ Main content │ Right rail│
│ (240)   │ (1fr)        │ (320–360)│
└─────────┴──────────────┴──────────┘
```

The right rail varies by screen — provenance on Wiki, sparring on Thinking, briefing on Project. It is always **scrollable independently** from the main column. On narrow viewports it collapses below the main content (mobile display is out of scope for v1, but future-narrowing should be a clean stack, not a hide).

---

## 5. Screen specs

### 5.1 Inbox (Layer 1)

```
┌──────────────────────────────────────────────────────────────┐
│ Eyebrow: LAYER 1 — CAPTURE BUFFER                            │
│ Inbox — 47 items pending triage                              │
│ A buffer, not a destination. Route each capture to a         │
│ thinking space, a reading list, or the bin.                  │
│                                          [Archive][+ Capture]│
├────────────────────────────────────┬─────────────────────────┤
│ Toolbar: search · all/today/read   │ Side cards:             │
├────────────────────────────────────┤  · Triage state         │
│ Row: when │ src │ body │ → route   │  · Routing legend       │
│ Row: when │ src │ body │ → route   │  · Principle quote      │
│ Row: ...                           │                         │
└────────────────────────────────────┴─────────────────────────┘
```

**Inbox row.** Five-column grid: `when | source-icon | body | suggested-route | actions`.

- `when` is a relative time ("11:42", "Yest", "Mon"), tabular numerals, ink-3.
- `source-icon` is a single-character disc — first letter of source, in the source's color (Twitter blue-ish, arXiv warm, voice memo gray).
- `body` is the captured text, italic Spectral. A muted suffix shows source meta ("@kanjun · 2 replies", "arxiv.org/2210.10760 · 31 pages").
- `suggested-route` shows the LLM's proposed routing: "→ route to **AI Research**". Bold the destination space. The space name is colored by space tag.
- `actions` are three icon-buttons: ✓ (accept routing), e (edit), × (archive). Hover-only by default; visible always on the selected row.

**Toolbar.** Search input on the left (paper-edge border, italic placeholder, magnifying-glass glyph). Filter pills on the right: "All 47 / Today 3 / To read 12". Active pill uses the accent.

**Side cards.**
- *Triage state*: "Captured 82 / Routed 31 / Filed 19 / Discarded 11 / Pending 21" stats. Pending is accent-colored.
- *Routing legend*: each space tag with its pending count. Helps the user see which spaces are being filled.
- *Principle*: italic block-quote callout — ("An inbox that grows indefinitely is a graveyard, not a system."). One per page. Use sparingly.

**Empty state.** "All clear. Capture in the wild and check back tomorrow." — italic Spectral, paper-2 background, no illustration.

---

### 5.2 Thinking Space (Layer 2 — cross-space view)

The default Thinking Space view is a graph + thoughts list + sparring panel. This is the page where the user spends most of their time *exploring*; Focus mode (5.3) is where they spend their *editing* time.

```
┌────────────────────────────────────┬────────────────────────┐
│ Eyebrow: LAYER 2 — WHERE COGNITION HAPPENS                  │
│ Thinking — graph view                                       │
│ A unified graph of thoughts, sources, and meta-ideas...     │
│                                  [Canvas][Outline][+ thought]│
├────────────────────────────────────┼────────────────────────┤
│ Graph wrap                         │ Sparring panel         │
│   toolbar: counts · legend · pills │   (right rail, sticky) │
│   SVG graph (full bleed in box)    │                        │
├────────────────────────────────────┤                        │
│ Active thoughts (list)             │                        │
│   thought card: tag · title · meta │                        │
│   thought card: ...                │                        │
└────────────────────────────────────┴────────────────────────┘
```

**Graph.** Hand-laid in v1 (positions are constants in the JSX). Three space "blobs" rendered as soft radial-gradient ellipses behind the nodes. Three node types:

- **Thought** (filled circle, space color, label always shown).
- **Source** (paper-filled circle with colored stroke, smaller, label hidden by default — visible on hover or selection).
- **Meta-idea** (filled accent circle with one or two dashed concentric rings; label always shown in italic Spectral).

**Edges.** Two visual axes:
- *Within-space* (faint ink-4 line, no dash).
- *Cross-space* (accent color, dashed).
And a second axis:
- *Human-confirmed* (solid stroke).
- *LLM-suggested* (dashed pattern).

So a cross-space LLM-suggested edge gets a dashed accent line; an intra-space human edge gets a solid faint line. On hover, the edge thickens, color shifts to the relation type's color (`supports` ink-4, `extends` green, `contradicts` red, `foundation` accent), and a small label appears at the midpoint with the relation kind and provenance ("LLM-suggested" or "you confirmed").

**Active thoughts list.** Below the graph, a vertical stack of thought cards. Each card:

- Top: space tag(s), and conditional accent tag ("ready to graduate?") when the LLM thinks the thought is mature.
- Title: Spectral, 18px, ink.
- Meta row: "6 sources · 9 edges · last edited 14d ago", JetBrains Mono, ink-3.

Clicking a thought selects it (highlights in graph, opens in sparring context, can be opened in Focus mode via Cmd+Enter).

**Sparring panel.** Right rail, 320px wide, sticky.

```
┌─────────────────────────────┐
│ [A] Sparring partner        │
│     reading your graph      │
│                       Mode C│
├─────────────────────────────┤
│ AI: You wrote three weeks   │
│ ago that ...                │
│                             │
│ You: Maybe both — universal │
│ in form but variable...     │
│                             │
│ AI: That reframes it as a   │
│ parameter. Two sources...   │
│   ↗ Gao et al. — Scaling... │
│   ↗ Cowen — tight loops...  │
│                             │
├─────────────────────────────┤
│ [Push back, ask, develop…]  │
│                          [↵]│
└─────────────────────────────┘
```

- A small "A" mark in accent-tint (the LLM's identity token).
- "Sparring partner" / "reading your graph" / "Mode C" badge — three small pieces of metadata, one always-visible.
- Body: messages alternate `.spar-msg.ai` (paper-2 background) and `.spar-msg.you` (paper background, indented). AI messages can include cited callouts (`<span className="cite">…</span>` — boxed quote of the user's prior thinking) and inline suggestion rows.
- Suggestions inside an AI message are clickable affordances ("+ propose meta-idea X", "— not now"). They write to the graph as proposals on confirmation.
- Input: textarea with italic placeholder, send button on the right. The send button is `var(--accent)`, the only persistently-accent-colored control on the page besides "+ New thought".

**Toolbar above the graph.** Counts ("132 thoughts · 87 sources · 4 meta-ideas") in italic Spectral. A legend of swatch+label for each space. Filter pills on the right: "All / Bridges only / Orphans" — these are the most useful graph filters and should be one-click.

---

### 5.3 Thinking Space — Focus mode (Layer 2, editing)

Focus mode is the deep-work surface. The graph goes full-bleed; the right rail becomes a multi-pane stack of open thoughts and the sparring partner.

```
┌─────────────────────────────────────────┬──────────────────┐
│                                         │ Pane: thought    │
│           Full-bleed graph              │  · body / conn / │
│           (SVG with grid pattern,       │    sources tabs  │
│            larger, more nodes shown)    │                  │
│                                         ├──────────────────┤
│           click a node to               │ Pane: thought    │
│           open it in the right rail     │                  │
│                                         ├──────────────────┤
│                                         │ Sparring         │
│                                         │  (Cmd+L adds the │
│                                         │   focused pane   │
│                                         │   to the chat)   │
└─────────────────────────────────────────┴──────────────────┘
```

**Graph behavior.** When a node is selected, non-neighbor nodes dim to 25% opacity. Hovering an edge reveals its relation kind and provenance in a small mid-line tooltip. Sources show their label only when hovered; thoughts always show theirs. The grid-paper pattern (radial dots) appears as the graph background at higher zoom.

**Multi-pane right rail.** Open thoughts stack in panes that can be:
- *Closed* (×)
- *Focused* (clicked — the focused pane has accent border)
- *Sent to chat* (Cmd+L on a focused pane, or button — adds the thought as a citation in the sparring panel)

Each pane has tabs: **Body** (textarea editor), **Connections** (list of edges with relation kind), **Sources** (list of supporting sources). The bottom of each pane has a "Save" button and an unsaved-state indicator.

**Sparring panel.** Same component as in 5.2, anchored at the bottom of the right rail. The "active" thought in the rail can be referenced from the chat by ID — or pushed in via Cmd+L.

**When to enter focus mode.** From the cross-space view, double-click a thought, press Cmd+Enter, or use the command palette ("Open in focus"). From elsewhere, the sidebar's "Thinking Space" link routes to cross-space; focus is always entered from a specific thought.

---

### 5.4 Wiki (Layer 3)

The wiki page is *editorial*: it should read like a magazine article, not like a Notion page. The center column is the article. The left rail is a TOC; the right rail is provenance.

```
┌──────────┬──────────────────────────────────────┬──────────┐
│ TOC      │ Article                              │ Side     │
│ (sticky) │   Eyebrow                            │  · Prov. │
│  Concepts│   Title                              │  · Cross │
│   ▸ Goodh│   Sub                                │    refs  │
│   • Prox.│                                      │  · Tens. │
│   ▸ Lega.│   Drop-cap paragraph                 │          │
│  Methods │   ...                                │          │
│  Frame.. │   ## Section                         │          │
│  Meta..  │   ### Subsection                     │          │
│          │   ...                                │          │
└──────────┴──────────────────────────────────────┴──────────┘
```

**TOC.** Fixed 200px left within the main area. Sections render as small caps Inter labels (`<h5>Concepts</h5>`); articles within a section as ink-2 anchors. Sub-articles indent. Current article is accent-colored and bordered on the left.

**Article.** Centered column with maximum line length around 72ch. Set in Spectral, 17px, line-height 1.7. Drop-cap on the first paragraph (3 lines high, accent color, no decoration). Inline wikilinks (`<span className="wlink">Goodhart's Law</span>`) are accent-colored, no underline, with a subtle underline on hover. Block quotes are indented with an italic accent-colored left border.

**Article meta strip.** Just below the sub, a single row of meta items separated by `·`: "Last revised · 4 days ago | Bridges · AI Research, Economics, Philosophy | Provenance · 8 thoughts, 11 sources | Status · stable". Inter, 12.5px, ink-3. Bold labels.

**Provenance side card.** This is the wiki page's most important affordance. Every thought, source, and meta-idea that the LLM consulted to produce the article appears as a small row with:
- Type mark (`t`/`s`/`m` in a small disc)
- Title
- Origin ("THOUGHT · Philosophy · 14d", "SOURCE · arxiv 2210.10760", "BRIDGES 3 SPACES")

Clicking a row opens that node in a side-drawer or Thinking Space (TBD — see open question 7 in the system spec).

**Cross-references side card.** A list of related wiki articles, with their kind ("concept", "method", "framework") as a small label. Click to navigate.

**Tension card.** When the graph maintenance has flagged a contradiction between the article and a recent thought, a `--paper-2` accent-eyebrow card surfaces it: "A new thought in *AI Research* contradicts the 'inversion' claim. Review?" with a one-click action.

---

### 5.5 Project (Layer 4)

The project page is journal-first. The journal is the most prominent surface; tasks come below; the right rail is a "since you last worked here" briefing plus linked-knowledge cards.

```
┌──────────────────────────────────────┬───────────────────────┐
│ Eyebrow: LAYER 4 — WHERE THINKING BECOMES BUILDING            │
│ Mechanism Spec v0                                              │
│ A working draft of...                                          │
│                              [Briefing][Open repo][+ Entry]    │
├──────────────────────────────────────┼───────────────────────┤
│ Meta strip (started · status · ...)  │                       │
│ Progress bar                         │                       │
├──────────────────────────────────────┤                       │
│ Project journal                      │ Briefing              │
│   2026-04-24 — THU                   │  · 2 new thoughts...  │
│     Reframing what this project is   │  · 1 paper tagged...  │
│     [body paragraphs, italic refs]   │  · Wiki revised...    │
│   2026-04-22 — TUE                   │  · meta-idea forming  │
│     What v0 needs to demonstrate     │                       │
│     ...                              ├───────────────────────┤
│   ...                                │ Drawing on            │
├──────────────────────────────────────┤  · linked knowledge   │
│ Backlog                              │                       │
│   ✓ task | when | who                ├───────────────────────┤
│   ✓ task | when | who                │ Push back card        │
│   ☐ task | when | who                │  "Working on this     │
└──────────────────────────────────────┴───────────────────────┘
```

**Project journal.** The single most important component on the page. Visually distinct: paper-2 background, accent rule along the left edge, "Human-only · no LLM writes" mark in the top-right corner. Each entry has:
- Date stamp (`2026-04-24 — THU`) in JetBrains Mono small caps, ink-3.
- Title (Spectral, 18px, ink).
- Body paragraphs (Spectral, 15px, ink-2).
- Inline references to other nodes (`<span className="ref">Proxy–Target Collapse</span>`) — accent-colored, hover underline.

**The journal must visually telegraph that it is human-authored.** No assistive UI overlays, no "AI suggestions," no inline edit chips. The user types Markdown, the system renders it. That's the entire interaction surface for the journal.

**Backlog.** A flat task list. Each row: checkbox · title · due-date · assignee. No priorities, no labels, no tags. The backlog syncs with `/TODO.md` in the project's directory — the markdown file is the source of truth. Italic note above the list says so explicitly: "*flat markdown · synced with /TODO.md*". This sets expectations.

**Briefing card.** "Since you last worked here" — the most distinctive Project affordance. Four-ish rows, each with:
- Type icon (`t`/`s`/`w`/`m`)
- Bold count or fact ("**2 new thoughts**", "**1 paper** tagged relevant", "**Wiki article** … was revised", "A meta-idea is **forming around** …")
- Italic rationale (which space, which paper, what changed).

**Drawing on (linked-knowledge card).** A list of nodes the project is built on top of: wiki articles, thoughts, sources. Each row: a small "kind" tag and the title. This is the project's read-only window into the rest of the system.

**Push back card.** A small `--paper-2` card with an accent eyebrow ("Push back"). One sentence: "Working on this taught you something general? Send it back to a thinking space." One button: "Capture insight → Economics" (the destination is inferred from linked spaces).

This card is the visual implementation of the philosophy's "PROJECT → THINKING SPACE (human-initiated only)" flow. The button is human-initiated; nothing auto-fires.

**Progress bar.** Just under the meta strip. A thin paper-edge channel filled to N% with the accent. "38% · 6/16 milestones" in tabular numerals to the right. Optional — for projects without milestones, hide.

---

## 6. Cross-cutting patterns

### Tags

A tag is a colored swatch + label, used for spaces and statuses. Three flavors:

- **Space tag** (`<span class="tag ai"><span class="swatch"></span>AI Research</span>`) — soft 1px border in the space color, swatch in same color, label in ink.
- **Status tag** ("ready to graduate?", "● editing", "● unsaved") — accent-colored border and text, no swatch.
- **Kind tag** ("concept", "method", "framework", "thought", "source") — small caps Inter, no border, used inside lists.

Tags are not buttons. They are labels. If you want a clickable space pill, use a **filter pill**.

### Filter pills

Used in toolbars (Inbox, Thinking, Wiki). Rounded, 1px paper-edge border, hover-darken, active-state uses `var(--accent-tint)` background and accent text. A small `<span class="num">12</span>` count is allowed inside a pill ("Today 3").

### Buttons

Three weights:

- **Primary** (`btn primary`) — accent background, paper text. One per page (the page's primary action: "+ Capture", "+ New thought", "Graduate", "+ Entry").
- **Ghost** (`btn ghost`) — paper background, ink-2 text, paper-edge border. Most secondary actions.
- **Icon** (`icon-btn`) — single character, no background, ink-3. Use in row actions.

Primary button glyphs (`+`, `↑`, `↗`) are inline characters — no leading icons.

### Eyebrow

A tiny uppercase Inter caption (9–11px, letter-spaced, ink-3) that sits above page titles, side-card titles, and wiki article opens. Used everywhere a "kicker" line would appear in a magazine.

### Page title

Two-part: an upright Spectral primary and an italic Spectral subtitle ("Inbox *— 47 items pending triage*"). The subtitle does not wrap to a new line; if it must, drop it to a second line in 80% gray.

### Meta-row

A single line of `·`-separated stats below a title or below an article subtitle. Inter, 12.5px, ink-3. **Bold** labels; ink secondary values. Use when there are 3–5 facts that don't merit a card.

### Empty states

Always italic Spectral, never an illustration. Examples:
- "All clear. Capture in the wild and check back tomorrow." (Inbox empty)
- "Nothing here yet. Open a thought to start sparring." (Sparring empty)
- "No projects yet. Create one when you're ready to converge." (Projects empty)

The empty state should restate the philosophy in a sentence.

---

## 7. Interactions

### Command palette (Cmd/Ctrl + K)

A modal centered overlay (paper background, accent caret) with:

- Search field (italic placeholder: "Type a command, jump to a thought, ask the system…").
- Results list, grouped: **Pages**, **Thoughts**, **Wiki**, **Projects**, **Commands**.
- Recent items at the top when the field is empty.

Keyboard: arrows to navigate, Enter to select, Esc to close. Mouse: click to select, click outside to close.

The palette is the universal verb input — anywhere in the dashboard, the user can press ⌘K and run "Triage inbox", "New thought", "Graduate t-foo", "Open Mechanism Spec", "Ask the system about t-bar". Its existence is a load-bearing UX commitment: every action must be addressable from the palette.

### Keyboard shortcuts (v1)

| key            | action                                        |
|----------------|-----------------------------------------------|
| ⌘/Ctrl + K     | Command palette                               |
| ⌘/Ctrl + L     | Add focused thought to sparring chat          |
| ⌘/Ctrl + Enter | Open selected thought in Focus mode           |
| ⌘/Ctrl + S     | Save current thought / journal entry          |
| Esc            | Close current pane / palette / modal          |
| /              | Focus search in current toolbar               |

The list is intentionally short. Every shortcut has a visible affordance (a pane footer hint, a tweaks panel listing) — no hidden chords.

### State indication

The dashboard uses a small set of dot indicators, all derived from `--accent`:

- `● editing` — current pane is being edited
- `● unsaved` — pane has uncommitted changes
- `● proposal pending` — a sidecar `.proposed.md` is waiting for review

These appear inline in pane headers and sidebar items. They are calm — no pulsing, no red, no bouncing badges.

### Sparring interactions

- **AI message with suggestion rows** — clicking a `+ propose …` suggestion writes a `.proposed.md` and surfaces a confirmation toast (paper card, bottom-right, auto-dismiss 4s) with an "Undo" link.
- **AI message with citation** — clicking the cited quote scrolls the relevant thought into view in the right rail (or opens it).
- **User message** — sent on Enter unless Shift+Enter, which makes a newline.
- **Mode label** — "Mode C" badge is a click target that explains what Mode C is (a small popover). Same for Mode A and B when they appear (e.g., a digest indicator in the sidebar).

### Hover and selection

The dashboard is generous with hover states because it's a desk tool. Every clickable element has a hover style — inbox rows lift their actions in, graph nodes show their label, edges thicken and label themselves. Selection is more reserved: only one thing is selected at a time within a column.

---

## 8. Surfaces that need real engineering (versus the prototype)

The prototype gets the surface right but mocks the data. v1 dashboard needs to:

1. **Read live data from `knowledge-db/`** via a `server/api/*` layer. Pages fetch their data on mount; no client-side caching beyond the React component tree.
2. **Wire actions to the `athenaeum` CLI** through `server/api/*` — "Triage inbox", "Accept proposal", "Graduate thought", "Send to sparring" — all invoke CLI subcommands.
3. **Render the graph from `knowledge-db/meta/graph.json`** — the prototype's hand-laid positions become a layout pass on real data. v1 can use a simple force-directed layout (D3 force or similar) with manual position overrides where the user has dragged a node. (Manual positions persist in the graph index.)
4. **Editor surface for thoughts** — replace the prototype's textareas with a real markdown editor (CodeMirror, ProseMirror, or just a textarea + preview pane). See open question 7 in the system spec.
5. **Tweaks persistence** — current tweaks state lives in JS state. v1 should persist to `localStorage` (per-device) and optionally to a `dashboard.tweaks.yaml` (per-repo, if the user wants their setup to follow them between machines).
6. **Auth** — bind to localhost / SSH-tunnel by default (see system spec open question 6).

---

## 9. What this spec doesn't yet pin down

These are real decisions for the build, not blockers for the spec:

1. **Markdown editor choice.** CodeMirror gives serious editing affordances (folding, headings, syntax highlight); a plain textarea is the most "plain text" answer; ProseMirror is overkill but pretty. The choice affects the feel of every thought-editing session.
2. **Graph layout algorithm.** Force-directed is the obvious choice but produces "graph hairball" results past ~200 nodes. Manual positions per node (persisted) might be necessary. Worth a research pass.
3. **Mobile read view.** Capture on mobile is solved (the iOS Shortcut). But a *read-only* mobile view of the dashboard ("show me my inbox" while away from the desk) might be useful. Out of scope for v1, but worth flagging that the layouts should degrade cleanly to one-column.
4. **Print stylesheet for wiki articles.** A surprising amount of value: print a wiki article, mark it up by hand, capture annotations back via inbox. Almost free if the typography is right.
5. **Dark mode.** Not in v1. The paper aesthetic assumes light. A dark variant is possible but is its own design pass.
6. **Animation.** Currently zero — selections are instant, panes appear, dialogs pop. A small budget of transition durations (150ms for hovers, 200ms for state changes) would soften without feeling animated. Don't go further.
7. **Accessibility.** The paper palette has acceptable but not stellar contrast (`--ink` on `--paper` is around 11:1, fine; `--ink-3` on `--paper` is around 4.5:1, borderline). Color-coded space tags need a non-color affordance for color-blind users (the swatch shape, the label). A WCAG AA pass is required before v1 ships.

---

## 10. Implementation notes for `dashboard/`

When the prototype is promoted to `dashboard/` during Phase 0:

- **Rename `Knowledge OS.html` → `index.html`.** It becomes the entry point.
- **Reorganize `page-*.jsx` into `dashboard/pages/`.** Each page is a single file (`pages/inbox.jsx`, `pages/thinking.jsx`, etc.).
- **Reorganize CSS into `dashboard/styles/`** as `base.css`, `overrides.css`, `focus.css`. The cascade order is preserved by `<link>` order in `index.html`.
- **Keep `data.js` initially** as a fallback / dev surface, but wire pages to fetch from `/api/*` on mount and fall back to `window.DATA` only when the API is unreachable. This makes the prototype-style demo mode still work while developing the live integration.
- **Don't introduce a bundler yet.** React 18 + Babel standalone via CDN is fine. Add a build step only when the dashboard outgrows browser-side JSX transpilation.
- **Keep the tweaks panel.** It is essential to "fit the tool to the user."
- **Move the development "Page" radio in tweaks behind a query-string flag (`?dev=1`)** so it doesn't appear in the user-facing tweaks panel.

---

## Appendix A — The five screens, one-line descriptions

For quick reference:

- **Inbox** — *list of unprocessed captures with one-click triage actions.*
- **Thinking Space** — *graph + active-thoughts list + sparring rail.*
- **Thinking Focus** — *full-bleed graph + multi-pane thought editor + sparring.*
- **Wiki** — *editorial article reader with provenance and cross-references.*
- **Project** — *journal-first page with backlog and a "since-you-last-worked-here" briefing.*

If a screen ever needs a paragraph to describe, it's doing too much.
