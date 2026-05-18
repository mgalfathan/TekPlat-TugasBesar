'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';

interface Team {
  id: number;
  name: string;
  shortName: string;
  tla: string;
  crest: string | null;
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
    t.tla.toLowerCase().includes(search.toLowerCase())
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
        <EmptyState title="No teams found" description="Try adjusting your search." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((team) => (
            <div key={team.id} className="bg-[#111827] border border-gray-800 rounded-xl p-5 hover:border-gray-600 transition-colors">
              <div className="flex items-center gap-3 mb-3">
                {team.crest ? (
                  <Image src={team.crest} alt={team.name} width={36} height={36} className="object-contain" />
                ) : (
                  <div className="w-9 h-9 bg-gray-700 rounded-full flex items-center justify-center text-xs font-bold text-slate-300">
                    {team.tla}
                  </div>
                )}
                <div>
                  <p className="text-white font-bold text-sm leading-tight">{team.name}</p>
                  <p className="text-slate-500 text-xs">{team.tla}</p>
                </div>
              </div>
              <div className="flex gap-4 text-xs text-slate-400">
                <span>Home: <span className="text-slate-200">{team._count.homeMatches}</span></span>
                <span>Away: <span className="text-slate-200">{team._count.awayMatches}</span></span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
