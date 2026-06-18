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

  const fieldLabel = 'font-mono text-[10px] tracking-[0.1em] text-muted-2 uppercase mb-2 block';
  const inputCls = 'w-full bg-panel-2 border border-border-2 text-ink rounded-[9px] px-3 py-2.5 text-sm outline-none focus:border-lime';

  return (
    <div className="space-y-4">
      {/* Scope */}
      <div className="flex gap-2">
        {(['team', 'player'] as const).map(s => (
          <button key={s} onClick={() => { setScope(s); setFormula(''); }}
            className={`px-4 py-2 rounded-chip text-sm font-bold transition capitalize ${scope === s ? 'bg-lime text-lime-ink' : 'bg-white/[0.04] text-muted hover:text-ink'}`}>
            {s}
          </button>
        ))}
      </div>

      {/* Templates */}
      <div>
        <span className={fieldLabel}>Templates</span>
        <div className="flex flex-wrap gap-1.5">
          {templates.map(t => (
            <button key={t.name} onClick={() => applyTemplate(t)}
              className="px-3 py-1.5 font-mono text-[11px] bg-white/[0.04] text-muted border border-border rounded-[7px] hover:text-lime hover:border-[rgba(200,242,58,0.35)] transition">
              {t.name}
            </button>
          ))}
        </div>
      </div>

      {/* Variables */}
      <div>
        <span className={fieldLabel}>Variables — tap to insert</span>
        <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto scrollbar-thin">
          {vars.map(v => (
            <button key={v.key} onClick={() => insertVar(v.key)}
              className="px-2.5 py-1.5 font-mono text-[11px] bg-white/[0.04] text-muted border border-border rounded-[7px] hover:text-lime hover:border-[rgba(200,242,58,0.35)] transition">
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Operators */}
      <div>
        <span className={fieldLabel}>Operators</span>
        <div className="flex gap-1.5">
          {OPERATORS.map(op => (
            <button key={op} onClick={() => insertOp(op)}
              className="w-[38px] h-[38px] bg-panel-2 border border-border rounded-chip text-ink font-mono text-sm font-bold hover:text-lime hover:border-lime transition">
              {op}
            </button>
          ))}
        </div>
      </div>

      {/* Formula */}
      <div>
        <span className={fieldLabel}>Formula</span>
        <div className="flex gap-2">
          <input value={formula} onChange={e => setFormula(e.target.value)} placeholder="e.g. (goals_for * 2) + win_rate"
            className="flex-1 bg-panel-2 border border-border-2 text-lime font-mono text-[13px] rounded-[9px] px-3 py-2.5 outline-none focus:border-lime" />
          <button onClick={() => setFormula('')} className="px-3 py-2.5 font-mono text-[11px] bg-white/[0.04] text-muted rounded-[9px] hover:text-ink transition">Clear</button>
        </div>
      </div>

      {/* Name + Description */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <span className={fieldLabel}>Name</span>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Attacking Threat" className={inputCls} />
        </div>
        <div>
          <span className={fieldLabel}>Description</span>
          <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional" className={inputCls} />
        </div>
      </div>

      {error && <p className="text-loss text-sm">{error}</p>}

      <button onClick={handleSave} disabled={saving || !name || !formula}
        className="w-full py-3.5 bg-lime text-lime-ink font-mono text-xs font-bold uppercase tracking-[0.06em] rounded-[9px] hover:brightness-110 transition disabled:opacity-50">
        {saving ? 'Saving…' : 'Save Metric'}
      </button>
    </div>
  );
}
