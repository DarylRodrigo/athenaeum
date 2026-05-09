"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import type { ProjectDetail } from "@/lib/types";

export default function ProjectPage() {
  const [project, setProject] = useState<ProjectDetail | null>(null);

  useEffect(() => {
    apiFetch<ProjectDetail>("/projects/p-mechanism-spec").then(setProject).catch(() => {});
  }, []);

  if (!project) return <div className="page" style={{ padding: 48, color: "var(--ink-3)" }}>Loading project...</div>;

  const tasks = project.tasks || [];
  const journal = project.journal || [];
  const doneCount = tasks.filter((t) => t.done).length;
  const pct = tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow" style={{ marginBottom: 8 }}>Layer 4 — Where thinking becomes building</div>
          <h1 className="page-title">{project.title || "Project"}</h1>
          <div className="page-sub">{project.goals || "A working draft."}</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn ghost"><span className="glyph">⌕</span> Briefing</button>
          <button className="btn ghost"><span className="glyph">↗</span> Open repo</button>
          <button className="btn primary"><span className="glyph">+</span> New entry</button>
        </div>
      </div>

      <div className="proj-meta-row" style={{ marginBottom: 28 }}>
        <span className="item"><b>Started</b> {project.created ? new Date(project.created).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }) : "—"}</span>
        <span className="item"><b>Status</b> {project.status || "active"}</span>
        <span className="item"><b>Linked spaces</b> {project.spaces?.join(", ") || "—"}</span>
        <div style={{ flex: 1 }}></div>
        <div className="proj-progress"><div className="fill" style={{ width: `${pct}%` }}></div></div>
        <span style={{ fontSize: 12, color: "var(--ink-3)", fontVariantNumeric: "tabular-nums" }}>{pct}% · {doneCount}/{tasks.length} tasks</span>
      </div>

      <div className="proj-grid">
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <section className="journal">
            <div className="journal-header">
              <h3>Project journal</h3>
              <span className="mark">Human-only · no LLM writes</span>
            </div>

            {journal.map((entry, idx) => (
              <div key={idx} className="journal-entry">
                <div className="date">{entry.date} — {entry.day}</div>
                <div style={{ whiteSpace: "pre-wrap", fontFamily: "var(--serif)", fontSize: "var(--fs-body)", color: "var(--ink-2)", lineHeight: 1.65 }}>
                  {entry.body}
                </div>
              </div>
            ))}
          </section>

          <section className="tasks">
            <div className="tasks-header">
              <h3>Backlog</h3>
              <span style={{ fontSize: 12, color: "var(--ink-3)", fontFamily: "var(--serif)", fontStyle: "italic" }}>flat markdown · synced with /TODO.md</span>
            </div>
            {tasks.map((t, idx) => (
              <div key={idx} className={"task-row" + (t.done ? " done" : "")}>
                <span className="check">✓</span>
                <span className="ttl">{t.title}</span>
                <span className="when">{t.when || ""}</span>
                <span className="who">self</span>
              </div>
            ))}
          </section>
        </div>

        <aside style={{ display: "flex", flexDirection: "column", gap: 18, position: "sticky", top: 32 }}>
          <div className="briefing">
            <h4>Since you last worked here</h4>
            <div className="b-item">
              <span className="icon">t</span>
              <div className="what">
                <b>2 new thoughts</b> in <i>Economics</i> mention mechanism design — one challenges the
                &quot;honest reporting is dominant&quot; framing.
              </div>
            </div>
            <div className="b-item">
              <span className="icon">s</span>
              <div className="what">
                <b>1 paper</b> tagged relevant: Hurwicz &amp; Maskin survey on implementation theory.
              </div>
            </div>
            <div className="b-item">
              <span className="icon">w</span>
              <div className="what">
                <b>Wiki article</b> &quot;Proxy–Target Collapse&quot; was revised — section 3 now directly
                concerns this project.
              </div>
            </div>
            <div className="b-item">
              <span className="icon">m</span>
              <div className="what">
                A meta-idea is forming around <b>&quot;feedback tightness&quot;</b>. Worth checking before
                you commit to the v0 architecture.
              </div>
            </div>
          </div>

          <div className="side-card">
            <div className="eyebrow" style={{ marginBottom: 6 }}>Drawing on</div>
            <h4 style={{ marginBottom: 8 }}>Linked knowledge</h4>
            <div className="linked-list">
              <div className="li"><span className="kind">wiki</span><span className="ttl">Mechanism Design</span></div>
              <div className="li"><span className="kind">wiki</span><span className="ttl">Proxy–Target Collapse</span></div>
              <div className="li"><span className="kind">thought</span><span className="ttl">Mechanism design ≠ RLHF</span></div>
              <div className="li"><span className="kind">thought</span><span className="ttl">Markets as info aggregators</span></div>
              <div className="li"><span className="kind">source</span><span className="ttl">Hurwicz &amp; Maskin (2008)</span></div>
            </div>
          </div>

          <div className="side-card" style={{ background: "var(--paper-2)" }}>
            <div className="eyebrow" style={{ marginBottom: 6, color: "var(--accent)" }}>Push back</div>
            <p style={{ margin: "0 0 10px", fontSize: 13 }}>
              Working on this taught you something general? Send it back to a thinking space.
            </p>
            <button className="btn" style={{ width: "100%", justifyContent: "center" }}>
              Capture insight → Economics
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
