'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Health { totalCountries: number; totalLeagues: number; totalSeasons: number; totalTeams: number; totalPlayers: number; totalMatches: number; totalStandings: number; lastSync?: { provider: string; syncType: string; status: string; startedAt: string } | null; staleDataWarnings: string[]; providerStatus: { apiFootball: boolean; footballData: boolean } }

export default function DataHealthPage() {
  const [health, setHealth] = useState<Health | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/data-health').then(r => r.json()).then(setHealth).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="max-w-3xl mx-auto px-4 py-8 text-gray-400 animate-pulse">Loading…</div>;
  if (!health) return null;

  const stats = [
    { label: 'Countries', value: health.totalCountries },
    { label: 'Leagues', value: health.totalLeagues },
    { label: 'Seasons', value: health.totalSeasons },
    { label: 'Teams', value: health.totalTeams },
    { label: 'Players', value: health.totalPlayers },
    { label: 'Matches', value: health.totalMatches },
    { label: 'Standings', value: health.totalStandings },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Data Health</h1>
        <Link href="/admin/sync" className="px-3 py-1.5 text-xs bg-[#00d4aa]/10 text-[#00d4aa] rounded-lg hover:bg-[#00d4aa]/20 transition">← Back to Sync</Link>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-6">
        {stats.map(s => (
          <div key={s.label} className="bg-[#111827] border border-white/5 rounded-xl p-4 text-center">
            <div className={`text-2xl font-bold ${s.value > 0 ? 'text-[#00d4aa]' : 'text-gray-600'}`}>{s.value}</div>
            <div className="text-gray-500 text-xs mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-[#111827] border border-white/5 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Provider Status</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">API-Football</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${health.providerStatus.apiFootball ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                {health.providerStatus.apiFootball ? 'Key set' : 'No key'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">football-data.org</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${health.providerStatus.footballData ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                {health.providerStatus.footballData ? 'Key set' : 'No key'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-[#111827] border border-white/5 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Last Sync</p>
          {health.lastSync ? (
            <div className="space-y-1 text-sm">
              <p className="text-white">{health.lastSync.provider} — {health.lastSync.syncType}</p>
              <p className="text-gray-500 text-xs">{new Date(health.lastSync.startedAt).toLocaleString()}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full ${health.lastSync.status === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{health.lastSync.status}</span>
            </div>
          ) : <p className="text-gray-500 text-sm">No syncs yet</p>}
        </div>
      </div>

      {health.staleDataWarnings.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
          <p className="text-yellow-400 font-semibold text-sm mb-2">⚠️ Warnings</p>
          {health.staleDataWarnings.map((w, i) => <p key={i} className="text-yellow-300/80 text-sm">{w}</p>)}
        </div>
      )}
    </div>
  );
}
