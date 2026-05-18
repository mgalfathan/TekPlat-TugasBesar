'use client';
import { useEffect, useState } from 'react';
import { StatCard } from '@/components/StatCard';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Badge } from '@/components/Badge';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { format } from 'date-fns';
import Link from 'next/link';

interface TeamLite { id: number; name: string; code?: string | null; logo?: string | null }
interface LeagueLite { id: number; name: string }
interface MatchLite { id: number; utcDate: string; homeScore: number | null; awayScore: number | null; homeTeam: TeamLite; awayTeam: TeamLite; league: LeagueLite }
interface StandingLite { id: number; rank: number; points: number; win: number | null; draw: number | null; lose: number | null; team: TeamLite }

interface DashboardData {
  stats: { totalTeams: number; totalMatches: number; totalPredictions: number; totalPlayers: number; finishedCount: number };
  recentMatches: MatchLite[];
  topStandings: StandingLite[];
}

function teamLabel(t: TeamLite) { return t.code ?? t.name.slice(0, 3).toUpperCase(); }

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard').then(r => r.json())
      .then((d: DashboardData & { error?: string }) => {
        if (d.error || !d.stats) return setLoading(false);
        setData(d); setLoading(false);
      }).catch(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner message="Loading dashboard..." />;
  if (!data) return (
    <div className="text-center py-20">
      <p className="text-red-400 font-medium">Database not connected</p>
      <p className="text-slate-500 text-sm mt-2">Set DATABASE_URL in .env and run <code className="text-[#00d4aa]">prisma migrate dev</code></p>
    </div>
  );

  const topScoringTeams = [...data.topStandings]
    .sort((a, b) => b.points - a.points)
    .slice(0, 5)
    .map(s => ({ name: teamLabel(s.team), goals: s.points }));

  return (
    <div className="space-y-8">
      <div><h1 className="text-3xl font-black text-white mb-1">Dashboard</h1><p className="text-slate-400">Overview of all football data</p></div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Link href="/teams"><StatCard label="Teams" value={data.stats.totalTeams} accent="green" /></Link>
        <StatCard label="Matches" value={data.stats.totalMatches} accent="blue" />
        <Link href="/predictions"><StatCard label="Predictions" value={data.stats.totalPredictions} accent="amber" /></Link>
        <Link href="/players"><StatCard label="Players" value={data.stats.totalPlayers} accent="green" /></Link>
        <StatCard label="Finished" value={data.stats.finishedCount} accent="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Results */}
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">Recent Results</h2>
            <Link href="/results" className="text-xs text-[#00d4aa] hover:underline">View all</Link>
          </div>
          {data.recentMatches.length === 0 ? <p className="text-slate-500 text-sm">No results yet.</p> : (
            <div className="space-y-2">
              {data.recentMatches.map(m => (
                <div key={m.id} className="flex items-center justify-between py-1.5 border-b border-gray-800/50 last:border-0">
                  <span className="text-slate-300 text-sm truncate flex-1">{teamLabel(m.homeTeam)} <span className="text-[#00d4aa] font-bold">{m.homeScore}–{m.awayScore}</span> {teamLabel(m.awayTeam)}</span>
                  <span className="text-xs text-slate-500 ml-2 shrink-0">{format(new Date(m.utcDate), 'dd MMM')}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Standings Preview */}
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">Top 5</h2>
            <Link href="/standings" className="text-xs text-[#00d4aa] hover:underline">Full table</Link>
          </div>
          {data.topStandings.length === 0 ? <p className="text-slate-500 text-sm">No standings yet.</p> : (
            <div className="space-y-2">
              {data.topStandings.slice(0, 5).map(s => (
                <div key={s.id} className="flex items-center justify-between py-1">
                  <span className="text-slate-500 text-sm w-5">{s.rank}</span>
                  <span className="text-slate-200 text-sm flex-1 truncate">{s.team.name}</span>
                  <span className="text-[#00d4aa] font-black">{s.points}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Points by Team chart */}
      {topScoringTeams.length > 0 && (
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-5">
          <h2 className="text-lg font-bold text-white mb-4">Points by Team</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={topScoringTeams} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 11 }} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1f2937', color: '#f1f5f9' }} />
              <Bar dataKey="goals" radius={[4, 4, 0, 0]}>
                {topScoringTeams.map((_, i) => <Cell key={i} fill={i === 0 ? '#00d4aa' : '#0ea5e9'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
