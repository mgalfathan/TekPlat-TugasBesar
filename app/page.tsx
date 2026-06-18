import Link from 'next/link';

const features = [
  {
    href: '/leaderboard',
    label: 'Analytics & Insights',
    desc: 'Sort the league on any statistic and overlay your own formulas.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <path d="M3 21h18" /><rect x="5" y="11" width="3" height="7" /><rect x="10.5" y="6" width="3" height="12" /><rect x="16" y="9" width="3" height="9" />
      </svg>
    ),
  },
  {
    href: '/standings',
    label: 'Results & Standings',
    desc: 'Live tables, recent results and form across the season.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <path d="M6 4h12v4a6 6 0 0 1-12 0V4Z" /><path d="M6 6H4v1a3 3 0 0 0 3 3" /><path d="M18 6h2v1a3 3 0 0 1-3 3" /><path d="M9 20h6M10 16v4M14 16v4" />
      </svg>
    ),
  },
  {
    href: '/metrics',
    label: 'Custom Metrics',
    desc: 'Compose a rating from team variables, then rank instantly.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 7h8M8 11h3M8 15h3M14 11l3 6M17 11l-3 6" />
      </svg>
    ),
  },
  {
    href: '/simulator',
    label: 'Season Simulator',
    desc: 'Build a club, pick your XI and simulate a full campaign.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />
      </svg>
    ),
  },
];

export default function HomePage() {
  return (
    <div className="gaffer-screen min-h-[78vh] flex flex-col items-center justify-center text-center">
      <div className="max-w-3xl w-full">
        <div className="inline-flex items-center gap-2 bg-[rgba(200,242,58,0.1)] border border-[rgba(200,242,58,0.3)] rounded-pill px-4 py-1.5 text-lime font-mono text-[11px] font-bold uppercase tracking-[0.12em] mb-8">
          Football Data &amp; Analytics
        </div>
        <h1 className="font-display uppercase text-ink leading-[0.9] tracking-[0.5px] mb-6 text-[clamp(56px,12vw,128px)]">
          THE <span className="text-lime">GAFFER</span>
        </h1>
        <p className="text-muted text-base md:text-lg mb-3 max-w-xl mx-auto leading-relaxed text-pretty">
          Football analytics, made simple. Explore live results and standings, break down
          team and player stats, build your own metrics, and simulate full seasons.
        </p>
        <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-2 mb-10">
          Build · Simulate · Analyse
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link
            href="/dashboard"
            className="bg-lime text-lime-ink font-mono text-xs font-bold uppercase tracking-[0.06em] px-7 py-3.5 rounded-[9px] hover:brightness-110 transition"
          >
            Explore the Data
          </Link>
          <Link
            href="/simulator"
            className="border border-border-2 text-ink font-mono text-xs font-bold uppercase tracking-[0.06em] px-7 py-3.5 rounded-[9px] hover:border-lime hover:text-lime transition-colors"
          >
            Open Simulator
          </Link>
        </div>
      </div>

      <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-3.5 w-full max-w-4xl">
        {features.map((f, i) => (
          <Link
            key={f.label}
            href={f.href}
            className="group bg-panel border border-border rounded-card p-5 text-left transition-all hover:border-border-2 hover:-translate-y-0.5"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-lime">{f.icon}</span>
              <span className="font-mono text-[10px] text-muted-2">{String(i + 1).padStart(2, '0')}</span>
            </div>
            <div className="font-bold text-sm text-ink mb-1.5">{f.label}</div>
            <div className="text-muted text-[12px] leading-relaxed">{f.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
