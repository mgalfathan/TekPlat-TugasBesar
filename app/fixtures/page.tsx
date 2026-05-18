'use client';
import { useEffect, useState } from 'react';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';
import { Badge } from '@/components/Badge';
import { format } from 'date-fns';

interface Fixture {
  id: number; utcDate: string; status: string; matchday: number | null;
  homeTeam: { name: string; tla: string };
  awayTeam: { name: string; tla: string };
  competition: { name: string };
  predictions: Array<{ homeWinProbability: number; drawProbability: number; awayWinProbability: number }>;
}

export default function FixturesPage() {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/fixtures?limit=30').then(r => r.json())
      .then(d => { setFixtures(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner message="Loading fixtures..." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-white mb-1">Upcoming Fixtures</h1>
        <p className="text-slate-400">{fixtures.length} upcoming matches</p>
      </div>
      {fixtures.length === 0 ? <EmptyState title="No upcoming fixtures" description="Sync data to load fixtures." /> : (
        <div className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-800 text-slate-400 text-xs uppercase">
              <th className="text-left px-4 py-3">Date</th>
              <th className="text-left px-4 py-3">Home</th>
              <th className="text-center px-4 py-3">vs</th>
              <th className="text-left px-4 py-3">Away</th>
              <th className="text-left px-4 py-3">Prediction</th>
              <th className="text-left px-4 py-3">MD</th>
            </tr></thead>
            <tbody>
              {fixtures.map(f => {
                const pred = f.predictions[0];
                return (
                  <tr key={f.id} className="border-b border-gray-800/50 last:border-0 hover:bg-gray-800/30">
                    <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{format(new Date(f.utcDate), 'dd MMM HH:mm')}</td>
                    <td className="px-4 py-3 text-slate-200 font-medium">{f.homeTeam.name}</td>
                    <td className="px-4 py-3 text-center"><Badge label="SOON" variant="blue" /></td>
                    <td className="px-4 py-3 text-slate-200 font-medium">{f.awayTeam.name}</td>
                    <td className="px-4 py-3">
                      {pred ? (
                        <div className="flex gap-1 text-xs">
                          <span className="text-emerald-400">{Math.round(pred.homeWinProbability*100)}%</span>
                          <span className="text-slate-500">/</span>
                          <span className="text-slate-400">{Math.round(pred.drawProbability*100)}%</span>
                          <span className="text-slate-500">/</span>
                          <span className="text-blue-400">{Math.round(pred.awayWinProbability*100)}%</span>
                        </div>
                      ) : <span className="text-slate-600 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{f.matchday ?? '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
