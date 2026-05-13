"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import type { NodeSummary } from "@/lib/types";

const SPACE_CLASS: Record<string, string> = {
  "ai-research": "ai",
  "economics": "econ",
  "philosophy": "phil",
  "meta": "meta",
};

export default function ThinkingPage() {
  const [thoughts, setThoughts] = useState<NodeSummary[]>([]);

  useEffect(() => {
    apiFetch<NodeSummary[]>("/thinking").then(setThoughts).catch(() => {});
  }, []);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow" style={{ marginBottom: 8 }}>Layer 2 — Where cognition happens</div>
          <h1 className="page-title">Thinking<span className="ital"> · index</span></h1>
          <div className="page-sub">
            The graph and editing live in focus mode. Pick a thought below to jump in, or open focus mode empty.
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link
            href="/thinking/focus"
            className="btn primary"
            style={{ textDecoration: "none" }}
          >
            <span className="glyph">⊙</span> Open focus mode
          </Link>
        </div>
      </div>

      <div style={{ marginTop: 32 }}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            marginBottom: 14,
          }}
        >
          <h3 className="section-title" style={{ margin: 0 }}>Active thoughts</h3>
          <span
            className="muted"
            style={{ fontSize: 12.5, fontStyle: "italic", fontFamily: "var(--serif)" }}
          >
            {thoughts.length} thought{thoughts.length === 1 ? "" : "s"} · sorted by edit time
          </span>
        </div>

        <div className="thoughts-stack">
          {thoughts.map((t) => {
            const spaceClass = SPACE_CLASS[t.spaces?.[0] || ""] || "meta";
            const spaceLabel =
              t.spaces?.[0]?.replace("-", " ").replace(/\b\w/g, (c) => c.toUpperCase()) ||
              "Meta";
            return (
              <Link
                key={t.id}
                href={`/thinking/focus?open=${encodeURIComponent(t.id)}`}
                className="thought"
                style={{ textDecoration: "none", color: "inherit", display: "block" }}
              >
                <div className="thought-header">
                  <span className={`tag ${spaceClass}`}>
                    <span className="swatch"></span>
                    {spaceLabel}
                  </span>
                  {t.tags?.includes("ready-to-graduate") && (
                    <span
                      className="tag"
                      style={{ borderColor: "var(--accent-soft)", color: "var(--accent)" }}
                    >
                      ready to graduate?
                    </span>
                  )}
                </div>
                <h4 className="thought-title">{t.title}</h4>
                <div className="thought-meta">
                  <span>{t.edge_count} edges</span>
                  <span className="dot-sep">{t.spaces?.length || 0} spaces</span>
                </div>
              </Link>
            );
          })}
          {thoughts.length === 0 && (
            <div
              className="muted"
              style={{ padding: "20px 0", fontStyle: "italic", fontFamily: "var(--serif)" }}
            >
              No thoughts yet. Capture from the inbox, then graduate from there.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
