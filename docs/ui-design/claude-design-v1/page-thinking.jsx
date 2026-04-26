// Thinking Space page — graph + thoughts list + sparring panel
function ThinkingGraph({ activeId, setActiveId }) {
  // Hand-laid node positions for visual control
  const nodes = [
    // AI Research cluster (left)
    { id: 'n1', type: 't', x: 180, y: 130, r: 9, label: 'RLHF reward hacking', space: 'ai' },
    { id: 'n2', type: 's', x: 100, y: 200, r: 5, space: 'ai' },
    { id: 'n3', type: 's', x: 230, y: 60, r: 5, space: 'ai' },
    { id: 'n4', type: 't', x: 280, y: 220, r: 7, label: 'Constitutional AI as proxy spec', space: 'ai' },
    { id: 'n5', type: 's', x: 130, y: 290, r: 5, space: 'ai' },

    // Economics cluster (top-right)
    { id: 'n6', type: 't', x: 620, y: 110, r: 8, label: 'Markets as info aggregators', space: 'econ' },
    { id: 'n7', type: 's', x: 540, y: 60, r: 5, space: 'econ' },
    { id: 'n8', type: 's', x: 720, y: 70, r: 5, space: 'econ' },
    { id: 'n9', type: 't', x: 700, y: 200, r: 7, label: 'Mechanism design ≠ RLHF', space: 'econ' },
    { id: 'n10', type: 's', x: 780, y: 150, r: 5, space: 'econ' },

    // Philosophy cluster (bottom)
    { id: 'n11', type: 't', x: 320, y: 410, r: 9, label: 'Goodhart as universal constraint', space: 'phil', active: true },
    { id: 'n12', type: 's', x: 230, y: 470, r: 5, space: 'phil' },
    { id: 'n13', type: 'meta', x: 440, y: 350, r: 11, label: 'Proxy ≠ Target', space: 'meta' },
    { id: 'n14', type: 't', x: 540, y: 440, r: 7, label: 'Legibility & control', space: 'phil' },
    { id: 'n15', type: 's', x: 620, y: 490, r: 5, space: 'phil' },
    { id: 'n16', type: 's', x: 380, y: 480, r: 5, space: 'phil' },
  ];

  const edges = [
    ['n1','n2'], ['n1','n3'], ['n1','n4'], ['n1','n5'], ['n4','n5'],
    ['n6','n7'], ['n6','n8'], ['n6','n9'], ['n9','n10'],
    ['n11','n12'], ['n11','n16'], ['n14','n15'], ['n14','n16'],
    // cross-space (the meta connections)
    ['n1','n13'], ['n9','n13'], ['n11','n13'], ['n6','n13'], ['n14','n13'],
    ['n11','n14'],
  ];

  const colors = {
    ai: 'oklch(0.62 0.13 28)',
    econ: 'oklch(0.55 0.10 145)',
    phil: 'oklch(0.50 0.11 270)',
    meta: 'var(--accent)',
  };
  const fillFor = (n) => colors[n.space] || 'var(--ink-3)';
  const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]));

  return (
    <svg className="graph-svg" viewBox="0 0 880 560" preserveAspectRatio="xMidYMid meet">
      {/* soft space regions */}
      <defs>
        <radialGradient id="g-ai" cx="50%" cy="50%">
          <stop offset="0%" stopColor="oklch(0.62 0.13 28 / 0.10)" />
          <stop offset="100%" stopColor="oklch(0.62 0.13 28 / 0)" />
        </radialGradient>
        <radialGradient id="g-econ" cx="50%" cy="50%">
          <stop offset="0%" stopColor="oklch(0.55 0.10 145 / 0.10)" />
          <stop offset="100%" stopColor="oklch(0.55 0.10 145 / 0)" />
        </radialGradient>
        <radialGradient id="g-phil" cx="50%" cy="50%">
          <stop offset="0%" stopColor="oklch(0.50 0.11 270 / 0.10)" />
          <stop offset="100%" stopColor="oklch(0.50 0.11 270 / 0)" />
        </radialGradient>
      </defs>
      <ellipse cx="200" cy="200" rx="200" ry="170" fill="url(#g-ai)" />
      <ellipse cx="660" cy="140" rx="200" ry="140" fill="url(#g-econ)" />
      <ellipse cx="420" cy="430" rx="260" ry="160" fill="url(#g-phil)" />

      {/* space labels */}
      <text x="60" y="60" style={{ font: '500 11px Inter', letterSpacing: 2, fill: 'oklch(0.62 0.13 28)', textTransform: 'uppercase' }}>AI RESEARCH</text>
      <text x="540" y="40" style={{ font: '500 11px Inter', letterSpacing: 2, fill: 'oklch(0.55 0.10 145)' }}>ECONOMICS</text>
      <text x="180" y="540" style={{ font: '500 11px Inter', letterSpacing: 2, fill: 'oklch(0.50 0.11 270)' }}>PHILOSOPHY</text>

      {/* edges */}
      {edges.map(([a, b], i) => {
        const A = nodeMap[a], B = nodeMap[b];
        const cross = A.space !== B.space;
        return (
          <line
            key={i}
            x1={A.x} y1={A.y} x2={B.x} y2={B.y}
            stroke={cross ? 'var(--accent)' : 'var(--ink-4)'}
            strokeWidth={cross ? 1.2 : 0.8}
            strokeDasharray={cross ? '3,3' : '0'}
            opacity={cross ? 0.55 : 0.35}
          />
        );
      })}

      {/* nodes */}
      {nodes.map(n => {
        const isActive = n.id === activeId || n.active;
        return (
          <g key={n.id} className="node-circ" onClick={() => setActiveId && setActiveId(n.id)}>
            {n.type === 'meta' && (
              <circle cx={n.x} cy={n.y} r={n.r + 6} fill="none" stroke="var(--accent)" strokeWidth="1" strokeDasharray="2,3" opacity="0.6" />
            )}
            <circle
              cx={n.x} cy={n.y} r={n.r}
              fill={n.type === 's' ? 'var(--paper)' : fillFor(n)}
              stroke={n.type === 's' ? fillFor(n) : (isActive ? 'var(--ink)' : 'var(--paper)')}
              strokeWidth={n.type === 's' ? 1.5 : (isActive ? 2 : 1.5)}
            />
            {n.label && (
              <text
                x={n.x + n.r + 8} y={n.y + 4}
                style={{ font: (n.type === 'meta' ? 'italic 500 13px Spectral' : '500 12px Spectral'), fill: 'var(--ink)' }}
              >
                {n.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function ThinkingPage() {
  const [activeId, setActiveId] = useState('t1');
  const thoughts = window.DATA.thoughts;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow" style={{ marginBottom: 8 }}>Layer 2 — Where cognition happens</div>
          <h1 className="page-title">Thinking<span className="ital"> — graph view</span></h1>
          <div className="page-sub">A unified graph of thoughts, sources, and meta-ideas. Spaces are colored regions, not boxes — bridges between them are where the real work lives.</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn ghost"><span className="glyph">⊞</span> Canvas</button>
          <button className="btn ghost"><span className="glyph">≡</span> Outline</button>
          <button className="btn primary"><span className="glyph">+</span> New thought</button>
        </div>
      </div>

      <div className="ts-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="graph-wrap">
            <div className="graph-toolbar">
              <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic' }}>132 thoughts · 87 sources · 4 meta-ideas</span>
              <div className="legend">
                <span className="legend-item"><span className="swatch" style={{ background: 'oklch(0.62 0.13 28)' }}></span>AI Research</span>
                <span className="legend-item"><span className="swatch" style={{ background: 'oklch(0.55 0.10 145)' }}></span>Economics</span>
                <span className="legend-item"><span className="swatch" style={{ background: 'oklch(0.50 0.11 270)' }}></span>Philosophy</span>
                <span className="legend-item"><span className="swatch" style={{ background: 'var(--accent)' }}></span>Meta-idea</span>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                <span className="filter-pill on">All</span>
                <span className="filter-pill">Bridges only</span>
                <span className="filter-pill">Orphans</span>
              </div>
            </div>
            <ThinkingGraph activeId={activeId} setActiveId={setActiveId} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
              <h3 className="section-title" style={{ margin: 0 }}>Active thoughts</h3>
              <span className="muted" style={{ fontSize: 12.5, fontStyle: 'italic', fontFamily: 'var(--serif)' }}>recently developed · sorted by edit time</span>
            </div>
            <div className="thoughts-stack">
              {thoughts.map(t => (
                <div
                  key={t.id}
                  className={'thought' + (activeId === t.id ? ' active' : '')}
                  onClick={() => setActiveId(t.id)}
                >
                  <div className="thought-header">
                    <span className={'tag ' + (t.space === 'AI Research' ? 'ai' : t.space === 'Economics' ? 'econ' : t.space === 'Philosophy' ? 'phil' : 'meta')}>
                      <span className="swatch"></span>{t.space}
                    </span>
                    {t.id === 't1' && <span className="tag" style={{ borderColor: 'var(--accent-soft)', color: 'var(--accent)' }}>ready to graduate?</span>}
                  </div>
                  <h4 className="thought-title">{t.title}</h4>
                  <div className="thought-meta">
                    <span>{t.sources} sources</span>
                    <span className="dot-sep">{t.edges} edges</span>
                    <span className="dot-sep">last edited {t.age} ago</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <SparringPanel />
      </div>
    </div>
  );
}

function SparringPanel() {
  return (
    <div className="sparring">
      <div className="sparring-header">
        <span className="ai-mark">A</span>
        <div>
          <div className="title">Sparring partner</div>
          <div style={{ fontSize: 11, color: 'var(--ink-4)', fontStyle: 'italic', fontFamily: 'var(--serif)' }}>reading your graph</div>
        </div>
        <span className="mode">Mode C</span>
      </div>
      <div className="sparring-body">
        <div className="spar-msg ai">
          You wrote three weeks ago that <span className="cite">Goodhart is "a constraint, not a law"</span>. The thought you're developing now treats it as universal. Which is it?
        </div>
        <div className="spar-msg you">
          Maybe both — universal in form but variable in severity, depending on feedback-loop tightness.
        </div>
        <div className="spar-msg ai">
          That reframes it as a parameter, not a binary. Two sources you haven't connected yet seem relevant:
          <div className="spar-suggest">
            <div className="sug">↗ Gao et al. — <i>Scaling Laws for Reward Model Overoptimization</i></div>
            <div className="sug">↗ Cowen — <i>tight loops in financial markets vs. policy</i></div>
          </div>
        </div>
        <div className="spar-msg ai">
          Also: this connects to your Economics thought <span className="cite">Mechanism design ≠ RLHF</span>. Want me to propose a meta-idea linking them?
          <div className="spar-suggest">
            <div className="sug">+ propose <i>Proxy collapse rate ∝ feedback tightness</i></div>
            <div className="sug">— not now</div>
          </div>
        </div>
      </div>
      <div className="sparring-input">
        <textarea placeholder="Push back, ask, develop…"></textarea>
        <button className="send">↵</button>
      </div>
    </div>
  );
}

window.ThinkingPage = ThinkingPage;
