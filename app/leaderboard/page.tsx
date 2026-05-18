'use client';

import { useEffect, useState, useCallback } from 'react';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';
import LeagueSeasonSelector from '@/components/LeagueSeasonSelector';

interface League { id: number; externalId?: string; name: string; country?: { name: string } | null }
interface TeamStat {
  teamId: number; teamName: string; code: string | null; logo: string | null; country: string | null;
  played: number; wins: number; draws: number; losses: number; winRate: number;
  goalsFor: number; goalsAgainst: number; goalDifference: number;
  goalsPerMatch: number; concededPerMatch: number;
  cleanSheets: number; failedToScore: number;
  homeWins: number; awayWins: number; points: number;
  form: Array<'W' | 'D' | 'L'>;
  customScore?: number;
}
interface CustomMetric { id: number; name: string; scope: string; formula: string }
interface CustomMetricResult { teamId: number; score: number }

type SortKey = 'points' | 'goalsFor' | 'goalsAgainst' | 'goalDifference' | 'winRate' | 'cleanSheets' | 'goalsPerMatch' | 'customScore';

const SORTS: Array<{ key: SortKey; label: string }> = [
  { key: 'points', label: 'Points' },
  { key: 'goalsFor', label: 'Goals For' },
  { key: 'goalsAgainst', label: 'Goals Against' },
  { key: 'goalDifference', label: 'Goal Diff' },
  { key: 'winRate', label: 'Win Rate' },
  { key: 'goalsPerMatch', label: 'Goals/Match' },
  { key: 'cleanSheets', label: 'Clean Sheets' },
];

