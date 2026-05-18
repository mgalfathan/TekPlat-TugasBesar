'use client';
import { useEffect, useState } from 'react';
import MetricBuilder from '@/components/MetricBuilder';

interface Metric { id: number; name: string; formula: string; scope: string; description?: string | null; createdAt: string }

export default function MetricsPage() {
  const [metrics, setMetrics] = useState<Metric[]>([]);

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
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Custom Metrics</h1>
        <p className="text-gray-500 text-sm mt-1">Build analytics formulas using team or player variables.</p>
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
                  <button onClick={() => handleDelete(m.id)} className="text-gray-600 hover:text-red-400 transition text-xs shrink-0">✕</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
