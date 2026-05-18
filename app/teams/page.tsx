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
      .then((r) => r.json())
      .then((d) => { setTeams(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = teams.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    (t.code ?? '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <LoadingSpinner message="Loading teams..." />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-black text-white mb-1">Teams</h1>
          <p className="text-slate-400">{teams.length} teams in database</p>
        </div>
        <input
          type="text"
          placeholder="Search teams..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-[#111827] border border-gray-700 rounded-lg px-4 py-2 text-slate-100 text-sm focus:outline-none focus:border-[#00d4aa] w-64"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No teams found" description={teams.length === 0 ? 'Sync data in Admin → Sync to load teams.' : 'Try adjusting your search.'} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((team) => (
            <Link key={team.id} href={`/teams/${team.id}`} className="bg-[#111827] border border-gray-800 rounded-xl p-5 hover:border-[#00d4aa]/40 hover:bg-[#00d4aa]/5 transition-colors block">
              <div className="flex items-center gap-3 mb-3">
                {team.logo ? (
                  <img src={team.logo} alt={team.name} width={36} height={36} className="object-contain" />
                ) : (
                  <div className="w-9 h-9 bg-gray-700 rounded-full flex items-center justify-center text-xs font-bold text-slate-300">
                    {team.code ?? team.name.slice(0, 3).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-white font-bold text-sm leading-tight truncate">{team.name}</p>
                  <p className="text-slate-500 text-xs truncate">{team.code ?? team.country ?? '—'}</p>
                </div>
              </div>
              <div className="flex gap-4 text-xs text-slate-400">
                <span>Home: <span className="text-slate-200">{team._count.homeMatches}</span></span>
                <span>Away: <span className="text-slate-200">{team._count.awayMatches}</span></span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
