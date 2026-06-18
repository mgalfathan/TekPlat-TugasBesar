'use client';
import { useState, useEffect, useCallback } from 'react';
import LeagueSeasonSelector from '@/components/LeagueSeasonSelector';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import ErrorState from '@/components/ErrorState';

interface Team { name: string; logo?: string | null }
interface League { id: number; name: string; country?: { name: string } | null }
interface Standing { id: number; rank: number; team: Team; league: League; points: number; played?: number | null; win?: number | null; draw?: number | null; lose?: number | null; goalsFor?: number | null; goalsAgainst?: number | null; goalsDiff?: number | null }
type SortMode = 'points' | 'rank';

function hueOf(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
}

function Crest({ team, size = 26 }: { team: Team; size?: number }) {
  if (team.logo) return <img src={team.logo} alt="" className="object-contain flex-none" style={{ width: size, height: size }} />;
  const code = team.name.slice(0, 3).toUpperCase();
  const h = hueOf(code);
  return (
    <div className="rounded-[8px] flex items-center justify-center flex-none shadow-[inset_0_0_0_1px_rgba(255,255,255,.12)]"
      style={{ width: size, height: size, background: `linear-gradient(150deg, hsl(${h} 40% 38%), hsl(${h} 40% 24%))` }}>
      <span className="font-display text-white tracking-[0.5px]" style={{ fontSize: Math.round(size * 0.34) }}>{code}</span>
    </div>
  );
}

export default function StandingsPage() {
  const [standings, setStandings] = useState<Standing[]>([]);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [leagueId, setLeagueId] = useState('');
  const [season, setSeason] = useState('2024');
  const [sortBy, setSortBy] = useState<SortMode>('points');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const qs = new URLSearchParams();
      if (leagueId) qs.set('leagueId', leagueId);
      if (season) qs.set('season', season);
      qs.set('sort', sortBy);
      const data = await fetch(`/api/standings?${qs}`).then(r => r.json());
      setStandings(data.standings ?? []);
      setLeagues(data.leagues ?? []);
    } catch { setError('Failed to load standings'); }
    finally { setLoading(false); }
  }, [leagueId, season, sortBy]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const zoneColor = (i: number) =>
    i < 4 ? '#c8f23a' : i === 4 ? '#5aa9f0' : i >= standings.length - 3 ? '#f5837f' : 'transparent';

  return (
    <div className="gaffer-screen space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <div className="flex items-center gap-2.5 font-mono text-xs font-bold tracking-[0.14em] text-lime uppercase mb-3.5">
            <span className="bg-lime text-lime-ink px-1.5 py-px rounded">05</span>
            <span>Standings</span>
          </div>
          <h1 className="font-display uppercase text-ink leading-[0.9] tracking-[0.5px] text-[clamp(40px,6.4vw,82px)]">
            The table.
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <LeagueSeasonSelector leagues={leagues} selectedLeagueId={leagueId} selectedSeason={season} onLeagueChange={setLeagueId} onSeasonChange={setSeason} />
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as SortMode)}
            className="bg-panel-2 border border-border-2 text-ink rounded-chip px-3 py-2 text-sm font-semibold focus:outline-none focus:border-lime"
            aria-label="Sort standings"
          >
            <option value="points">Sort by points</option>
            <option value="rank">Sort by rank</option>
          </select>
        </div>
      </header>

      {loading && <LoadingSkeleton rows={10} />}
      {error && <ErrorState message={error} onRetry={fetchData} />}
      {!loading && !error && standings.length === 0 && (
        <div className="text-center py-16 text-muted"><div className="font-display text-5xl text-muted-2 mb-3 uppercase">—</div><p>No standings. Sync a league in Admin → Sync.</p></div>
      )}
      {!loading && standings.length > 0 && (
        <div className="bg-panel border border-border rounded-card p-2 sm:p-3 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse">
            <thead>
              <tr className="font-mono text-[10px] tracking-[0.06em] text-muted-2 uppercase border-b border-border">
                <th className="text-left px-3.5 py-3 font-normal">#</th>
                <th className="text-left px-3.5 py-3 font-normal">Club</th>
                {!leagueId && <th className="text-left px-3 py-3 font-normal">League</th>}
                <th className="text-center px-2 py-3 font-normal">MP</th>
                <th className="text-center px-2 py-3 font-normal">W</th>
                <th className="text-center px-2 py-3 font-normal">D</th>
                <th className="text-center px-2 py-3 font-normal">L</th>
                <th className="text-center px-2 py-3 font-normal">GF</th>
                <th className="text-center px-2 py-3 font-normal">GA</th>
                <th className="text-center px-2 py-3 font-normal">GD</th>
                <th className="text-right px-3.5 py-3 font-normal">Pts</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((s, i) => {
                const gd = s.goalsDiff;
                return (
                  <tr key={s.id} className={`border-b border-border last:border-0 text-[13.5px] font-semibold transition-colors hover:bg-white/[0.02] ${i === 0 ? 'bg-[rgba(200,242,58,0.04)]' : ''}`}>
                    <td className="px-3.5 py-3.5 relative">
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-sm" style={{ background: zoneColor(i) }} />
                      <span className="font-mono text-[12px] font-bold text-ink pl-1.5">{s.rank}</span>
                    </td>
                    <td className="px-3.5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <Crest team={s.team} size={26} />
                        <span className="text-ink font-bold truncate">{s.team.name}</span>
                      </div>
                    </td>
                    {!leagueId && <td className="px-3 py-3.5 text-muted-2 font-mono text-[10px]">{s.league.name}</td>}
                    <td className="text-center px-2 py-3.5 text-muted">{s.played ?? '-'}</td>
                    <td className="text-center px-2 py-3.5 text-win">{s.win ?? '-'}</td>
                    <td className="text-center px-2 py-3.5 text-muted">{s.draw ?? '-'}</td>
                    <td className="text-center px-2 py-3.5 text-loss">{s.lose ?? '-'}</td>
                    <td className="text-center px-2 py-3.5 text-ink">{s.goalsFor ?? '-'}</td>
                    <td className="text-center px-2 py-3.5 text-ink">{s.goalsAgainst ?? '-'}</td>
                    <td className={`text-center px-2 py-3.5 ${gd != null && gd > 0 ? 'text-win' : gd != null && gd < 0 ? 'text-loss' : 'text-muted'}`}>
                      {gd != null ? (gd > 0 ? `+${gd}` : gd) : '-'}
                    </td>
                    <td className="text-right px-3.5 py-3.5">
                      <span className="font-display text-[19px]" style={{ color: i === 0 ? '#c8f23a' : undefined }}>{s.points}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="flex flex-wrap gap-5 px-3.5 pt-4 pb-1 font-mono text-[10px] text-muted">
            <span className="flex items-center gap-2"><i className="w-2.5 h-2.5 rounded-sm bg-lime inline-block" /> Champions League</span>
            <span className="flex items-center gap-2"><i className="w-2.5 h-2.5 rounded-sm bg-chart-blue inline-block" /> Europa</span>
            <span className="flex items-center gap-2"><i className="w-2.5 h-2.5 rounded-sm bg-loss inline-block" /> Relegation</span>
          </div>
        </div>
      )}
    </div>
  );
}
