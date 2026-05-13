"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import type { Edge, NodeDetail, NodeSummary } from "@/lib/types";
import {
  fetchGraph,
  SPACE_COLOR,
  SPACE_LABEL,
  type GraphData,
  type GraphNode,
  type GraphNodeType,
  type GraphSpace,
} from "@/lib/graph";
import {
  ThinkingGraph,
  type ThinkingGraphHandle,
} from "@/components/graph/ThinkingGraph";

// ---------- Types ----------

interface ThoughtData {
  id: string;
  space: GraphSpace;
  title: string;
  body: string;
  meta?: string;
  edges?: Edge[];
}

type Pane =
  | { id: string; kind: "thought"; refId: string }
  | { id: string; kind: "spar" };

// ---------- Constants ----------

const SPACE_FROM_API: Record<string, GraphSpace> = {
  "ai-research": "ai",
  "economics": "econ",
  "philosophy": "phil",
  "meta": "meta",
};

const PANE_W = 460;
const PANE_MIN_W = 44;
const GAP = 10;
const RAIL_PAD_R = 14;

// Bumped on shape changes so old payloads are ignored cleanly.
const STORAGE_KEY = "athenaeum:focus:v1";

interface PersistedFocusState {
  panes: Pane[];
  minimized: string[];
  focusedPane: string;
  hiddenSpaces: GraphSpace[];
  hiddenSrcs: ("you" | "llm")[];
  hiddenTypes: GraphNodeType[];
}

function normalizeSpace(spaces: string[] | undefined): GraphSpace {
  const first = spaces?.[0] || "";
  return SPACE_FROM_API[first] || "other";
}

function tagClass(space: GraphSpace): string {
  // .tag.{ai|econ|phil|meta} exist in globals.css — fall back to meta for
  // anything else so the tag still has a visible accent.
  return space === "other" ? "meta" : space;
}

function ensurePaneId(refId: string) {
  return "p-" + refId;
}

