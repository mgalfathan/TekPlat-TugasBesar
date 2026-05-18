'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';
import { Badge } from '@/components/Badge';
import { format } from 'date-fns';

interface Team { id: number; name: string; code?: string | null; logo?: string | null }
interface League { id: number; name: string }
interface Match {
  id: number;
  utcDate: string;
  statusShort: string;
  homeScore: number | null;
  awayScore: number | null;
  homeTeam: Team;
  awayTeam: Team;
  league: League;
}

const FINISHED = ['FT', 'AET', 'PEN', 'FINISHED'];
const UPCOMING = ['NS', 'TBD', 'SCHEDULED', 'TIMED'];
const LIVE = ['1H', '2H', 'ET', 'P', 'LIVE', 'BT', 'INT'];

function statusVariant(s: string): 'green' | 'blue' | 'amber' | 'gray' {
  if (FINISHED.includes(s)) return 'green';
  if (UPCOMING.includes(s)) return 'blue';
  if (LIVE.includes(s)) return 'amber';
  return 'gray';
}

const FILTERS: Array<{ key: string; label: string; statuses: string[] }> = [
  { key: '', label: 'All', statuses: [] },
  { key: 'finished', label: 'Finished', statuses: FINISHED },
  { key: 'upcoming', label: 'Upcoming', statuses: UPCOMING },
  { key: 'live', label: 'Live', statuses: LIVE },
];

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const fetchMatches = (filterKey = '') => {
    setLoading(true);
    const filt = FILTERS.find(f => f.key === filterKey);
    const params = new URLSearchParams({ limit: '50' });
    // API accepts a single status; if a filter spans multiple statuses, fetch all and filter client-side.
    fetch(`/api/matches?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        const all: Match[] = d.matches ?? [];
        const filtered = filt && filt.statuses.length ? all.filter(m => filt.statuses.includes(m.statusShort)) : all;
        setMatches(filtered);
        setTotal(d.total ?? all.length);
        setLoading(false);
      })
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
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => handleFilter(f.key)}
              className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
                filter === f.key
                  ? 'bg-[#00d4aa] text-[#0a0f1e]'
                  : 'bg-[#111827] border border-gray-700 text-slate-300 hover:border-gray-500'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {matches.length === 0 ? (
        <EmptyState title="No matches found" description="Sync data in Admin → Sync to load matches." />
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
                <th className="text-left px-4 py-3">League</th>
                <th className="text-right px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {matches.map((m) => (
                <tr key={m.id} className="border-b border-gray-800/50 last:border-0 hover:bg-gray-800/30 transition-colors">
                  <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                    {format(new Date(m.utcDate), 'dd MMM yyyy')}
                  </td>
                  <td className="px-4 py-3 text-slate-200 font-medium">
                    <div className="flex items-center gap-2">
                      {m.homeTeam.logo && <img src={m.homeTeam.logo} alt="" className="w-5 h-5 object-contain" />}
                      <span>{m.homeTeam.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {FINISHED.includes(m.statusShort) ? (
                      <span className="text-[#00d4aa] font-bold">{m.homeScore} – {m.awayScore}</span>
                    ) : (
                      <span className="text-slate-500">vs</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-200 font-medium">
                    <div className="flex items-center gap-2">
                      {m.awayTeam.logo && <img src={m.awayTeam.logo} alt="" className="w-5 h-5 object-contain" />}
                      <span>{m.awayTeam.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge label={m.statusShort} variant={statusVariant(m.statusShort)} />
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{m.league.name}</td>
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
