'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LoadingSpinner } from '@/components/LoadingSpinner';

interface Health {
  totalCountries: number; totalLeagues: number; totalSeasons: number; totalTeams: number;
  totalPlayers: number; totalMatches: number; totalStandings: number;
  lastSync?: { provider: string; syncType: string; status: string; startedAt: string } | null;
  staleDataWarnings: string[];
  providerStatus: { apiFootball: boolean; footballData: boolean };
}

function Status({ active, activeLabel = 'Configured', inactiveLabel = 'Missing' }: { active: boolean; activeLabel?: string; inactiveLabel?: string }) {
  return (
    <span className={`rounded px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.06em] ${active ? 'bg-win/10 text-win' : 'bg-loss/10 text-loss'}`}>
      {active ? activeLabel : inactiveLabel}
    </span>
  );
}

export default function DataHealthPage() {
  const [health, setHealth] = useState<Health | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/data-health').then(r => r.json()).then(setHealth).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner message="Checking data health..." />;
  if (!health) return <div className="py-20 text-center text-loss">Unable to load data health.</div>;

  const stats = [
    ['Countries', health.totalCountries], ['Leagues', health.totalLeagues],
    ['Seasons', health.totalSeasons], ['Teams', health.totalTeams],
    ['Players', health.totalPlayers], ['Matches', health.totalMatches],
    ['Standings', health.totalStandings],
  ] as const;

  return (
    <div className="gaffer-screen space-y-6">
      <header className="flex flex-col justify-between gap-5 border-b border-border pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-lime">Admin diagnostics</p>
          <h1 className="mt-3 font-display text-[clamp(42px,6vw,72px)] uppercase leading-[0.9] tracking-[0.5px] text-ink">Data health.</h1>
          <p className="mt-3 text-sm text-muted">Coverage, provider configuration, and latest synchronization status.</p>
        </div>
        <Link href="/admin/sync" className="w-fit rounded-chip border border-border-2 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.06em] text-muted hover:border-lime hover:text-lime">
          Back to sync
        </Link>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {stats.map(([label, value]) => (
          <div key={label} className="border border-border bg-panel p-4 rounded-card">
            <div className={`font-display text-3xl ${value > 0 ? 'text-lime' : 'text-muted-2'}`}>{value}</div>
            <div className="mt-2 font-mono text-[9px] uppercase tracking-[0.08em] text-muted">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="border border-border bg-panel p-5 rounded-card">
          <p className="mb-4 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-muted">Provider status</p>
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <span className="text-sm font-semibold text-ink">API-Football</span>
              <Status active={health.providerStatus.apiFootball} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-ink">football-data.org</span>
              <Status active={health.providerStatus.footballData} />
            </div>
          </div>
        </section>

        <section className="border border-border bg-panel p-5 rounded-card">
          <p className="mb-4 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-muted">Latest sync</p>
          {health.lastSync ? (
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-ink">{health.lastSync.provider} / {health.lastSync.syncType}</p>
                <p className="mt-1 font-mono text-[10px] text-muted">{new Date(health.lastSync.startedAt).toLocaleString()}</p>
              </div>
              <Status active={health.lastSync.status === 'success'} activeLabel="Success" inactiveLabel={health.lastSync.status} />
            </div>
          ) : <p className="text-sm text-muted">No sync operations recorded.</p>}
        </section>
      </div>

      {health.staleDataWarnings.length > 0 && (
        <section className="border border-amber-500/20 bg-amber-500/[0.04] p-5 rounded-card">
          <p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-amber-400">Warnings</p>
          <div className="space-y-2 text-sm text-muted">
            {health.staleDataWarnings.map((warning, index) => <p key={index}>{warning}</p>)}
          </div>
        </section>
      )}
    </div>
  );
}
