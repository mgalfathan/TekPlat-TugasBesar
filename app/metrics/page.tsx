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
    <div className="gaffer-screen space-y-7">
      <header>
        <div className="flex items-center gap-2.5 font-mono text-xs font-bold tracking-[0.14em] text-lime uppercase mb-3.5">
          <span className="bg-lime text-lime-ink px-1.5 py-px rounded">04</span>
          <span>Custom Metrics</span>
        </div>
        <h1 className="font-display uppercase text-ink leading-[0.9] tracking-[0.5px] text-[clamp(40px,6.4vw,82px)] mb-4">
          Build your<br />own rating.
        </h1>
        <p className="text-muted text-base leading-relaxed max-w-[620px] text-pretty">
          Compose a formula from team or player variables, save it, and rank the league instantly.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <section className="bg-panel border border-border rounded-card p-[22px]">
          <h2 className="text-base font-extrabold text-ink mb-4">Metric Builder</h2>
          <MetricBuilder onSave={handleSave} />
        </section>

        <section>
          <h2 className="text-base font-extrabold text-ink mb-4 px-0.5">Saved Metrics · {metrics.length}</h2>
          {metrics.length === 0 && <p className="text-muted-2 text-sm px-0.5">No metrics saved yet.</p>}
          <div className="flex flex-col gap-3">
            {metrics.map(m => (
              <div key={m.id} className="bg-panel border border-border rounded-inset p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-ink font-extrabold text-[14.5px]">{m.name}</span>
                      <span className="font-mono text-[9px] tracking-[0.06em] uppercase bg-[rgba(200,242,58,0.14)] text-lime px-1.5 py-0.5 rounded-[5px]">{m.scope}</span>
                    </div>
                    <p className="text-lime font-mono text-xs truncate mt-2">{m.formula}</p>
                    {m.description && <p className="text-muted text-xs mt-1.5 leading-relaxed">{m.description}</p>}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => viewResults(m.id)}
                      className={`font-mono text-[10px] font-bold tracking-[0.06em] px-2.5 py-1.5 rounded-[7px] border transition ${
                        openId === m.id ? 'bg-lime text-lime-ink border-lime' : 'bg-white/[0.05] text-muted border-border hover:text-ink'
                      }`}>
                      {openId === m.id ? 'HIDE' : 'RESULTS'}
                    </button>
                    <button onClick={() => handleDelete(m.id)} className="font-mono text-[11px] px-2 py-1.5 rounded-[7px] text-muted-2 hover:text-loss hover:bg-loss/10 transition">✕</button>
                  </div>
                </div>

                {openId === m.id && (
                  <div className="mt-3.5 pt-3.5 border-t border-border">
                    {loadingResults && <p className="text-muted-2 font-mono text-[11px]">Computing…</p>}
                    {resultsError && <p className="text-loss text-xs">{resultsError}</p>}
                    {!loadingResults && !resultsError && results.length === 0 && (
                      <p className="text-muted-2 text-xs">No data. Sync match/standings data first (Admin → Sync), then try again.</p>
                    )}
                    {!loadingResults && results.length > 0 && (
                      <div className="flex flex-col">
                        {results.map((r, i) => (
                          <div key={(r.teamId ?? r.playerId ?? i)} className="grid grid-cols-[22px_1fr_auto_auto] items-center gap-2.5 py-1.5 border-b border-border last:border-0">
                            <span className="font-mono text-[11px] text-muted-2">{i + 1}</span>
                            <div className="flex items-center gap-2 min-w-0">
                              {r.logo && <img src={r.logo} alt="" className="w-[18px] h-[18px] object-contain" />}
                              <span className="text-[13px] font-semibold text-ink truncate">{r.teamName ?? r.playerName}</span>
                            </div>
                            {m.scope === 'team' ? <span className="font-mono text-[10px] text-muted-2">{r.matches_played ?? '-'} MP</span> : <span />}
                            <span className="font-display text-base text-lime">{r.score.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
