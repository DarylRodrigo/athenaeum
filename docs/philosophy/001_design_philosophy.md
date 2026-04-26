# Personal Knowledge Operating System — Design Philosophy

## Core Premise

This system exists to support a single person's intellectual life: the continuous cycle of encountering ideas, developing thinking, solidifying knowledge, and applying it to projects. It is not a note-taking app, not a search engine, not a project manager. It is the connective tissue between how you *discover*, how you *think*, and how you *build*.

The system is designed around one fundamental observation: **knowledge moves through phases of maturity**, and each phase requires different treatment. A half-formed thought captured during a documentary is not the same as a well-developed position on economic incentive design, which is not the same as a concrete task in a project backlog. The system respects these differences rather than flattening everything into "notes."

---

## The Five Layers

### Layer 1: The Inbox — Capture Without Friction

The inbox is a buffer, not a destination. Its only job is to eliminate the gap between having a thought and recording it. No categorization required. No tagging required. No complete sentences required. A thought, a URL, a voice memo transcript, a screenshot — anything goes in.

**Principles:**

- **Zero-friction capture is non-negotiable.** If it takes more than 10 seconds to add something to the inbox, the system has failed. Most thoughts occur when you're doing something else — watching, reading, walking, talking. The capture mechanism must meet you where you are.
- **Inbox items are ephemeral by design.** They exist to be triaged, not to accumulate. An inbox that grows indefinitely is a graveyard, not a system. Regular triage (daily or weekly) routes items to their proper home or discards them.
- **Minimal metadata at capture, enriched at triage.** At capture time, only timestamp and source matter. During triage, the LLM suggests routing (which thinking space, which project, which reading list) and you confirm.

---

### Layer 2: Thinking Spaces — Where Cognition Happens

Thinking spaces are the heart of the system. This is where ideas develop, connect, collide, and mature. A thinking space is not a folder of files — it is a **living graph of interconnected thoughts, sources, and questions** that represents your evolving understanding of a domain.

**Principles:**

- **One unified graph, soft-bounded into spaces.** Thinking spaces (AI research, economics, philosophy, etc.) are colored regions within a single graph, not separate containers. This is essential because the most valuable ideas are often **meta-ideas** that span spaces — principles about how societies self-organize that illuminate how multi-agent AI systems behave, economic dynamics that explain open-source community governance, and so on. Hard boundaries between spaces would suppress exactly the cross-pollination that makes a knowledge system worth having.
- **Three node types coexist in the graph:**
  - **Thought nodes** — your original ideas, questions, observations, arguments. These are what you write. They can be fragmentary or developed. They are always yours.
  - **Source nodes** — ingested material from the outside world. Tweets, articles, papers, documentary notes, podcast takeaways. These arrived via the inbox and were routed here. They are reference material that feeds your thinking.
  - **Meta-idea nodes** — emergent principles that span multiple spaces. These surface when cross-space edges cluster, indicating that you're circling a deeper pattern. They sit at the boundaries between spaces and connect to thoughts across multiple domains.
- **Edges are first-class citizens.** The connections between nodes matter as much as the nodes themselves. Some edges you create deliberately ("I think this connects to that"). Some the LLM suggests based on content similarity, contradiction, or thematic resonance. The graph's structure — its clusters, its bridges, its orphans — tells you something about the shape of your understanding.
- **Thoughts have no required structure.** A thought can be a single sentence ("Is Goodhart's Law a universal constraint on designed systems?") or a multi-paragraph argument. The system imposes no template. Structure emerges from connections, not from formatting.
- **The LLM's primary role here is intellectual sparring.** When you're developing a thought, the LLM has access to your entire graph — all your prior thinking, all your sources, all your contradictions. It can challenge you with your own past positions, surface relevant sources you've forgotten, identify contradictions between thoughts, and articulate patterns you haven't named yet. This is qualitatively different from chatting with a stateless LLM. It is a conversation partner that knows your intellectual history.

#### Reading Spaces — A Special Case

Books, courses, and other dense, multi-session sources deserve their own temporary thinking environment: a **reading space**.

- A reading space is a bounded sub-region of the graph, created when you begin a book or course.
- As you read, you add thoughts and reactions incrementally — this mirrors the natural rhythm of reading over days or weeks, where your understanding of chapter 8 is shaped by what you thought about chapter 3.
- When you finish (or abandon) the book, the reading space **dissolves**: its thought nodes get absorbed into the appropriate thinking spaces, carrying their edges with them. The book itself remains as a source node connected to all the thoughts it generated.
- This preserves the temporal arc of engagement with a dense source while avoiding permanent structural clutter in the main graph.

---

