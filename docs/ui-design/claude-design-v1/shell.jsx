// Shell: sidebar, topbar, command palette
const { useState, useEffect, useRef, useMemo } = React;

function Sidebar({ page, setPage, counts }) {
  const items = [
    { id: 'inbox', label: 'Inbox', glyph: '\u2709', count: counts.inbox },
    { id: 'thinking', label: 'Thinking Space', glyph: 'T', count: counts.thinking },
    { id: 'wiki', label: 'Wiki', glyph: 'W', count: counts.wiki },
    { id: 'project', label: 'Project', glyph: 'P', count: counts.project },
  ];
  const spaces = [
    { id: 'ai', label: 'AI Research', tone: 'oklch(0.62 0.13 28)' },
    { id: 'econ', label: 'Economics', tone: 'oklch(0.55 0.10 145)' },
    { id: 'phil', label: 'Philosophy', tone: 'oklch(0.50 0.11 270)' },
    { id: 'reading', label: 'Reading: Scott', tone: 'oklch(0.55 0.06 60)', italic: true },
  ];
  const projects = [
    { id: 'p1', label: 'Mechanism Spec' },
    { id: 'p2', label: 'Essay: Proxy collapse' },
  ];

  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="dot"></span>
        <div className="brand-stack">
          <div>Athenaeum</div>
          <small>Knowledge OS</small>
        </div>
      </div>

      <div className="nav-section">
        <div className="nav-label">Layers</div>
        {items.map(it => (
          <div
            key={it.id}
            className={'nav-item' + (page === it.id ? ' active' : '')}
            onClick={() => setPage(it.id)}
          >
            <span className="glyph">{it.glyph}</span>
            <span>{it.label}</span>
            {it.count != null && <span className="count">{it.count}</span>}
          </div>
        ))}
      </div>

      <div className="nav-section">
        <div className="nav-label">Spaces</div>
        {spaces.map(s => (
          <div
            key={s.id}
            className="nav-item"
            onClick={() => setPage('thinking')}
            style={{ paddingLeft: 10 }}
          >
            <span className="glyph" style={{ color: s.tone, fontStyle: s.italic ? 'italic' : 'italic' }}>•</span>
            <span style={{ fontStyle: s.italic ? 'italic' : 'normal' }}>{s.label}</span>
          </div>
        ))}
      </div>

      <div className="nav-section">
        <div className="nav-label">Projects</div>
        {projects.map(p => (
          <div key={p.id} className="nav-item" onClick={() => setPage('project')}>
            <span className="glyph">§</span>
            <span>{p.label}</span>
          </div>
        ))}
      </div>

      <div className="cmdk" onClick={() => window.__openCmdK && window.__openCmdK()}>
        <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic' }}>quick jump</span>
        <kbd>⌘K</kbd>
      </div>
    </aside>
  );
}

function Topbar({ page, where, actions }) {
  const titles = {
    inbox: 'Inbox',
    thinking: 'Thinking Space',
    wiki: 'Wiki',
    project: 'Project',
  };
  return (
    <header className="topbar">
      <div className="crumbs">
        <span className="here">{titles[page]}</span>
        {where && <span className="sep">/</span>}
        {where && <span className="where">{where}</span>}
      </div>
      <div className="top-actions">
        {actions}
      </div>
    </header>
  );
}

function CommandPalette({ open, onClose, setPage }) {
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef();

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current && inputRef.current.focus(), 30);
      setQ('');
      setActive(0);
    }
  }, [open]);

  const groups = useMemo(() => {
    const layers = [
      { id: 'inbox', name: 'Go to Inbox', glyph: '\u2709', hint: 'G I', kind: 'layer', target: 'inbox' },
      { id: 'thinking', name: 'Go to Thinking Space', glyph: 'T', hint: 'G T', kind: 'layer', target: 'thinking' },
      { id: 'wiki', name: 'Go to Wiki', glyph: 'W', hint: 'G W', kind: 'layer', target: 'wiki' },
      { id: 'project', name: 'Go to Project', glyph: 'P', hint: 'G P', kind: 'layer', target: 'project' },
    ];
    const docs = [
      { id: 'd1', name: 'Goodhart\'s Law as a universal constraint', glyph: 't', kind: 'thought', where: 'Philosophy', target: 'thinking' },
      { id: 'd2', name: 'RLHF reward hacking is a measurement failure', glyph: 't', kind: 'thought', where: 'AI Research', target: 'thinking' },
      { id: 'd3', name: 'Proxy–Target Collapse', glyph: 'w', kind: 'wiki', where: 'Wiki', target: 'wiki' },
      { id: 'd4', name: 'Legibility (Scott)', glyph: 'w', kind: 'wiki', where: 'Wiki', target: 'wiki' },
      { id: 'd5', name: 'Mechanism Spec', glyph: '§', kind: 'project', where: 'Active', target: 'project' },
    ];
    const actions = [
      { id: 'a1', name: 'Capture new thought', glyph: '+', hint: '⌘N', kind: 'action' },
      { id: 'a2', name: 'Triage inbox', glyph: '\u2709', kind: 'action', target: 'inbox' },
      { id: 'a3', name: 'Generate weekly digest', glyph: 'D', kind: 'action' },
    ];

    const filter = (arr) => q ? arr.filter(x => x.name.toLowerCase().includes(q.toLowerCase())) : arr;
    return [
      { label: 'Navigate', items: filter(layers) },
      { label: 'Open', items: filter(docs) },
      { label: 'Actions', items: filter(actions) },
    ].filter(g => g.items.length);
  }, [q]);

  const flat = groups.flatMap(g => g.items);

  useEffect(() => {
    function onKey(e) {
      if (!open) return;
      if (e.key === 'Escape') { onClose(); }
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, flat.length - 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
      if (e.key === 'Enter') {
        const item = flat[active];
        if (item && item.target) { setPage(item.target); onClose(); }
        else if (item) { onClose(); }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, active, flat, onClose, setPage]);

  if (!open) return null;
  let idx = -1;
  return (
    <div className="cmd-overlay" onClick={onClose}>
      <div className="cmd-panel" onClick={e => e.stopPropagation()}>
        <div className="cmd-input">
          <span className="glyph">⌕</span>
          <input
            ref={inputRef}
            value={q}
            onChange={e => { setQ(e.target.value); setActive(0); }}
            placeholder="Jump to anything — pages, thoughts, articles, projects…"
          />
          <span style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--mono)' }}>esc</span>
        </div>
        <div className="cmd-list">
          {groups.map(g => (
            <div key={g.label}>
              <div className="cmd-group-label">{g.label}</div>
              {g.items.map(it => {
                idx++;
                const isActive = idx === active;
                return (
                  <div
                    key={it.id}
                    className={'cmd-row' + (isActive ? ' active' : '')}
                    onClick={() => { if (it.target) { setPage(it.target); } onClose(); }}
                  >
                    <span className="cmd-glyph">{it.glyph}</span>
                    <span className="cmd-name">{it.name}</span>
                    {it.where && <span className="cmd-where">{it.where}</span>}
                    {it.hint && <span className="cmd-hint">{it.hint}</span>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Sidebar, Topbar, CommandPalette });
