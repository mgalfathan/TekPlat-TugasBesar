'use client';

import { useEffect, useState } from 'react';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';
import Image from 'next/image';

interface Standing {
  teamId: number;
  teamName: string;
  tla: string;
  crest: string | null;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export default function LeaderboardPage() {
  const [standings, setStandings] = useState<Standing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/leaderboard')
      .then((r) => r.json())
      .then((d) => { setStandings(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner message="Loading leaderboard..." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-white mb-1">Leaderboard</h1>
        <p className="text-slate-400">Current standings based on match results</p>
      </div>

      {standings.length === 0 ? (
        <EmptyState title="No standings available" description="Sync data or add match results to see standings." />
      ) : (
        <div className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-slate-400 text-xs uppercase">
                <th className="text-left px-4 py-3 w-8">#</th>
                <th className="text-left px-4 py-3">Team</th>
                <th className="text-center px-2 py-3">P</th>
                <th className="text-center px-2 py-3">W</th>
                <th className="text-center px-2 py-3">D</th>
                <th className="text-center px-2 py-3">L</th>
                <th className="text-center px-2 py-3">GF</th>
                <th className="text-center px-2 py-3">GA</th>
                <th className="text-center px-2 py-3">GD</th>
                <th className="text-center px-4 py-3 text-[#00d4aa]">PTS</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((s, i) => (
                <tr key={s.teamId} className="border-b border-gray-800/50 last:border-0 hover:bg-gray-800/30 transition-colors">
                  <td className="px-4 py-3 text-slate-400 font-medium">{i + 1}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {s.crest ? (
                        <Image src={s.crest} alt={s.teamName} width={20} height={20} className="object-contain" />
                      ) : (
                        <span className="text-xs text-slate-500 w-5 text-center">{s.tla}</span>
                      )}
                      <span className="text-slate-200 font-medium">{s.teamName}</span>
                    </div>
                  </td>
                  <td className="text-center px-2 py-3 text-slate-400">{s.played}</td>
                  <td className="text-center px-2 py-3 text-emerald-400">{s.wins}</td>
                  <td className="text-center px-2 py-3 text-slate-400">{s.draws}</td>
                  <td className="text-center px-2 py-3 text-red-400">{s.losses}</td>
                  <td className="text-center px-2 py-3 text-slate-300">{s.goalsFor}</td>
                  <td className="text-center px-2 py-3 text-slate-300">{s.goalsAgainst}</td>
                  <td className={`text-center px-2 py-3 font-medium ${s.goalDifference > 0 ? 'text-emerald-400' : s.goalDifference < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                    {s.goalDifference > 0 ? '+' : ''}{s.goalDifference}
                  </td>
                  <td className="text-center px-4 py-3 text-[#00d4aa] font-black text-base">{s.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
