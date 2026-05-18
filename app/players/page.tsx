'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';

interface Player {
  id: number;
  name: string;
  nickname: string | null;
  country: string | null;
  _count: { lineupEntries: number };
}

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [country, setCountry] = useState('');

  const fetchPlayers = useCallback((s: string, c: string) => {
    setLoading(true);
    const params = new URLSearchParams({ limit: '100' });
    if (s) params.set('search', s);
    if (c) params.set('country', c);
    fetch(`/api/players?${params}`)
      .then(r => r.json())
      .then((d: { players?: Player[]; total?: number }) => {
        setPlayers(d.players ?? []);
        setTotal(d.total ?? 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { fetchPlayers('', ''); }, [fetchPlayers]);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); fetchPlayers(search, country); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-black text-white mb-1">Players</h1>
          <p className="text-slate-400">{total} players from StatsBomb open data</p>
        </div>
        <form onSubmit={handleSearch} className="flex gap-2 flex-wrap">
          <input
            type="text" placeholder="Search name..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-[#111827] border border-gray-700 rounded-lg px-4 py-2 text-slate-100 text-sm focus:outline-none focus:border-[#00d4aa] w-48"
          />
          <input
            type="text" placeholder="Country..." value={country}
            onChange={e => setCountry(e.target.value)}
            className="bg-[#111827] border border-gray-700 rounded-lg px-4 py-2 text-slate-100 text-sm focus:outline-none focus:border-[#00d4aa] w-36"
          />
          <button type="submit" className="bg-[#00d4aa] text-[#0a0f1e] font-bold px-4 py-2 rounded-lg text-sm hover:bg-[#00d4aa]/90 transition-colors">
            Search
          </button>
        </form>
      </div>

      {loading ? (
        <LoadingSpinner message="Loading players..." />
      ) : players.length === 0 ? (
        <EmptyState
          title="No players found"
          description="Sync StatsBomb data from Admin → Sync to load players."
        />
      ) : (
        <div className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-slate-400 text-xs uppercase">
                <th className="text-left px-4 py-3">Player</th>
                <th className="text-left px-4 py-3">Country</th>
                <th className="text-center px-4 py-3">Appearances</th>
                <th className="text-right px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {players.map(p => (
                <tr key={p.id} className="border-b border-gray-800/50 last:border-0 hover:bg-gray-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-slate-200 font-medium">{p.name}</p>
                    {p.nickname && <p className="text-slate-500 text-xs">{p.nickname}</p>}
                  </td>
                  <td className="px-4 py-3 text-slate-400">{p.country ?? '—'}</td>
                  <td className="px-4 py-3 text-center text-slate-300">{p._count.lineupEntries}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/players/${p.id}`} className="text-xs text-[#00d4aa] hover:underline">
                      Profile →
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
