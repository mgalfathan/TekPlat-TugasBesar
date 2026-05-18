'use client';
import { useEffect, useState } from 'react';
import MetricBuilder from '@/components/MetricBuilder';

interface Metric { id: number; name: string; formula: string; scope: string; description?: string | null; createdAt: string }
interface MetricResultRow { teamId?: number; teamName?: string; playerId?: number; playerName?: string; logo?: string | null; score: number; matches_played?: number }

export default function MetricsPage() {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [openId, setOpenId] = useState<number | null>(null);
  const [results, setResults] = useState<MetricResultRow[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);
  const [resultsError, setResultsError] = useState('');

  async function load() {
    const data = await fetch('/api/custom-metrics').then(r => r.json());
    setMetrics(Array.isArray(data) ? data : []);
  }
  useEffect(() => { load(); }, []);

  async function handleSave(name: string, formula: string, scope: string, description: string) {
    const res = await fetch('/api/custom-metrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, formula, scope, description }),
    });
    if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
    await load();
  }

  async function handleDelete(id: number) {
    await fetch('/api/custom-metrics', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    setMetrics(m => m.filter(x => x.id !== id));
    if (openId === id) { setOpenId(null); setResults([]); }
  }

  async function viewResults(id: number) {
    if (openId === id) { setOpenId(null); setResults([]); return; }
    setOpenId(id); setResults([]); setResultsError(''); setLoadingResults(true);
    try {
      const res = await fetch(`/api/custom-metrics/${id}/results`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed');
      setResults(Array.isArray(data.results) ? data.results : []);
    } catch (e) { setResultsError(String(e)); }
    finally { setLoadingResults(false); }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Custom Metrics</h1>
        <p className="text-gray-500 text-sm mt-1">Build analytics formulas using team or player variables. Click <span className="text-[#00d4aa]">View Results</span> on a metric to see the leaderboard.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#111827] border border-white/5 rounded-xl p-6">
          <h2 className="text-white font-semibold mb-4">Metric Builder</h2>
          <MetricBuilder onSave={handleSave} />
        </div>

        <div>
          <h2 className="text-white font-semibold mb-4">Saved Metrics ({metrics.length})</h2>
          {metrics.length === 0 && <p className="text-gray-500 text-sm">No metrics saved yet.</p>}
          <div className="space-y-3">
            {metrics.map(m => (
              <div key={m.id} className="bg-[#111827] border border-white/5 rounded-xl p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white font-medium">{m.name}</span>
                      <span className="px-1.5 py-0.5 rounded text-xs bg-[#00d4aa]/10 text-[#00d4aa] capitalize">{m.scope}</span>
                    </div>
                    <p className="text-[#00d4aa] font-mono text-xs truncate">{m.formula}</p>
                    {m.description && <p className="text-gray-500 text-xs mt-1">{m.description}</p>}
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <button onClick={() => viewResults(m.id)} className="text-xs px-2 py-1 rounded bg-[#00d4aa]/10 text-[#00d4aa] hover:bg-[#00d4aa]/20 transition">
                      {openId === m.id ? 'Hide' : 'View Results'}
                    </button>
                    <button onClick={() => handleDelete(m.id)} className="text-xs px-2 py-1 rounded text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition">✕</button>
                  </div>
                </div>

                {openId === m.id && (
                  <div className="mt-3 pt-3 border-t border-white/5">
                    {loadingResults && <p className="text-gray-500 text-xs">Computing…</p>}
                    {resultsError && <p className="text-red-400 text-xs">{resultsError}</p>}
                    {!loadingResults && !resultsError && results.length === 0 && (
                      <p className="text-gray-500 text-xs">No data. Sync match/standings data first (Admin → Sync), then try again.</p>
                    )}
                    {!loadingResults && results.length > 0 && (
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-gray-500 border-b border-white/5">
                            <th className="text-left py-1.5 w-8">#</th>
                            <th className="text-left py-1.5">{m.scope === 'team' ? 'Team' : 'Player'}</th>
                            {m.scope === 'team' && <th className="text-center py-1.5">MP</th>}
                            <th className="text-right py-1.5 text-[#00d4aa]">Score</th>
                          </tr>
                        </thead>
                        <tbody>
                          {results.map((r, i) => (
                            <tr key={(r.teamId ?? r.playerId ?? i)} className="border-b border-white/5 last:border-0">
                              <td className="py-1.5 text-gray-500">{i + 1}</td>
                              <td className="py-1.5">
                                <div className="flex items-center gap-2">
                                  {r.logo && <img src={r.logo} alt="" className="w-4 h-4 object-contain" />}
                                  <span className="text-white">{r.teamName ?? r.playerName}</span>
                                </div>
                              </td>
                              {m.scope === 'team' && <td className="py-1.5 text-center text-gray-400">{r.matches_played ?? '-'}</td>}
                              <td className="py-1.5 text-right text-[#00d4aa] font-mono">{r.score.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
