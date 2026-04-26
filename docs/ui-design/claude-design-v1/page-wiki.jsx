// Wiki page
function WikiPage() {
  const articles = window.DATA.wikiArticles;
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow" style={{ marginBottom: 8 }}>Layer 3 — Crystallized knowledge</div>
          <h1 className="page-title">Wiki<span className="ital"> — positions you've arrived at</span></h1>
          <div className="page-sub">Reference articles distilled from thinking-space thoughts. The LLM writes; you review.</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn ghost"><span className="glyph">↺</span> Revision history</button>
          <button className="btn ghost"><span className="glyph">⇆</span> Index</button>
          <button className="btn primary"><span className="glyph">↑</span> Graduate thought</button>
        </div>
      </div>

      <div className="wiki-grid">
        <nav className="wiki-toc">
          <h5>Concepts</h5>
          {articles.filter(a => a.section === 'Concepts').map(a => (
            <a key={a.id} className={(a.indent ? 'indent ' : '') + (a.current ? 'current' : '')}>
              {a.title}
            </a>
          ))}
          <h5 style={{ marginTop: 22 }}>Methods</h5>
          {articles.filter(a => a.section === 'Methods').map(a => (
            <a key={a.id}>{a.title}</a>
          ))}
          <h5 style={{ marginTop: 22 }}>Frameworks</h5>
          {articles.filter(a => a.section === 'Frameworks').map(a => (
            <a key={a.id}>{a.title}</a>
          ))}
          <h5 style={{ marginTop: 22 }}>Meta-essays</h5>
          {articles.filter(a => a.section === 'Meta-essays').map(a => (
            <a key={a.id}>{a.title}</a>
          ))}
        </nav>

        <article className="wiki-article">
          <div className="eyebrow">Concept · Bridge article</div>
          <h1>Proxy–Target Collapse</h1>
          <p className="wiki-sub">When the measurement and the thing being measured become indistinguishable, and the system loses the ability to tell whether it is succeeding.</p>

          <div className="wiki-meta">
            <span><b>Last revised</b> · 4 days ago</span>
            <span><b>Bridges</b> · AI Research, Economics, Philosophy</span>
            <span><b>Provenance</b> · 8 thoughts, 11 sources</span>
            <span><b>Status</b> · stable</span>
          </div>

          <p className="drop-cap">
            A proxy is a measurable stand-in for something we actually care about — test scores for learning,
            engagement metrics for value delivered, reward signals for aligned behavior. The proxy is useful
            precisely <em>because</em> it is not the thing itself: it is observable, comparable, and cheap.
            But the same gap that makes a proxy useful also makes it gameable. Once a system is optimized
            against a proxy with sufficient force, the proxy ceases to track the underlying target — and
            eventually the system can no longer tell the difference. This is the proxy–target collapse, and
            it is a strict generalization of <span className="wlink">Goodhart's Law</span>.
          </p>

          <h2>Three modes of collapse</h2>
          <p>
            The collapse arrives in three observable patterns, each producing a different failure mode in
            the system that depended on the proxy.
          </p>
          <h3>1. Drift — the proxy slowly decouples</h3>
          <p>
            Standard Goodhart territory. The metric still responds to inputs, but the correlation with the
            target weakens over time. See <span className="wlink">Reward Model Overoptimization</span> for
            the empirical version of this in RLHF, and Campbell's law in the social-policy literature.
          </p>
          <h3>2. Capture — the proxy becomes the target</h3>
          <p>
            More severe. Stakeholders begin treating the proxy as the actual goal. Universities measure
            "research quality" by citation count, then optimize for citation count, then redefine research
            quality as that-which-produces-citations. The system has not failed; it has just been
            re-pointed.
          </p>
          <h3>3. Inversion — the proxy actively damages the target</h3>
          <p>
            The most severe. Optimization for the proxy now produces outcomes that are worse on the
            underlying target than no optimization would have. This is the Cobra Effect in policy and the
            most dangerous failure mode for <span className="wlink">aligned AI systems</span>.
          </p>

          <blockquote>
            The proxy is useful precisely because it is not the target.
            That same gap is what eventually destroys it.
          </blockquote>

          <h2>Why tightness matters</h2>
          <p>
            The rate of collapse appears proportional to the tightness of the feedback loop between the
            proxy and the optimizer. Markets — fast, high-stakes, well-instrumented — produce collapses on
            the scale of weeks. Policy — slow, noisy, multi-stakeholder — can sustain a proxy for decades.
            This suggests a generalization worth testing:
          </p>
          <ul>
            <li>Loose loops produce drift; tight loops produce inversion.</li>
            <li>The "alignment tax" of any optimizer is partially a tax on loop-tightening.</li>
            <li>A meaningful design lever is to <em>deliberately slow</em> the loop.</li>
          </ul>

          <h2>Open questions</h2>
          <p>
            Is there a class of proxies that resist collapse — for instance, those that are themselves
            the output of competing optimizers (markets, peer review, adversarial games)? See the
            unresolved thread in <span className="wlink">Mechanism Design</span>.
          </p>
        </article>

        <aside className="wiki-side">
          <div className="side-card">
            <div className="eyebrow" style={{ marginBottom: 6 }}>Provenance</div>
            <h4>Built from</h4>
            <div className="prov-list">
              <div className="prov-item">
                <span className="pmark">t</span>
                <div className="ptext">
                  Goodhart's Law as a universal constraint
                  <small>THOUGHT · Philosophy · 14d</small>
                </div>
              </div>
              <div className="prov-item">
                <span className="pmark">t</span>
                <div className="ptext">
                  RLHF reward hacking is a measurement failure
                  <small>THOUGHT · AI Research · 6d</small>
                </div>
              </div>
              <div className="prov-item">
                <span className="pmark">s</span>
                <div className="ptext">
                  Gao et al. — Scaling Laws for Reward Model Overoptimization
                  <small>SOURCE · arxiv 2210.10760</small>
                </div>
              </div>
              <div className="prov-item">
                <span className="pmark">s</span>
                <div className="ptext">
                  Strathern — "Improving Ratings"
                  <small>SOURCE · 1997</small>
                </div>
              </div>
              <div className="prov-item">
                <span className="pmark">m</span>
                <div className="ptext">
                  Proxy ≠ Target (meta-idea)
                  <small>BRIDGES 3 SPACES</small>
                </div>
              </div>
            </div>
          </div>

          <div className="side-card">
            <div className="eyebrow" style={{ marginBottom: 6 }}>Cross-references</div>
            <h4 style={{ marginBottom: 8 }}>Linked articles</h4>
            <div className="linked-list">
              <div className="li"><span className="kind">concept</span><span className="ttl">Goodhart's Law</span></div>
              <div className="li"><span className="kind">concept</span><span className="ttl">Legibility (Scott)</span></div>
              <div className="li"><span className="kind">method</span><span className="ttl">RLHF</span></div>
              <div className="li"><span className="kind">framework</span><span className="ttl">Mechanism Design</span></div>
            </div>
          </div>

          <div className="side-card" style={{ background: 'var(--paper-2)' }}>
            <div className="eyebrow" style={{ marginBottom: 6, color: 'var(--accent)' }}>Tension</div>
            <p style={{ margin: 0, fontSize: 13 }}>
              A new thought in <i>AI Research</i> contradicts the "inversion" claim. Review?
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

window.WikiPage = WikiPage;
