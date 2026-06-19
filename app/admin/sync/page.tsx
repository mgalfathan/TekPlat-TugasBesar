'use client';

import { useState } from 'react';
import Link from 'next/link';

const SYNC_TYPES = ['all', 'leagues', 'teams', 'fixtures', 'standings', 'players'];
const PROVIDERS = ['api-football', 'football-data'];

const fieldClass =
  'h-11 w-full rounded-chip border border-border-2 bg-bg px-3 text-sm text-ink outline-none transition-colors placeholder:text-muted-2 hover:border-white/20 focus:border-lime focus:ring-1 focus:ring-lime/20';
const labelClass =
  'mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-muted';

export default function AdminSyncPage() {
  const [provider, setProvider] = useState('api-football');
  const [syncType, setSyncType] = useState('all');
  const [country, setCountry] = useState('');
  const [leagueId, setLeagueId] = useState('');
  const [season, setSeason] = useState('2024');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  async function runSync() {
    setLoading(true);
    setError('');
    setResult('');
    try {
      const res = await fetch('/api/admin/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          syncType,
          country: country || undefined,
          leagueId: leagueId || undefined,
          season,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(JSON.stringify(data.result, null, 2));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function syncTop5() {
    setLoading(true);
    setError('');
    setResult('');
    try {
      const res = await fetch('/api/admin/sync/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, preset: 'top5', season }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(JSON.stringify(data, null, 2));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="gaffer-screen space-y-6">
      <header className="flex flex-col justify-between gap-5 border-b border-border pb-6 sm:flex-row sm:items-end">
        <div>
          <div className="mb-3 flex items-center gap-2.5 font-mono text-xs font-bold uppercase tracking-[0.14em] text-lime">
            <span className="rounded bg-lime px-1.5 py-px text-lime-ink">A1</span>
            Data operations
          </div>
          <h1 className="font-display text-[clamp(42px,6vw,72px)] uppercase leading-[0.9] tracking-[0.5px] text-ink">
            Data sync.
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
            Import football data from configured providers and monitor each operation from one workspace.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/sofifa"
            className="rounded-chip border border-border-2 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.06em] text-muted transition-colors hover:border-lime hover:text-lime"
          >
            SoFIFA
          </Link>
          <Link
            href="/admin/data-health"
            className="rounded-chip border border-border-2 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.06em] text-muted transition-colors hover:border-lime hover:text-lime"
          >
            Data health
          </Link>
        </div>
      </header>

      <section className="grid gap-4 border border-lime/20 bg-lime/[0.05] p-5 rounded-card sm:grid-cols-[1fr_auto] sm:items-center">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-lime">
            Quick operation
          </p>
          <h2 className="mt-2 text-lg font-extrabold text-ink">Sync the top five European leagues</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            Premier League, La Liga, Serie A, Bundesliga, and Ligue 1 for season {season}.
            The provider is paced to respect free-tier limits.
          </p>
        </div>
        <button
          onClick={syncTop5}
          disabled={loading}
          className="h-11 rounded-chip bg-lime px-5 font-mono text-xs font-bold uppercase tracking-[0.06em] text-lime-ink transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Syncing...' : 'Sync top 5'}
        </button>
      </section>

      <section className="border border-border bg-panel p-5 rounded-card sm:p-6">
        <div className="mb-5 flex items-center justify-between border-b border-border pb-4">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
              Manual operation
            </p>
            <h2 className="mt-1 text-base font-extrabold text-ink">Single league sync</h2>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-2">
            {provider}
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="provider" className={labelClass}>Provider</label>
            <select id="provider" value={provider} onChange={e => setProvider(e.target.value)} className={fieldClass}>
              {PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="sync-type" className={labelClass}>Sync type</label>
            <select id="sync-type" value={syncType} onChange={e => setSyncType(e.target.value)} className={fieldClass}>
              {SYNC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="country" className={labelClass}>Country (optional)</label>
            <input id="country" value={country} onChange={e => setCountry(e.target.value)} placeholder="England" className={fieldClass} />
          </div>
          <div>
            <label htmlFor="league-id" className={labelClass}>League ID</label>
            <input id="league-id" value={leagueId} onChange={e => setLeagueId(e.target.value)} placeholder="39" className={fieldClass} />
          </div>
          <div>
            <label htmlFor="season" className={labelClass}>Season</label>
            <input id="season" value={season} onChange={e => setSeason(e.target.value)} placeholder="2024" className={fieldClass} />
          </div>
        </div>

        {error && (
          <div role="alert" className="mt-4 rounded-chip border border-loss/25 bg-loss/[0.06] px-4 py-3 text-sm text-loss">
            {error}
          </div>
        )}

        <button
          onClick={runSync}
          disabled={loading}
          className="mt-5 h-11 w-full rounded-chip bg-lime px-5 font-mono text-xs font-bold uppercase tracking-[0.06em] text-lime-ink transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Syncing...' : `Sync ${syncType}`}
        </button>
      </section>

      {result && (
        <section className="border border-border bg-panel p-5 rounded-card">
          <p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
            Operation result
          </p>
          <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-chip bg-bg p-4 font-mono text-[11px] leading-relaxed text-ink">
            {result}
          </pre>
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="border border-border bg-panel p-5 rounded-card">
          <p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
            League reference
          </p>
          <div className="space-y-3 text-sm text-muted">
            <p><span className="font-mono text-lime">39</span> Premier League</p>
            <p><span className="font-mono text-lime">140</span> La Liga</p>
            <p><span className="font-mono text-lime">135</span> Serie A</p>
            <p><span className="font-mono text-lime">78</span> Bundesliga</p>
            <p><span className="font-mono text-lime">61</span> Ligue 1</p>
          </div>
        </section>

        <section className="border border-amber-500/20 bg-amber-500/[0.04] p-5 rounded-card">
          <p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-amber-400">
            Rate limit notes
          </p>
          <div className="space-y-2 text-sm leading-relaxed text-muted">
            <p>Free API-Football accounts allow 10 requests per minute and 100 per day.</p>
            <p>If a 429 response occurs, wait 60 seconds and sync only the missing data type.</p>
            <p>Live provider syncs require the relevant API key in <code className="font-mono text-ink">.env</code>.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
