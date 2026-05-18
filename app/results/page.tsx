'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';
import { format } from 'date-fns';

interface Result {
  id: number; utcDate: string; winner: string | null;
  homeScore: number | null; awayScore: number | null; matchday: number | null;
  homeTeam: { name: string; tla: string };
  awayTeam: { name: string; tla: string };
  competition: { name: string };
}

function winnerBadge(winner: string | null, homeId: boolean) {
  if (!winner || winner === 'DRAW') return null;
  const isWinner = (winner === 'HOME_TEAM' && homeId) || (winner === 'AWAY_TEAM' && !homeId);
  return isWinner ? <span className="text-xs text-emerald-400 font-bold ml-1">W</span> : null;
}

export default function ResultsPage() {
  const router = useRouter();
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/results?limit=30').then(r => r.json())
      .then(d => { setResults(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner message="Loading results..." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-white mb-1">Results</h1>
        <p className="text-slate-400">{results.length} recent results</p>
      </div>
      {results.length === 0 ? <EmptyState title="No results yet" description="Sync data to load match results." /> : (
        <div className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-800 text-slate-400 text-xs uppercase">
              <th className="text-left px-4 py-3">Date</th>
              <th className="text-left px-4 py-3">Home</th>
              <th className="text-center px-4 py-3">Score</th>
              <th className="text-left px-4 py-3">Away</th>
              <th className="text-left px-4 py-3">Competition</th>
              <th className="text-center px-4 py-3">MD</th>
            </tr></thead>
            <tbody>
              {results.map(r => (
                <tr key={r.id} className="border-b border-gray-800/50 last:border-0 hover:bg-gray-800/30 cursor-pointer" onClick={() => router.push(`/matches/${r.id}`)}>

                  <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{format(new Date(r.utcDate), 'dd MMM yyyy')}</td>
                  <td className="px-4 py-3 font-medium text-slate-200">{r.homeTeam.name}{winnerBadge(r.winner, true)}</td>
                  <td className="px-4 py-3 text-center font-black text-[#00d4aa]">{r.homeScore} – {r.awayScore}</td>
                  <td className="px-4 py-3 font-medium text-slate-200">{r.awayTeam.name}{winnerBadge(r.winner, false)}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{r.competition.name}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs text-center">{r.matchday ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
