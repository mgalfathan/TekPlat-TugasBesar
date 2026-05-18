'use client';
import { useState } from 'react';
import { TEAM_VARIABLES, PLAYER_VARIABLES, METRIC_TEMPLATES } from '@/lib/metrics/metricVariables';

interface Props { onSave: (name: string, formula: string, scope: string, description: string) => Promise<void> }

const OPERATORS = ['+', '-', '*', '/', '(', ')'];

export default function MetricBuilder({ onSave }: Props) {
  const [scope, setScope] = useState<'team' | 'player'>('team');
  const [name, setName] = useState('');
  const [formula, setFormula] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const vars = scope === 'team' ? TEAM_VARIABLES : PLAYER_VARIABLES;
  const templates = METRIC_TEMPLATES[scope];

  function insertVar(key: string) { setFormula(f => f + (f && !f.endsWith('(') ? ' ' : '') + key); }
  function insertOp(op: string) { setFormula(f => f + ' ' + op + ' '); }
  function applyTemplate(tpl: { name: string; formula: string }) { setName(tpl.name); setFormula(tpl.formula); }

  async function handleSave() {
    if (!name || !formula) { setError('Name and formula required'); return; }
    setSaving(true); setError('');
    try { await onSave(name, formula, scope, description); setName(''); setFormula(''); setDescription(''); }
    catch (e) { setError(String(e)); }
    finally { setSaving(false); }
  }

  return (
    <div className="space-y-5">
      {/* Scope */}
      <div className="flex gap-2">
        {(['team', 'player'] as const).map(s => (
          <button key={s} onClick={() => { setScope(s); setFormula(''); }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition capitalize ${scope === s ? 'bg-[#00d4aa] text-black' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
            {s}
          </button>
        ))}
      </div>

      {/* Templates */}
      <div>
        <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Templates</p>
        <div className="flex flex-wrap gap-2">
          {templates.map(t => (
            <button key={t.name} onClick={() => applyTemplate(t)}
              className="px-3 py-1 text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full hover:bg-blue-500/20 transition">
              {t.name}
            </button>
          ))}
        </div>
      </div>

      {/* Operators */}
      <div>
        <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Operators</p>
        <div className="flex gap-2">
          {OPERATORS.map(op => (
            <button key={op} onClick={() => insertOp(op)}
              className="w-9 h-9 bg-white/5 hover:bg-white/10 text-white rounded-lg text-sm font-mono transition">
              {op}
            </button>
          ))}
        </div>
      </div>

      {/* Variables */}
      <div>
        <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Variables — click to insert</p>
        <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
          {vars.map(v => (
            <button key={v.key} onClick={() => insertVar(v.key)}
              className="px-3 py-1 text-xs bg-[#00d4aa]/10 text-[#00d4aa] border border-[#00d4aa]/20 rounded-full hover:bg-[#00d4aa]/20 transition">
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Formula preview */}
      <div>
        <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Formula</p>
        <div className="flex gap-2">
          <input value={formula} onChange={e => setFormula(e.target.value)} placeholder="e.g. (goals_for * 2) + win_rate"
            className="flex-1 bg-[#1a2535] border border-white/10 text-white font-mono text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#00d4aa]" />
          <button onClick={() => setFormula('')} className="px-3 py-2 text-xs bg-white/5 text-gray-400 rounded-lg hover:bg-white/10">Clear</button>
        </div>
      </div>

      {/* Name + Description */}
      <div className="grid grid-cols-2 gap-3">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Metric name"
          className="bg-[#1a2535] border border-white/10 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#00d4aa]" />
        <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Description (optional)"
          className="bg-[#1a2535] border border-white/10 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#00d4aa]" />
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button onClick={handleSave} disabled={saving || !name || !formula}
        className="px-6 py-2 bg-[#00d4aa] hover:bg-[#00b899] text-black font-semibold rounded-lg transition disabled:opacity-50 text-sm">
        {saving ? 'Saving…' : 'Save Metric'}
      </button>
    </div>
  );
}
