'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';

interface Player {
  id: number;
  name: string;
  firstname: string | null;
  lastname: string | null;
  age: number | null;
  nationality: string | null;
  height: string | null;
  weight: string | null;
  photo: string | null;
  injured: boolean;
  team: { id: number; name: string; logo: string | null; code: string | null } | null;
}

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [country, setCountry] = useState('');

  const fetchPlayers = useCallback((name: string, nationality: string) => {
    setLoading(true);
    const params = new URLSearchParams({ limit: '100' });
    if (name) params.set('search', name);
    if (nationality) params.set('country', nationality);
    fetch(`/api/players?${params}`)
      .then(r => r.json())
      .then((d: { players?: Player[]; total?: number }) => {
        setPlayers(d.players ?? []);
        setTotal(d.total ?? 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchPlayers('', '');
  }, [fetchPlayers]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    fetchPlayers(search.trim(), country.trim());
  }

  function clearFilters() {
    setSearch('');
    setCountry('');
    fetchPlayers('', '');
  }

  return (
    <div className="gaffer-screen space-y-7">
      <header className="border-b border-border pb-6">
        <div className="mb-3 flex items-center gap-2.5 font-mono text-xs font-bold uppercase tracking-[0.14em] text-lime">
          <span className="rounded bg-lime px-1.5 py-px text-lime-ink">08</span>
          Player database
        </div>
        <h1 className="font-display text-[clamp(44px,7vw,78px)] uppercase leading-[0.9] tracking-[0.5px] text-ink">
          Players.
        </h1>
        <p className="mt-3 text-sm text-muted">{total} player profiles available.</p>
      </header>

      <form onSubmit={handleSearch} className="grid gap-3 border border-border bg-panel p-4 rounded-card md:grid-cols-[1fr_240px_auto_auto] md:items-end">
        <div>
          <label htmlFor="player-search" className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-muted">
            Player name
          </label>
          <input
            id="player-search"
            type="search"
            placeholder="Search players"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-11 w-full rounded-chip border border-border-2 bg-bg px-4 text-sm text-ink outline-none transition-colors placeholder:text-muted-2 focus:border-lime focus:ring-1 focus:ring-lime/20"
          />
        </div>
        <div>
          <label htmlFor="nationality" className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-muted">
            Nationality
          </label>
          <input
            id="nationality"
            type="search"
            placeholder="e.g. England"
            value={country}
            onChange={e => setCountry(e.target.value)}
            className="h-11 w-full rounded-chip border border-border-2 bg-bg px-4 text-sm text-ink outline-none transition-colors placeholder:text-muted-2 focus:border-lime focus:ring-1 focus:ring-lime/20"
          />
        </div>
        <button type="submit" className="h-11 rounded-chip bg-lime px-5 font-mono text-xs font-bold uppercase tracking-[0.06em] text-lime-ink transition hover:brightness-110">
          Search
        </button>
        <button type="button" onClick={clearFilters} className="h-11 rounded-chip border border-border-2 px-4 font-mono text-[10px] font-bold uppercase tracking-[0.06em] text-muted transition-colors hover:border-lime hover:text-lime">
          Reset
        </button>
      </form>

      {loading ? (
        <LoadingSpinner message="Loading players..." />
      ) : players.length === 0 ? (
        <EmptyState
          title="No players found"
          description="Sync players in Admin > Sync, or adjust the current filters."
        />
      ) : (
        <div className="overflow-hidden border border-border bg-panel rounded-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-border bg-panel-2 font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
                  <th className="px-4 py-3 text-left">Player</th>
                  <th className="px-4 py-3 text-left">Club</th>
                  <th className="px-4 py-3 text-left">Nationality</th>
                  <th className="px-4 py-3 text-center">Age</th>
                  <th className="px-4 py-3 text-center">Availability</th>
                  <th className="px-4 py-3 text-right">Profile</th>
                </tr>
              </thead>
              <tbody>
                {players.map(player => (
                  <tr key={player.id} className="border-b border-border last:border-0 transition-colors hover:bg-white/[0.025]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-chip border border-border bg-bg">
                          {player.photo ? (
                            <img src={player.photo} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <span className="font-display text-[11px] text-muted">
                              {player.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-ink">{player.name}</p>
                          {player.firstname && player.lastname && (
                            <p className="mt-0.5 text-[11px] text-muted-2">{player.firstname} {player.lastname}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {player.team ? (
                        <Link href={`/teams/${player.team.id}`} className="inline-flex items-center gap-2 text-xs text-muted transition-colors hover:text-lime">
                          {player.team.logo && <img src={player.team.logo} alt="" className="h-5 w-5 object-contain" />}
                          {player.team.name}
                        </Link>
                      ) : <span className="text-xs text-muted-2">-</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">{player.nationality ?? '-'}</td>
                    <td className="px-4 py-3 text-center font-mono text-xs text-ink">{player.age ?? '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex rounded px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.06em] ${
                        player.injured ? 'bg-loss/10 text-loss' : 'bg-win/10 text-win'
                      }`}>
                        {player.injured ? 'Injured' : 'Available'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/players/${player.id}`} className="font-mono text-[10px] font-bold uppercase tracking-[0.06em] text-muted transition-colors hover:text-lime">
                        View
                      </Link>
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