function FormDots({ form }: { form: Array<'W' | 'D' | 'L'> }) {
  if (!form.length) return <span className="text-slate-600 text-xs">—</span>;
  return (
    <div className="flex gap-1">
      {form.map((r, i) => (
        <span key={i} className={`w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold ${
          r === 'W' ? 'bg-emerald-500/20 text-emerald-400' :
          r === 'D' ? 'bg-slate-500/20 text-slate-400' :
          'bg-red-500/20 text-red-400'
        }`}>{r}</span>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const [teams, setTeams] = useState<TeamStat[]>([]);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [leagueId, setLeagueId] = useState('');
  const [season, setSeason] = useState('2024');
  const [sortBy, setSortBy] = useState<SortKey>('points');
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<CustomMetric[]>([]);
  const [metricId, setMetricId] = useState('');
  const [metricLoading, setMetricLoading] = useState(false);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (leagueId) qs.set('leagueId', leagueId);
      if (season) qs.set('season', season);
      const data = await fetch(`/api/analytics/teams?${qs}`).then(r => r.json());
      setTeams(Array.isArray(data.teams) ? data.teams : []);
      setLeagues(Array.isArray(data.leagues) ? data.leagues : []);
    } catch { /* keep stale */ }
    finally { setLoading(false); }
  }, [leagueId, season]);

  useEffect(() => { loadAnalytics(); }, [loadAnalytics]);

  useEffect(() => {
    fetch('/api/custom-metrics')
      .then(r => r.json())
      .then((d: CustomMetric[]) => setMetrics(Array.isArray(d) ? d.filter(m => m.scope === 'team') : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!metricId) {
      setTeams(prev => prev.map(t => ({ ...t, customScore: undefined })));
      return;
    }
    setMetricLoading(true);
    const qs = new URLSearchParams();
    if (leagueId) qs.set('leagueId', leagueId);
    if (season) qs.set('season', season);
    fetch(`/api/custom-metrics/${metricId}/results?${qs}`)
      .then(r => r.json())
      .then((d: { results?: CustomMetricResult[] }) => {
        const scoreMap = new Map((d.results ?? []).map(r => [r.teamId, r.score]));
        setTeams(prev => prev.map(t => ({ ...t, customScore: scoreMap.get(t.teamId) })));
      })
      .catch(() => {})
      .finally(() => setMetricLoading(false));
  }, [metricId, leagueId, season, teams.length]);

  const selectedMetric = metrics.find(m => String(m.id) === metricId);

  const sorted = [...teams].sort((a, b) => {
    const av = sortBy === 'customScore' ? (a.customScore ?? -Infinity) : (a[sortBy] as number);
    const bv = sortBy === 'customScore' ? (b.customScore ?? -Infinity) : (b[sortBy] as number);
    const diff = bv - av;
    return diff !== 0 ? diff : b.goalDifference - a.goalDifference;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white mb-1">Team Analytics</h1>
          <p className="text-slate-400">General statistics per team — filter, sort, and overlay your custom metrics</p>
        </div>
        <LeagueSeasonSelector leagues={leagues} selectedLeagueId={leagueId} selectedSeason={season} onLeagueChange={setLeagueId} onSeasonChange={setSeason} />
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <span className="text-slate-500 text-xs uppercase tracking-wide">Custom Metric:</span>
          <select
            value={metricId}
            onChange={e => setMetricId(e.target.value)}
            className="bg-[#1a2535] border border-white/10 text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-[#00d4aa]"
          >
            <option value="">None</option>
            {metrics.map(m => <option key={m.id} value={String(m.id)}>{m.name}</option>)}
          </select>
          {metricLoading && <span className="text-slate-500 text-xs">computing…</span>}
        </div>
        <div className="flex flex-wrap gap-2 items-center text-xs">
          <span className="text-slate-500 uppercase tracking-wide mr-1">Sort by:</span>
          {SORTS.map(s => (
            <button key={s.key} onClick={() => setSortBy(s.key)}
              className={`px-3 py-1 rounded-full border transition ${
                sortBy === s.key
                  ? 'bg-[#00d4aa] text-black border-[#00d4aa]'
                  : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'
              }`}>
              {s.label}
            </button>
          ))}
          {selectedMetric && (
            <button onClick={() => setSortBy('customScore')}
              className={`px-3 py-1 rounded-full border transition ${
                sortBy === 'customScore'
                  ? 'bg-amber-500 text-black border-amber-500'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
              }`}>
              ★ {selectedMetric.name}
            </button>
          )}
        </div>
      </div>

      {loading ? <LoadingSpinner message="Loading team analytics..." /> :
       sorted.length === 0 ? <EmptyState title="No analytics yet" description="Sync data in Admin → Sync to populate team statistics." /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sorted.map((t, i) => (
            <div key={t.teamId} className="bg-[#111827] border border-gray-800 rounded-xl p-5 hover:border-gray-600 transition">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-2xl font-black text-slate-600 w-6 shrink-0">{i + 1}</span>
                  {t.logo ? (
                    <img src={t.logo} alt="" className="w-9 h-9 object-contain shrink-0" />
                  ) : (
                    <div className="w-9 h-9 bg-gray-700 rounded-full flex items-center justify-center text-xs font-bold text-slate-300 shrink-0">{t.code ?? '?'}</div>
                  )}
                  <div className="min-w-0">
                    <p className="text-white font-bold text-sm truncate">{t.teamName}</p>
                    <p className="text-slate-500 text-xs truncate">{t.country ?? '—'}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-2xl font-black text-[#00d4aa]">{t.points}</div>
                  <div className="text-slate-500 text-[10px] uppercase tracking-wide">Points</div>
                </div>
              </div>

              {selectedMetric && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 mb-4 flex items-center justify-between">
                  <div>
                    <div className="text-amber-400/70 text-[10px] uppercase tracking-wide">★ {selectedMetric.name}</div>
                    <div className="text-amber-400 font-mono font-bold text-lg">
                      {t.customScore != null ? t.customScore.toFixed(2) : '—'}
                    </div>
                  </div>
                  <div className="text-amber-400/40 text-[10px] font-mono max-w-[60%] text-right truncate" title={selectedMetric.formula}>
                    {selectedMetric.formula}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-4 gap-2 mb-4 text-center">
                <div>
                  <div className="text-slate-200 font-bold text-sm">{t.played}</div>
                  <div className="text-slate-500 text-[10px] uppercase">MP</div>
                </div>
                <div>
                  <div className="text-emerald-400 font-bold text-sm">{t.wins}</div>
                  <div className="text-slate-500 text-[10px] uppercase">W</div>
                </div>
                <div>
                  <div className="text-slate-300 font-bold text-sm">{t.draws}</div>
                  <div className="text-slate-500 text-[10px] uppercase">D</div>
                </div>
                <div>
                  <div className="text-red-400 font-bold text-sm">{t.losses}</div>
                  <div className="text-slate-500 text-[10px] uppercase">L</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                <div className="bg-white/5 rounded-lg px-2.5 py-1.5">
                  <div className="text-slate-500 text-[10px] uppercase">Win Rate</div>
                  <div className="text-slate-100 font-semibold">{t.winRate}%</div>
                </div>
                <div className="bg-white/5 rounded-lg px-2.5 py-1.5">
                  <div className="text-slate-500 text-[10px] uppercase">Goal Diff</div>
                  <div className={`font-semibold ${t.goalDifference > 0 ? 'text-emerald-400' : t.goalDifference < 0 ? 'text-red-400' : 'text-slate-300'}`}>
                    {t.goalDifference > 0 ? '+' : ''}{t.goalDifference}
                  </div>
                </div>
                <div className="bg-white/5 rounded-lg px-2.5 py-1.5">
                  <div className="text-slate-500 text-[10px] uppercase">Goals (For / Against)</div>
                  <div className="text-slate-100 font-semibold">{t.goalsFor} / {t.goalsAgainst}</div>
                </div>
                <div className="bg-white/5 rounded-lg px-2.5 py-1.5">
                  <div className="text-slate-500 text-[10px] uppercase">Avg per Match</div>
                  <div className="text-slate-100 font-semibold">{t.goalsPerMatch} / {t.concededPerMatch}</div>
                </div>
                <div className="bg-white/5 rounded-lg px-2.5 py-1.5">
                  <div className="text-slate-500 text-[10px] uppercase">Clean Sheets</div>
                  <div className="text-emerald-400 font-semibold">{t.cleanSheets}</div>
                </div>
                <div className="bg-white/5 rounded-lg px-2.5 py-1.5">
                  <div className="text-slate-500 text-[10px] uppercase">Failed to Score</div>
                  <div className="text-red-400 font-semibold">{t.failedToScore}</div>
                </div>
                <div className="bg-white/5 rounded-lg px-2.5 py-1.5">
                  <div className="text-slate-500 text-[10px] uppercase">Home Wins</div>
                  <div className="text-slate-100 font-semibold">{t.homeWins}</div>
                </div>
                <div className="bg-white/5 rounded-lg px-2.5 py-1.5">
                  <div className="text-slate-500 text-[10px] uppercase">Away Wins</div>
                  <div className="text-slate-100 font-semibold">{t.awayWins}</div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 text-[10px] uppercase tracking-wide">Last 5</span>
                <FormDots form={t.form} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
