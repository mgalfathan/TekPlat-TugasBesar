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

// deterministic club hue (the analytics API carries no brand colour)
function hueOf(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
}

function Crest({ team, size = 40 }: { team: { teamName: string; code: string | null; logo: string | null }; size?: number }) {
  if (team.logo) return <img src={team.logo} alt="" className="object-contain flex-none" style={{ width: size, height: size }} />;
  const code = team.code ?? team.teamName.slice(0, 3).toUpperCase();
  const h = hueOf(code);
  return (
    <div
      className="rounded-[9px] flex items-center justify-center flex-none shadow-[inset_0_0_0_1px_rgba(255,255,255,.14)]"
      style={{ width: size, height: size, background: `linear-gradient(150deg, hsl(${h} 48% 44%), hsl(${h} 48% 28%))` }}
    >
      <span className="font-display text-white tracking-[0.5px] drop-shadow" style={{ fontSize: Math.round(size * 0.34) }}>{code}</span>
    </div>
  );
}

function FormDots({ form }: { form: Array<'W' | 'D' | 'L'> }) {
  if (!form.length) return <span className="text-muted-2 text-xs">—</span>;
  const tone = { W: 'bg-win/[0.16] text-win', D: 'bg-draw/[0.16] text-draw', L: 'bg-loss/[0.16] text-loss' };
  return (
    <div className="flex gap-1">
      {form.map((r, i) => (
        <span key={i} className={`w-[21px] h-[21px] rounded-md text-[10px] font-mono font-extrabold flex items-center justify-center ${tone[r]}`}>{r}</span>
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
    <div className="gaffer-screen space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <div className="flex items-center gap-2.5 font-mono text-xs font-bold tracking-[0.14em] text-lime uppercase mb-3.5">
            <span className="bg-lime text-lime-ink px-1.5 py-px rounded">02</span>
            <span>Team Analytics</span>
          </div>
          <h1 className="font-display uppercase text-ink leading-[0.9] tracking-[0.5px] text-[clamp(40px,6.4vw,82px)] mb-4">
            Every club,<br />every metric.
          </h1>
          <p className="text-muted text-base leading-relaxed max-w-[620px] text-pretty">
            Sort the league on any statistic, then overlay a custom formula to rank clubs your way.
          </p>
        </div>
        <LeagueSeasonSelector leagues={leagues} selectedLeagueId={leagueId} selectedSeason={season} onLeagueChange={setLeagueId} onSeasonChange={setSeason} />
      </header>

      <div className="flex flex-wrap gap-5 items-center">
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-2">Custom Metric</span>
          <select
            value={metricId}
            onChange={e => {
              setMetricId(e.target.value);
              if (e.target.value && sortBy !== 'customScore') setSortBy('customScore');
              if (!e.target.value && sortBy === 'customScore') setSortBy('points');
            }}
            className="bg-panel-2 border border-border-2 text-ink rounded-chip px-3 py-2 text-sm font-semibold focus:outline-none focus:border-lime"
          >
            <option value="">None</option>
            {metrics.map(m => <option key={m.id} value={String(m.id)}>{m.name}</option>)}
          </select>
          {metricLoading && <span className="font-mono text-[10px] text-muted-2">computing…</span>}
        </div>
        <div className="flex flex-wrap gap-[7px] items-center">
          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-2 mr-1">Sort by</span>
          {SORTS.map(s => (
            <button key={s.key} onClick={() => setSortBy(s.key)}
              className={`px-3.5 py-[7px] rounded-pill text-[12.5px] font-semibold border transition ${
                sortBy === s.key
                  ? 'bg-lime text-lime-ink border-lime'
                  : 'bg-white/[0.04] text-muted border-border hover:text-ink hover:border-border-2'
              }`}>
              {s.label}
            </button>
          ))}
          {selectedMetric && (
            <button onClick={() => setSortBy('customScore')}
              className={`px-3.5 py-[7px] rounded-pill text-[12.5px] font-semibold border transition ${
                sortBy === 'customScore'
                  ? 'bg-lime text-lime-ink border-lime'
                  : 'bg-[rgba(200,242,58,0.08)] text-lime border-[rgba(200,242,58,0.3)]'
              }`}>
              ★ {selectedMetric.name}
            </button>
          )}
        </div>
      </div>

      {loading ? <LoadingSpinner message="Loading team analytics..." /> :
       sorted.length === 0 ? <EmptyState title="No analytics yet" description="Sync data in Admin → Sync to populate team statistics." /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sorted.map((t, i) => {
            const h = hueOf(t.code ?? t.teamName);
            return (
            <article key={t.teamId} className="relative overflow-hidden bg-panel border border-border rounded-card p-5 transition-all hover:border-border-2 hover:-translate-y-0.5">
              <div className="flex items-center gap-3 mb-4">
                <span className="font-display text-xl text-muted-2">{String(i + 1).padStart(2, '0')}</span>
                <Crest team={t} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="text-ink font-extrabold text-[15px] truncate">{t.teamName}</p>
                  <p className="font-mono text-[10px] text-muted-2 truncate mt-px">{t.country ?? '—'}</p>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-display text-3xl leading-none text-lime">{t.points}</div>
                  <div className="font-mono text-[9px] text-muted tracking-[0.1em] uppercase">PTS</div>
                </div>
              </div>

              {selectedMetric && (
                <div className="bg-[rgba(200,242,58,0.07)] border border-[rgba(200,242,58,0.18)] rounded-[10px] px-3 py-2.5 mb-3.5 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-mono text-[9.5px] tracking-[0.08em] text-lime uppercase">★ {selectedMetric.name}</div>
                    <div className="font-mono text-[10px] text-muted mt-0.5 truncate max-w-[160px]" title={selectedMetric.formula}>{selectedMetric.formula}</div>
                  </div>
                  <div className="font-display text-2xl text-lime shrink-0">
                    {t.customScore != null ? t.customScore.toFixed(2) : '—'}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-4 gap-1.5 mb-3.5 text-center">
                <div><b className="font-display text-lg block text-ink">{t.played}</b><span className="font-mono text-[9px] text-muted-2 tracking-[0.08em]">MP</span></div>
                <div><b className="font-display text-lg block text-win">{t.wins}</b><span className="font-mono text-[9px] text-muted-2 tracking-[0.08em]">W</span></div>
                <div><b className="font-display text-lg block text-draw">{t.draws}</b><span className="font-mono text-[9px] text-muted-2 tracking-[0.08em]">D</span></div>
                <div><b className="font-display text-lg block text-loss">{t.losses}</b><span className="font-mono text-[9px] text-muted-2 tracking-[0.08em]">L</span></div>
              </div>

              <div className="grid grid-cols-2 gap-1.5 mb-4">
                <div className="bg-white/[0.035] rounded-lg px-2.5 py-2">
                  <span className="font-mono text-[9px] tracking-[0.06em] text-muted-2 block uppercase">Win Rate</span>
                  <b className="text-[13.5px] font-bold block mt-0.5 text-ink">{t.winRate}%</b>
                </div>
                <div className="bg-white/[0.035] rounded-lg px-2.5 py-2">
                  <span className="font-mono text-[9px] tracking-[0.06em] text-muted-2 block uppercase">Goal Diff</span>
                  <b className={`text-[13.5px] font-bold block mt-0.5 ${t.goalDifference > 0 ? 'text-win' : t.goalDifference < 0 ? 'text-loss' : 'text-ink'}`}>{t.goalDifference > 0 ? '+' : ''}{t.goalDifference}</b>
                </div>
                <div className="bg-white/[0.035] rounded-lg px-2.5 py-2">
                  <span className="font-mono text-[9px] tracking-[0.06em] text-muted-2 block uppercase">Goals F / A</span>
                  <b className="text-[13.5px] font-bold block mt-0.5 text-ink">{t.goalsFor} / {t.goalsAgainst}</b>
                </div>
                <div className="bg-white/[0.035] rounded-lg px-2.5 py-2">
                  <span className="font-mono text-[9px] tracking-[0.06em] text-muted-2 block uppercase">Avg / Match</span>
                  <b className="text-[13.5px] font-bold block mt-0.5 text-ink">{t.goalsPerMatch} / {t.concededPerMatch}</b>
                </div>
                <div className="bg-white/[0.035] rounded-lg px-2.5 py-2">
                  <span className="font-mono text-[9px] tracking-[0.06em] text-muted-2 block uppercase">Clean Sheets</span>
                  <b className="text-[13.5px] font-bold block mt-0.5 text-win">{t.cleanSheets}</b>
                </div>
                <div className="bg-white/[0.035] rounded-lg px-2.5 py-2">
                  <span className="font-mono text-[9px] tracking-[0.06em] text-muted-2 block uppercase">Failed to Score</span>
                  <b className="text-[13.5px] font-bold block mt-0.5 text-loss">{t.failedToScore}</b>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-muted-2">Last 5</span>
                <FormDots form={t.form} />
              </div>

              <div className="absolute left-0 bottom-0 h-[3px] w-full opacity-85" style={{ background: `linear-gradient(90deg, hsl(${h} 55% 50%), transparent)` }} />
            </article>
          );})}
        </div>
      )}
    </div>
  );
}
