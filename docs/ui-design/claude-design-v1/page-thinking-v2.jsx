// Thinking Space v2 — full-bleed graph + multi-pane right rail (thoughts + sparring)
const { useState: useState2, useEffect: useEffect2, useRef: useRef2 } = React;

function ThinkingGraphV2({ activeId, setActiveId, hoverEdge, setHoverEdge, hoverNode, setHoverNode, openIds }) {
  const nodes = [
    { id: 'n1', type: 't', x: 280, y: 240, r: 11, label: 'RLHF reward hacking', space: 'ai' },
    { id: 'n2', type: 's', x: 180, y: 310, r: 6, label: 'Gao et al. 2022', space: 'ai' },
    { id: 'n3', type: 's', x: 350, y: 150, r: 6, label: '@kanjun tweet', space: 'ai' },
    { id: 'n4', type: 't', x: 420, y: 340, r: 9, label: 'Constitutional AI as proxy spec', space: 'ai' },
    { id: 'n5', type: 's', x: 220, y: 400, r: 6, label: 'Anthropic CAI paper', space: 'ai' },
    { id: 'n17', type: 's', x: 130, y: 220, r: 6, label: 'Bai et al. RLHF', space: 'ai' },

    { id: 'n6', type: 't', x: 1080, y: 220, r: 10, label: 'Markets as info aggregators', space: 'econ' },
    { id: 'n7', type: 's', x: 980, y: 150, r: 6, label: 'Hayek 1945', space: 'econ' },
    { id: 'n8', type: 's', x: 1190, y: 150, r: 6, label: 'Cowen Substack', space: 'econ' },
    { id: 'n9', type: 't', x: 1180, y: 340, r: 9, label: 'Mechanism design ≠ RLHF', space: 'econ' },
    { id: 'n10', type: 's', x: 1280, y: 260, r: 6, label: 'Hurwicz/Maskin', space: 'econ' },

    { id: 'n11', type: 't', x: 560, y: 620, r: 13, label: 'Goodhart as universal constraint', space: 'phil' },
    { id: 'n12', type: 's', x: 440, y: 700, r: 6, label: 'Strathern 1997', space: 'phil' },
    { id: 'n14', type: 't', x: 880, y: 640, r: 9, label: 'Legibility & control', space: 'phil' },
    { id: 'n15', type: 's', x: 980, y: 720, r: 6, label: 'Scott — Seeing Like a State', space: 'phil' },
    { id: 'n16', type: 's', x: 660, y: 720, r: 6, label: 'Campbell\'s Law note', space: 'phil' },
    { id: 'n19', type: 's', x: 360, y: 660, r: 6, label: 'Cobra Effect note', space: 'phil' },

    { id: 'n13', type: 'meta', x: 730, y: 430, r: 16, label: 'Proxy ≠ Target', space: 'meta' },
  ];

  const edges = [
    { from: 'n1', to: 'n2', rel: 'supports', src: 'you' },
    { from: 'n1', to: 'n4', rel: 'extends', src: 'you' },
    { from: 'n6', to: 'n9', rel: 'extends', src: 'you' },
    { from: 'n9', to: 'n10', rel: 'supports', src: 'you' },
    { from: 'n11', to: 'n12', rel: 'supports', src: 'you' },
    { from: 'n14', to: 'n15', rel: 'supports', src: 'you' },
    { from: 'n14', to: 'n16', rel: 'extends', src: 'llm' },
    { from: 'n1', to: 'n13', rel: 'foundation', src: 'you' },
    { from: 'n9', to: 'n13', rel: 'foundation', src: 'you' },
    { from: 'n11', to: 'n13', rel: 'foundation', src: 'you' },
    { from: 'n6', to: 'n13', rel: 'extends', src: 'llm' },
    { from: 'n14', to: 'n13', rel: 'foundation', src: 'llm' },
    { from: 'n4', to: 'n13', rel: 'contradicts', src: 'llm' },
    { from: 'n11', to: 'n14', rel: 'extends', src: 'you' },
  ];

  const colors = {
    ai: 'oklch(0.62 0.13 28)', econ: 'oklch(0.55 0.10 145)',
    phil: 'oklch(0.50 0.11 270)', meta: 'var(--accent)',
  };
  const fillFor = (n) => colors[n.space];
  const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]));
  const neighborOf = new Set();
  if (activeId) edges.forEach(e => {
    if (e.from === activeId) neighborOf.add(e.to);
    if (e.to === activeId) neighborOf.add(e.from);
  });
  const dim = (id) => activeId && id !== activeId && !neighborOf.has(id);
  const relColor = { supports: 'var(--ink-4)', extends: 'oklch(0.55 0.10 145)', contradicts: '#b04a3a', foundation: 'var(--accent)' };

  return (
    <svg className="graph-canvas" viewBox="0 0 1440 820" preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id="ga-ai" cx="50%" cy="50%"><stop offset="0%" stopColor="oklch(0.62 0.13 28 / 0.14)" /><stop offset="100%" stopColor="oklch(0.62 0.13 28 / 0)" /></radialGradient>
        <radialGradient id="ga-econ" cx="50%" cy="50%"><stop offset="0%" stopColor="oklch(0.55 0.10 145 / 0.14)" /><stop offset="100%" stopColor="oklch(0.55 0.10 145 / 0)" /></radialGradient>
        <radialGradient id="ga-phil" cx="50%" cy="50%"><stop offset="0%" stopColor="oklch(0.50 0.11 270 / 0.14)" /><stop offset="100%" stopColor="oklch(0.50 0.11 270 / 0)" /></radialGradient>
        <pattern id="grid-paper" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="0.6" fill="rgba(29,27,22,0.06)" /></pattern>
      </defs>
      <rect width="1440" height="820" fill="url(#grid-paper)" />
      <ellipse cx="290" cy="280" rx="300" ry="240" fill="url(#ga-ai)" />
      <ellipse cx="1120" cy="270" rx="320" ry="240" fill="url(#ga-econ)" />
      <ellipse cx="650" cy="660" rx="430" ry="220" fill="url(#ga-phil)" />
      <text x="80" y="90" style={{ font: '500 13px Inter', letterSpacing: 2.6, fill: 'oklch(0.62 0.13 28)' }}>AI RESEARCH · 42</text>
      <text x="980" y="90" style={{ font: '500 13px Inter', letterSpacing: 2.6, fill: 'oklch(0.55 0.10 145)' }}>ECONOMICS · 38</text>
      <text x="380" y="790" style={{ font: '500 13px Inter', letterSpacing: 2.6, fill: 'oklch(0.50 0.11 270)' }}>PHILOSOPHY · 52</text>

      {edges.map((e, i) => {
        const A = nodeMap[e.from], B = nodeMap[e.to];
        const cross = A.space !== B.space;
        const involved = e.from === activeId || e.to === activeId;
        const bothDim = dim(e.from) && dim(e.to);
        const isHover = hoverEdge === i;
        const stroke = isHover ? relColor[e.rel] : (cross ? 'var(--accent)' : 'var(--ink-4)');
        return (
          <g key={i} onMouseEnter={() => setHoverEdge(i)} onMouseLeave={() => setHoverEdge(null)} style={{ cursor: 'pointer' }}>
            <line x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke="transparent" strokeWidth="14" />
            <line x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke={stroke}
              strokeWidth={isHover ? 2.6 : (involved ? 2.2 : (cross ? 1.4 : 1))}
              strokeDasharray={e.src === 'llm' ? '4,4' : '0'}
              opacity={bothDim && !isHover ? 0.10 : (isHover ? 1 : (involved ? 0.85 : (cross ? 0.55 : 0.35)))} />
            {isHover && (
              <g>
                <rect x={(A.x + B.x) / 2 - 60} y={(A.y + B.y) / 2 - 20} width="120" height="38" rx="4" fill="var(--card)" stroke={relColor[e.rel]} strokeWidth="1" />
                <text x={(A.x + B.x) / 2} y={(A.y + B.y) / 2 - 5} textAnchor="middle" style={{ font: '500 12px Inter', fill: 'var(--ink)' }}>{e.rel}</text>
                <text x={(A.x + B.x) / 2} y={(A.y + B.y) / 2 + 9} textAnchor="middle" style={{ font: 'italic 11px Spectral', fill: 'var(--ink-3)' }}>{e.src === 'llm' ? 'LLM-suggested' : 'you confirmed'}</text>
              </g>
            )}
          </g>
        );
      })}

      {nodes.map(n => {
        const active = n.id === activeId;
        const isOpen = openIds && openIds.includes(n.id);
        const isDim = dim(n.id);
        const isHover = hoverNode === n.id;
        const showLabel = n.label && (n.type !== 's' || isHover || active);
        return (
          <g key={n.id} className="node-circ" onClick={() => setActiveId(n.id)}
            onMouseEnter={() => setHoverNode(n.id)} onMouseLeave={() => setHoverNode(null)}
            opacity={isDim && !isHover ? 0.25 : 1} style={{ transition: 'opacity 200ms', cursor: 'pointer' }}>
            {n.type === 'meta' && (<>
              <circle cx={n.x} cy={n.y} r={n.r + 14} fill="none" stroke="var(--accent)" strokeWidth="1" strokeDasharray="2,4" opacity="0.5" />
              <circle cx={n.x} cy={n.y} r={n.r + 7} fill="none" stroke="var(--accent)" strokeWidth="0.8" opacity="0.4" />
            </>)}
            {(active || isOpen) && (<circle cx={n.x} cy={n.y} r={n.r + 10} fill="none" stroke="var(--accent)" strokeWidth={isOpen ? 2 : 1.5} opacity={isOpen ? 1 : 0.7} />)}
            {isHover && !active && (<circle cx={n.x} cy={n.y} r={n.r + 6} fill="none" stroke="var(--ink-3)" strokeWidth="1" opacity="0.5" />)}
            <circle cx={n.x} cy={n.y} r={n.r}
              fill={n.type === 's' ? 'var(--paper)' : fillFor(n)}
              stroke={n.type === 's' ? fillFor(n) : 'var(--paper)'}
              strokeWidth={n.type === 's' ? 1.8 : 2} />
            {showLabel && (
              <g>
                {n.type === 's' && isHover && (
                  <rect x={n.x + n.r + 6} y={n.y - 11} width={n.label.length * 6.6 + 14} height="22" rx="3"
                    fill="var(--card)" stroke="var(--rule)" strokeWidth="0.5" opacity="0.96" />
                )}
                <text x={n.x + n.r + 10} y={n.y + 5}
                  style={{
                    font: (n.type === 'meta' ? 'italic 600 17px Spectral' :
                           n.type === 's' ? 'italic 12px Spectral' : '500 15px Spectral'),
                    fill: active ? 'var(--accent)' : (n.type === 's' ? 'var(--ink-2)' : 'var(--ink)'),
                  }}>{n.label}</text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ---- A single thought pane ----
function ThoughtPane({ thought, onClose, onAddToChat, isFocused, onFocus, width }) {
  const [body, setBody] = useState2(thought.body);
  const [title, setTitle] = useState2(thought.title);
  const [tab, setTab] = useState2('body');
  const space = thought.space || 'phil';
  const spaceLabel = { ai: 'AI Research', econ: 'Economics', phil: 'Philosophy', meta: 'Meta-idea' }[space];

  return (
    <section className={'pane pane-thought' + (isFocused ? ' is-focused' : '')} style={{ width }} onMouseDown={onFocus}>
      <div className="pane-head">
        <div className="pane-head-l">
          <span className={'tag ' + space}><span className="swatch"></span>{spaceLabel}</span>
          <span className="tag" style={{ borderColor: 'var(--accent-soft)', color: 'var(--accent)' }}>● editing</span>
        </div>
        <div className="pane-head-r">
          <button className="icon-btn" title="Add to chat (⌘L)" onClick={() => onAddToChat(thought)}>⌘L</button>
          <button className="icon-btn" title="Graduate to wiki">↑</button>
          <button className="icon-btn" onClick={onClose} title="Close pane">×</button>
        </div>
      </div>

      <input className="fe-title" value={title} onChange={e => setTitle(e.target.value)} />
      <div className="fe-meta-row">
        <span>created Apr 12 · edited 14d ago · 6 sources · 9 edges</span>
        <span style={{ color: 'var(--accent)', marginLeft: 'auto' }}>● unsaved</span>
      </div>

      <div className="fe-tabs">
        <button className={'fe-tab' + (tab === 'body' ? ' on' : '')} onClick={() => setTab('body')}>Body</button>
        <button className={'fe-tab' + (tab === 'connections' ? ' on' : '')} onClick={() => setTab('connections')}>Connections <span className="cnt">3</span></button>
        <button className={'fe-tab' + (tab === 'sources' ? ' on' : '')} onClick={() => setTab('sources')}>Sources <span className="cnt">6</span></button>
      </div>

      <div className="fe-body">
        {tab === 'body' && (<textarea className="fe-textarea" value={body} onChange={e => setBody(e.target.value)} />)}
        {tab === 'connections' && (
          <div className="fe-pane">
            <div className="conn-row"><span className="conn-mark" style={{ background: 'oklch(0.62 0.13 28)' }}></span><div className="conn-text"><div>RLHF reward hacking is a measurement failure</div><small>AI Research · supports</small></div></div>
            <div className="conn-row"><span className="conn-mark" style={{ background: 'oklch(0.55 0.10 145)' }}></span><div className="conn-text"><div>The proxy–target collapse is faster in tight feedback loops</div><small>Economics · extends</small></div></div>
            <div className="conn-row"><span className="conn-mark" style={{ background: 'var(--accent)' }}></span><div className="conn-text"><div><i>Proxy ≠ Target</i></div><small>META · this thought is a foundation</small></div></div>
          </div>
        )}
        {tab === 'sources' && (
          <div className="fe-pane">
            <div className="src-row"><span className="src-glyph">P</span><div className="src-text"><div>Strathern — "Improving Ratings"</div><small>1997 · paper</small></div><span className="src-rel">supports</span></div>
            <div className="src-row"><span className="src-glyph">P</span><div className="src-text"><div>Gao et al. — Reward Model Overoptimization</div><small>arxiv 2210.10760</small></div><span className="src-rel">supports</span></div>
            <div className="src-row"><span className="src-glyph">A</span><div className="src-text"><div>Cowen — "On stubborn metrics"</div><small>Substack</small></div><span className="src-rel">extends</span></div>
          </div>
        )}
      </div>

      <div className="pane-foot">
        <span className="hint">⌘L to add to chat</span>
        <span style={{ flex: 1 }}></span>
        <button className="btn ghost">Cancel</button>
        <button className="btn primary">Save</button>
      </div>
    </section>
  );
}

// ---- Sparring pane ----
function SparPane({ context, onRemoveContext, onClose, isFocused, onFocus, width }) {
  const [draft, setDraft] = useState2('');
  return (
    <section className={'pane pane-spar' + (isFocused ? ' is-focused' : '')} style={{ width }} onMouseDown={onFocus}>
      <div className="pane-head spar-head">
        <div className="pane-head-l">
          <span className="ai-mark-2">A</span>
          <span style={{ fontFamily: 'var(--serif)', fontSize: 14, fontWeight: 500 }}>Sparring partner</span>
          <span className="muted-2" style={{ fontSize: 11, fontFamily: 'var(--serif)', fontStyle: 'italic' }}>knows what's open</span>
        </div>
        <div className="pane-head-r">
          <button className="icon-btn" title="History">⏱</button>
          <button className="icon-btn" onClick={onClose} title="Close">×</button>
        </div>
      </div>

      {context.length > 0 && (
        <div className="spar-context">
          <span className="ctx-label">In context</span>
          {context.map(c => (
            <span key={c.id} className={'ctx-chip ' + (c.space || 'phil')}>
              <span className="swatch"></span>
              {c.title.length > 28 ? c.title.slice(0, 28) + '…' : c.title}
              <button onClick={() => onRemoveContext(c.id)}>×</button>
            </span>
          ))}
        </div>
      )}

      <div className="spar-stream">
        <div className="spar-day">Today</div>

        <div className="spar-msg ai">
          <div className="msg-head"><span className="who">Athenaeum</span><span className="when">2:14 PM</span></div>
          You opened <i>Goodhart as universal constraint</i> — three weeks ago you wrote it was <em>"a constraint, not a law."</em> The current draft treats it as universal. Reconcile?
          <div className="spar-cite">
            <span className="cite-mark">¶</span> from <i>Apr 5 — note on rate-of-collapse</i>
          </div>
        </div>

        <div className="spar-msg you">
          <div className="msg-head"><span className="who">You</span><span className="when">2:16 PM</span></div>
          Maybe both — universal in form, variable in severity by feedback-loop tightness.
        </div>

        <div className="spar-msg ai">
          <div className="msg-head"><span className="who">Athenaeum</span><span className="when">2:16 PM</span></div>
          Good reframe. That makes it a parameter, not a binary. Two relevant items in your library you haven't connected:
          <div className="spar-suggest">
            <button className="sug">↗ Gao et al. — overoptimization scaling</button>
            <button className="sug">↗ Cowen — tight loops in markets vs policy</button>
          </div>
        </div>

        <div className="spar-msg ai">
          <div className="msg-head"><span className="who">Athenaeum</span><span className="when">2:17 PM</span></div>
          Worth promoting <em>Proxy collapse rate ∝ feedback tightness</em> to a meta-idea? It would bridge all three open thoughts.
          <div className="spar-suggest">
            <button className="sug accent">+ propose meta-idea</button>
            <button className="sug">— not now</button>
          </div>
        </div>
      </div>

      <div className="spar-input">
        <textarea
          placeholder={context.length ? `Ask about ${context.length} open thought${context.length>1?'s':''}…` : 'Push back, ask, develop…'}
          value={draft}
          onChange={e => setDraft(e.target.value)}
        />
        <div className="spar-input-foot">
          <button className="ctx-add">@ add context</button>
          <span className="hint">⌘L from any thought</span>
          <span style={{ flex: 1 }}></span>
          <button className="send">Send ↵</button>
        </div>
      </div>
    </section>
  );
}

// ---- Page ----
function ThinkingPageV2({ onExit }) {
  const [activeId, setActiveId] = useState2('n11');
  const [zoom, setZoom] = useState2(100);
  const [hoverEdge, setHoverEdge] = useState2(null);
  const [hoverNode, setHoverNode] = useState2(null);

  // Library of openable thoughts
  const library = {
    n11: {
      id: 'n11', space: 'phil',
      title: "Goodhart's Law as a universal constraint on designed systems",
      body:
`The longer I sit with this, the more I think Goodhart's Law isn't really a law in the social-policy sense. It is a structural property of any system where you measure one thing in order to optimize another.

Three observations are worth pulling apart:

1. The proxy is useful precisely because it is *not* the target. That gap is what lets us measure at all. But the same gap is what makes the proxy gameable.

2. The rate at which a proxy decouples from its target seems proportional to the tightness of the feedback loop between the two. Fast loops produce inversion; slow loops produce drift.

3. This may explain why mechanism-design approaches to alignment feel qualitatively different from RLHF — they are designed under the explicit assumption that the optimizer is adversarial.

Open question: is there a class of proxies that resist collapse?`
    },
    n9: {
      id: 'n9', space: 'econ',
      title: "Mechanism design ≠ RLHF — adversarial assumptions matter",
      body:
`Mechanism design starts from an adversarial premise: agents will lie, collude, or shirk if it is in their interest. RLHF, by contrast, assumes the reward model is a reasonable proxy and the policy is a cooperative student.

This asymmetry shows up in the failure modes. Mechanism designers expect strategic behaviour; alignment researchers are repeatedly surprised by it.

The interesting bridge: maybe RLHF needs an "incentive-compatibility" check. What is the analogue?`
    },
    n13: {
      id: 'n13', space: 'meta',
      title: "Proxy ≠ Target",
      body:
`META-IDEA. Synthesis of Goodhart, mechanism design, and reward hacking into a single structural claim.

The proxy is useful precisely because it is not the target. That gap is what permits measurement; the same gap is what allows it to be gamed.

Foundations: thoughts n1, n9, n11.`
    },
  };

  // Tabs/panes open in the right rail
  const [panes, setPanes] = useState2([
    { id: 'p-n11', kind: 'thought', refId: 'n11' },
    { id: 'p-spar', kind: 'spar' },
  ]);
  const [focusedPane, setFocusedPane] = useState2('p-spar');
  const [chatContext, setChatContext] = useState2([library.n11]);

  const openIds = panes.filter(p => p.kind === 'thought').map(p => p.refId);

  function openThought(refId) {
    if (panes.find(p => p.kind === 'thought' && p.refId === refId)) {
      setFocusedPane('p-' + refId);
      return;
    }
    if (!library[refId]) return;
    const newPane = { id: 'p-' + refId, kind: 'thought', refId };
    // Insert before spar pane if present
    const sparIdx = panes.findIndex(p => p.kind === 'spar');
    const next = [...panes];
    if (sparIdx >= 0) next.splice(sparIdx, 0, newPane);
    else next.push(newPane);
    setPanes(next);
    setFocusedPane(newPane.id);
  }
  function closePane(id) {
    setPanes(panes.filter(p => p.id !== id));
  }
  function openSpar() {
    if (panes.find(p => p.kind === 'spar')) { setFocusedPane('p-spar'); return; }
    setPanes([...panes, { id: 'p-spar', kind: 'spar' }]);
    setFocusedPane('p-spar');
  }
  function addToChat(thought) {
    if (chatContext.find(c => c.id === thought.id)) return;
    setChatContext([...chatContext, thought]);
    if (!panes.find(p => p.kind === 'spar')) openSpar();
    setFocusedPane('p-spar');
  }

  // ⌘L handler — add the focused thought pane to the spar context
  useEffect2(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        // find focused thought pane
        const fp = panes.find(p => p.id === focusedPane && p.kind === 'thought')
          || panes.find(p => p.kind === 'thought');
        if (fp) addToChat(library[fp.refId]);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [panes, focusedPane, chatContext]);

  // Open thought when clicking a node in graph
  useEffect2(() => {
    if (activeId && library[activeId]) {
      // don't auto-open already-open
      if (!panes.find(p => p.kind === 'thought' && p.refId === activeId)) {
        // only open the first big-thought click; comment out if too aggressive
      }
    }
  }, [activeId]);

  // Compute pane widths — floating rail with gaps
  const totalPanes = panes.length;
  const PANE_W = 460;
  const GAP = 10;
  const RAIL_PAD_R = 14; // matches CSS right offset
  const railWidth = totalPanes === 0 ? 0 : totalPanes * PANE_W + (totalPanes - 1) * GAP;
  const paneWidth = PANE_W;
  const canvasInset = totalPanes === 0 ? 0 : railWidth + RAIL_PAD_R + 8;

  return (
    <div className="focus-root" style={{ '--rail-w': canvasInset + 'px' }} data-screen-label="02 Thinking — Focus mode">
      <div className={'focus-canvas-wrap' + (totalPanes ? ' has-rail' : '')} style={{ transform: `scale(${zoom / 100})` }}>
        <ThinkingGraphV2
          activeId={activeId} setActiveId={(id) => { setActiveId(id); openThought(id); }}
          hoverEdge={hoverEdge} setHoverEdge={setHoverEdge}
          hoverNode={hoverNode} setHoverNode={setHoverNode}
          openIds={openIds}
        />
      </div>

      <div className="focus-bar focus-bar-tl">
        <div className="focus-brand" onClick={onExit} title="Exit focus mode">
          <span className="dot" style={{ background: 'var(--accent)' }}></span>
          <span>Athenaeum</span>
          <span className="bar-divider"></span>
          <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', color: 'var(--ink-3)', fontSize: 13 }}>Thinking · focus</span>
        </div>
      </div>

      <div className="focus-bar focus-bar-tc">
        <div className="focus-search">
          <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', color: 'var(--ink-3)' }}>⌕</span>
          <input placeholder="Search 132 thoughts, 87 sources…" />
          <kbd>⌘F</kbd>
        </div>
      </div>

      <div className="focus-bar focus-bar-tr">
        <div className="ctrl-group">
          <button className="ctrl-btn" onClick={() => setZoom(z => Math.max(60, z - 10))}>−</button>
          <span className="zoom-label">{zoom}%</span>
          <button className="ctrl-btn" onClick={() => setZoom(z => Math.min(160, z + 10))}>+</button>
          <span className="ctrl-divider"></span>
          <button className="ctrl-btn" onClick={() => setZoom(100)}>⌖ fit</button>
        </div>
        <button className="btn ghost" onClick={openSpar} title="Toggle sparring partner">
          <span className="ai-mark-2 sm">A</span> Spar
        </button>
        <button className="btn primary"><span className="glyph">+</span> thought</button>
      </div>

      <div className="focus-bar focus-bar-bl">
        <div className="focus-legend">
          <span className="legend-item"><span className="swatch" style={{ background: 'oklch(0.62 0.13 28)' }}></span>AI</span>
          <span className="legend-item"><span className="swatch" style={{ background: 'oklch(0.55 0.10 145)' }}></span>Econ</span>
          <span className="legend-item"><span className="swatch" style={{ background: 'oklch(0.50 0.11 270)' }}></span>Phil</span>
          <span className="legend-item"><span className="swatch" style={{ background: 'var(--accent)' }}></span>Meta</span>
          <span className="legend-divider"></span>
          <span className="legend-item"><span className="line solid"></span>confirmed</span>
          <span className="legend-item"><span className="line dashed"></span>LLM-suggested</span>
        </div>
      </div>

      <div className="focus-bar focus-bar-bc-stats">
        <div className="focus-stats">
          <span><b>132</b> thoughts</span>
          <span><b>87</b> sources</span>
          <span style={{ color: 'var(--accent)' }}><b>4</b> meta-ideas</span>
        </div>
      </div>

      {/* Right rail — multi-pane */}
      {totalPanes > 0 && (
        <div className="rail" style={{ width: railWidth }}>
          {panes.map(p => {
            const focused = focusedPane === p.id;
            if (p.kind === 'thought') {
              return (
                <ThoughtPane key={p.id} thought={library[p.refId]}
                  width={paneWidth} isFocused={focused} onFocus={() => setFocusedPane(p.id)}
                  onClose={() => closePane(p.id)} onAddToChat={addToChat} />
              );
            }
            return (
              <SparPane key={p.id} context={chatContext}
                onRemoveContext={(id) => setChatContext(chatContext.filter(c => c.id !== id))}
                width={paneWidth} isFocused={focused} onFocus={() => setFocusedPane(p.id)}
                onClose={() => closePane(p.id)} />
            );
          })}
        </div>
      )}
    </div>
  );
}

window.ThinkingPageV2 = ThinkingPageV2;
