'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import StatusBadge from '@/components/StatusBadge';
import LeagueSeasonSelector from '@/components/LeagueSeasonSelector';

interface Team { name: string; logo?: string | null }
interface League { id: number; name: string; country?: { name: string } | null }
interface Match { id: number; homeTeam: Team; awayTeam: Team; homeScore?: number | null; awayScore?: number | null; statusShort: string; elapsed?: number | null; league: League; lastSyncedAt?: string | null }

const POLL_MS = (parseInt(process.env.NEXT_PUBLIC_LIVE_POLL_INTERVAL_SECONDS ?? '30') || 30) * 1000;

export default function LivePage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [leagueId, setLeagueId] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchLive = useCallback(async () => {
    try {
      const qs = leagueId ? `?leagueId=${leagueId}` : '';
      const data = await fetch(`/api/live${qs}`).then(r => r.json());
      setMatches(data.matches ?? []);
      setLastUpdated(new Date());
    } catch { /* keep stale data */ }
    finally { setLoading(false); }
  }, [leagueId]);

  useEffect(() => {
    const leagueRes = fetch('/api/standings').then(r => r.json()).then(d => setLeagues(d.leagues ?? [])).catch(() => {});
    fetchLive();
    timerRef.current = setInterval(fetchLive, POLL_MS);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [fetchLive]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            Live Matches
          </h1>
          <p className="text-gray-500 text-xs mt-1">
            Near real-time live updates · Auto-refresh on ·{' '}
            {lastUpdated ? `Last updated ${lastUpdated.toLocaleTimeString()}` : 'Loading…'}
          </p>
        </div>
        <LeagueSeasonSelector leagues={leagues} selectedLeagueId={leagueId} selectedSeason="" onLeagueChange={setLeagueId} onSeasonChange={() => {}} seasons={[]} />
      </div>

      {loading && <div className="text-center py-16 text-gray-500 animate-pulse">Loading live data…</div>}

      {!loading && matches.length === 0 && (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">⚽</div>
          <p className="text-gray-400 font-medium">No live matches right now</p>
          <p className="text-gray-600 text-sm mt-1">Page auto-refreshes every {POLL_MS / 1000}s</p>
        </div>
      )}

      <div className="space-y-3">
        {matches.map(m => (
          <div key={m.id} className="bg-[#111827] border border-white/5 rounded-xl p-5 hover:border-red-500/20 transition">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-500">{m.league.name}</span>
              <StatusBadge status={m.statusShort} elapsed={m.elapsed} />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                {m.homeTeam.logo && <img src={m.homeTeam.logo} alt="" className="w-8 h-8 object-contain" />}
                <span className="text-white font-semibold">{m.homeTeam.name}</span>
              </div>
              <div className="text-3xl font-bold text-white px-6 font-mono">
                {m.homeScore ?? '-'} — {m.awayScore ?? '-'}
              </div>
              <div className="flex items-center gap-3 flex-1 justify-end">
                <span className="text-white font-semibold">{m.awayTeam.name}</span>
                {m.awayTeam.logo && <img src={m.awayTeam.logo} alt="" className="w-8 h-8 object-contain" />}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
