'use client';
import { useState } from 'react';
import Link from 'next/link';

const SYNC_TYPES = ['all', 'leagues', 'teams', 'fixtures', 'standings', 'players'];
const PROVIDERS = ['api-football', 'football-data'];

export default function AdminSyncPage() {
  const [provider, setProvider] = useState('api-football');
  const [syncType, setSyncType] = useState('all');
  const [country, setCountry] = useState('');
  const [leagueId, setLeagueId] = useState('');
  const [season, setSeason] = useState('2024');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  const [error, setError] = useState('');

  async function runSync() {
    setLoading(true); setError(''); setResult('');
    try {
      const res = await fetch('/api/admin/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, syncType, country: country || undefined, leagueId: leagueId || undefined, season }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(JSON.stringify(data.result, null, 2));
    } catch (e) { setError(String(e)); }
    finally { setLoading(false); }
  }

  async function syncTop5() {
    setLoading(true); setError(''); setResult('');
    try {
      const res = await fetch('/api/admin/sync/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, preset: 'top5', season }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(JSON.stringify(data, null, 2));
    } catch (e) { setError(String(e)); }
    finally { setLoading(false); }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Admin — Data Sync</h1>
          <p className="text-gray-500 text-sm">Sync football data from external providers into the database.</p>
        </div>
        <Link href="/admin/data-health" className="px-3 py-1.5 text-xs bg-white/5 text-gray-400 rounded-lg hover:bg-white/10 transition">Data Health →</Link>
      </div>

      <div className="mb-4 bg-gradient-to-br from-[#00d4aa]/10 to-[#0ea5e9]/10 border border-[#00d4aa]/20 rounded-xl p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-white font-semibold text-sm">⚡ Quick Sync — Top 5 European Leagues</p>
            <p className="text-gray-400 text-xs mt-1">Premier League, La Liga, Serie A, Bundesliga, Ligue 1 — season {season}. One click, ~20 API requests.</p>
            <p className="text-amber-400/80 text-xs mt-1">⏱ Takes ~2 minutes — paced to stay under the 10 req/min free-tier limit. Leave the tab open.</p>
          </div>
          <button onClick={syncTop5} disabled={loading} className="shrink-0 px-5 py-2.5 bg-[#00d4aa] hover:bg-[#00b899] text-black font-semibold rounded-lg transition disabled:opacity-50 text-sm">
            {loading ? 'Syncing…' : 'Sync Top 5'}
          </button>
        </div>
      </div>

      <div className="bg-[#111827] border border-white/5 rounded-xl p-6 space-y-4">
        <p className="text-xs text-gray-500 uppercase tracking-wide">Manual Sync — Single League</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wide mb-1.5 block">Provider</label>
            <select value={provider} onChange={e => setProvider(e.target.value)} className="w-full bg-[#1a2535] border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#00d4aa]">
              {PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wide mb-1.5 block">Sync Type</label>
            <select value={syncType} onChange={e => setSyncType(e.target.value)} className="w-full bg-[#1a2535] border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#00d4aa]">
              {SYNC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wide mb-1.5 block">Country (optional)</label>
            <input value={country} onChange={e => setCountry(e.target.value)} placeholder="e.g. England"
              className="w-full bg-[#1a2535] border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#00d4aa]" />
          </div>
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wide mb-1.5 block">League ID</label>
            <input value={leagueId} onChange={e => setLeagueId(e.target.value)} placeholder="e.g. 39"
              className="w-full bg-[#1a2535] border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#00d4aa]" />
          </div>
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wide mb-1.5 block">Season</label>
            <input value={season} onChange={e => setSeason(e.target.value)} placeholder="2024"
              className="w-full bg-[#1a2535] border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#00d4aa]" />
          </div>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="flex gap-3">
          <button onClick={runSync} disabled={loading} className="flex-1 py-2.5 bg-[#00d4aa] hover:bg-[#00b899] text-black font-semibold rounded-lg transition disabled:opacity-50 text-sm">
            {loading ? 'Syncing…' : `Sync ${syncType}`}
          </button>
        </div>
      </div>

      {result && (
        <div className="mt-4 bg-[#111827] border border-white/5 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Result</p>
          <pre className="text-xs text-gray-300 overflow-auto">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}

      <div className="mt-6 bg-[#111827] border border-white/5 rounded-xl p-4">
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Common Sync Commands</p>
        <div className="space-y-1.5 text-xs text-gray-400">
          <p>• Premier League (API-Football): Provider=api-football, Type=all, League ID=39, Season=2024</p>
          <p>• Supported seasons: 2022, 2023, 2024 only (free tier limit)</p>
          <p>• La Liga: League ID=140 | Serie A: 135 | Bundesliga: 78 | Ligue 1: 61</p>
          <p>• Sync leagues first, then teams, then fixtures+standings</p>
          <p>• API key must be set in .env for live provider syncs</p>
        </div>
      </div>

      <div className="mt-4 bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
        <p className="text-amber-400 font-semibold text-xs mb-2">🚨 If you hit a 429 (rate limit) error:</p>
        <div className="space-y-1 text-xs text-gray-400">
          <p>• Free tier caps at <span className="text-amber-400 font-semibold">10 requests/minute</span> and <span className="text-amber-400 font-semibold">100/day</span>.</p>
          <p>• The app now paces requests automatically — but if you hit it, wait 60 seconds and re-run the sync.</p>
          <p>• Failed leagues only need their missing pieces re-synced (e.g. just <code>fixtures</code> + <code>standings</code>) — others stay intact.</p>
        </div>
      </div>
    </div>
  );
}