### Layer 3: The Wiki — Crystallized Knowledge

The wiki is where developed thinking solidifies into reference-quality knowledge. Wiki articles are not thoughts in progress — they are positions you've arrived at, concepts you understand well enough to explain clearly, syntheses that integrate multiple sources and ideas.

**Principles:**

- **Graduation is a deliberate act.** A thought moves from thinking space to wiki when you decide it's mature enough. This can be prompted by the LLM ("this thought has 12 supporting sources and hasn't changed in two weeks — ready to graduate?") but the decision is yours. Premature graduation produces shallow wiki articles; the system should bias toward keeping things in the thinking space longer.
- **Wiki articles maintain provenance.** Every article links back to the thinking space thoughts and sources that produced it. You should always be able to trace *how you arrived* at a position, not just read the position itself. This also means that if your underlying thinking changes, you can identify which wiki articles need revision.
- **The LLM writes the wiki, you write the thoughts.** Wiki articles are the one place where the LLM does the heavy authorial lifting — taking your rough thoughts, connected sources, and the relationships between them, and producing a clear, well-structured article. You review, edit, and approve. This division of labor is intentional: the thinking is yours, the exposition is the LLM's.
- **The wiki feeds back into thinking spaces.** Wiki articles are not endpoints. They're stable reference points that can inform future thinking. When a new thought contradicts a wiki article, that's a signal — either the thought is wrong, the article needs revision, or you've discovered a genuine tension worth exploring.
- **Cross-referencing is automatic.** The LLM maintains wikilinks between related articles, builds an index, and flags when new articles overlap with or contradict existing ones. This is classic Karpathy LLM Wiki territory — the LLM does the filing and cross-referencing work that humans consistently fail to maintain.

---

### Layer 4: Projects — Structured, Actionable, Human-Authored

Projects are where thinking becomes building. They have goals, tasks, timelines, and deliverables. They are fundamentally different from thinking spaces in that they are **convergent** (moving toward a specific outcome) rather than **divergent** (exploring a possibility space).

**Principles:**

- **The project journal is sacred.** It is the one artifact in the entire system that only you write. No LLM suggestions get auto-merged, no sources get auto-filed into it. It is your running narrative of what you're building, why, and how your thinking about it is evolving. This is the document you'll read in six months to remember what you were actually trying to do.
- **Projects receive from thinking spaces and wiki, they don't feed them directly.** The information flow is primarily inbound: thoughts that inspire project directions, wiki articles that inform architectural decisions, sources that suggest approaches. The project doesn't push back into the thinking space automatically — but *you* can. When project work generates a general insight ("building this taught me something about incentive design"), you capture that insight and route it back to the appropriate thinking space. This is a human-initiated flow, not an automated one.
- **Issue tracking lives close to the code.** For solo projects, a flat markdown backlog in the repo is sufficient. For collaborative projects, the canonical issue tracker is wherever the team works (GitHub Issues, Linear, etc.). The system can maintain a personal view into the shared tracker, but it doesn't try to replace it.
- **Context briefings bridge exploration and execution.** When you sit down to work on a project, the LLM generates a briefing: what's changed in relevant thinking spaces since you last worked on this, which new sources have been tagged as relevant, which wiki articles have been updated. This bridges the gap between your exploratory and productive modes without requiring you to manually check every thinking space.

---

### The Meta Layer — LLM-Maintained Connective Tissue

The meta layer is infrastructure that the LLM maintains to keep the system coherent and navigable.

- **Global index** — a catalog of everything: all thoughts, sources, wiki articles, projects, and the relationships between them.
- **Reading list** — items tagged "to-read" from the inbox, prioritized by relevance to active thinking spaces and projects, with auto-suggested tags.
- **Flow log** — tracks the movement of knowledge through the system: inbox items triaged, thoughts graduated to wiki, connections made between spaces and projects. This is the system's audit trail.
- **Periodic digest** — a regular (weekly) summary of system activity: what you thought about, what you ingested, what connections the LLM noticed, what's gone stale, what contradictions have emerged. This is the LLM's opportunity to surface patterns you haven't noticed.

---

## Information Flow

Knowledge moves through the system along defined pathways. Each pathway has a direction, a trigger, and a responsible party (human or LLM).

