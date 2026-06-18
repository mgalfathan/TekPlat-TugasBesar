/* global React */
const { useState } = React;

// ---- Team crest: monogram chip tinted with club colour ----
function Crest({ team, size = 38 }) {
  if (!team) return null;
  const fs = Math.round(size * 0.34);
  return (
    <div
      className="crest"
      style={{
        width: size, height: size, fontSize: fs,
        background: `linear-gradient(150deg, ${team.primary}, ${shade(team.primary, -28)})`,
        boxShadow: `inset 0 0 0 1px rgba(255,255,255,.14)`,
      }}
    >
      <span style={{ color: readable(team.primary) }}>{team.code}</span>
    </div>
  );
}

// ---- Last-5 form chips ----
function FormDots({ form }) {
  if (!form || !form.length) return <span className="muted-x">—</span>;
  return (
    <div className="form-dots">
      {form.map((r, i) => (
        <span key={i} className={`fd fd-${r}`}>{r}</span>
      ))}
    </div>
  );
}

// ---- Section eyebrow label (monospace, lime) ----
function Eyebrow({ children, n }) {
  return (
    <div className="eyebrow">
      {n != null && <span className="eyebrow-n">{n}</span>}
      <span>{children}</span>
    </div>
  );
}

// ---- Win/Draw/Loss probability bar ----
function ProbBar({ hp, dp, ap, home, away }) {
  const h = Math.round(hp * 100), d = Math.round(dp * 100), a = Math.round(ap * 100);
  return (
    <div>
      <div className="prob-track">
        <div className="prob-seg prob-h" style={{ width: `${h}%` }} title={`${home} ${h}%`} />
        <div className="prob-seg prob-d" style={{ width: `${d}%` }} title={`Draw ${d}%`} />
        <div className="prob-seg prob-a" style={{ width: `${a}%` }} title={`${away} ${a}%`} />
      </div>
      <div className="prob-legend">
        <span className="pl-h">{home} {h}%</span>
        <span className="pl-d">Draw {d}%</span>
        <span className="pl-a">{a}% {away}</span>
      </div>
    </div>
  );
}

// ---- Mini ranked bar (dashboard "points by team") ----
function RankBars({ rows, max, accent }) {
  return (
    <div className="rankbars">
      {rows.map((r, i) => (
        <div className="rankbar-row" key={r.code}>
          <span className="rankbar-rank">{i + 1}</span>
          <span className="rankbar-name">{r.name}</span>
          <div className="rankbar-track">
            <div
              className="rankbar-fill"
              style={{
                width: `${(r.value / max) * 100}%`,
                background: i === 0 ? accent : 'rgba(255,255,255,.22)',
              }}
            />
          </div>
          <span className="rankbar-val" style={{ color: i === 0 ? accent : undefined }}>{r.value}</span>
        </div>
      ))}
    </div>
  );
}

// ---- colour helpers ----
function shade(hex, pct) {
  const { r, g, b } = hexToRgb(hex);
  const f = (c) => Math.max(0, Math.min(255, Math.round(c + (pct / 100) * 255)));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}
function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const n = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return { r: parseInt(n.slice(0, 2), 16), g: parseInt(n.slice(2, 4), 16), b: parseInt(n.slice(4, 6), 16) };
}
function readable(hex) {
  const { r, g, b } = hexToRgb(hex);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.62 ? '#0c0d08' : '#ffffff';
}

Object.assign(window, { Crest, FormDots, Eyebrow, ProbBar, RankBars });
