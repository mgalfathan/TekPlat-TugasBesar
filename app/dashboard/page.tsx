'use client';
import { useEffect, useState } from 'react';
import { StatCard } from '@/components/StatCard';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { format } from 'date-fns';
import Link from 'next/link';

interface TeamLite { id: number; name: string; code?: string | null; logo?: string | null }
interface LeagueLite { id: number; name: string }
interface MatchLite { id: number; utcDate: string; homeScore: number | null; awayScore: number | null; homeTeam: TeamLite; awayTeam: TeamLite; league: LeagueLite }
interface StandingLite { id: number; rank: number; points: number; win: number | null; draw: number | null; lose: number | null; team: TeamLite }

interface DashboardData {
  stats: { totalTeams: number; totalMatches: number; totalPredictions: number; totalPlayers: number; finishedCount: number };
  recentMatches: MatchLite[];
  topStandings: StandingLite[];
}

function teamLabel(t: TeamLite) { return t.code ?? t.name.slice(0, 3).toUpperCase(); }

// Monogram crest — neutral chip tinted from a deterministic hue (decorative only)
function Crest({ team, size = 32 }: { team: TeamLite; size?: number }) {
  const code = teamLabel(team);
  let h = 0;
  for (let i = 0; i < code.length; i++) h = (h * 31 + code.charCodeAt(i)) % 360;
  return (
    <div
      className="rounded-[9px] flex items-center justify-center flex-none shadow-[inset_0_0_0_1px_rgba(255,255,255,.12)]"
      style={{
        width: size, height: size,
        background: `linear-gradient(150deg, hsl(${h} 22% 22%), hsl(${h} 22% 14%))`,
      }}
    >
      <span className="font-display text-ink/90 tracking-[0.5px]" style={{ fontSize: Math.round(size * 0.34) }}>{code}</span>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard').then(r => r.json())
      .then((d: DashboardData & { error?: string }) => {
        if (d.error || !d.stats) return setLoading(false);
        setData(d); setLoading(false);
      }).catch(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner message="Loading dashboard..." />;
  if (!data) return (
    <div className="text-center py-20">
      <p className="text-loss font-semibold">Database not connected</p>
      <p className="text-muted-2 text-sm mt-2 font-mono">Set DATABASE_URL in .env and run <code className="text-lime">prisma migrate dev</code></p>
    </div>
  );

  const ranked = [...data.topStandings].sort((a, b) => a.rank - b.rank);
  const top6 = ranked.slice(0, 6);
  const barMax = Math.max(1, ...top6.map(s => s.points));
  const leader = ranked[0];

  return (
    <div className="gaffer-screen space-y-8">
      <header className="mb-2">
        <div className="flex items-center gap-2.5 font-mono text-xs font-bold tracking-[0.14em] text-lime uppercase mb-3.5">
          <span className="bg-lime text-lime-ink px-1.5 py-px rounded">01</span>
          <span>Dashboard — Overview</span>
        </div>
        <h1 className="font-display uppercase text-ink leading-[0.9] tracking-[0.5px] text-[clamp(40px,6.4vw,82px)] mb-4">
          The numbers<br />behind the game.
        </h1>
        <p className="text-muted text-base leading-relaxed max-w-[620px] text-pretty">
          Live football data, rule-based predictions and custom performance metrics — every figure
          computed from real results, not vibes.
        </p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <Link href="/teams"><StatCard label="Clubs Tracked" value={data.stats.totalTeams} /></Link>
        <StatCard label="Matches Played" value={data.stats.totalMatches} />
        <StatCard label="Predictions" value={data.stats.totalPredictions} />
        <Link href="/players"><StatCard label="Players" value={data.stats.totalPlayers} /></Link>
        <StatCard label="Finished" value={data.stats.finishedCount} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Results */}
        <section className="bg-panel border border-border rounded-card p-[22px]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-extrabold text-ink">Recent Results</h2>
            <Link href="/results" className="font-mono text-[10.5px] font-semibold tracking-[0.08em] text-muted hover:text-lime transition-colors">VIEW ALL →</Link>
          </div>
          {data.recentMatches.length === 0 ? <p className="text-muted-2 text-sm">No results yet.</p> : (
            <div className="flex flex-col">
              {data.recentMatches.map(m => {
                const hw = (m.homeScore ?? 0) > (m.awayScore ?? 0);
                const aw = (m.awayScore ?? 0) > (m.homeScore ?? 0);
                return (
                  <div key={m.id} className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-3 py-[11px] border-b border-border last:border-0">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Crest team={m.homeTeam} size={26} />
                      <span className={`text-[13.5px] font-semibold truncate ${hw ? 'text-ink' : 'text-muted'}`}>{m.homeTeam.name}</span>
                    </div>
                    <div className="font-display text-[22px] flex items-center gap-1.5 text-ink">
                      {m.homeScore}<span className="text-muted-2 text-[15px]">–</span>{m.awayScore}
                    </div>
                    <div className="flex items-center gap-2.5 min-w-0 justify-end">
                      <span className={`text-[13.5px] font-semibold truncate ${aw ? 'text-ink' : 'text-muted'}`}>{m.awayTeam.name}</span>
                      <Crest team={m.awayTeam} size={26} />
                    </div>
                    <span className="font-mono text-[10px] text-muted-2 min-w-[46px] text-right">{format(new Date(m.utcDate), 'dd MMM')}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Points · Top 6 */}
        <section className="bg-panel border border-border rounded-card p-[22px]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-extrabold text-ink">Points · Top 6</h2>
            <Link href="/standings" className="font-mono text-[10.5px] font-semibold tracking-[0.08em] text-muted hover:text-lime transition-colors">FULL TABLE →</Link>
          </div>
          {top6.length === 0 ? <p className="text-muted-2 text-sm">No standings yet.</p> : (
            <>
              <div className="flex flex-col gap-[11px]">
                {top6.map((s, i) => (
                  <div key={s.id} className="grid grid-cols-[18px_56px_1fr_34px] items-center gap-[11px]">
                    <span className="font-mono text-[11px] text-muted-2">{i + 1}</span>
                    <span className="font-display text-sm tracking-[0.5px] text-ink truncate">{teamLabel(s.team)}</span>
                    <div className="h-[9px] bg-white/[0.05] rounded-[5px] overflow-hidden">
                      <div
                        className="h-full rounded-[5px] transition-[width] duration-500"
                        style={{ width: `${(s.points / barMax) * 100}%`, background: i === 0 ? '#c8f23a' : 'rgba(255,255,255,.22)' }}
                      />
                    </div>
                    <span className="font-display text-base text-right" style={{ color: i === 0 ? '#c8f23a' : undefined }}>{s.points}</span>
                  </div>
                ))}
              </div>
              {leader && (
                <div className="flex items-center gap-3.5 mt-5 pt-[18px] border-t border-border">
                  <Crest team={leader.team} size={44} />
                  <div>
                    <div className="font-mono text-[9.5px] tracking-[0.12em] text-muted uppercase">League Leader</div>
                    <div className="font-extrabold text-base text-ink mt-0.5">{leader.team.name}</div>
                  </div>
                  <div className="ml-auto font-display text-4xl leading-none flex items-baseline gap-1.5 text-lime">
                    {leader.points}<span className="text-xs text-muted">PTS</span>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
