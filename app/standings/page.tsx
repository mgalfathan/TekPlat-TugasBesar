'use client';
import { useState, useEffect, useCallback } from 'react';
import LeagueSeasonSelector from '@/components/LeagueSeasonSelector';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import ErrorState from '@/components/ErrorState';

interface Team { name: string; logo?: string | null }
interface League { id: number; name: string; country?: { name: string } | null }
interface Standing { id: number; rank: number; team: Team; points: number; played?: number | null; win?: number | null; draw?: number | null; lose?: number | null; goalsFor?: number | null; goalsAgainst?: number | null; goalsDiff?: number | null }

export default function StandingsPage() {
  const [standings, setStandings] = useState<Standing[]>([]);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [leagueId, setLeagueId] = useState('');
  const [season, setSeason] = useState('2025');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const qs = new URLSearchParams();
      if (leagueId) qs.set('leagueId', leagueId);
      if (season) qs.set('season', season);
      const data = await fetch(`/api/standings?${qs}`).then(r => r.json());
      setStandings(data.standings ?? []);
      setLeagues(data.leagues ?? []);
    } catch { setError('Failed to load standings'); }
    finally { setLoading(false); }
  }, [leagueId, season]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Standings</h1>
          <p className="text-gray-500 text-sm">Official league tables</p>
        </div>
        <LeagueSeasonSelector leagues={leagues} selectedLeagueId={leagueId} selectedSeason={season} onLeagueChange={setLeagueId} onSeasonChange={setSeason} />
      </div>
      {loading && <LoadingSkeleton rows={10} />}
      {error && <ErrorState message={error} onRetry={fetchData} />}
      {!loading && !error && standings.length === 0 && (
        <div className="text-center py-16 text-gray-500"><div className="text-4xl mb-3">📊</div><p>No standings. Sync a league in Admin → Sync.</p></div>
      )}
      {!loading && standings.length > 0 && (
        <div className="bg-[#111827] border border-white/5 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-white/5 text-gray-500 text-xs uppercase">
              <th className="text-left px-4 py-3">#</th>
              <th className="text-left px-4 py-3">Team</th>
              <th className="text-center px-3 py-3">P</th>
              <th className="text-center px-3 py-3 text-green-400">W</th>
              <th className="text-center px-3 py-3">D</th>
              <th className="text-center px-3 py-3 text-red-400">L</th>
              <th className="text-center px-3 py-3">GF</th>
              <th className="text-center px-3 py-3">GA</th>
              <th className="text-center px-3 py-3">GD</th>
              <th className="text-center px-3 py-3 text-white font-bold">Pts</th>
            </tr></thead>
            <tbody>
              {standings.map((s, i) => (
                <tr key={s.id} className={`border-b border-white/5 hover:bg-white/3 transition ${i < 4 ? 'border-l-2 border-l-[#00d4aa]' : i < 6 ? 'border-l-2 border-l-blue-500' : ''}`}>
                  <td className="px-4 py-3 text-gray-400 font-mono text-xs">{s.rank}</td>
                  <td className="px-4 py-3"><div className="flex items-center gap-2">
                    {s.team.logo && <img src={s.team.logo} alt="" className="w-5 h-5 object-contain" />}
                    <span className="text-white font-medium">{s.team.name}</span>
                  </div></td>
                  <td className="text-center px-3 py-3 text-gray-400">{s.played ?? '-'}</td>
                  <td className="text-center px-3 py-3 text-green-400">{s.win ?? '-'}</td>
                  <td className="text-center px-3 py-3 text-gray-400">{s.draw ?? '-'}</td>
                  <td className="text-center px-3 py-3 text-red-400">{s.lose ?? '-'}</td>
                  <td className="text-center px-3 py-3 text-gray-300">{s.goalsFor ?? '-'}</td>
                  <td className="text-center px-3 py-3 text-gray-300">{s.goalsAgainst ?? '-'}</td>
                  <td className="text-center px-3 py-3 text-gray-300">{s.goalsDiff != null ? (s.goalsDiff > 0 ? `+${s.goalsDiff}` : s.goalsDiff) : '-'}</td>
                  <td className="text-center px-3 py-3 text-white font-bold">{s.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
