"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import type { NodeSummary } from "@/lib/types";

function relativeTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  if (days === 1) return "Yest";
  if (days < 7) return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()];
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

const SOURCE_LABELS: Record<string, string> = {
  twitter: "Twitter", arxiv: "arXiv", voice: "Voice", substack: "Substack",
  doc: "Doc", tweet: "Tweet", podcast: "Podcast", note: "Note", paper: "Paper",
  test: "Test", cli: "CLI", final: "Test",
};

export default function InboxPage() {
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [items, setItems] = useState<NodeSummary[]>([]);

  useEffect(() => {
    apiFetch<NodeSummary[]>("/inbox").then(setItems).catch(() => {});
  }, []);

  const filtered = filter === "all" ? items : items.filter((i) => {
    if (filter === "today") {
      const d = i.created ? new Date(i.created) : null;
      const now = new Date();
      return d && d.toDateString() === now.toDateString();
    }
    return true;
  });

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow" style={{ marginBottom: 8 }}>Layer 1 — Capture buffer</div>
          <h1 className="page-title">Inbox<span className="ital"> — {items.length} items pending triage</span></h1>
          <div className="page-sub">A buffer, not a destination. Route each capture to a thinking space, a reading list, or the bin.</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn ghost"><span className="glyph">⌫</span> Archive all read</button>
          <button className="btn primary"><span className="glyph">+</span> Quick capture</button>
        </div>
      </div>

      <div className="inbox-grid">
        <div>
          <div className="inbox-toolbar">
            <div className="inbox-search">
              <span className="glyph" style={{ fontFamily: "var(--serif)", fontStyle: "italic" }}>⌕</span>
              <input placeholder="Search captures…" />
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              <span className={"filter-pill" + (filter === "all" ? " on" : "")} onClick={() => setFilter("all")}>All<span className="num">{items.length}</span></span>
              <span className={"filter-pill" + (filter === "today" ? " on" : "")} onClick={() => setFilter("today")}>Today<span className="num">3</span></span>
              <span className={"filter-pill" + (filter === "reading" ? " on" : "")} onClick={() => setFilter("reading")}>To read<span className="num">12</span></span>
            </div>
          </div>

          <div className="inbox-list">
            {filtered.map((it) => {
              const source = it.id.split("-").pop() || "";
              const sourceLabel = SOURCE_LABELS[source] || source;
              return (
                <div
                  key={it.id}
                  className={"inbox-row" + (selected === it.id ? " selected" : "")}
                  onClick={() => setSelected(it.id)}
                >
                  <div className="when">{relativeTime(it.created)}</div>
                  <div className="src-icon" title={sourceLabel}>{sourceLabel[0]}</div>
                  <div className="body">
                    {it.title}
                  </div>
                  <div className="suggest">
                    <span className="muted-2">→</span>
                    <span>route to <b style={{ color: "var(--ink)", fontWeight: 500 }}>AI Research</b></span>
                  </div>
                  <div className="actions">
                    <span className="icon-btn" title="Accept routing">✓</span>
                    <span className="icon-btn" title="Edit">e</span>
                    <span className="icon-btn archive" title="Archive">×</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <aside className="inbox-side">
          <div className="side-card">
            <div className="eyebrow" style={{ marginBottom: 6 }}>Triage state</div>
            <h4>This week</h4>
            <div className="stat-row"><span className="k">Captured</span><span className="v">82</span></div>
            <div className="stat-row"><span className="k">Routed to spaces</span><span className="v">31</span></div>
            <div className="stat-row"><span className="k">Filed as sources</span><span className="v">19</span></div>
            <div className="stat-row"><span className="k">Discarded</span><span className="v">11</span></div>
            <div className="stat-row"><span className="k">Pending</span><span className="v" style={{ color: "var(--accent)" }}>21</span></div>
          </div>

          <div className="side-card">
            <div className="eyebrow" style={{ marginBottom: 6 }}>Routing legend</div>
            <h4 style={{ marginBottom: 12 }}>Where things go</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                <span className="tag ai"><span className="swatch"></span>AI Research</span>
                <span style={{ fontSize: 11.5, color: "var(--ink-4)" }}>14 pending</span>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                <span className="tag econ"><span className="swatch"></span>Economics</span>
                <span style={{ fontSize: 11.5, color: "var(--ink-4)" }}>6 pending</span>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                <span className="tag phil"><span className="swatch"></span>Philosophy</span>
                <span style={{ fontSize: 11.5, color: "var(--ink-4)" }}>9 pending</span>
              </div>
            </div>
          </div>

          <div className="side-card" style={{ background: "var(--paper-2)" }}>
            <div className="eyebrow" style={{ marginBottom: 6, color: "var(--accent)" }}>Principle</div>
            <p style={{ marginBottom: 0 }}>
              &quot;An inbox that grows indefinitely is a graveyard, not a system.&quot;
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
