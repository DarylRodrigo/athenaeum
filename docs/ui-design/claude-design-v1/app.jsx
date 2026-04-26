// Main app
const { useState, useEffect } = React;

function App() {
  const [page, setPage] = useState('thinking2');
  const [cmdOpen, setCmdOpen] = useState(false);
  const [tweaks, setTweak] = useTweaks(/*EDITMODE-BEGIN*/{
    "aesthetic": "warm",
    "density": "balanced",
    "accent": "oxblood",
    "showSparring": true
  }/*EDITMODE-END*/);

  useEffect(() => {
    window.__openCmdK = () => setCmdOpen(true);
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCmdOpen(o => !o);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    document.body.dataset.aesthetic = tweaks.aesthetic;
    document.body.dataset.density = tweaks.density;
    document.body.dataset.focus = page === 'thinking2' ? '1' : '0';
    const accents = {
      oxblood: { c: '#8a3a2a', s: '#c98c7a', t: 'rgba(138,58,42,0.08)' },
      ink: { c: '#1d1b16', s: '#6b6557', t: 'rgba(29,27,22,0.06)' },
      forest: { c: '#3f5d3a', s: '#8aa886', t: 'rgba(63,93,58,0.10)' },
      cobalt: { c: '#2e4a7a', s: '#7e95b8', t: 'rgba(46,74,122,0.08)' },
      umber: { c: '#7a4a1f', s: '#bd8c5e', t: 'rgba(122,74,31,0.09)' },
    };
    const a = accents[tweaks.accent] || accents.oxblood;
    document.documentElement.style.setProperty('--accent', a.c);
    document.documentElement.style.setProperty('--accent-soft', a.s);
    document.documentElement.style.setProperty('--accent-tint', a.t);
  }, [tweaks]);

  const counts = { inbox: 47, thinking: 132, wiki: 28, project: 2 };

  return (
    <>
      <div className="app">
        <Sidebar page={page} setPage={setPage} counts={counts} />
        <main className="main" data-screen-label={
          page === 'inbox' ? '01 Inbox' :
          page === 'thinking' ? '02 Thinking Space' :
          page === 'thinking2' ? '02b Thinking Space — Focus' :
          page === 'wiki' ? '03 Wiki' : '04 Project'
        }>
          <Topbar
            page={page}
            where={
              page === 'thinking' ? 'Cross-space view' :
              page === 'thinking2' ? 'Focus mode · editing thought' :
              page === 'wiki' ? 'Concepts / Proxy–Target Collapse' :
              page === 'project' ? 'Mechanism Spec' : null
            }
          />
          {page === 'inbox' && <InboxPage />}
          {page === 'thinking' && <ThinkingPage />}
          {page === 'thinking2' && <ThinkingPageV2 onExit={() => setPage('thinking')} />}
          {page === 'wiki' && <WikiPage />}
          {page === 'project' && <ProjectPage />}
        </main>
      </div>

      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} setPage={setPage} />

      <TweaksPanel title="Tweaks">
        <TweakSection title="Aesthetic">
          <TweakRadio
            value={tweaks.aesthetic}
            onChange={v => setTweak('aesthetic', v)}
            options={[
              { value: 'warm', label: 'Warm paper' },
              { value: 'cool', label: 'Cool gray' },
              { value: 'mono', label: 'Monospace' },
            ]}
          />
        </TweakSection>
        <TweakSection title="Density">
          <TweakRadio
            value={tweaks.density}
            onChange={v => setTweak('density', v)}
            options={[
              { value: 'spacious', label: 'Spacious' },
              { value: 'balanced', label: 'Balanced' },
              { value: 'dense', label: 'Dense' },
            ]}
          />
        </TweakSection>
        <TweakSection title="Accent">
          <TweakSelect
            value={tweaks.accent}
            onChange={v => setTweak('accent', v)}
            options={[
              { value: 'oxblood', label: 'Oxblood' },
              { value: 'ink', label: 'Ink black' },
              { value: 'forest', label: 'Forest' },
              { value: 'cobalt', label: 'Cobalt' },
              { value: 'umber', label: 'Umber' },
            ]}
          />
        </TweakSection>
        <TweakSection title="Page">
          <TweakRadio
            value={page}
            onChange={v => setPage(v)}
            options={[
              { value: 'inbox', label: 'Inbox' },
              { value: 'thinking', label: 'Thinking' },
              { value: 'thinking2', label: 'Thinking · Focus' },
              { value: 'wiki', label: 'Wiki' },
              { value: 'project', label: 'Project' },
            ]}
          />
        </TweakSection>
      </TweaksPanel>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
