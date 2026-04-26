// Project page
function ProjectPage() {
  const tasks = window.DATA.tasks;
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow" style={{ marginBottom: 8 }}>Layer 4 — Where thinking becomes building</div>
          <h1 className="page-title">Mechanism Spec<span className="ital"> v0</span></h1>
          <div className="page-sub">A working draft of an incentive layer for honest reporting in multi-agent systems. Receives from thinking spaces. Pushes back only when you say so.</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn ghost"><span className="glyph">⌕</span> Briefing</button>
          <button className="btn ghost"><span className="glyph">↗</span> Open repo</button>
          <button className="btn primary"><span className="glyph">+</span> New entry</button>
        </div>
      </div>

      <div className="proj-meta-row" style={{ marginBottom: 28 }}>
        <span className="item"><b>Started</b> Mar 14, 2026</span>
        <span className="item"><b>Status</b> drafting</span>
        <span className="item"><b>Repo</b> github.com/—/mech-spec</span>
        <span className="item"><b>Linked spaces</b> Economics, AI Research</span>
        <div style={{ flex: 1 }}></div>
        <div className="proj-progress"><div className="fill" style={{ width: '38%' }}></div></div>
        <span style={{ fontSize: 12, color: 'var(--ink-3)', fontVariantNumeric: 'tabular-nums' }}>38% · 6/16 milestones</span>
      </div>

      <div className="proj-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <section className="journal">
            <div className="journal-header">
              <h3>Project journal</h3>
              <span className="mark">Human-only · no LLM writes</span>
            </div>

            <div className="journal-entry">
              <div className="date">2026-04-24 — THU</div>
              <h4>Reframing what this project actually is</h4>
              <p>
                Spent the morning re-reading my Economics thoughts and realized the spec I'm drafting isn't
                really a "reward function" — it's a mechanism. The distinction matters. A reward function
                assumes a single agent and a fixed objective; a mechanism assumes multiple agents with
                strategic responses and tries to make truth-telling individually rational.
              </p>
              <p>
                The wiki article on <span className="ref">Proxy–Target Collapse</span> is doing more work
                than I expected — every section of the spec keeps bumping up against it. May need to lift
                its conclusions into the architecture section directly.
              </p>
            </div>

            <div className="journal-entry">
              <div className="date">2026-04-22 — TUE</div>
              <h4>What the v0 needs to demonstrate</h4>
              <p>
                Three properties: (1) honest reporting is a dominant strategy under mild assumptions,
                (2) the mechanism degrades gracefully when those assumptions are violated, (3) it is
                computationally tractable for the agent count we care about (≤ 50). I do not need v0 to
                be deployable. I need it to be <em>arguable</em>.
              </p>
              <p>
                Connecting back to <span className="ref">Goodhart as universal constraint</span>: the
                whole reason I think this is worth building is that traditional RLHF can't satisfy
                property (1). If it could, mechanism design would be a curiosity, not a tool.
              </p>
            </div>

            <div className="journal-entry">
              <div className="date">2026-04-18 — FRI</div>
              <h4>Day-one notes</h4>
              <p>
                Starting this project because I keep circling the same problem in three different
                thinking spaces and it's clearly time to commit to something specific. The hypothesis is
                that you can borrow the formal apparatus of mechanism design and use it as a framework
                for AI alignment in multi-agent settings. I don't yet know if that's a clever observation
                or a category error. The point of v0 is to find out.
              </p>
            </div>
          </section>

          <section className="tasks">
            <div className="tasks-header">
              <h3>Backlog</h3>
              <span style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'var(--serif)', fontStyle: 'italic' }}>flat markdown · synced with /TODO.md</span>
            </div>
            {tasks.map(t => (
              <div key={t.id} className={'task-row' + (t.done ? ' done' : '')}>
                <span className="check">✓</span>
                <span className="ttl">{t.title}</span>
                <span className="when">{t.when}</span>
                <span className="who">{t.who}</span>
              </div>
            ))}
          </section>
        </div>

        <aside style={{ display: 'flex', flexDirection: 'column', gap: 18, position: 'sticky', top: 32 }}>
          <div className="briefing">
            <h4>Since you last worked here</h4>
            <div className="b-item">
              <span className="icon">t</span>
              <div className="what">
                <b>2 new thoughts</b> in <i>Economics</i> mention mechanism design — one challenges the
                "honest reporting is dominant" framing.
              </div>
            </div>
            <div className="b-item">
              <span className="icon">s</span>
              <div className="what">
                <b>1 paper</b> tagged relevant: Hurwicz & Maskin survey on implementation theory.
              </div>
            </div>
            <div className="b-item">
              <span className="icon">w</span>
              <div className="what">
                <b>Wiki article</b> "Proxy–Target Collapse" was revised — section 3 now directly
                concerns this project.
              </div>
            </div>
            <div className="b-item">
              <span className="icon">m</span>
              <div className="what">
                A meta-idea is forming around <b>"feedback tightness"</b>. Worth checking before
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
              <div className="li"><span className="kind">source</span><span className="ttl">Hurwicz & Maskin (2008)</span></div>
              <div className="li"><span className="kind">source</span><span className="ttl">Cowen — Stubborn Attachments</span></div>
            </div>
          </div>

          <div className="side-card" style={{ background: 'var(--paper-2)' }}>
            <div className="eyebrow" style={{ marginBottom: 6, color: 'var(--accent)' }}>Push back</div>
            <p style={{ margin: '0 0 10px', fontSize: 13 }}>
              Working on this taught you something general? Send it back to a thinking space.
            </p>
            <button className="btn" style={{ width: '100%', justifyContent: 'center' }}>
              Capture insight → Economics
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

window.ProjectPage = ProjectPage;
