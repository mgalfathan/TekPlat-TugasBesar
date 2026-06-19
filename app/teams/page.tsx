'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';

interface Team {
  id: number;
  name: string;
  code: string | null;
  country: string | null;
  logo: string | null;
  venueName: string | null;
  _count: { homeMatches: number; awayMatches: number };
}

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/teams')
      .then(r => r.json())
      .then(d => {
        setTeams(Array.isArray(d) ? d : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const query = search.trim().toLowerCase();
  const filtered = teams.filter(team =>
    team.name.toLowerCase().includes(query) ||
    (team.code ?? '').toLowerCase().includes(query) ||
    (team.country ?? '').toLowerCase().includes(query)
  );

  if (loading) return <LoadingSpinner message="Loading teams..." />;

  return (
    <div className="gaffer-screen space-y-7">
      <header className="flex flex-col justify-between gap-5 border-b border-border pb-6 md:flex-row md:items-end">
        <div>
          <div className="mb-3 flex items-center gap-2.5 font-mono text-xs font-bold uppercase tracking-[0.14em] text-lime">
            <span className="rounded bg-lime px-1.5 py-px text-lime-ink">07</span>
            Club directory
          </div>
          <h1 className="font-display text-[clamp(44px,7vw,78px)] uppercase leading-[0.9] tracking-[0.5px] text-ink">
            Teams.
          </h1>
          <p className="mt-3 text-sm text-muted">{teams.length} clubs currently tracked.</p>
        </div>
        <div className="w-full md:w-72">
          <label htmlFor="team-search" className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-muted">
            Search directory
          </label>
          <input
            id="team-search"
            type="search"
            placeholder="Club, code, or country"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-11 w-full rounded-chip border border-border-2 bg-panel px-4 text-sm text-ink outline-none transition-colors placeholder:text-muted-2 hover:border-white/20 focus:border-lime focus:ring-1 focus:ring-lime/20"
          />
        </div>
      </header>

      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-muted">
          {filtered.length} results
        </p>
        {search && (
          <button onClick={() => setSearch('')} className="font-mono text-[10px] uppercase tracking-[0.06em] text-muted hover:text-lime">
            Clear search
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No teams found"
          description={teams.length === 0 ? 'Sync data in Admin > Sync to load teams.' : 'Try a different search term.'}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map(team => (
            <Link
              key={team.id}
              href={`/teams/${team.id}`}
              className="group border border-border bg-panel p-5 rounded-card transition-all hover:-translate-y-0.5 hover:border-border-2 hover:bg-panel-2"
            >
              <div className="flex items-start gap-3.5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-chip border border-border bg-bg">
                  {team.logo ? (
                    <img src={team.logo} alt="" className="h-9 w-9 object-contain" />
                  ) : (
                    <span className="font-display text-sm tracking-[0.5px] text-ink">
                      {team.code ?? team.name.slice(0, 3).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-sm font-extrabold text-ink transition-colors group-hover:text-lime">
                    {team.name}
                  </h2>
                  <p className="mt-1 truncate font-mono text-[10px] uppercase tracking-[0.05em] text-muted">
                    {team.country ?? team.code ?? 'Unknown country'}
                  </p>
                </div>
                <span className="font-mono text-xs text-muted-2 transition-colors group-hover:text-lime">+</span>
              </div>

              <div className="mt-5 grid grid-cols-2 border-t border-border pt-4">
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-[0.08em] text-muted-2">Home matches</p>
                  <p className="mt-1 font-display text-xl text-ink">{team._count.homeMatches}</p>
                </div>
                <div className="border-l border-border pl-4">
                  <p className="font-mono text-[9px] uppercase tracking-[0.08em] text-muted-2">Away matches</p>
                  <p className="mt-1 font-display text-xl text-ink">{team._count.awayMatches}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
