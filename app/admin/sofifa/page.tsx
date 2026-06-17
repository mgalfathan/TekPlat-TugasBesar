'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

const LEAGUES = [
  { id: 13, name: 'Premier League', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { id: 53, name: 'La Liga',        flag: '🇪🇸' },
  { id: 19, name: 'Bundesliga',     flag: '🇩🇪' },
  { id: 31, name: 'Serie A',        flag: '🇮🇹' },
  { id: 16, name: 'Ligue 1',        flag: '🇫🇷' },
];

interface SyncLog {
  id: number; leagueName: string | null; status: string;
  teamsCount: number; playersCount: number;
  startedAt: string; finishedAt: string | null; errorMsg: string | null;
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
    const d = await fetch('/api/admin/sofifa/sync').then(r => r.json());
    setLogs(d.logs ?? []);
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  async function runSync() {
    setLoading(true);
    setMsg('Sync dimulai — berjalan di background. Refresh tabel setelah beberapa menit.');
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
    e.target.value = ''; // allow re-selecting the same file
    if (!file) return;
    setImporting(true); setImportMsg(''); setImportErr('');
    try {
      const text = await file.text();
      const res = await fetch('/api/admin/sofifa/import', {
        method: 'POST',
        headers: { 'Content-Type': 'text/csv' },
        body: text,
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? 'Import failed');
      setImportMsg(`✓ Import selesai: ${d.teamsImported} tim · ${d.playersImported} pemain (liga ${d.leagueIds.join(', ')}).`);
    } catch (err) {
      setImportErr(err instanceof Error ? err.message : String(err));
    } finally {
      setImporting(false);
    }
  }

  const statusColor = (s: string) =>
    s === 'done' ? 'text-[#00d4aa]' : s === 'error' ? 'text-red-400' : 'text-yellow-400';

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">SoFIFA Sync</h1>
          <p className="text-gray-500 text-sm mt-1">
            Coba ambil rating live dari SoFIFA; jika IP diblokir, otomatis pakai data bawaan top-5 liga.
          </p>
        </div>
        <Link href="/admin/sync" className="text-xs text-gray-500 hover:text-gray-300 transition">
          ← Admin Sync
        </Link>
      </div>

      <div className="bg-[#111827] border border-white/5 rounded-xl p-5 mb-6">
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-3 font-bold">Pilih liga</p>
        <div className="grid grid-cols-3 gap-2 mb-4">
          <button
            onClick={() => setSelectedLeague(null)}
            className={`px-3 py-2 rounded-lg text-sm font-semibold border transition
              ${selectedLeague === null
                ? 'bg-[#00d4aa]/20 border-[#00d4aa] text-[#00d4aa]'
                : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'}`}>
            🌍 Semua liga
          </button>
          {LEAGUES.map(l => (
            <button key={l.id}
              onClick={() => setSelectedLeague(l.id)}
              className={`px-3 py-2 rounded-lg text-sm font-semibold border transition
                ${selectedLeague === l.id
                  ? 'bg-[#00d4aa]/20 border-[#00d4aa] text-[#00d4aa]'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'}`}>
              {l.flag} {l.name}
            </button>
          ))}
        </div>

        <div className="bg-yellow-900/20 border border-yellow-500/20 rounded-lg p-3 mb-4">
          <p className="text-yellow-400 text-xs">
            ℹ SoFIFA membatasi 60 request/menit (429) & memblokir IP datacenter via Cloudflare (403).
            Sync mencoba API live dulu; bila gagal otomatis fallback ke rating bawaan. Catatan: di
            Cloudflare Workers kemungkinan besar selalu fallback karena IP-nya datacenter.
          </p>
        </div>

        <button onClick={runSync} disabled={loading}
          className="w-full py-2.5 bg-[#00d4aa] hover:bg-[#00b899] text-black
            font-bold rounded-lg transition disabled:opacity-50 text-sm">
          {loading ? 'Memulai sync…' : `▶ Sync ${selectedLeague
            ? LEAGUES.find(l => l.id === selectedLeague)?.name
            : 'semua liga'}`}
        </button>

        {msg && <p className="text-[#00d4aa] text-sm mt-3">{msg}</p>}
      </div>

      {/* CSV import — EA FC / FIFA dataset */}
      <div className="bg-[#111827] border border-white/5 rounded-xl p-5 mb-6">
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-2 font-bold">Import EA FC / FIFA CSV</p>
        <p className="text-gray-500 text-sm mb-3">
          Upload dataset pemain EA FC / FIFA (mis. <code className="text-gray-400">players_24.csv</code> dari Kaggle).
          Hanya top-5 liga (league_id 13/53/19/31/16) yang diimpor; rating tim diturunkan dari skuad.
          Import menggantikan data liga yang ada di file.
        </p>
        <label className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition cursor-pointer
          ${importing ? 'bg-white/10 text-gray-400 cursor-wait' : 'bg-[#00d4aa] hover:bg-[#00b899] text-black'}`}>
          {importing ? 'Mengimpor…' : '⬆ Pilih file CSV'}
          <input type="file" accept=".csv,text/csv" onChange={handleImport} disabled={importing} className="hidden" />
        </label>
        {importMsg && <p className="text-[#00d4aa] text-sm mt-3">{importMsg}</p>}
        {importErr && <p className="text-red-400 text-sm mt-3">{importErr}</p>}
      </div>

      <div className="bg-[#111827] border border-white/5 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-bold">Riwayat sync</p>
          <button onClick={fetchLogs} className="text-xs text-gray-500 hover:text-gray-300">
            ↻ Refresh
          </button>
        </div>
        {logs.length === 0
          ? <p className="text-gray-600 text-sm">Belum ada sync.</p>
          : (
            <div className="space-y-2">
              {logs.map(log => (
                <div key={log.id} className="flex items-center justify-between
                  bg-white/[0.03] border border-white/5 rounded-lg px-4 py-2.5 text-sm">
                  <div>
                    <span className="text-white font-medium">{log.leagueName ?? 'Unknown'}</span>
                    {log.errorMsg && (
                      <p className="text-red-400 text-xs mt-0.5">{log.errorMsg}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className={`font-semibold ${statusColor(log.status)}`}>
                      {log.status}
                    </span>
                    {log.status === 'done' && (
                      <p className="text-gray-500 text-xs">
                        {log.teamsCount} tim · {log.playersCount} pemain
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>
    </div>
  );
}
