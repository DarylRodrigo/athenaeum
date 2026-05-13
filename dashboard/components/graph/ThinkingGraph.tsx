"use client";

import dynamic from "next/dynamic";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { forceCollide, forceX, forceY } from "d3-force";
import type { GraphData, GraphLink, GraphNode } from "@/lib/graph";
import { SPACE_COLOR, SPACE_LABEL } from "@/lib/graph";

// next/dynamic loses the generic typing of react-force-graph-2d, so we cast
// to a permissive component type and keep strong typing inside the wrapper.
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
}) as unknown as React.ComponentType<Record<string, unknown>>;

// ForceGraph2D mutates nodes — adds x, y, vx, vy.
type RFNode = GraphNode & { x?: number; y?: number };
type RFLink = Omit<GraphLink, "source" | "target"> & {
  source: RFNode | string;
  target: RFNode | string;
};

export interface ThinkingGraphHandle {
  zoom: (scale: number) => void;
  zoomBy: (factor: number) => void;
  fit: () => void;
  centerOn: (id: string) => void;
}

interface Props {
  data: GraphData;
  activeId: string | null;
  openIds: string[];
  onNodeClick: (node: GraphNode) => void;
}

const REL_COLOR: Record<string, string> = {
  supports: "var(--ink-4)",
  supported_by: "var(--ink-4)",
  extends: "oklch(0.55 0.10 145)",
  contradicts: "#b04a3a",
  foundation: "var(--accent)",
  instance_of: "var(--accent)",
};

function radiusFor(n: GraphNode): number {
  if (n.type === "meta") return 8;
  if (n.type === "thought") return 5 + Math.min(n.degree, 6) * 0.7;
  return 3.2;
}

// Minimum visual radius in *screen* pixels — nodes never paint smaller
// than this regardless of zoom level. Computed as MIN_SCREEN_R / globalScale
// in world coordinates inside the painter.
const MIN_NODE_SCREEN_R = 4;
const MIN_LINK_SCREEN_W = 0.8;

// Word-wrap a label to at most `maxLines`, truncating with an ellipsis if
// further content exists. Width is measured against the active context font.
function wrapTitleLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let cur = "";
  let consumed = 0;

  for (const w of words) {
    const test = cur ? cur + " " + w : w;
    if (ctx.measureText(test).width > maxWidth && cur) {
      lines.push(cur);
      cur = w;
      if (lines.length >= maxLines) {
        cur = "";
        break;
      }
    } else {
      cur = test;
    }
    consumed = lines.length === maxLines ? consumed : lines.length;
  }
  if (cur && lines.length < maxLines) lines.push(cur);

  // If we ran out of room before consuming all words, truncate the last
  // line to fit within maxWidth including a trailing ellipsis.
  const renderedWords = lines.join(" ").split(/\s+/).length;
  if (renderedWords < words.length && lines.length > 0) {
    const lastIdx = lines.length - 1;
    let last = lines[lastIdx];
    while (last.length > 1 && ctx.measureText(last + "…").width > maxWidth) {
      last = last.slice(0, -1).trimEnd();
    }
    lines[lastIdx] = last + "…";
  }
  return lines;
}