```
INBOX ──→ THINKING SPACE
           Trigger: triage (human decision, LLM-suggested routing)
           What moves: raw captures become source nodes in the graph

THINKING SPACE ──→ WIKI
           Trigger: graduation (human decision, LLM can prompt)
           What moves: mature thoughts become reference articles

THINKING SPACE ──→ PROJECT
           Trigger: relevance recognized (human or LLM)
           What moves: thought references, not copies — inspiration
           and ideas linked to project context

WIKI ──→ PROJECT
           Trigger: project needs established knowledge
           What moves: article references informing decisions

PROJECT ──→ THINKING SPACE
           Trigger: general insight emerges from specific work (human)
           What moves: new thought nodes created from project learnings

READING SPACE ──→ THINKING SPACES
           Trigger: book/course completed or abandoned
           What moves: thought nodes dissolve into appropriate spaces,
           book becomes a source node with all its connections preserved
```

No knowledge flows directly from inbox to wiki or from inbox to projects. Everything passes through the thinking space. The thinking space is the crucible where raw input becomes developed thought before it can solidify or be applied.

---

## The LLM's Three Modes of Operation

### Mode C: Intellectual Sparring Partner (on demand, primary)

When you're actively working in a thinking space, the LLM serves as a Socratic interlocutor. It has read your entire graph — all your prior thinking, all your sources, all your contradictions — and uses this to:

- Challenge your current argument with your own prior positions
- Surface relevant sources you ingested weeks ago and have since forgotten
- Identify contradictions between thoughts, within a space or across spaces
- Articulate emerging patterns you haven't explicitly named
- Ask questions that push your thinking further ("You've described the problem well, but you haven't proposed a mechanism. What would one look like?")
- Suggest when a thought is ready for graduation, or when it needs more development

This is the mode that makes the system more than a filing cabinet. The LLM is not generating knowledge — it is helping you develop yours by holding up a mirror to your own intellectual history.

### Mode A: Graph Maintenance (background, continuous)

After any change to the system — a new thought, a new source, an edit, a graduation — the LLM runs maintenance:

- Suggest new edges between nodes based on content analysis
- Flag potential meta-ideas when cross-space connections cluster
- Detect contradictions between thoughts or between thoughts and wiki articles
- Identify orphan nodes (thoughts with no connections) that may need attention or pruning
- Update narrative canvas summaries for each thinking space
- Maintain the global index and flow log

Suggestions are surfaced for human approval. The LLM does not modify the graph autonomously — it proposes, you dispose.

### Mode B: Source Processing (on ingestion)

When a source arrives from the inbox, the LLM:

- Summarizes the key claims and ideas
- Extracts concepts and maps them to existing graph nodes
- Identifies where the source supports, contradicts, or extends your current thinking
- Suggests which space(s) the source belongs to
- Proposes specific edges to existing thought nodes
- Flags if the source is relevant to any active projects

---

## Core Design Beliefs

1. **The human thinks, the LLM maintains.** The system never generates thoughts on your behalf. It processes sources, maintains structure, surfaces connections, and challenges your reasoning — but every thought node in the graph represents something *you* believe, question, or are exploring. The moment the LLM starts producing thoughts, the knowledge base becomes its, not yours.

2. **Connections matter more than content.** A thought in isolation is a note. A thought connected to three sources, two other thoughts, and a meta-idea is *understanding*. The system's primary value is in making connections visible and maintaining them over time — the work that humans are worst at doing consistently.

3. **Knowledge matures, it doesn't just accumulate.** The inbox → thinking space → wiki pipeline is a maturation process. Raw captures become developing thoughts become reference knowledge. The system makes this lifecycle explicit and supports each phase with appropriate tools. Accumulation without maturation is hoarding.

4. **Friction should be proportional to commitment.** Capturing a thought: near-zero friction. Adding it to a thinking space: low friction (one triage decision). Graduating to wiki: moderate friction (review, approve). Creating a project: deliberate friction (define goals, establish structure). The system should never make it hard to capture, but it should make you pause before solidifying.

5. **Cross-pollination is a feature, not a bug.** The most valuable insights often come from unexpected connections between domains. The unified graph with soft space boundaries exists specifically to enable this. A system that silos knowledge by topic prevents exactly the kind of thinking it should support.

6. **Everything is plain text, everything is versioned.** Markdown files and JSON in a git repository. No proprietary formats, no vendor lock-in, no database that can corrupt. The system should survive any individual tool's obsolescence. You can read your knowledge base with nothing more than a text editor.

7. **The system should surface what you've forgotten.** You ingested a paper three months ago that's directly relevant to what you're thinking about today. You had a thought six weeks ago that contradicts your current position. You have an orphan thought that connects to nothing. The LLM's background maintenance exists to prevent knowledge from disappearing into the archive. The weekly digest is the primary mechanism for this.

8. **Reading is a process, not an event.** Dense sources like books deserve a temporary dedicated space — a reading space — that accommodates the multi-session, evolving nature of engaging with a long work. The reading space dissolves when complete, but the thinking it generated persists. This respects the temporal arc of deep engagement.