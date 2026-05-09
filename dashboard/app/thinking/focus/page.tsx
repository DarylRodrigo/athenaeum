"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import type { NodeSummary, NodeDetail } from "@/lib/types";

const SPACE_CLASS: Record<string, string> = {
  "ai-research": "ai", "economics": "econ", "philosophy": "phil",
};

export default function ThinkingFocusPage() {
  const router = useRouter();
  const [thoughts, setThoughts] = useState<NodeSummary[]>([]);
  const [selectedThought, setSelectedThought] = useState<NodeDetail | null>(null);
  const [zoom, setZoom] = useState(100);

  useEffect(() => {
    apiFetch<NodeSummary[]>("/thinking").then(setThoughts).catch(() => {});
  }, []);

  const loadThought = (id: string) => {
    apiFetch<NodeDetail>(`/thinking/${id}`).then(setSelectedThought).catch(() => {});
  };

  // Graph nodes (same as cross-space view)
  const nodes = [
    { id: "n1", type: "t", x: 180, y: 130, r: 9, label: "RLHF reward hacking", space: "ai" },
    { id: "n2", type: "s", x: 100, y: 200, r: 5, space: "ai" },
    { id: "n3", type: "s", x: 230, y: 60, r: 5, space: "ai" },
    { id: "n4", type: "t", x: 280, y: 220, r: 7, label: "Constitutional AI as proxy spec", space: "ai" },
    { id: "n5", type: "s", x: 130, y: 290, r: 5, space: "ai" },
    { id: "n6", type: "t", x: 620, y: 110, r: 8, label: "Markets as info aggregators", space: "econ" },
    { id: "n7", type: "s", x: 540, y: 60, r: 5, space: "econ" },
    { id: "n8", type: "s", x: 720, y: 70, r: 5, space: "econ" },
    { id: "n9", type: "t", x: 700, y: 200, r: 7, label: "Mechanism design ≠ RLHF", space: "econ" },
    { id: "n10", type: "s", x: 780, y: 150, r: 5, space: "econ" },
    { id: "n11", type: "t", x: 320, y: 410, r: 9, label: "Goodhart as universal constraint", space: "phil", active: true },
    { id: "n12", type: "s", x: 230, y: 470, r: 5, space: "phil" },
    { id: "n13", type: "meta", x: 440, y: 350, r: 11, label: "Proxy ≠ Target", space: "meta" },
    { id: "n14", type: "t", x: 540, y: 440, r: 7, label: "Legibility & control", space: "phil" },
    { id: "n15", type: "s", x: 620, y: 490, r: 5, space: "phil" },
    { id: "n16", type: "s", x: 380, y: 480, r: 5, space: "phil" },
  ];

  const edges: [string, string][] = [
    ["n1","n2"], ["n1","n3"], ["n1","n4"], ["n1","n5"], ["n4","n5"],
    ["n6","n7"], ["n6","n8"], ["n6","n9"], ["n9","n10"],
    ["n11","n12"], ["n11","n16"], ["n14","n15"], ["n14","n16"],
    ["n1","n13"], ["n9","n13"], ["n11","n13"], ["n6","n13"], ["n14","n13"],
    ["n11","n14"],
  ];

  const colors: Record<string, string> = {
    ai: "oklch(0.62 0.13 28)", econ: "oklch(0.55 0.10 145)",
    phil: "oklch(0.50 0.11 270)", meta: "var(--accent)",
  };
  const fillFor = (n: typeof nodes[number]) => colors[n.space] || "var(--ink-3)";
  const nodeMap = Object.fromEntries(nodes.map((n) => [n.id, n]));

  return (
    <div className="page focus-page" style={{ display: "grid", gridTemplateColumns: "1fr 380px", height: "calc(100vh - 64px)", gap: 0 }}>
      {/* Full-bleed graph */}
      <div style={{ position: "relative", overflow: "hidden", background: "var(--paper)" }}>
        {/* Floating top-left bar */}
        <div style={{ position: "absolute", top: 16, left: 16, zIndex: 10, display: "flex", gap: 12, alignItems: "center" }}>
          <span className="dot" style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", display: "inline-block" }}></span>
          <span style={{ fontFamily: "var(--serif)", fontWeight: 500, fontSize: 14 }}>Athenaeum</span>
          <button className="btn ghost" style={{ fontSize: 12, padding: "4px 10px" }} onClick={() => router.push("/thinking")}>← Exit focus</button>
        </div>

        {/* Floating bottom-left legend */}
        <div style={{ position: "absolute", bottom: 16, left: 16, zIndex: 10, display: "flex", gap: 12, fontSize: 11, color: "var(--ink-3)" }}>
          <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "oklch(0.62 0.13 28)", marginRight: 4 }}></span>AI</span>
          <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "oklch(0.55 0.10 145)", marginRight: 4 }}></span>Econ</span>
          <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "oklch(0.50 0.11 270)", marginRight: 4 }}></span>Phil</span>
          <span style={{ borderLeft: "1px solid var(--rule)", paddingLeft: 8 }}>— confirmed</span>
          <span>┈ LLM-suggested</span>
        </div>

        {/* Zoom controls */}
        <div style={{ position: "absolute", top: 16, right: 16, zIndex: 10, display: "flex", gap: 6 }}>
          <button className="btn ghost" style={{ padding: "4px 8px", fontSize: 12 }} onClick={() => setZoom((z) => Math.max(60, z - 10))}>−</button>
          <span style={{ fontSize: 12, color: "var(--ink-3)", padding: "4px 0" }}>{zoom}%</span>
          <button className="btn ghost" style={{ padding: "4px 8px", fontSize: 12 }} onClick={() => setZoom((z) => Math.min(160, z + 10))}>+</button>
        </div>

        <svg viewBox="0 0 880 560" preserveAspectRatio="xMidYMid meet" style={{ width: "100%", height: "100%", transform: `scale(${zoom / 100})`, transformOrigin: "center" }}>
          <defs>
            <radialGradient id="gf-ai" cx="50%" cy="50%"><stop offset="0%" stopColor="oklch(0.62 0.13 28 / 0.10)" /><stop offset="100%" stopColor="oklch(0.62 0.13 28 / 0)" /></radialGradient>
            <radialGradient id="gf-econ" cx="50%" cy="50%"><stop offset="0%" stopColor="oklch(0.55 0.10 145 / 0.10)" /><stop offset="100%" stopColor="oklch(0.55 0.10 145 / 0)" /></radialGradient>
            <radialGradient id="gf-phil" cx="50%" cy="50%"><stop offset="0%" stopColor="oklch(0.50 0.11 270 / 0.10)" /><stop offset="100%" stopColor="oklch(0.50 0.11 270 / 0)" /></radialGradient>
          </defs>
          <ellipse cx={200} cy={200} rx={200} ry={170} fill="url(#gf-ai)" />
          <ellipse cx={660} cy={140} rx={200} ry={140} fill="url(#gf-econ)" />
          <ellipse cx={420} cy={430} rx={260} ry={160} fill="url(#gf-phil)" />

          <text x={60} y={60} style={{ font: "500 11px Inter", letterSpacing: 2, fill: "oklch(0.62 0.13 28)" }}>AI RESEARCH</text>
          <text x={540} y={40} style={{ font: "500 11px Inter", letterSpacing: 2, fill: "oklch(0.55 0.10 145)" }}>ECONOMICS</text>
          <text x={180} y={540} style={{ font: "500 11px Inter", letterSpacing: 2, fill: "oklch(0.50 0.11 270)" }}>PHILOSOPHY</text>

          {edges.map(([a, b], i) => {
            const A = nodeMap[a], B = nodeMap[b];
            const cross = A.space !== B.space;
            return <line key={i} x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke={cross ? "var(--accent)" : "var(--ink-4)"} strokeWidth={cross ? 1.2 : 0.8} strokeDasharray={cross ? "3,3" : "0"} opacity={cross ? 0.55 : 0.35} />;
          })}

          {nodes.map((n) => (
            <g key={n.id} style={{ cursor: "pointer" }} onClick={() => {
              if (n.type === "t") loadThought(n.label?.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") || n.id);
            }}>
              {n.type === "meta" && <circle cx={n.x} cy={n.y} r={n.r + 6} fill="none" stroke="var(--accent)" strokeWidth={1} strokeDasharray="2,3" opacity={0.6} />}
              <circle cx={n.x} cy={n.y} r={n.r} fill={n.type === "s" ? "var(--paper)" : fillFor(n)} stroke={n.type === "s" ? fillFor(n) : "var(--paper)"} strokeWidth={1.5} />
              {n.label && <text x={n.x + n.r + 8} y={n.y + 4} style={{ font: n.type === "meta" ? "italic 500 13px Spectral" : "500 12px Spectral", fill: "var(--ink)" }}>{n.label}</text>}
            </g>
          ))}
        </svg>
      </div>

      {/* Right rail */}
      <div style={{ borderLeft: "1px solid var(--rule)", display: "flex", flexDirection: "column", overflow: "auto", background: "var(--paper)" }}>
        {selectedThought ? (
          <div style={{ padding: 20, flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span className={`tag ${SPACE_CLASS[selectedThought.spaces?.[0] || ""] || "meta"}`}>
                <span className="swatch"></span>{selectedThought.spaces?.[0] || ""}
              </span>
              <button className="icon-btn" onClick={() => setSelectedThought(null)}>×</button>
            </div>
            <h3 style={{ fontFamily: "var(--serif)", fontSize: 18, fontWeight: 500, marginBottom: 12 }}>{selectedThought.title}</h3>
            <div style={{ fontFamily: "var(--serif)", fontSize: "var(--fs-body)", lineHeight: 1.65, color: "var(--ink-2)", whiteSpace: "pre-wrap" }}>
              {selectedThought.body?.replace(/^#\s+.+\n*/, "") || ""}
            </div>
            {selectedThought.edges && selectedThought.edges.length > 0 && (
              <div style={{ marginTop: 20, borderTop: "1px solid var(--rule-soft)", paddingTop: 12 }}>
                <div className="eyebrow" style={{ marginBottom: 8 }}>Connections</div>
                {selectedThought.edges.map((e, i) => (
                  <div key={i} style={{ fontSize: 12.5, color: "var(--ink-2)", padding: "3px 0" }}>
                    <span style={{ fontSize: 10, color: "var(--ink-4)", marginRight: 6 }}>{e.kind}</span> {e.to}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div style={{ padding: 20, flex: 1 }}>
            <h4 style={{ color: "var(--ink-3)", fontStyle: "italic", fontFamily: "var(--serif)" }}>Click a thought node to open it here</h4>
            <div style={{ marginTop: 20 }}>
              <div className="eyebrow" style={{ marginBottom: 8 }}>Recent thoughts</div>
              {thoughts.slice(0, 5).map((t) => (
                <div key={t.id} style={{ padding: "8px 0", borderBottom: "1px solid var(--rule-soft)", cursor: "pointer" }} onClick={() => loadThought(t.id)}>
                  <div style={{ fontSize: 13.5, fontFamily: "var(--serif)", color: "var(--ink)" }}>{t.title}</div>
                  <div style={{ fontSize: 11, color: "var(--ink-3)" }}>{t.edge_count} edges · {t.spaces?.join(", ")}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sparring panel at bottom */}
        <div style={{ borderTop: "1px solid var(--rule)", padding: 16, background: "var(--card)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span className="ai-mark" style={{ width: 20, height: 20, borderRadius: "50%", background: "var(--accent-tint)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600 }}>A</span>
            <span style={{ fontSize: 13, fontWeight: 500 }}>Sparring partner</span>
            <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--ink-4)", fontFamily: "var(--mono)" }}>Mode C</span>
          </div>
          <p style={{ fontSize: 12.5, color: "var(--ink-3)", fontStyle: "italic", margin: "0 0 8px" }}>LLM not connected. Sparring will be available once the thinking-spar skill is configured.</p>
          <div style={{ display: "flex", gap: 6 }}>
            <textarea placeholder="Push back, ask, develop…" disabled style={{ flex: 1, resize: "none", height: 36, padding: "8px", fontFamily: "var(--serif)", fontSize: 13, border: "1px solid var(--rule)", borderRadius: 4, background: "var(--paper)" }}></textarea>
            <button className="btn ghost" disabled style={{ padding: "8px 12px" }}>↵</button>
          </div>
        </div>
      </div>
    </div>
  );
}
