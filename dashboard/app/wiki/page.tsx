"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import type { NodeSummary, NodeDetail } from "@/lib/types";

export default function WikiPage() {
  const [sections, setSections] = useState<Record<string, NodeSummary[]>>({});
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [article, setArticle] = useState<NodeDetail | null>(null);

  useEffect(() => {
    apiFetch<Record<string, NodeSummary[]>>("/wiki").then((data) => {
      setSections(data);
      const allArticles = Object.values(data).flat();
      if (allArticles.length > 0 && !currentId) {
        setCurrentId(allArticles[0].id);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (currentId) {
      apiFetch<NodeDetail>(`/wiki/${currentId}`).then(setArticle).catch(() => {});
    }
  }, [currentId]);

  const sectionOrder = ["concepts", "methods", "frameworks", "meta-essays"];
  const orderedSections = sectionOrder.filter((s) => sections[s]);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow" style={{ marginBottom: 8 }}>Layer 3 — Crystallized knowledge</div>
          <h1 className="page-title">Wiki<span className="ital"> — {Object.values(sections).flat().length} articles</span></h1>
          <div className="page-sub">Reference-quality articles built from thinking-space thoughts. Every claim traces back to sources.</div>
        </div>
      </div>

      <div className="wiki-grid">
        <nav className="wiki-toc">
          {orderedSections.map((section) => (
            <div key={section}>
              <h5 style={{ textTransform: "uppercase", letterSpacing: "0.08em", fontSize: 10.5, color: "var(--ink-3)", margin: "16px 0 6px" }}>{section}</h5>
              {sections[section].map((a) => (
                <div
                  key={a.id}
                  className={"toc-item" + (currentId === a.id ? " current" : "")}
                  onClick={() => setCurrentId(a.id)}
                  style={{ cursor: "pointer", padding: "4px 8px", fontSize: 13.5, color: currentId === a.id ? "var(--accent)" : "var(--ink-2)", borderLeft: currentId === a.id ? "2px solid var(--accent)" : "2px solid transparent" }}
                >
                  {a.title}
                </div>
              ))}
            </div>
          ))}
        </nav>

        <article className="wiki-article">
          {article ? (
            <>
              <div className="eyebrow" style={{ marginBottom: 8 }}>{(article as any).section || "Article"}</div>
              <h2 style={{ fontFamily: "var(--serif)", fontSize: 28, fontWeight: 500, marginBottom: 8 }}>{article.title}</h2>
              <div className="meta-strip" style={{ marginBottom: 24, fontSize: 12.5, color: "var(--ink-3)" }}>
                <b>Last revised</b> {article.last_revised || "—"} · <b>Spaces</b> {article.spaces?.join(", ") || "—"} · <b>Provenance</b> {article.provenance?.length || 0} sources
              </div>
              <div style={{ fontFamily: "var(--serif)", fontSize: "var(--fs-body)", lineHeight: 1.7, color: "var(--ink)", whiteSpace: "pre-wrap" }}>
                {article.body?.replace(/^#\s+.+\n*/, "") || ""}
              </div>
            </>
          ) : (
            <p style={{ color: "var(--ink-3)", fontStyle: "italic" }}>Select an article from the table of contents.</p>
          )}
        </article>

        <aside className="wiki-side">
          {article && article.provenance && article.provenance.length > 0 && (
            <div className="side-card">
              <div className="eyebrow" style={{ marginBottom: 6 }}>Provenance</div>
              <h4 style={{ marginBottom: 8 }}>Built from</h4>
              {article.provenance.map((pid) => (
                <div key={pid} style={{ fontSize: 12.5, color: "var(--ink-2)", padding: "3px 0" }}>
                  <span style={{ fontSize: 10, background: "var(--paper-2)", borderRadius: 3, padding: "1px 5px", marginRight: 6, fontFamily: "var(--mono)" }}>{pid.split("-")[0]}</span>
                  {pid}
                </div>
              ))}
            </div>
          )}

          {article && article.edges && article.edges.length > 0 && (
            <div className="side-card">
              <div className="eyebrow" style={{ marginBottom: 6 }}>Cross-references</div>
              <h4 style={{ marginBottom: 8 }}>Related</h4>
              {article.edges.map((e, idx) => (
                <div key={idx} style={{ fontSize: 12.5, color: "var(--ink-2)", padding: "3px 0" }}>
                  <span style={{ fontSize: 10, color: "var(--ink-4)", marginRight: 6 }}>{e.kind}</span>
                  {e.to}
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
