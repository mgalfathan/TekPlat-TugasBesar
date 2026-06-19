'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

const LEAGUES = [
  { id: 13, name: 'Premier League', code: 'ENG' },
  { id: 53, name: 'La Liga', code: 'ESP' },
  { id: 19, name: 'Bundesliga', code: 'GER' },
  { id: 31, name: 'Serie A', code: 'ITA' },
  { id: 16, name: 'Ligue 1', code: 'FRA' },
];

interface SyncLog {
  id: number;
  leagueName: string | null;
  status: string;
  teamsCount: number;
  playersCount: number;
  startedAt: string;
  finishedAt: string | null;
  errorMsg: string | null;
}

export default function SofifaSyncPage() {
  const [selectedLeague, setSelectedLeague] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState('');
  const [importErr, setImportErr] = useState('');

  const fetchLogs = useCallback(async () => {
    const data = await fetch('/api/admin/sofifa/sync').then(r => r.json());
    setLogs(data.logs ?? []);
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  async function runSync() {
    setLoading(true);
    setMsg('Sync started in the background. Refresh the log after a few minutes.');
    await fetch('/api/admin/sofifa/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leagueId: selectedLeague }),
    });
    setLoading(false);
    setTimeout(fetchLogs, 3000);
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImporting(true);
    setImportMsg('');
    setImportErr('');
    try {
      const text = await file.text();
      const res = await fetch('/api/admin/sofifa/import', {
        method: 'POST',
        headers: { 'Content-Type': 'text/csv' },
        body: text,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Import failed');
      setImportMsg(`Import complete: ${data.teamsImported} teams and ${data.playersImported} players.`);
    } catch (error) {
      setImportErr(error instanceof Error ? error.message : String(error));
    } finally {
      setImporting(false);
    }
  }

  function statusColor(status: string) {
    if (status === 'done') return 'text-win';
    if (status === 'error') return 'text-loss';
    return 'text-amber-400';
  }

  return (
    <div className="gaffer-screen mx-auto max-w-3xl space-y-6">
      <header className="flex flex-col justify-between gap-5 border-b border-border pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-lime">Player ratings</p>
          <h1 className="mt-3 font-display text-[clamp(42px,6vw,72px)] uppercase leading-[0.9] tracking-[0.5px] text-ink">
            SoFIFA sync.
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
            Fetch live ratings when available, with bundled top-five league data as a fallback.
          </p>
        </div>
        <Link
          href="/admin/sync"
          className="w-fit rounded-chip border border-border-2 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.06em] text-muted hover:border-lime hover:text-lime"
        >
          Back to sync
        </Link>
      </header>

      <section className="border border-border bg-panel p-5 rounded-card">
        <p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-muted">League scope</p>
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <button
            onClick={() => setSelectedLeague(null)}
            className={`rounded-chip border px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.04em] transition ${
              selectedLeague === null
                ? 'border-lime bg-lime/10 text-lime'
                : 'border-border-2 bg-bg text-muted hover:border-lime hover:text-lime'
            }`}
          >
            All leagues
          </button>
          {LEAGUES.map(league => (
            <button
              key={league.id}
              onClick={() => setSelectedLeague(league.id)}
              className={`rounded-chip border px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.04em] transition ${
                selectedLeague === league.id
                  ? 'border-lime bg-lime/10 text-lime'
                  : 'border-border-2 bg-bg text-muted hover:border-lime hover:text-lime'
              }`}
            >
              {league.code} / {league.name}
            </button>
          ))}
        </div>

        <div className="mb-4 rounded-chip border border-amber-500/20 bg-amber-500/[0.04] p-3">
          <p className="text-xs leading-relaxed text-amber-400">
            SoFIFA may rate-limit requests or block datacenter IPs. The sync automatically falls back to bundled ratings.
          </p>
        </div>

        <button
          onClick={runSync}
          disabled={loading}
          className="h-11 w-full rounded-chip bg-lime font-mono text-xs font-bold uppercase tracking-[0.06em] text-lime-ink hover:brightness-110 disabled:opacity-50"
        >
          {loading ? 'Starting sync...' : `Sync ${selectedLeague ? LEAGUES.find(l => l.id === selectedLeague)?.name : 'all leagues'}`}
        </button>
        {msg && <p className="mt-3 text-sm text-win">{msg}</p>}
      </section>

      <section className="border border-border bg-panel p-5 rounded-card">
        <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-muted">EA FC / FIFA CSV import</p>
        <p className="mb-4 text-sm leading-relaxed text-muted">
          Upload a player dataset such as <code className="font-mono text-ink">players_24.csv</code>.
          Only the supported top-five leagues are imported, replacing their existing rating data.
        </p>
        <label className={`inline-flex h-11 cursor-pointer items-center rounded-chip px-4 font-mono text-xs font-bold uppercase tracking-[0.06em] ${
          importing ? 'cursor-wait bg-white/[0.05] text-muted' : 'bg-lime text-lime-ink hover:brightness-110'
        }`}>
          {importing ? 'Importing...' : 'Select CSV file'}
          <input type="file" accept=".csv,text/csv" onChange={handleImport} disabled={importing} className="hidden" />
        </label>
        {importMsg && <p className="mt-3 text-sm text-win">{importMsg}</p>}
        {importErr && <p className="mt-3 text-sm text-loss">{importErr}</p>}
      </section>

      <section className="border border-border bg-panel p-5 rounded-card">
        <div className="mb-4 flex items-center justify-between">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-muted">Sync history</p>
          <button onClick={fetchLogs} className="font-mono text-[10px] font-bold uppercase tracking-[0.06em] text-muted hover:text-lime">
            Refresh
          </button>
        </div>
        {logs.length === 0 ? (
          <p className="text-sm text-muted">No sync operations recorded.</p>
        ) : (
          <div className="space-y-2">
            {logs.map(log => (
              <div key={log.id} className="flex items-center justify-between gap-4 rounded-chip border border-border bg-bg px-4 py-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">{log.leagueName ?? 'Unknown league'}</p>
                  {log.errorMsg && <p className="mt-1 text-xs text-loss">{log.errorMsg}</p>}
                </div>
                <div className="shrink-0 text-right">
                  <span className={`font-mono text-[10px] font-bold uppercase ${statusColor(log.status)}`}>{log.status}</span>
                  {log.status === 'done' && <p className="mt-1 text-[10px] text-muted">{log.teamsCount} teams / {log.playersCount} players</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