function nodeDetailToThought(d: NodeDetail): ThoughtData {
  const space = normalizeSpace(d.spaces);
  const metaParts: string[] = [];
  if (d.created) metaParts.push("created " + d.created.slice(0, 10));
  if (d.updated) metaParts.push("edited " + d.updated.slice(0, 10));
  metaParts.push(`${d.edge_count} edges`);
  return {
    id: d.id,
    space,
    title: d.title || d.id,
    body: (d.body || "").replace(/^#\s+.+\n*/, ""),
    meta: metaParts.join(" · "),
    edges: d.edges,
  };
}

// ---------- Sub-components ----------

function ThoughtPane({
  thought,
  width,
  isFocused,
  onFocus,
  onClose,
  onAddToChat,
  onMinimize,
  onSave,
}: {
  thought: ThoughtData;
  width: number;
  isFocused: boolean;
  onFocus: () => void;
  onClose: () => void;
  onAddToChat: (t: ThoughtData) => void;
  onMinimize: () => void;
  onSave: (id: string, title: string, body: string) => Promise<void>;
}) {
  const [body, setBody] = useState(thought.body);
  const [title, setTitle] = useState(thought.title);
  const [tab, setTab] = useState<"body" | "connections" | "sources">("body");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const space = thought.space;
  const connections = thought.edges || [];
  const isDirty = title !== thought.title || body !== thought.body;

  useEffect(() => {
    setBody(thought.body);
    setTitle(thought.title);
    setSaveError(null);
  }, [thought.id, thought.body, thought.title]);

  const handleSave = async () => {
    if (!isDirty || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      await onSave(thought.id, title, body);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };
  const handleCancel = () => {
    setTitle(thought.title);
    setBody(thought.body);
    setSaveError(null);
  };

  return (
    <section
      className={"pane pane-thought" + (isFocused ? " is-focused" : "")}
      style={{ width }}
      onMouseDown={onFocus}
    >
      <div className="pane-head">
        <div className="pane-head-l">
          <span className={`tag ${tagClass(space)}`}>
            <span className="swatch"></span>
            {SPACE_LABEL[space]}
          </span>
          <span
            className="tag"
            style={{ borderColor: "var(--accent-soft)", color: "var(--accent)" }}
          >
            ● editing
          </span>
        </div>
        <div className="pane-head-r">
          <button
            className="icon-btn"
            title="Add to chat (⌘L)"
            onClick={() => onAddToChat(thought)}
          >
            ⌘L
          </button>
          <button className="icon-btn" title="Graduate to wiki">
            ↑
          </button>
          <button className="icon-btn" onClick={onMinimize} title="Minimize pane">
            −
          </button>
          <button className="icon-btn" onClick={onClose} title="Close pane">
            ×
          </button>
        </div>
      </div>

      <input
        className="fe-title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <div className="fe-meta-row">
        <span>{thought.meta || ""}</span>
        {isDirty && (
          <span style={{ color: "var(--accent)", marginLeft: "auto" }}>● unsaved</span>
        )}
        {!isDirty && !saving && (
          <span style={{ color: "var(--ink-4)", marginLeft: "auto" }}>● saved</span>
        )}
        {saving && (
          <span style={{ color: "var(--ink-3)", marginLeft: "auto" }}>● saving…</span>
        )}
      </div>

      <div className="fe-tabs">
        <button
          className={"fe-tab" + (tab === "body" ? " on" : "")}
          onClick={() => setTab("body")}
        >
          Body
        </button>
        <button
          className={"fe-tab" + (tab === "connections" ? " on" : "")}
          onClick={() => setTab("connections")}
        >
          Connections <span className="cnt">{connections.length}</span>
        </button>
        <button
          className={"fe-tab" + (tab === "sources" ? " on" : "")}
          onClick={() => setTab("sources")}
        >
          Sources <span className="cnt">0</span>
        </button>
      </div>

      <div className="fe-body">
        {tab === "body" && (
          <textarea
            className="fe-textarea"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        )}
        {tab === "connections" && (
          <div className="fe-pane">
            {connections.length === 0 && (
              <div
                style={{
                  fontFamily: "var(--serif)",
                  fontStyle: "italic",
                  color: "var(--ink-3)",
                  padding: "8px 0",
                }}
              >
                No connections yet.
              </div>
            )}
            {connections.map((e, i) => (
              <div key={i} className="conn-row">
                <span
                  className="conn-mark"
                  style={{ background: SPACE_COLOR[space] }}
                ></span>
                <div className="conn-text">
                  <div>{e.to}</div>
                  <small>{e.kind}</small>
                </div>
              </div>
            ))}
          </div>
        )}
        {tab === "sources" && (
          <div className="fe-pane">
            <div
              style={{
                fontFamily: "var(--serif)",
                fontStyle: "italic",
                color: "var(--ink-3)",
                padding: "8px 0",
              }}
            >
              Source linking is not yet wired up.
            </div>
          </div>
        )}
      </div>

      <div className="pane-foot">
        <span className="hint">⌘L to add to chat</span>
        {saveError && (
          <span
            className="hint"
            style={{ color: "#b04a3a", fontFamily: "var(--sans)" }}
            title={saveError}
          >
            save failed
          </span>
        )}
        <span style={{ flex: 1 }}></span>
        <button
          className="btn ghost"
          onClick={handleCancel}
          disabled={!isDirty || saving}
        >
          Cancel
        </button>
        <button
          className="btn primary"
          onClick={handleSave}
          disabled={!isDirty || saving}
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </section>
  );
}

function SparPane({
  context,
  onRemoveContext,
  onClose,
  isFocused,
  onFocus,
  width,
}: {
  context: ThoughtData[];
  onRemoveContext: (id: string) => void;
  onClose: () => void;
  isFocused: boolean;
  onFocus: () => void;
  width: number;
}) {
  const [draft, setDraft] = useState("");
  return (
    <section
      className={"pane pane-spar" + (isFocused ? " is-focused" : "")}
      style={{ width }}
      onMouseDown={onFocus}
    >
      <div className="pane-head spar-head">
        <div className="pane-head-l">
          <span className="ai-mark-2">A</span>
          <span style={{ fontFamily: "var(--serif)", fontSize: 14, fontWeight: 500 }}>
            Sparring partner
          </span>
          <span
            className="muted-2"
            style={{ fontSize: 11, fontFamily: "var(--serif)", fontStyle: "italic" }}
          >
            knows what's open
          </span>
        </div>
        <div className="pane-head-r">
          <button className="icon-btn" title="History">
            ⏱
          </button>
          <button className="icon-btn" onClick={onClose} title="Close">
            ×
          </button>
        </div>
      </div>

      {context.length > 0 && (
        <div className="spar-context">
          <span className="ctx-label">In context</span>
          {context.map((c) => (
            <span key={c.id} className={`ctx-chip ${tagClass(c.space)}`}>
              <span className="swatch"></span>
              {c.title.length > 28 ? c.title.slice(0, 28) + "…" : c.title}
              <button onClick={() => onRemoveContext(c.id)}>×</button>
            </span>
          ))}
        </div>
      )}

      <div className="spar-stream">
        <div className="spar-day">Today</div>

        <div className="spar-msg ai">
          <div className="msg-head">
            <span className="who">Athenaeum</span>
            <span className="when">— sample</span>
          </div>
          <em>
            LLM not connected. Sparring will be available once the thinking-spar skill
            is configured.
          </em>
        </div>
      </div>

      <div className="spar-input">
        <textarea
          placeholder={
            context.length
              ? `Ask about ${context.length} open thought${context.length > 1 ? "s" : ""}…`
              : "Push back, ask, develop…"
          }
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled
        />
        <div className="spar-input-foot">
          <button className="ctx-add" disabled>
            @ add context
          </button>
          <span className="hint">⌘L from any thought</span>
          <span style={{ flex: 1 }}></span>
          <button className="send" disabled>
            Send ↵
          </button>
        </div>
      </div>
    </section>
  );
}

// ---------- Page ----------

export default function ThinkingFocusPage() {
  const router = useRouter();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);

  const [graph, setGraph] = useState<GraphData | null>(null);
  // Cache the raw NodeDetail so we can reconstruct frontmatter on save.
  // The display-side ThoughtData is derived per render via resolveThought.
  const [fetched, setFetched] = useState<Record<string, NodeDetail>>({});
  const [thoughtsList, setThoughtsList] = useState<NodeSummary[]>([]);

  // Visibility filters driven by the legend and stats bar.
  // Sources are hidden by default — they're the bulk of the graph and the
  // user wanted to see thoughts/meta-ideas first. localStorage will override
  // this if the user changes the preference.
  const [hiddenSpaces, setHiddenSpaces] = useState<Set<GraphSpace>>(new Set());
  const [hiddenSrcs, setHiddenSrcs] = useState<Set<"you" | "llm">>(new Set());
  const [hiddenTypes, setHiddenTypes] = useState<Set<GraphNodeType>>(
    () => new Set<GraphNodeType>(["source"])
  );

  const toggleSpace = useCallback((s: GraphSpace) => {
    setHiddenSpaces((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  }, []);
  const toggleSrc = useCallback((s: "you" | "llm") => {
    setHiddenSrcs((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  }, []);
  const toggleType = useCallback((t: GraphNodeType) => {
    setHiddenTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  }, []);

  // Apply visibility filters before passing to the force layout.
  const visibleGraph = useMemo<GraphData | null>(() => {
    if (!graph) return null;
    if (hiddenSpaces.size === 0 && hiddenSrcs.size === 0 && hiddenTypes.size === 0) {
      return graph;
    }
    const nodes = graph.nodes.filter(
      (n) => !hiddenSpaces.has(n.space) && !hiddenTypes.has(n.type)
    );
    const ids = new Set(nodes.map((n) => n.id));
    const links = graph.links.filter(
      (l) =>
        !hiddenSrcs.has(l.src) &&
        ids.has(typeof l.source === "string" ? l.source : (l.source as { id: string }).id) &&
        ids.has(typeof l.target === "string" ? l.target : (l.target as { id: string }).id)
    );
    return { nodes, links };
  }, [graph, hiddenSpaces, hiddenSrcs, hiddenTypes]);

  const [panes, setPanes] = useState<Pane[]>([{ id: "p-spar", kind: "spar" }]);
  const [focusedPane, setFocusedPane] = useState<string>("p-spar");
  const [chatContext, setChatContext] = useState<ThoughtData[]>([]);
  const [minimized, setMinimized] = useState<Set<string>>(new Set());

  const graphRef = useRef<ThinkingGraphHandle>(null);

  const resolveThought = useCallback(
    (refId: string): ThoughtData | null => {
      const d = fetched[refId];
      return d ? nodeDetailToThought(d) : null;
    },
    [fetched]
  );

  const openThought = useCallback(
    (refId: string) => {
      setPanes((prev) => {
        const existing = prev.find((p) => p.kind === "thought" && p.refId === refId);
        if (existing) {
          setFocusedPane(existing.id);
          return prev;
        }
        const newPane: Pane = { id: ensurePaneId(refId), kind: "thought", refId };
        const sparIdx = prev.findIndex((p) => p.kind === "spar");
        const next = [...prev];
        if (sparIdx >= 0) next.splice(sparIdx, 0, newPane);
        else next.push(newPane);
        setFocusedPane(newPane.id);
        return next;
      });

      if (!fetched[refId]) {
        apiFetch<NodeDetail>(`/thinking/${refId}`)
          .then((d) => {
            setFetched((prev) => ({ ...prev, [refId]: d }));
          })
          .catch(() => {});
      }
    },
    [fetched]
  );

  const saveThought = useCallback(
    async (id: string, newTitle: string, newBody: string) => {
      const detail = fetched[id];
      if (!detail) throw new Error(`No cached detail for ${id}`);
      // Strip derived/server-managed fields; the rest is the frontmatter.
      const {
        body: _body,
        title: _title,
        edge_count: _edgeCount,
        updated: _updated,
        ...frontmatter
      } = detail;
      void _body;
      void _title;
      void _edgeCount;
      void _updated;
      // Title is derived from the first H1 in the body.
      const composedBody = `# ${newTitle}\n\n${newBody}`;
      const updated = await apiFetch<NodeDetail>(`/nodes/${id}`, {
        method: "PUT",
        body: JSON.stringify({ frontmatter, body: composedBody }),
      });
      setFetched((prev) => ({ ...prev, [id]: updated }));
    },
    [fetched]
  );

  const closePane = useCallback((id: string) => {
    setPanes((prev) => prev.filter((p) => p.id !== id));
    setMinimized((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const toggleMinimize = useCallback((id: string) => {
    setMinimized((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    // Restoring a minimized pane should focus it.
    setFocusedPane(id);
  }, []);

  const openSpar = useCallback(() => {
    setPanes((prev) => {
      if (prev.find((p) => p.kind === "spar")) {
        setFocusedPane("p-spar");
        return prev;
      }
      setFocusedPane("p-spar");
      return [...prev, { id: "p-spar", kind: "spar" }];
    });
  }, []);

  const addToChat = useCallback(
    (thought: ThoughtData) => {
      setChatContext((prev) =>
        prev.find((c) => c.id === thought.id) ? prev : [...prev, thought]
      );
      openSpar();
      setFocusedPane("p-spar");
    },
    [openSpar]
  );

  const onGraphNodeClick = useCallback(
    (node: GraphNode) => {
      setActiveId(node.id);
      // Sources don't have a thought editor; future: open a source preview.
      if (node.type === "source") return;
      openThought(node.id);
    },
    [openThought]
  );

  // Hydrate UI state from localStorage on first mount. Until this runs, the
  // page renders with default state (sources hidden, just the spar pane open).
  const [hydrated, setHydrated] = useState(false);

  // Initial: fetch graph + thoughts list, hydrate from localStorage, honor
  // ?open=<id> deep-link.
  const didInit = useRef(false);
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;

    fetchGraph()
      .then(setGraph)
      .catch(() => setGraph({ nodes: [], links: [] }));
    apiFetch<NodeSummary[]>("/thinking").then(setThoughtsList).catch(() => {});

    // Hydrate from localStorage. Anything missing falls back to the default
    // useState value, so older payloads stay forward-compatible.
    if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const s = JSON.parse(raw) as Partial<PersistedFocusState>;
          if (Array.isArray(s.panes) && s.panes.length > 0) setPanes(s.panes);
          if (Array.isArray(s.minimized)) setMinimized(new Set(s.minimized));
          if (typeof s.focusedPane === "string") setFocusedPane(s.focusedPane);
          if (Array.isArray(s.hiddenSpaces))
            setHiddenSpaces(new Set(s.hiddenSpaces as GraphSpace[]));
          if (Array.isArray(s.hiddenSrcs))
            setHiddenSrcs(new Set(s.hiddenSrcs as ("you" | "llm")[]));
          if (Array.isArray(s.hiddenTypes))
            setHiddenTypes(new Set(s.hiddenTypes as GraphNodeType[]));
        }
      } catch {
        // Ignore corrupt payloads — defaults remain.
      }

      const params = new URLSearchParams(window.location.search);
      const openId = params.get("open");
      if (openId) {
        setActiveId(openId);
        openThought(openId);
      }
    }
    setHydrated(true);
  }, [openThought]);

  // Persist UI state on every change after hydration.
  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    const payload: PersistedFocusState = {
      panes,
      minimized: Array.from(minimized),
      focusedPane,
      hiddenSpaces: Array.from(hiddenSpaces),
      hiddenSrcs: Array.from(hiddenSrcs),
      hiddenTypes: Array.from(hiddenTypes),
    };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Quota / private mode — ignore.
    }
  }, [
    hydrated,
    panes,
    minimized,
    focusedPane,
    hiddenSpaces,
    hiddenSrcs,
    hiddenTypes,
  ]);

  // Once a saved pane is restored from localStorage, fetch the underlying
  // detail for any thought we don't yet have cached. This runs once after
  // hydration sets settle.
  useEffect(() => {
    if (!hydrated) return;
    for (const p of panes) {
      if (p.kind !== "thought") continue;
      if (fetched[p.refId]) continue;
      apiFetch<NodeDetail>(`/thinking/${p.refId}`)
        .then((d) => setFetched((prev) => ({ ...prev, [p.refId]: d })))
        .catch(() => {});
    }
    // Intentionally only react to hydration completing — fetch-on-open is
    // handled separately by openThought.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  // ⌘L — add the focused thought pane to chat context.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "l") {
        const fp =
          panes.find((p) => p.id === focusedPane && p.kind === "thought") ||
          panes.find((p): p is Pane & { kind: "thought" } => p.kind === "thought");
        if (fp && fp.kind === "thought") {
          const t = resolveThought(fp.refId);
          if (t) {
            e.preventDefault();
            addToChat(t);
          }
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panes, focusedPane, resolveThought, addToChat]);

  const openIds = useMemo(
    () =>
      panes
        .filter((p): p is Pane & { kind: "thought" } => p.kind === "thought")
        .map((p) => p.refId),
    [panes]
  );

  const totalPanes = panes.length;
  // Only non-minimized panes occupy the rail; minimized ones live in a dock.
  const railPanes = useMemo(
    () => panes.filter((p) => !minimized.has(p.id)),
    [panes, minimized]
  );
  const dockPanes = useMemo(
    () => panes.filter((p) => minimized.has(p.id)),
    [panes, minimized]
  );
  const railWidth =
    railPanes.length === 0
      ? 0
      : railPanes.length * PANE_W + (railPanes.length - 1) * GAP;
  const canvasInset = railWidth === 0 ? 0 : railWidth + RAIL_PAD_R + 8;

  const exitFocus = () => router.push("/thinking");

  // Zoom: drive both the displayed % and the actual graph zoom.
  const bumpZoom = (delta: number) => {
    setZoom((z) => {
      const next = Math.max(40, Math.min(220, z + delta));
      const factor = next / z;
      graphRef.current?.zoomBy(factor);
      return next;
    });
  };
  const fitZoom = () => {
    setZoom(100);
    graphRef.current?.fit();
  };

  return (
    <div
      className="focus-root"
      style={{ ["--rail-w" as string]: canvasInset + "px" } as React.CSSProperties}
      data-screen-label="02 Thinking — Focus mode"
    >
      <div className={"focus-canvas-wrap" + (totalPanes ? " has-rail" : "")}>
        {visibleGraph ? (
          <ThinkingGraph
            ref={graphRef}
            data={visibleGraph}
            activeId={activeId}
            openIds={openIds}
            onNodeClick={onGraphNodeClick}
          />
        ) : (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
              color: "var(--ink-3)",
              fontFamily: "var(--serif)",
              fontStyle: "italic",
            }}
          >
            Loading graph…
          </div>
        )}
      </div>

      <div className="focus-topbar">
        <div className="ft-left">
          <div className="focus-brand" onClick={exitFocus} title="Exit focus mode">
            <span className="dot" style={{ background: "var(--accent)" }}></span>
            <span>Athenaeum</span>
            <span className="bar-divider"></span>
            <span
              style={{
                fontFamily: "var(--serif)",
                fontStyle: "italic",
                color: "var(--ink-3)",
                fontSize: 13,
              }}
            >
              Thinking · focus
            </span>
          </div>
        </div>

        <div className="ft-center">
          <div className="focus-search">
            <span style={{ fontFamily: "var(--serif)", fontStyle: "italic", color: "var(--ink-3)" }}>
              ⌕
            </span>
            <input
              placeholder={`Search ${thoughtsList.length || 0} thoughts…`}
              aria-label="Search thoughts"
            />
            <kbd>⌘F</kbd>
          </div>
        </div>

        <div className="ft-right">
          <div className="ctrl-group">
            <button className="ctrl-btn" onClick={() => bumpZoom(-10)}>
              −
            </button>
            <span className="zoom-label">{zoom}%</span>
            <button className="ctrl-btn" onClick={() => bumpZoom(10)}>
              +
            </button>
            <span className="ctrl-divider"></span>
            <button className="ctrl-btn" onClick={fitZoom}>
              ⌖ fit
            </button>
          </div>
          <button className="btn ghost" onClick={openSpar} title="Toggle sparring partner">
            <span className="ai-mark-2 sm">A</span> Spar
          </button>
          <button className="btn primary">
            <span className="glyph">+</span> thought
          </button>
        </div>
      </div>

      <div className="focus-bar focus-bar-bl">
        <div className="focus-legend">
          {(["ai", "econ", "phil", "meta"] as GraphSpace[]).map((s) => {
            const off = hiddenSpaces.has(s);
            const label = s === "ai" ? "AI" : s === "econ" ? "Econ" : s === "phil" ? "Phil" : "Meta";
            return (
              <button
                key={s}
                type="button"
                className={"legend-item legend-toggle" + (off ? " is-off" : "")}
                onClick={() => toggleSpace(s)}
                title={`${off ? "Show" : "Hide"} ${label} nodes`}
                aria-pressed={!off}
              >
                <span
                  className="swatch"
                  style={{
                    background: off ? "transparent" : SPACE_COLOR[s],
                    boxShadow: off ? `inset 0 0 0 1.5px ${SPACE_COLOR[s]}` : undefined,
                  }}
                ></span>
                {label}
              </button>
            );
          })}
          <span className="legend-divider"></span>
          {(["you", "llm"] as const).map((src) => {
            const off = hiddenSrcs.has(src);
            const label = src === "you" ? "confirmed" : "LLM-suggested";
            return (
              <button
                key={src}
                type="button"
                className={"legend-item legend-toggle" + (off ? " is-off" : "")}
                onClick={() => toggleSrc(src)}
                title={`${off ? "Show" : "Hide"} ${label} edges`}
                aria-pressed={!off}
              >
                <span className={"line " + (src === "you" ? "solid" : "dashed")}></span>
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="focus-bar focus-bar-bc-stats">
        <div className="focus-stats">
          {(
            [
              { type: "thought", label: "thoughts" },
              { type: "source", label: "sources" },
              { type: "meta", label: "meta-ideas" },
            ] as { type: GraphNodeType; label: string }[]
          ).map(({ type, label }) => {
            const off = hiddenTypes.has(type);
            const count = graph?.nodes.filter((n) => n.type === type).length ?? 0;
            const accent = type === "meta";
            return (
              <button
                key={type}
                type="button"
                className={"stat-toggle" + (off ? " is-off" : "")}
                onClick={() => toggleType(type)}
                title={`${off ? "Show" : "Hide"} ${label}`}
                aria-pressed={!off}
                style={accent && !off ? { color: "var(--accent)" } : undefined}
              >
                <b>{count}</b> {label}
              </button>
            );
          })}
        </div>
      </div>

      {railPanes.length > 0 && (
        <div className="rail" style={{ width: railWidth }}>
          {railPanes.map((p) => {
            const focused = focusedPane === p.id;

            if (p.kind === "thought") {
              const data = resolveThought(p.refId);

              if (!data) {
                return (
                  <section
                    key={p.id}
                    className={"pane pane-thought" + (focused ? " is-focused" : "")}
                    style={{ width: PANE_W }}
                    onMouseDown={() => setFocusedPane(p.id)}
                  >
                    <div className="pane-head">
                      <div className="pane-head-l">
                        <span
                          className="muted-2"
                          style={{ fontFamily: "var(--serif)", fontStyle: "italic" }}
                        >
                          loading {p.refId}…
                        </span>
                      </div>
                      <div className="pane-head-r">
                        <button
                          className="icon-btn"
                          onClick={() => toggleMinimize(p.id)}
                          title="Minimize pane"
                        >
                          −
                        </button>
                        <button
                          className="icon-btn"
                          onClick={() => closePane(p.id)}
                          title="Close pane"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  </section>
                );
              }

              return (
                <ThoughtPane
                  key={p.id}
                  thought={data}
                  width={PANE_W}
                  isFocused={focused}
                  onFocus={() => setFocusedPane(p.id)}
                  onClose={() => closePane(p.id)}
                  onAddToChat={addToChat}
                  onMinimize={() => toggleMinimize(p.id)}
                  onSave={saveThought}
                />
              );
            }
            return (
              <SparPane
                key={p.id}
                context={chatContext}
                onRemoveContext={(id) =>
                  setChatContext((prev) => prev.filter((c) => c.id !== id))
                }
                width={PANE_W}
                isFocused={focused}
                onFocus={() => setFocusedPane(p.id)}
                onClose={() => closePane(p.id)}
              />
            );
          })}
        </div>
      )}

      {dockPanes.length > 0 && (
        <div className="min-dock" aria-label="Minimized thoughts">
          {dockPanes.map((p) => {
            if (p.kind !== "thought") return null;
            const data = resolveThought(p.refId);
            const title = data?.title || p.refId;
            const space = data?.space || "other";
            return (
              <div key={p.id} className="min-chip" title={`Restore: ${title}`}>
                <button
                  className="min-chip-body"
                  onClick={() => toggleMinimize(p.id)}
                >
                  <span
                    className="min-chip-swatch"
                    style={{ background: SPACE_COLOR[space] }}
                  ></span>
                  <span className="min-chip-title">{title}</span>
                </button>
                <button
                  className="min-chip-close"
                  onClick={() => closePane(p.id)}
                  aria-label="Close"
                  title="Close"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