// Read a CSS custom property off <html>, in CSS pixels. Falls back to the
// default value if the property is missing or unparseable.
function cssVar(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

export const ThinkingGraph = forwardRef<ThinkingGraphHandle, Props>(
  function ThinkingGraph({ data, activeId, openIds, onNodeClick }, ref) {
    const wrapRef = useRef<HTMLDivElement>(null);
    const fgRef = useRef<unknown>(null);
    const [size, setSize] = useState({ w: 0, h: 0 });

    const [hover, setHover] = useState<{ node: RFNode; x: number; y: number } | null>(null);

    // Cache resolved CSS colors. The library can't evaluate var(--…) inside
    // canvas paths, so we resolve once at mount and on theme changes.
    const colors = useMemo(
      () => ({
        paper: cssVar("--paper", "#f5f2ea"),
        ink: cssVar("--ink", "#1d1b16"),
        ink2: cssVar("--ink-2", "#3a362d"),
        ink3: cssVar("--ink-3", "#6c6759"),
        ink4: cssVar("--ink-4", "#a09a89"),
        rule: cssVar("--rule", "#dcd6c8"),
        accent: cssVar("--accent", "#7a3327"),
      }),
      []
    );

    const openSet = useMemo(() => new Set(openIds), [openIds]);

    // Live-updated zoom level for accessor functions that don't receive
    // globalScale (linkWidth, nodePointerAreaPaint).
    const zoomRef = useRef(1);

    // Tracks whether the inner ForceGraph2D has mounted and bound its
    // imperative handle to fgRef. We need this because the FG only mounts
    // after the wrapper's size is known (ResizeObserver), which happens on
    // a later render than the one that first delivers `data`. Without this
    // flag, our force-tuning useEffect would fire once with fgRef=null and
    // never reapply.
    const [fgReady, setFgReady] = useState(false);
    const setFgRef = useCallback((instance: unknown) => {
      fgRef.current = instance;
      setFgReady(!!instance);
    }, []);

    useEffect(() => {
      if (!wrapRef.current) return;
      const el = wrapRef.current;
      const ro = new ResizeObserver(() => {
        setSize({ w: el.clientWidth, h: el.clientHeight });
      });
      ro.observe(el);
      setSize({ w: el.clientWidth, h: el.clientHeight });
      return () => ro.disconnect();
    }, []);

    // Tune the d3-force simulation for more breathing room: stronger
    // node-node repulsion, longer ideal link length, and a collision force
    // so labels don't collide. Applied after the graph mounts; reapplied
    // when data changes since RFG re-creates forces on graphData reset.
    useEffect(() => {
      const fg = fgRef.current as {
        d3Force?: (name: string, force?: unknown) => unknown;
        d3ReheatSimulation?: () => void;
      } | null;
      if (!fg?.d3Force) return;
      const charge = fg.d3Force("charge") as
        | { strength: (s: number) => unknown; distanceMax: (d: number) => unknown }
        | undefined;
      const link = fg.d3Force("link") as { distance: (d: number) => unknown } | undefined;
      // Strong but short-range repulsion: connected clusters spread out,
      // but the force fades quickly so unconnected nodes don't drift to
      // infinity.
      charge?.strength(-1200);
      charge?.distanceMax(420);
      link?.distance(500);

      // Collision force keyed off node radius + label padding.
      const collideRadius = (node: RFNode) => radiusFor(node) + 30;
      fg.d3Force?.("collide", forceCollide<RFNode>(collideRadius));

      // Gentle pull toward the origin so orphan nodes settle near the
      // cluster instead of along the canvas edges.
      fg.d3Force?.("centerX", forceX<RFNode>(0).strength(0.06));
      fg.d3Force?.("centerY", forceY<RFNode>(0).strength(0.06));

      fg.d3ReheatSimulation?.();
    }, [data, fgReady]);

    useImperativeHandle(
      ref,
      () => ({
        zoom: (scale: number) => {
          const fg = fgRef.current as { zoom?: (s: number, ms?: number) => void } | null;
          fg?.zoom?.(scale, 250);
        },
        zoomBy: (factor: number) => {
          const fg = fgRef.current as {
            zoom?: ((s?: number) => number) & ((s: number, ms?: number) => void);
          } | null;
          if (!fg?.zoom) return;
          const cur = (fg.zoom() as unknown as number) || 1;
          (fg.zoom as (s: number, ms?: number) => void)(cur * factor, 200);
        },
        fit: () => {
          const fg = fgRef.current as { zoomToFit?: (ms?: number, pad?: number) => void } | null;
          fg?.zoomToFit?.(400, 60);
        },
        centerOn: (id: string) => {
          const node = data.nodes.find((n) => n.id === id) as RFNode | undefined;
          const fg = fgRef.current as {
            centerAt?: (x: number, y: number, ms?: number) => void;
          } | null;
          if (node && node.x != null && node.y != null) {
            fg?.centerAt?.(node.x, node.y, 600);
          }
        },
      }),
      [data]
    );

    // Custom canvas painters — kept simple so we stay fast at 2k nodes.
    const paintNode = useCallback(
      (node: RFNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
        zoomRef.current = globalScale;
        // Floor the on-screen radius so deeply zoomed-out nodes don't
        // disappear. baseR is the world-space "natural" size; we expand
        // to MIN_NODE_SCREEN_R / globalScale when that floor is larger.
        const baseR = radiusFor(node);
        const r = Math.max(baseR, MIN_NODE_SCREEN_R / globalScale);
        const fill = SPACE_COLOR[node.space];
        const isActive = node.id === activeId;
        const isOpen = openSet.has(node.id);

        // Aura / ring offsets and stroke widths kept in screen pixels so
        // they stay visually distinct at any zoom.
        const ringGap = 5 / globalScale;
        const auraGap = 8 / globalScale;
        const stroke = 1.4 / globalScale;

        // Meta-idea aura
        if (node.type === "meta") {
          ctx.beginPath();
          ctx.arc(node.x!, node.y!, r + auraGap, 0, 2 * Math.PI);
          ctx.strokeStyle = colors.accent;
          ctx.globalAlpha = 0.35;
          ctx.setLineDash([2 / globalScale, 3 / globalScale]);
          ctx.lineWidth = 0.8 / globalScale;
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.globalAlpha = 1;
        }

        // Open / active ring
        if (isOpen || isActive) {
          ctx.beginPath();
          ctx.arc(node.x!, node.y!, r + ringGap, 0, 2 * Math.PI);
          ctx.strokeStyle = colors.accent;
          ctx.lineWidth = (isOpen ? 1.6 : 1.2) / globalScale;
          ctx.globalAlpha = isOpen ? 0.95 : 0.6;
          ctx.stroke();
          ctx.globalAlpha = 1;
        }

        ctx.beginPath();
        ctx.arc(node.x!, node.y!, r, 0, 2 * Math.PI);
        if (node.type === "source") {
          ctx.fillStyle = colors.paper;
          ctx.fill();
          ctx.strokeStyle = fill;
          ctx.lineWidth = stroke;
          ctx.stroke();
        } else {
          ctx.fillStyle = fill;
          ctx.fill();
          ctx.strokeStyle = colors.paper;
          ctx.lineWidth = stroke;
          ctx.stroke();
        }

        // Labels — thoughts and meta-ideas only. Sources rely on the
        // hover tooltip so we don't clutter the graph.
        if (node.type !== "source" && (globalScale > 0.45 || isActive || isOpen)) {
          const fontSize = node.type === "meta" ? 13 / globalScale : 12 / globalScale;
          const fontStyle = node.type === "meta" ? "italic 600" : "500";
          ctx.font = `${fontStyle} ${fontSize}px Spectral, serif`;
          ctx.textBaseline = "middle";

          const maxLineWidth = 150 / globalScale;
          const lines = wrapTitleLines(ctx, node.title, maxLineWidth, 2);
          const lineH = fontSize * 1.18;
          const totalH = lines.length * lineH;
          const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));

          const labelX = node.x! + r + 6 / globalScale;
          const labelY = node.y!;
          const padX = 4 / globalScale;
          const padY = 3 / globalScale;
          const radius = 3 / globalScale;

          // Soft paper-colored backdrop so labels read over edges.
          ctx.beginPath();
          ctx.globalAlpha = 0.85;
          ctx.fillStyle = colors.paper;
          if (typeof ctx.roundRect === "function") {
            ctx.roundRect(
              labelX - padX,
              labelY - totalH / 2 - padY,
              widest + padX * 2,
              totalH + padY * 2,
              radius
            );
            ctx.fill();
          } else {
            ctx.fillRect(
              labelX - padX,
              labelY - totalH / 2 - padY,
              widest + padX * 2,
              totalH + padY * 2
            );
          }
          ctx.globalAlpha = 1;

          ctx.fillStyle = isActive ? colors.accent : colors.ink;
          lines.forEach((line, i) => {
            ctx.fillText(line, labelX, labelY - totalH / 2 + lineH * (i + 0.5));
          });
        }
      },
      [activeId, openSet, colors]
    );

    const linkColor = useCallback(
      (l: RFLink) => {
        if (l.src === "llm") return colors.ink4;
        if (l.cross) return colors.accent;
        return REL_COLOR[l.kind] || colors.ink4;
      },
      [colors]
    );

    const onHover = useCallback(
      (node: RFNode | null) => {
        if (!node || !wrapRef.current) {
          setHover(null);
          return;
        }
        // Track mouse via wrapper coords; this fires on every node boundary
        // change, so we use the last known mouse position.
        setHover((prev) => ({
          node,
          x: prev?.x ?? 0,
          y: prev?.y ?? 0,
        }));
      },
      []
    );

    const onMouseMove = (e: React.MouseEvent) => {
      const rect = wrapRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setHover((prev) => (prev ? { ...prev, x, y } : prev));
    };

    return (
      <div
        ref={wrapRef}
        onMouseMove={onMouseMove}
        style={{ position: "absolute", inset: 0, overflow: "hidden" }}
      >
        {size.w > 0 && size.h > 0 && (
          <ForceGraph2D
            {...({
              ref: setFgRef,
              width: size.w,
              height: size.h,
              graphData: data,
              backgroundColor: "rgba(0,0,0,0)",
              nodeRelSize: 1,
              nodeId: "id",
              nodeCanvasObject: paintNode,
              nodeCanvasObjectMode: () => "replace",
              nodePointerAreaPaint: (
                node: RFNode,
                color: string,
                ctx: CanvasRenderingContext2D
              ) => {
                const k = zoomRef.current || 1;
                const baseR = radiusFor(node);
                const r = Math.max(baseR, MIN_NODE_SCREEN_R / k) + 4 / k;
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(node.x!, node.y!, r, 0, 2 * Math.PI);
                ctx.fill();
              },
              linkColor,
              linkWidth: (l: RFLink) => {
                const base = l.cross ? 1.2 : 0.8;
                return Math.max(base, MIN_LINK_SCREEN_W / (zoomRef.current || 1));
              },
              linkLineDash: (l: RFLink) => (l.src === "llm" ? [3, 3] : null),
              cooldownTicks: 150,
              onNodeClick: (n: RFNode) => onNodeClick(n),
              onNodeHover: onHover,
              onBackgroundClick: () => setHover(null),
              enableNodeDrag: false,
            } as Record<string, unknown>)}
          />
        )}

        {hover && (
          <div
            className="graph-tooltip"
            style={{
              left: hover.x + 14,
              top: hover.y + 14,
            }}
          >
            <div className="gt-title">{hover.node.title}</div>
            <div className="gt-meta">
              <span
                className="gt-swatch"
                style={{ background: SPACE_COLOR[hover.node.space] }}
              />
              {SPACE_LABEL[hover.node.space]}
              <span className="gt-sep">·</span>
              {hover.node.type}
              <span className="gt-sep">·</span>
              {hover.node.degree} edge{hover.node.degree === 1 ? "" : "s"}
            </div>
          </div>
        )}
      </div>
    );
  }
);
