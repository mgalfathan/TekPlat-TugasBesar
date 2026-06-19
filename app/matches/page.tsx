'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';
import { Badge } from '@/components/Badge';

interface Team { id: number; name: string; code?: string | null; logo?: string | null }
interface League { id: number; name: string }
interface Match {
  id: number; utcDate: string; statusShort: string; homeScore: number | null;
  awayScore: number | null; homeTeam: Team; awayTeam: Team; league: League;
}

const FINISHED = ['FT', 'AET', 'PEN', 'FINISHED'];
const UPCOMING = ['NS', 'TBD', 'SCHEDULED', 'TIMED'];
const LIVE = ['1H', '2H', 'ET', 'P', 'LIVE', 'BT', 'INT'];
const FILTERS = [
  { key: '', label: 'All', statuses: [] },
  { key: 'finished', label: 'Finished', statuses: FINISHED },
  { key: 'upcoming', label: 'Upcoming', statuses: UPCOMING },
  { key: 'live', label: 'Live', statuses: LIVE },
];

function statusVariant(status: string): 'green' | 'blue' | 'amber' | 'gray' {
  if (FINISHED.includes(status)) return 'green';
  if (UPCOMING.includes(status)) return 'blue';
  if (LIVE.includes(status)) return 'amber';
  return 'gray';
}

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  function fetchMatches(filterKey = '') {
    setLoading(true);
    const selected = FILTERS.find(item => item.key === filterKey);
    fetch('/api/matches?limit=50')
      .then(r => r.json())
      .then(data => {
        const all: Match[] = data.matches ?? [];
        const visible = selected?.statuses.length ? all.filter(match => selected.statuses.includes(match.statusShort)) : all;
        setMatches(visible);
        setTotal(data.total ?? all.length);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }

  useEffect(() => { fetchMatches(); }, []);

  function handleFilter(key: string) {
    setFilter(key);
    fetchMatches(key);
  }

  if (loading) return <LoadingSpinner message="Loading matches..." />;

  return (
    <div className="gaffer-screen space-y-7">
      <header className="flex flex-col justify-between gap-5 border-b border-border pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-lime">Match centre</p>
          <h1 className="mt-3 font-display text-[clamp(44px,7vw,78px)] uppercase leading-[0.9] tracking-[0.5px] text-ink">Matches.</h1>
          <p className="mt-3 text-sm text-muted">{total} fixtures and results in the database.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map(item => (
            <button
              key={item.key}
              onClick={() => handleFilter(item.key)}
              className={`h-9 rounded-chip px-3 font-mono text-[10px] font-bold uppercase tracking-[0.06em] transition-colors ${
                filter === item.key
                  ? 'bg-lime text-lime-ink'
                  : 'border border-border-2 bg-panel text-muted hover:border-lime hover:text-lime'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      {matches.length === 0 ? (
        <EmptyState title="No matches found" description="Sync data in Admin > Sync to load matches." />
      ) : (
        <div className="overflow-hidden border border-border bg-panel rounded-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-border bg-panel-2 font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Home</th>
                  <th className="px-4 py-3 text-center">Score</th>
                  <th className="px-4 py-3 text-left">Away</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">League</th>
                  <th className="px-4 py-3 text-right">Detail</th>
                </tr>
              </thead>
              <tbody>
                {matches.map(match => (
                  <tr key={match.id} className="border-b border-border last:border-0 transition-colors hover:bg-white/[0.025]">
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-[10px] text-muted">{format(new Date(match.utcDate), 'dd MMM yyyy')}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5 font-semibold text-ink">
                        {match.homeTeam.logo && <img src={match.homeTeam.logo} alt="" className="h-6 w-6 object-contain" />}
                        {match.homeTeam.name}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {FINISHED.includes(match.statusShort) ? (
                        <span className="font-display text-xl text-lime">{match.homeScore} - {match.awayScore}</span>
                      ) : <span className="font-mono text-[10px] uppercase text-muted-2">vs</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5 font-semibold text-ink">
                        {match.awayTeam.logo && <img src={match.awayTeam.logo} alt="" className="h-6 w-6 object-contain" />}
                        {match.awayTeam.name}
                      </div>
                    </td>
                    <td className="px-4 py-3"><Badge label={match.statusShort} variant={statusVariant(match.statusShort)} /></td>
                    <td className="px-4 py-3 text-xs text-muted">{match.league.name}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/matches/${match.id}`} className="font-mono text-[10px] font-bold uppercase tracking-[0.06em] text-muted hover:text-lime">View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
