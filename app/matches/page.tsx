'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';
import { Badge } from '@/components/Badge';
import { format } from 'date-fns';

interface Match {
  id: number;
  utcDate: string;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
  homeTeam: { name: string; tla: string };
  awayTeam: { name: string; tla: string };
  competition: { name: string };
}

function statusVariant(s: string): 'green' | 'blue' | 'amber' | 'gray' {
  if (s === 'FINISHED') return 'green';
  if (s === 'SCHEDULED') return 'blue';
  if (s === 'IN_PLAY' || s === 'PAUSED') return 'amber';
  return 'gray';
}

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const fetchMatches = (status = '') => {
    setLoading(true);
    const url = status ? `/api/matches?status=${status}&limit=50` : '/api/matches?limit=50';
    fetch(url)
      .then((r) => r.json())
      .then((d) => { setMatches(d.matches ?? []); setTotal(d.total ?? 0); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchMatches(); }, []);

  const handleFilter = (s: string) => { setFilter(s); fetchMatches(s); };

  if (loading) return <LoadingSpinner message="Loading matches..." />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-black text-white mb-1">Matches</h1>
          <p className="text-slate-400">{total} matches total</p>
        </div>
        <div className="flex gap-2">
          {['', 'FINISHED', 'SCHEDULED'].map((s) => (
            <button
              key={s}
              onClick={() => handleFilter(s)}
              className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
                filter === s
                  ? 'bg-[#00d4aa] text-[#0a0f1e]'
                  : 'bg-[#111827] border border-gray-700 text-slate-300 hover:border-gray-500'
              }`}
            >
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      {matches.length === 0 ? (
        <EmptyState title="No matches found" />
      ) : (
        <div className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-slate-400 text-xs uppercase">
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-left px-4 py-3">Home</th>
                <th className="text-center px-4 py-3">Score</th>
                <th className="text-left px-4 py-3">Away</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Competition</th>
                <th className="text-right px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {matches.map((m) => (
                <tr key={m.id} className="border-b border-gray-800/50 last:border-0 hover:bg-gray-800/30 transition-colors">
                  <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                    {format(new Date(m.utcDate), 'dd MMM yyyy')}
                  </td>
                  <td className="px-4 py-3 text-slate-200 font-medium">{m.homeTeam.name}</td>
                  <td className="px-4 py-3 text-center">
                    {m.status === 'FINISHED' ? (
                      <span className="text-[#00d4aa] font-bold">{m.homeScore} – {m.awayScore}</span>
                    ) : (
                      <span className="text-slate-500">vs</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-200 font-medium">{m.awayTeam.name}</td>
                  <td className="px-4 py-3">
                    <Badge label={m.status} variant={statusVariant(m.status)} />
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{m.competition.name}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/matches/${m.id}`} className="text-xs text-[#00d4aa] hover:underline">
                      Detail →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
