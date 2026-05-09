"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  test: "Test", cli: "CLI", agent: "Agent", final: "Test",
};

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export default function InboxPage() {
  const router = useRouter();
  const [filter, setFilter] = useState("all");
  const [items, setItems] = useState<NodeSummary[]>([]);
  const [sideVisible, setSideVisible] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

  const todayCount = items.filter((i) => {
    const d = i.created ? new Date(i.created) : null;
    const now = new Date();
    return d && d.toDateString() === now.toDateString();
  }).length;

  async function archive(id: string) {
    setBusyId(id);
    setErrorMsg(null);
    try {
      await apiFetch(`/inbox/${id}`, { method: "DELETE" });
      setItems((items) => items.filter((i) => i.id !== id));
    } catch {
      setErrorMsg(`archive failed: ${id}`);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow" style={{ marginBottom: 8 }}>Layer 1 — Capture buffer</div>
          <h1 className="page-title">Inbox<span className="ital"> — {items.length} items pending triage</span></h1>
          <div className="page-sub">A buffer, not a destination. Read each capture, develop a thought from it, or archive.</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn primary"><span className="glyph">+</span> Quick capture</button>
        </div>
      </div>

      {errorMsg && (
        <div style={{ background: "var(--paper-2)", border: "1px solid var(--accent-soft)", color: "var(--accent)", padding: "8px 12px", borderRadius: 6, marginBottom: 16, fontSize: 13 }}>
          {errorMsg}
        </div>
      )}

      <div className={"inbox-grid" + (sideVisible ? "" : " side-hidden")} style={{ position: "relative" }}>
        <div>
          <div className="inbox-toolbar">
            <div className="inbox-search">
              <span className="glyph" style={{ fontFamily: "var(--serif)", fontStyle: "italic" }}>⌕</span>
              <input placeholder="Search captures…" />
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              <span className={"filter-pill" + (filter === "all" ? " on" : "")} onClick={() => setFilter("all")}>All<span className="num">{items.length}</span></span>
              <span className={"filter-pill" + (filter === "today" ? " on" : "")} onClick={() => setFilter("today")}>Today<span className="num">{todayCount}</span></span>
            </div>
            <button
              className="inbox-side-toggle"
              onClick={() => setSideVisible((v) => !v)}
              aria-label={sideVisible ? "Hide stats" : "Show stats"}
              style={{ position: "static", marginLeft: "auto" }}
            >
              {sideVisible ? "Hide stats →" : "← Show stats"}
            </button>
          </div>

          <div className="inbox-list">
            {filtered.map((it) => {
              const source = it.source || it.id.split("-").pop() || "";
              const sourceLabel = SOURCE_LABELS[source] || source;
              const isBusy = busyId === it.id;
              return (
                <div
                  key={it.id}
                  className="inbox-row"
                  onClick={() => router.push(`/inbox/${it.id}`)}
                  style={{ cursor: "pointer" }}
                >
                  <div className="when">{relativeTime(it.created)}</div>
                  <div className="src-icon" title={sourceLabel}>{sourceLabel[0]?.toUpperCase()}</div>
                  <div className="body">
                    {it.title}
                    {it.raw_url && (
                      <a
                        href={it.raw_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="raw-link"
                        onClick={(e) => e.stopPropagation()}
                        title={it.raw_url}
                      >
                        ↗ {hostname(it.raw_url)}
                      </a>
                    )}
                  </div>
                  <div className="actions">
                    <span
                      className="icon-btn"
                      title="Read & develop"
                      onClick={(e) => { e.stopPropagation(); router.push(`/inbox/${it.id}`); }}
                    >→</span>
                    <span
                      className="icon-btn archive"
                      title="Archive"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isBusy) archive(it.id);
                      }}
                      style={{ opacity: isBusy ? 0.4 : 1 }}
                    >×</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {sideVisible && (
          <aside className="inbox-side">
            <div className="side-card">
              <div className="eyebrow" style={{ marginBottom: 6 }}>Triage state</div>
              <h4>This week</h4>
              <div className="stat-row"><span className="k">Captured</span><span className="v">{items.length}</span></div>
              <div className="stat-row"><span className="k">Routed to spaces</span><span className="v">—</span></div>
              <div className="stat-row"><span className="k">Filed as sources</span><span className="v">—</span></div>
              <div className="stat-row"><span className="k">Discarded</span><span className="v">—</span></div>
              <div className="stat-row"><span className="k">Pending</span><span className="v" style={{ color: "var(--accent)" }}>{items.length}</span></div>
            </div>

            <div className="side-card" style={{ background: "var(--paper-2)" }}>
              <div className="eyebrow" style={{ marginBottom: 6, color: "var(--accent)" }}>Principle</div>
              <p style={{ marginBottom: 0 }}>
                &quot;Don&apos;t file. Develop. Every captured item is a stimulus — read it, write what it sparks, or let it go.&quot;
              </p>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
