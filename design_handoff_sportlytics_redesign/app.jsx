/* global React, ReactDOM, Dashboard, Analytics, Predictions, Metrics, Standings,
   useTweaks, TweaksPanel, TweakSection, TweakColor, TweakRadio */
const { useState, useEffect } = React;

const NAV = [
  { id: 'dashboard',  n: '01', label: 'Dashboard',  C: () => window.Dashboard },
  { id: 'analytics',  n: '02', label: 'Analytics',  C: () => window.Analytics },
  { id: 'predictions',n: '03', label: 'Predictions',C: () => window.Predictions },
  { id: 'metrics',    n: '04', label: 'Metrics',    C: () => window.Metrics },
  { id: 'standings',  n: '05', label: 'Standings',  C: () => window.Standings },
];

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#c8f23a",
  "displayFont": "Anton",
  "panelTone": "warm"
}/*EDITMODE-END*/;

const DISPLAY_FONTS = {
  Anton: "'Anton', sans-serif",
  Archivo: "'Archivo', sans-serif",
};
const PANEL_TONES = {
  warm:    { panel: '#13140e', p2: '#191b11', bg: '#0b0c08' },
  neutral: { panel: '#121317', p2: '#181a20', bg: '#0a0b0d' },
};

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [view, setView] = useState(() => {
    const h = (location.hash || '').replace('#', '');
    return NAV.some((x) => x.id === h) ? h : 'dashboard';
  });

  useEffect(() => { location.hash = view; }, [view]);

  // apply tweaks to CSS vars
  useEffect(() => {
    const r = document.documentElement.style;
    r.setProperty('--lime', t.accent);
    // pick readable ink for accent buttons
    const ink = readableOn(t.accent);
    r.setProperty('--lime-ink', ink);
    const tone = PANEL_TONES[t.panelTone] || PANEL_TONES.warm;
    r.setProperty('--panel', tone.panel);
    r.setProperty('--panel-2', tone.p2);
    r.setProperty('--bg', tone.bg);
    document.querySelectorAll('.display, .stat-value, .result-score, .rankbar-name, .rankbar-val, .lc-points, .tc-rank, .tc-pts-val, .tcm-score, .wdl div b, .fx-team, .fx-v, .pred-score, .preview-val, .rt-score, .tr-pts')
      .forEach((el) => { el.style.fontFamily = DISPLAY_FONTS[t.displayFont]; });
  }, [t.accent, t.panelTone, t.displayFont, view]);

  const Active = NAV.find((x) => x.id === view).C();

  return (
    <React.Fragment>
      <nav className="nav">
        <div className="nav-inner">
          <div className="brand">SPORT<span className="b-dot">LYTICS</span></div>
          <div className="nav-tabs">
            {NAV.map((x) => (
              <button key={x.id} className={'nav-tab' + (view === x.id ? ' on' : '')}
                onClick={() => setView(x.id)}>
                <span className="nt-n">{x.n}</span>{x.label}
              </button>
            ))}
          </div>
          <div className="nav-auth">
            <span className="nav-user">m.galfathan<span className="role-tag">ADMIN</span></span>
            <button className="nav-logout">LOGOUT</button>
          </div>
        </div>
      </nav>

      <main className="wrap">
        <Active accent={t.accent} />
      </main>

      <TweaksPanel>
        <TweakSection label="Identity" />
        <TweakColor label="Accent" value={t.accent}
          options={['#c8f23a', '#00d4aa', '#5aa9f0', '#ff5d3b', '#e3b341']}
          onChange={(v) => setTweak('accent', v)} />
        <TweakRadio label="Display font" value={t.displayFont}
          options={['Anton', 'Archivo']}
          onChange={(v) => setTweak('displayFont', v)} />
        <TweakSection label="Surface" />
        <TweakRadio label="Panel tone" value={t.panelTone}
          options={['warm', 'neutral']}
          onChange={(v) => setTweak('panelTone', v)} />
      </TweaksPanel>
    </React.Fragment>
  );
}

function readableOn(hex) {
  const h = hex.replace('#', '');
  const n = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(n.slice(0, 2), 16), g = parseInt(n.slice(2, 4), 16), b = parseInt(n.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? '#0b0c08' : '#f4f5ec';
}

ReactDOM.createRoot(document.getElementById('root-app')).render(<App />);
