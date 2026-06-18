'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';
import LeagueSeasonSelector from '@/components/LeagueSeasonSelector';
import { format } from 'date-fns';

interface Team { id: number; name: string; code?: string | null; logo?: string | null }
interface League { id: number; name: string; country?: { name: string } | null }
interface Result {
  id: number; utcDate: string; winner: string | null;
  homeScore: number | null; awayScore: number | null;
  homeTeam: Team; awayTeam: Team; league: League;
}

function hueOf(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
}

function Crest({ team, size = 26 }: { team: Team; size?: number }) {
  if (team.logo) return <img src={team.logo} alt="" className="object-contain flex-none" style={{ width: size, height: size }} />;
  const code = team.code ?? team.name.slice(0, 3).toUpperCase();
  const h = hueOf(code);
  return (
    <div
      className="rounded-[8px] flex items-center justify-center flex-none shadow-[inset_0_0_0_1px_rgba(255,255,255,.12)]"
      style={{ width: size, height: size, background: `linear-gradient(150deg, hsl(${h} 40% 38%), hsl(${h} 40% 24%))` }}
    >
      <span className="font-display text-white tracking-[0.5px]" style={{ fontSize: Math.round(size * 0.34) }}>{code}</span>
    </div>
  );
}

export default function ResultsPage() {
  const router = useRouter();
  const [results, setResults] = useState<Result[]>([]);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [leagueId, setLeagueId] = useState('');
  const [season, setSeason] = useState('2024');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ limit: '50' });
      if (leagueId) qs.set('leagueId', leagueId);
      if (season) qs.set('season', season);
      const d = await fetch(`/api/results?${qs}`).then(r => r.json());
      setResults(Array.isArray(d.matches) ? d.matches : []);
      setLeagues(Array.isArray(d.leagues) ? d.leagues : []);
    } catch { /* keep stale */ }
    finally { setLoading(false); }
  }, [leagueId, season]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="gaffer-screen space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <div className="flex items-center gap-2.5 font-mono text-xs font-bold tracking-[0.14em] text-lime uppercase mb-3.5">
            <span className="bg-lime text-lime-ink px-1.5 py-px rounded">03</span>
            <span>Results</span>
          </div>
          <h1 className="font-display uppercase text-ink leading-[0.9] tracking-[0.5px] text-[clamp(40px,6.4vw,82px)] mb-4">
            Every<br />final whistle.
          </h1>
          <p className="text-muted text-base leading-relaxed max-w-[620px] text-pretty">
            The latest {results.length} results across the top leagues — tap any match for the full breakdown.
          </p>
        </div>
        <LeagueSeasonSelector leagues={leagues} selectedLeagueId={leagueId} selectedSeason={season} onLeagueChange={setLeagueId} onSeasonChange={setSeason} />
      </header>

      {loading ? <LoadingSpinner message="Loading results..." /> :
       results.length === 0 ? <EmptyState title="No results yet" description="Try a different league/season, or sync data in Admin → Sync." /> : (
        <div className="bg-panel border border-border rounded-card p-2 sm:p-3">
          <div className="flex flex-col">
            {results.map(r => {
              const hw = r.winner === 'HOME_TEAM';
              const aw = r.winner === 'AWAY_TEAM';
              return (
                <div
                  key={r.id}
                  onClick={() => router.push(`/matches/${r.id}`)}
                  className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-3 px-3 py-3 border-b border-border last:border-0 cursor-pointer rounded-lg hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Crest team={r.homeTeam} size={26} />
                    <span className={`text-[13.5px] font-semibold truncate ${hw ? 'text-ink' : 'text-muted'}`}>{r.homeTeam.name}</span>
                  </div>
                  <div className="font-display text-[22px] flex items-center gap-1.5 text-ink">
                    {r.homeScore}<span className="text-muted-2 text-[15px]">–</span>{r.awayScore}
                  </div>
                  <div className="flex items-center gap-2.5 min-w-0 justify-end">
                    <span className={`text-[13.5px] font-semibold truncate ${aw ? 'text-ink' : 'text-muted'}`}>{r.awayTeam.name}</span>
                    <Crest team={r.awayTeam} size={26} />
                  </div>
                  <div className="text-right min-w-[80px]">
                    <div className="font-mono text-[10px] text-muted-2">{format(new Date(r.utcDate), 'dd MMM yyyy')}</div>
                    <div className="font-mono text-[9px] text-muted-2/70 truncate">{r.league.name}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
