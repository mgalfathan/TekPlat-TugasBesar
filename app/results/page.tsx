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

function winnerBadge(winner: string | null, isHome: boolean) {
  if (!winner) return null;
  const isWinner = (winner === 'HOME_TEAM' && isHome) || (winner === 'AWAY_TEAM' && !isHome);
  return isWinner ? <span className="text-xs text-emerald-400 font-bold ml-1">W</span> : null;
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white mb-1">Results</h1>
          <p className="text-slate-400">{results.length} recent results</p>
        </div>
        <LeagueSeasonSelector leagues={leagues} selectedLeagueId={leagueId} selectedSeason={season} onLeagueChange={setLeagueId} onSeasonChange={setSeason} />
      </div>

      {loading ? <LoadingSpinner message="Loading results..." /> :
       results.length === 0 ? <EmptyState title="No results yet" description="Try a different league/season, or sync data in Admin → Sync." /> : (
        <div className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-800 text-slate-400 text-xs uppercase">
              <th className="text-left px-4 py-3">Date</th>
              <th className="text-left px-4 py-3">Home</th>
              <th className="text-center px-4 py-3">Score</th>
              <th className="text-left px-4 py-3">Away</th>
              <th className="text-left px-4 py-3">League</th>
            </tr></thead>
            <tbody>
              {results.map(r => (
                <tr key={r.id} className="border-b border-gray-800/50 last:border-0 hover:bg-gray-800/30 cursor-pointer" onClick={() => router.push(`/matches/${r.id}`)}>
                  <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{format(new Date(r.utcDate), 'dd MMM yyyy')}</td>
                  <td className="px-4 py-3 font-medium text-slate-200">
                    <div className="flex items-center gap-2">
                      {r.homeTeam.logo && <img src={r.homeTeam.logo} alt="" className="w-5 h-5 object-contain" />}
                      <span>{r.homeTeam.name}{winnerBadge(r.winner, true)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center font-black text-[#00d4aa]">{r.homeScore} – {r.awayScore}</td>
                  <td className="px-4 py-3 font-medium text-slate-200">
                    <div className="flex items-center gap-2">
                      {r.awayTeam.logo && <img src={r.awayTeam.logo} alt="" className="w-5 h-5 object-contain" />}
                      <span>{r.awayTeam.name}{winnerBadge(r.winner, false)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{r.league.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
