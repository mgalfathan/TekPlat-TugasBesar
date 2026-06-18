'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, ScatterChart, Scatter, ReferenceLine,
  CartesianGrid, Legend, Cell,
} from 'recharts';
import {
  FORMATIONS, CLUB_COLORS, LEAGUE_CONFIG, FALLBACK_POOL, LEAGUE_KEY,
  type XiSlot, type PosGroup,
} from '@/lib/gaffer-data';
import {
  simulateSeasonFull, runMonteCarlo, computeTeamRatings, buildTeamList,
  type StandingRow, type MCResult,
} from '@/lib/gaffer-engine';

type Tab = 'setup' | 'squad' | 'simulate' | 'analytics';

interface DbTeam {
  id: number; name: string; leagueId: number;
  overallRating: number; attackRating: number;
  midfieldRating: number; defenseRating: number;
}
interface DbPlayer {
  id: number; name: string; posGroup: PosGroup;
  overallRating: number; photoUrl: string | null;
  team?: { name: string } | null;
}

interface PickItem { name: string; ovr: number; sub: string }

const POS_LABEL: Record<PosGroup, string> = {
  GK: 'Goalkeeper', DEF: 'Defender', MID: 'Midfielder', ATT: 'Forward / Attacker',
};
const LEAGUE_IDS = [13, 53, 19, 31, 16];

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// shared bits ---------------------------------------------------------------
function Eyebrow({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 font-mono text-xs font-bold tracking-[0.14em] text-lime uppercase mb-3.5">
      <span className="bg-lime text-lime-ink px-1.5 py-px rounded">{n}</span>
      <span>{children}</span>
    </div>
  );
}

export default function SimulatorPage() {
  const [tab, setTab] = useState<Tab>('setup');

  // setup
  const [leagueId, setLeagueId] = useState<number | null>(null);
  const [leagueTeams, setLeagueTeams] = useState<DbTeam[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [noData, setNoData] = useState(false);
  const [clubName, setClubName] = useState('');
  const [color, setColor] = useState(CLUB_COLORS[0]);
  const [formation, setFormation] = useState('4-3-3');

  // squad
  const [xi, setXi] = useState<XiSlot[]>([]);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [pickList, setPickList] = useState<PickItem[]>([]);
  const [search, setSearch] = useState('');
  const [customName, setCustomName] = useState('');
  const [customOvr, setCustomOvr] = useState(80);

  // simulate
  const [season, setSeason] = useState<StandingRow[] | null>(null);
  const [mc, setMc] = useState<MCResult | null>(null);
  const [mcN, setMcN] = useState(500);
  const [mcProgress, setMcProgress] = useState(0);
  const [mcRunning, setMcRunning] = useState(false);
  const [simStatus, setSimStatus] = useState('');

  const cfg = leagueId ? LEAGUE_CONFIG[leagueId] : null;
  const ratings = useMemo(() => computeTeamRatings(xi), [xi]);
  const xiFilled = ratings.filled === xi.length && xi.length > 0;

  const lgAvg = leagueTeams.length
    ? leagueTeams.reduce((s, t) => s + t.overallRating, 0) / leagueTeams.length : 0;
  const lgBest = leagueTeams.length ? Math.max(...leagueTeams.map(t => t.overallRating)) : 0;

  // ---- setup ----
  async function selectLeague(id: number) {
    setLeagueId(id);
    setTeamsLoading(true); setNoData(false);
    try {
      const d = await fetch(`/api/sofifa/teams?leagueId=${id}`).then(r => r.json());
      const teams: DbTeam[] = d.teams ?? [];
      setLeagueTeams(teams);
      setNoData(teams.length === 0);
    } catch {
      setLeagueTeams([]); setNoData(true);
    } finally {
      setTeamsLoading(false);
    }
  }

  function initXi() {
    const f = FORMATIONS[formation];
    setXi(f.layout.map(p => ({ group: p[0], name: null, ovr: null })));
  }

  function goSquad() {
    initXi();
    setSeason(null); setMc(null); setSimStatus('');
    setTab('squad');
  }

  // ---- squad / picker ----
  const loadPicker = useCallback(async (slotGroup: PosGroup, q: string) => {
    const fallback = (): PickItem[] => {
      if (!leagueId) return [];
      const key = LEAGUE_KEY[leagueId];
      return FALLBACK_POOL
        .filter(p => p.group === slotGroup)
        .sort((a, b) => (b.league === key ? 1 : 0) - (a.league === key ? 1 : 0) || b.ovr - a.ovr)
        .filter(p => !q || p.name.toLowerCase().includes(q.toLowerCase()))
        .map(p => ({ name: p.name, ovr: p.ovr, sub: p.league }));
    };
    if (!leagueId) { setPickList([]); return; }
    try {
      const params = new URLSearchParams({
        leagueId: String(leagueId), posGroup: slotGroup, search: q,
      });
      const d = await fetch(`/api/sofifa/players?${params}`).then(r => r.json());
      const players: DbPlayer[] = d.players ?? [];
      if (!players.length) { setPickList(fallback()); return; }
      setPickList(players.map(p => ({
        name: p.name, ovr: p.overallRating, sub: p.team?.name ?? '',
      })));
    } catch {
      setPickList(fallback());
    }
  }, [leagueId]);

  function openPicker(i: number) {
    setActiveSlot(i);
    setSearch(''); setCustomName(''); setCustomOvr(80);
    loadPicker(xi[i].group, '');
  }

  useEffect(() => {
    if (activeSlot === null) return;
    const g = xi[activeSlot].group;
    const t = setTimeout(() => loadPicker(g, search), 180);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, activeSlot]);

  function assign(name: string, ovr: number) {
    if (activeSlot === null) return;
    setXi(prev => prev.map((p, i) =>
      i === activeSlot ? { ...p, name, ovr } : p));
    setActiveSlot(null);
  }

  function autoFill() {
    if (!leagueId) return;
    const key = LEAGUE_KEY[leagueId];
    const byGroup: Record<PosGroup, PickItem[]> = { GK: [], DEF: [], MID: [], ATT: [] };
    FALLBACK_POOL
      .filter(p => p.league === key)
      .sort((a, b) => b.ovr - a.ovr)
      .forEach(p => byGroup[p.group].push({ name: p.name, ovr: p.ovr, sub: p.league }));
    setXi(prev => prev.map((slot, i) => {
      const pool = byGroup[slot.group];
      if (pool.length) {
        const pk = pool.shift()!;
        return { group: slot.group, name: pk.name, ovr: pk.ovr };
      }
      const base = { GK: 82, DEF: 81, MID: 82, ATT: 83 }[slot.group];
      return { group: slot.group, name: `${slot.group} ${i}`, ovr: base };
    }));
  }

  function clearXi() { initXi(); }

  function fillTier(base: number) {
    const labels: Record<PosGroup, string> = { GK: 'Keeper', DEF: 'Defender', MID: 'Midfielder', ATT: 'Forward' };
    const cnt: Record<PosGroup, number> = { GK: 0, DEF: 0, MID: 0, ATT: 0 };
    setXi(prev => prev.map(p => {
      cnt[p.group]++;
      if (!p.ovr) {
        const ov = Math.max(45, Math.min(99, base + Math.round(Math.random() * 5 - 2.5)));
        return { group: p.group, name: `${labels[p.group]} ${cnt[p.group]}`, ovr: ov };
      }
      return p;
    }));
  }

  // ---- simulate ----
  function userTeam() {
    return {
      name: clubName || 'Your Club', color,
      att: ratings.attk, def: ratings.defn, ovr: ratings.ovr,
    };
  }

  function runOne() {
    const teams = buildTeamList(leagueTeams, userTeam());
    const result = simulateSeasonFull(teams);
    setSeason(result);
    const you = result.find(r => r.team.isUser)!;
    setSimStatus(`✓ Headline season simulated. Your club finished ${ordinal(you.pos)}.`);
  }

  function runMC() {
    if (!cfg) return;
    const teams = buildTeamList(leagueTeams, userTeam());
    const userIdx = teams.length - 1;
    setMcRunning(true); setMcProgress(0);
    setSimStatus('Running Monte Carlo…');
    runMonteCarlo(
      teams, userIdx, mcN,
      { rel: cfg.rel, contCut: cfg.cont },
      (done) => setMcProgress(Math.round(100 * done / mcN)),
      (result) => {
        setMc(result);
        setMcRunning(false);
        setSimStatus(`✓ ${mcN} seasons simulated. Avg finish ${ordinal(Math.round(result.avgPos))} · title ${result.titlePct.toFixed(1)}%`);
        if (!season) setSeason(simulateSeasonFull(teams));
      },
    );
  }

  const canSimulate = leagueTeams.length > 0 && xiFilled;

  return (
    <div className="gaffer-screen">
      {/* sub-tab bar */}
      <div className="flex justify-center sm:justify-end mb-7">
        <div className="flex gap-1 bg-panel border border-border rounded-card p-1">
          {([['setup', '01 Setup'], ['squad', '02 Squad'], ['simulate', '03 Simulate'], ['analytics', '04 Analytics']] as [Tab, string][]).map(([t, label]) => {
            const disabled =
              (t === 'squad' && !leagueId) ||
              (t === 'simulate' && !canSimulate) ||
              (t === 'analytics' && !season);
            return (
              <button key={t} disabled={disabled} onClick={() => !disabled && setTab(t)}
                className={`px-3.5 py-2 rounded-[9px] font-mono text-[11px] font-bold uppercase tracking-[0.06em] transition
                  ${tab === t ? 'bg-lime text-lime-ink'
                    : disabled ? 'text-muted-2 cursor-not-allowed'
                    : 'text-muted hover:text-ink'}`}>
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ============ SETUP ============ */}
      {tab === 'setup' && (
        <section>
          <Eyebrow n="01">Step 01 — Choose your stage</Eyebrow>
          <h1 className="font-display uppercase text-ink leading-[0.9] tracking-[0.5px] text-[clamp(34px,5vw,64px)]">Pick a league.<br />Build your club.</h1>
          <p className="text-muted max-w-xl mt-3 mb-6 leading-relaxed">
            Drop your club into one of Europe&apos;s top-5 leagues and simulate a full home-and-away season.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {LEAGUE_IDS.map(id => {
              const c = LEAGUE_CONFIG[id];
              const on = leagueId === id;
              const h = (id * 47) % 360;
              return (
                <button key={id} onClick={() => selectLeague(id)}
                  className={`relative overflow-hidden text-left rounded-card border p-4 transition
                    ${on ? 'border-lime bg-[rgba(200,242,58,0.05)] shadow-lg shadow-[rgba(200,242,58,0.12)]'
                      : 'border-border bg-panel hover:border-border-2'}`}>
                  <div className="font-mono text-[10px] tracking-[0.2em] text-muted-2 font-bold uppercase">{c.flag}</div>
                  <div className="font-display text-2xl text-ink mt-1.5 uppercase tracking-[0.5px]">{c.name}</div>
                  <div className="font-mono text-[10px] text-muted-2 mt-2">
                    Top {c.cont} → UCL · {c.rel} relegated
                  </div>
                  <div className={`absolute top-3 right-3 w-5 h-5 rounded-full grid place-items-center text-xs transition
                    ${on ? 'bg-lime text-lime-ink' : 'border-2 border-border-2'}`}>{on ? '✓' : ''}</div>
                  <div className="absolute left-0 bottom-0 h-[3px] w-full" style={{ background: `linear-gradient(90deg, hsl(${h} 55% 50%), transparent)`, opacity: on ? 0.9 : 0.4 }} />
                </button>
              );
            })}
          </div>

          {teamsLoading && <p className="text-muted-2 text-sm mt-4 font-mono">Loading teams…</p>}
          {noData && (
            <div className="mt-4 bg-[rgba(245,131,127,0.08)] border border-[rgba(245,131,127,0.25)] rounded-inset p-4">
              <p className="text-loss text-sm">
                ⚠ Data untuk liga ini belum ada. Pergi ke{' '}
                <Link href="/admin/sofifa" className="underline font-semibold">Admin → SoFIFA Sync</Link>{' '}
                untuk import / seed data tim &amp; pemain.
              </p>
            </div>
          )}

          <div className="bg-panel border border-border rounded-card p-[22px] mt-6">
            <h3 className="font-mono text-[10px] text-muted-2 uppercase tracking-[0.1em] font-bold mb-4">Your club</h3>
            <div className="grid md:grid-cols-2 gap-5">
              <label className="block">
                <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-2 font-bold block mb-2">Club name</span>
                <input value={clubName} maxLength={22} onChange={e => setClubName(e.target.value)}
                  placeholder="e.g. Banjar Athletic"
                  className="w-full bg-panel-2 border border-border-2 rounded-[9px] px-3 py-2.5 text-ink text-sm font-semibold outline-none focus:border-lime" />
              </label>
              <label className="block">
                <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-2 font-bold block mb-2">Club colour</span>
                <div className="flex gap-2 flex-wrap">
                  {CLUB_COLORS.map(c => (
                    <button key={c} onClick={() => setColor(c)}
                      style={{ background: c }}
                      className={`w-8 h-8 rounded-lg border-2 transition ${color === c ? 'border-ink scale-110' : 'border-transparent'}`} />
                  ))}
                </div>
              </label>
              <div className="md:col-span-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-2 font-bold block mb-2">Formation</span>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                  {Object.keys(FORMATIONS).map(f => (
                    <button key={f} onClick={() => setFormation(f)}
                      className={`rounded-[9px] border px-2 py-2.5 text-center font-mono font-bold text-sm transition
                        ${formation === f ? 'border-lime text-lime bg-[rgba(200,242,58,0.05)]'
                          : 'border-border text-muted hover:border-border-2'}`}>
                      {f}
                      <span className="block text-[9px] tracking-[0.06em] text-muted-2 mt-1 uppercase">
                        {FORMATIONS[f].def} def · {FORMATIONS[f].att} att
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-5 flex-wrap">
              <button onClick={goSquad} disabled={!leagueId || leagueTeams.length === 0}
                className="px-5 py-2.5 bg-lime text-lime-ink font-mono text-xs font-bold uppercase tracking-[0.06em] rounded-[9px] hover:brightness-110 transition disabled:opacity-40">
                Build the squad →
              </button>
              <span className="text-xs text-muted-2 font-mono">
                {leagueId
                  ? leagueTeams.length
                    ? `${cfg?.name} · ${leagueTeams.length} clubs — name optional`
                    : 'Import / seed data to continue'
                  : 'Select a league to continue'}
              </span>
            </div>
          </div>
        </section>
      )}

      {/* ============ SQUAD ============ */}
      {tab === 'squad' && (
        <section>
          <Eyebrow n="02">Step 02 — The starting XI</Eyebrow>
          <h1 className="font-display uppercase text-ink leading-[0.9] tracking-[0.5px] text-[clamp(30px,4.5vw,56px)]">
            Pick your <span className="text-lime">{(clubName || 'Squad')}</span>
          </h1>
          <p className="text-muted max-w-xl mt-3 text-sm">Tap any position to assign a player. Your team strength updates live.</p>

          <div className="grid lg:grid-cols-[1.25fr_1fr] gap-5 mt-5 items-start">
            <div>
              <div className="relative rounded-card border border-border-2 overflow-hidden"
                style={{ aspectRatio: '3/3.7', background: 'repeating-linear-gradient(0deg,#14160e 0 9%,#0f110b 9% 18%)' }}>
                <div className="absolute inset-2.5 border border-white/[0.06] rounded-lg" />
                <div className="absolute left-2.5 right-2.5 top-1/2 border-t border-white/[0.06]" />
                {xi.map((slot, i) => {
                  const p = FORMATIONS[formation].layout[i];
                  const filled = !!slot.ovr;
                  const init = slot.name
                    ? slot.name.split(' ').slice(-1)[0].slice(0, 3).toUpperCase()
                    : slot.group;
                  return (
                    <button key={i} onClick={() => openPicker(i)}
                      className="absolute -translate-x-1/2 -translate-y-1/2 w-20 text-center"
                      style={{ left: `${p[1]}%`, top: `${p[2]}%` }}>
                      <div className="relative w-12 h-12 mx-auto rounded-full grid place-items-center font-mono font-bold text-sm transition"
                        style={filled
                          ? { background: color, color: '#0b0c08', border: `2px solid ${color}` }
                          : { background: 'rgba(11,12,8,.55)', color: '#5f6052', border: '2px dashed #2a2c1e' }}>
                        {filled && <span className="absolute -top-1 right-1 bg-lime text-lime-ink text-[9px] font-bold px-1 rounded">{slot.ovr}</span>}
                        {filled ? init : '+'}
                      </div>
                      <div className="text-[10px] font-bold mt-1 text-ink truncate drop-shadow"
                        style={{ textShadow: '0 1px 3px #000' }}>
                        {slot.name ?? <span className="text-muted-2 tracking-[0.06em] uppercase text-[9px]">{slot.group}</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2 flex-wrap mt-3">
                <button onClick={autoFill} className="px-3 py-2 rounded-[9px] border border-border text-muted text-xs hover:border-lime hover:text-lime transition">⚡ Auto-pick league stars</button>
                <button onClick={clearXi} className="px-3 py-2 rounded-[9px] border border-border text-muted text-xs hover:border-border-2 transition">Clear</button>
              </div>
              <div className="text-[11px] text-muted-2 font-mono mt-3">Or fill all empty slots at a tier:</div>
              <div className="grid grid-cols-5 gap-1.5 mt-2">
                {([['World', 89], ['Elite', 84], ['Strong', 79], ['Solid', 74], ['Plucky', 69]] as [string, number][]).map(([lab, base]) => (
                  <button key={lab} onClick={() => fillTier(base)}
                    className="rounded-[9px] border border-border px-1 py-2 text-center text-[10px] font-bold uppercase text-muted hover:border-lime hover:text-lime transition">
                    {lab}<b className="block font-display text-base text-ink">{base}</b>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="bg-panel border border-border rounded-card p-[22px]">
                <h3 className="font-mono text-[10px] text-muted-2 uppercase tracking-[0.1em] font-bold mb-3">Team rating</h3>
                <div className="flex items-end gap-4">
                  <div>
                    <div className="font-display text-6xl text-lime leading-none">{ratings.filled ? ratings.ovr : '--'}</div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-2 font-bold mt-1">Overall</div>
                  </div>
                  <div className="ml-auto text-right">
                    <div className="font-mono text-sm text-muted">{ratings.filled}/{xi.length} picked</div>
                    {ratings.filled > 0 && lgAvg > 0 && (
                      <div className="font-mono text-xs mt-1"
                        style={{ color: ratings.ovr - lgAvg >= 0 ? '#74e6a4' : '#f5837f' }}>
                        {ratings.ovr - lgAvg >= 0 ? '+' : ''}{(ratings.ovr - lgAvg).toFixed(1)} vs avg · best {lgBest}
                      </div>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-4">
                  {([['Attack', ratings.attLine, '#f5837f'], ['Midfield', ratings.midLine, '#c8f23a'], ['Defence', ratings.defLine, '#74e6a4']] as [string, number, string][]).map(([k, v, col]) => (
                    <div key={k} className="bg-panel-2 border border-border rounded-inset p-3 text-center">
                      <div className="font-display text-2xl" style={{ color: col }}>{ratings.filled ? Math.round(v) : '--'}</div>
                      <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-2 font-bold mt-1">{k}</div>
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={() => setTab('simulate')} disabled={!xiFilled}
                className="w-full mt-4 px-5 py-3 bg-lime text-lime-ink font-mono text-xs font-bold uppercase tracking-[0.06em] rounded-[9px] hover:brightness-110 transition disabled:opacity-40">
                Go to simulation →
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ============ SIMULATE ============ */}
      {tab === 'simulate' && (
        <section>
          <Eyebrow n="03">Step 03 — Run the season</Eyebrow>
          <h1 className="font-display uppercase text-ink leading-[0.9] tracking-[0.5px] text-[clamp(30px,4.5vw,56px)]">Simulate</h1>
          <p className="text-muted max-w-xl mt-3 text-sm">
            Your club plays everyone home and away. One season gives the full table; the Monte Carlo
            runs hundreds of seasons for your true title, top-four and relegation probabilities.
          </p>

          <div className="grid md:grid-cols-2 gap-4 mt-5">
            <div className="bg-panel border border-border rounded-card p-[22px]">
              <h3 className="font-mono text-[10px] text-muted-2 uppercase tracking-[0.1em] font-bold mb-2">① Headline season</h3>
              <p className="text-muted text-sm mb-4">One full simulated campaign — builds the table, fixtures, xG and player contributions.</p>
              <button onClick={runOne} className="px-5 py-2.5 bg-lime text-lime-ink font-mono text-xs font-bold uppercase tracking-[0.06em] rounded-[9px] hover:brightness-110 transition">▶ Simulate one season</button>
            </div>
            <div className="bg-panel border border-border rounded-card p-[22px]">
              <h3 className="font-mono text-[10px] text-muted-2 uppercase tracking-[0.1em] font-bold mb-2">② Monte Carlo</h3>
              <p className="text-muted text-sm mb-3">Repeat the season many times to find where your club really finishes.</p>
              <label className="block mb-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-2 font-bold block mb-2">Number of seasons</span>
                <select value={mcN} onChange={e => setMcN(Number(e.target.value))}
                  className="w-full bg-panel-2 border border-border-2 rounded-[9px] px-3 py-2.5 text-ink text-sm font-semibold outline-none focus:border-lime">
                  <option value={200}>200 (fast)</option>
                  <option value={500}>500</option>
                  <option value={1000}>1000</option>
                  <option value={2000}>2000 (slow)</option>
                </select>
              </label>
              <div className="flex items-center gap-3">
                <button onClick={runMC} disabled={mcRunning}
                  className="px-5 py-2.5 bg-lime text-lime-ink font-mono text-xs font-bold uppercase tracking-[0.06em] rounded-[9px] hover:brightness-110 transition disabled:opacity-40 whitespace-nowrap">▶ Run Monte Carlo</button>
                <div className="flex-1 h-2 bg-panel-2 border border-border rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-lime to-[#a6d626] transition-all" style={{ width: `${mcProgress}%` }} />
                </div>
              </div>
            </div>
          </div>

          {simStatus && <p className="mt-5 text-ink font-mono text-sm">{simStatus}</p>}
          <button onClick={() => setTab('analytics')} disabled={!season}
            className="mt-5 px-5 py-2.5 border border-border text-muted rounded-[9px] text-xs font-mono hover:border-lime hover:text-lime transition disabled:opacity-40">
            View analytics →
          </button>
        </section>
      )}

      {/* ============ ANALYTICS ============ */}
      {tab === 'analytics' && (
        <Analytics season={season} mc={mc} cfg={cfg} clubName={clubName} color={color} xi={xi} />
      )}

      {/* ============ PICKER MODAL ============ */}
      {activeSlot !== null && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-start justify-center p-6 overflow-auto"
          onClick={e => { if (e.target === e.currentTarget) setActiveSlot(null); }}>
          <div className="w-full max-w-lg bg-panel border border-border-2 rounded-card p-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-display text-2xl text-ink uppercase tracking-[0.5px]">Pick a player</h3>
                <p className="text-muted-2 text-xs font-mono mt-0.5 uppercase tracking-[0.06em]">{POS_LABEL[xi[activeSlot].group]}</p>
              </div>
              <button onClick={() => setActiveSlot(null)} className="text-muted-2 text-2xl leading-none hover:text-ink">×</button>
            </div>
            <input value={search} onChange={e => setSearch(e.target.value)} autoFocus placeholder="Search players…"
              className="w-full mt-4 bg-panel-2 border border-border-2 rounded-[9px] px-3 py-2.5 text-ink text-sm outline-none focus:border-lime" />
            <div className="max-h-72 overflow-auto flex flex-col gap-1.5 mt-3 scrollbar-thin">
              {pickList.length === 0
                ? <p className="text-muted-2 text-sm font-mono p-2">No match — create a custom player below.</p>
                : pickList.slice(0, 50).map((p, i) => (
                  <button key={`${p.name}-${i}`} onClick={() => assign(p.name, p.ovr)}
                    className="flex items-center gap-3 px-3 py-2 rounded-[9px] border border-border bg-panel-2 hover:border-lime transition text-left">
                    <span className="w-9 h-9 rounded-lg grid place-items-center font-mono font-bold text-sm bg-lime text-lime-ink">{p.ovr}</span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-bold text-ink truncate">{p.name}</span>
                      <span className="block text-[10px] uppercase tracking-[0.06em] text-muted-2 font-bold">{xi[activeSlot].group}</span>
                    </span>
                    <span className="text-[10px] font-mono text-muted-2 truncate max-w-[120px]">{p.sub}</span>
                  </button>
                ))}
            </div>
            <div className="border-t border-border mt-4 pt-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-2 font-bold mb-2">Or create your own</div>
              <input value={customName} onChange={e => setCustomName(e.target.value)} placeholder="Player name"
                className="w-full bg-panel-2 border border-border-2 rounded-[9px] px-3 py-2.5 text-ink text-sm outline-none focus:border-lime mb-3" />
              <div className="flex items-center gap-3">
                <span className="font-mono text-[11px] text-muted-2 font-bold tracking-[0.06em]">RATING</span>
                <input type="range" min={45} max={99} value={customOvr} onChange={e => setCustomOvr(Number(e.target.value))}
                  className="flex-1 accent-lime" />
                <span className="font-mono font-bold bg-lime text-lime-ink rounded-lg px-2.5 py-1.5 min-w-[42px] text-center text-sm">{customOvr}</span>
                <button onClick={() => assign(customName.trim() || `${xi[activeSlot!].group} player`, customOvr)}
                  className="px-4 py-2 bg-lime text-lime-ink font-bold rounded-lg text-sm hover:brightness-110 transition">Add</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   ANALYTICS
   ============================================================ */
const GOAL_WEIGHTS: Record<PosGroup, number> = { GK: 0.00, DEF: 0.07, MID: 0.30, ATT: 0.62 };
const ASSIST_WEIGHTS: Record<PosGroup, number> = { GK: 0.01, DEF: 0.16, MID: 0.50, ATT: 0.33 };

function Analytics({ season, mc, cfg, clubName, color, xi }: {
  season: StandingRow[] | null;
  mc: MCResult | null;
  cfg: { name: string; rel: number; cont: number; eur: number } | null;
  clubName: string; color: string; xi: XiSlot[];
}) {
  if (!season || !cfg) {
    return (
      <div className="text-center py-20 text-muted-2">
        <div className="font-display text-5xl opacity-50 uppercase">—</div>
        <p className="mt-3">Run a simulation first.</p>
      </div>
    );
  }
  const n = season.length;
  const relCut = n - cfg.rel;
  const you = season.find(r => r.team.isUser)!;
  const name = clubName || 'Your Club';

  const kpis: { v: string; k: string; sub?: string }[] = [
    { v: ordinal(you.pos), k: 'League finish', sub: `${you.pts} pts · ${you.W}W ${you.D}D ${you.L}L` },
    { v: `${you.GF}-${you.GA}`, k: 'Goals (F-A)', sub: `GD ${you.GF - you.GA >= 0 ? '+' : ''}${you.GF - you.GA}` },
    { v: `${you.GF - you.xGF >= 0 ? '+' : ''}${(you.GF - you.xGF).toFixed(1)}`, k: 'Finishing vs xG', sub: `${you.GF} scored · ${you.xGF.toFixed(1)} xG` },
  ];
  if (mc) {
    kpis.push({ v: `${mc.titlePct.toFixed(1)}%`, k: 'Title probability', sub: `from ${mc.n} seasons` });
    kpis.push({ v: `${mc.top4Pct.toFixed(0)}%`, k: `Top-${cfg.cont} / UCL`, sub: `relegation ${mc.relPct.toFixed(0)}%` });
    kpis.push({ v: ordinal(Math.round(mc.avgPos)), k: 'Avg finish', sub: `${mc.avgPts.toFixed(0)} pts avg · ${mc.minPts}-${mc.maxPts} range` });
  } else {
    kpis.push({ v: String(you.team.ovr), k: 'Squad rating', sub: 'run Monte Carlo for probabilities' });
  }

  // chart data
  const pointsData = season.map(r => ({
    name: r.team.isUser ? (clubName || 'YOU') : r.team.name,
    pts: r.pts, isUser: r.team.isUser,
  }));
  const xgClubs = season.filter(r => !r.team.isUser).map(r => ({ x: +r.xGF.toFixed(1), y: r.GF, name: r.team.name }));
  const xgYou = season.filter(r => r.team.isUser).map(r => ({ x: +r.xGF.toFixed(1), y: r.GF, name: r.team.name }));
  const xgMax = Math.max(...season.map(r => Math.max(r.xGF, r.GF))) + 5;

  // form line
  let cum = 0;
  const formData = you.results.map((r, i) => {
    cum += r.r === 'W' ? 3 : r.r === 'D' ? 1 : 0;
    return { gw: i + 1, you: cum, avg: +((i + 1) * 1.36).toFixed(1) };
  });

  const finishData = mc
    ? Array.from({ length: n }, (_, i) => {
        const pos = i + 1;
        return { pos, pct: +(100 * mc.finish[pos] / mc.n).toFixed(1) };
      })
    : [];

  // contributions
  const xiP = xi.filter(p => p.ovr);
  const totGoals = you.GF, totAst = Math.round(you.GF * 0.72);
  function alloc(total: number, weights: Record<PosGroup, number>) {
    const grp: Record<PosGroup, XiSlot[]> = { GK: [], DEF: [], MID: [], ATT: [] };
    xiP.forEach(p => grp[p.group].push(p));
    const out = new Map<XiSlot, number>();
    (Object.keys(weights) as PosGroup[]).forEach(g => {
      const pool = grp[g]; if (!pool.length) return;
      const share = total * weights[g];
      const sum = pool.reduce((s, p) => s + (p.ovr ?? 0), 0);
      pool.forEach(p => out.set(p, (out.get(p) ?? 0) + share * ((p.ovr ?? 0) / sum)));
    });
    return out;
  }
  const gMap = alloc(totGoals, GOAL_WEIGHTS), aMap = alloc(totAst, ASSIST_WEIGHTS);
  const contribRows = xiP
    .map(p => ({ p, g: Math.round(gMap.get(p) ?? 0), a: Math.round(aMap.get(p) ?? 0) }))
    .sort((x, y) => (y.g * 2 + y.a) - (x.g * 2 + x.a));

  const form5 = you.results.slice(-5);

  const axis = { fill: '#8d8f7e', fontSize: 11 };
  const grid = 'rgba(255,255,255,.06)';
  const tooltipStyle = { background: '#13140e', border: '1px solid rgba(200,242,58,.22)', borderRadius: 8, fontSize: 12, color: '#f4f5ec' } as const;
  const mutedSeries = '#33352a';

  return (
    <section>
      <Eyebrow n="04">Step 04 — The numbers</Eyebrow>
      <h1 className="font-display uppercase text-ink leading-[0.9] tracking-[0.5px] text-[clamp(30px,4.5vw,56px)] mb-5">Analytics</h1>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {kpis.map((k, i) => (
          <div key={i} className="bg-panel border border-border rounded-card p-4">
            <div className="font-display text-4xl text-lime leading-none">{k.v}</div>
            <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-2 font-bold mt-2">{k.k}</div>
            {k.sub && <div className="text-[11px] text-muted-2 font-mono mt-1">{k.sub}</div>}
          </div>
        ))}
      </div>

      {/* table */}
      <div className="bg-panel border border-border rounded-card p-[22px] mt-5">
        <h3 className="font-mono text-[10px] text-muted-2 uppercase tracking-[0.1em] font-bold mb-3">{cfg.name} — final table</h3>
        <div className="overflow-auto rounded-lg border border-border">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="font-mono text-[10px] uppercase tracking-[0.06em] text-muted-2 bg-panel-2">
                <th className="text-right px-2 py-2.5 font-normal">#</th>
                <th className="text-left px-2 py-2.5 font-normal">Club</th>
                {['P', 'W', 'D', 'L', 'GF', 'GA', 'GD', 'xG', 'Pts'].map(h => <th key={h} className="text-right px-2 py-2.5 font-normal">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {season.map((r, i) => {
                const pos = i + 1;
                let zone = '';
                if (pos <= cfg.cont) zone = 'bg-[rgba(200,242,58,0.06)]';
                else if (pos <= cfg.eur) zone = 'bg-[rgba(90,169,240,0.06)]';
                else if (pos > relCut) zone = 'bg-[rgba(245,131,127,0.06)]';
                const gd = r.GF - r.GA;
                return (
                  <tr key={r.team.name} className={r.team.isUser ? 'bg-[rgba(200,242,58,0.14)]' : zone}>
                    <td className={`text-right px-2 py-2 font-mono text-muted-2${r.team.isUser ? ' border-l-4 border-l-lime' : ''}`}>{pos}</td>
                    <td className={`text-left px-2 py-2 font-bold ${r.team.isUser ? 'text-lime' : 'text-ink'}`}>
                      <span className="inline-block w-2 h-2 rounded-full mr-2 align-middle" style={{ background: r.team.isUser ? color : '#3a3c2e' }} />
                      {r.team.name}
                    </td>
                    <td className="text-right px-2 py-2 font-mono text-muted">{r.P}</td>
                    <td className="text-right px-2 py-2 font-mono text-muted">{r.W}</td>
                    <td className="text-right px-2 py-2 font-mono text-muted">{r.D}</td>
                    <td className="text-right px-2 py-2 font-mono text-muted">{r.L}</td>
                    <td className="text-right px-2 py-2 font-mono text-muted">{r.GF}</td>
                    <td className="text-right px-2 py-2 font-mono text-muted">{r.GA}</td>
                    <td className="text-right px-2 py-2 font-mono text-muted">{gd >= 0 ? '+' : ''}{gd}</td>
                    <td className="text-right px-2 py-2 font-mono text-muted-2">{r.xGF.toFixed(0)}</td>
                    <td className="text-right px-2 py-2 font-mono font-bold text-ink">{r.pts}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex gap-4 flex-wrap mt-3 text-[11px] text-muted-2 font-mono">
          <span className="flex items-center gap-1.5"><b className="w-2 h-2 rounded-sm bg-lime" />Champions / continental</span>
          <span className="flex items-center gap-1.5"><b className="w-2 h-2 rounded-sm bg-chart-blue" />Europe</span>
          <span className="flex items-center gap-1.5"><b className="w-2 h-2 rounded-sm bg-loss" />Relegation</span>
          <span className="flex items-center gap-1.5"><b className="w-2 h-2 rounded-sm bg-lime ring-2 ring-lime" />Your club</span>
        </div>
      </div>

      {/* charts row 1 */}
      <div className="grid md:grid-cols-2 gap-4 mt-4">
        <div className="bg-panel border border-border rounded-card p-[22px]">
          <h3 className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-2 font-bold">Title race — points by position</h3>
          <p className="text-[11px] text-muted-2 font-mono mb-3">Final points of every club, your team highlighted</p>
          <div style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pointsData} layout="vertical" margin={{ left: 8, right: 12 }}>
                <CartesianGrid stroke={grid} horizontal={false} />
                <XAxis type="number" tick={axis} stroke={grid} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#8d8f7e', fontSize: 9 }} width={90} stroke={grid} />
                <Tooltip cursor={{ fill: 'rgba(255,255,255,.04)' }} contentStyle={tooltipStyle} formatter={(v: number) => [`${v} pts`, 'Points']} />
                <Bar dataKey="pts" radius={[0, 4, 4, 0]}>
                  {pointsData.map((d, i) => <Cell key={i} fill={d.isUser ? color : mutedSeries} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-panel border border-border rounded-card p-[22px]">
          <h3 className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-2 font-bold">xG vs actual goals</h3>
          <p className="text-[11px] text-muted-2 font-mono mb-3">Over the line = clinical · under = wasteful</p>
          <div style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ left: 4, right: 12, bottom: 8 }}>
                <CartesianGrid stroke={grid} />
                <XAxis type="number" dataKey="x" name="xG" domain={[0, Math.ceil(xgMax)]} tick={axis} stroke={grid} label={{ value: 'Expected goals (xG)', fill: '#8d8f7e', fontSize: 11, position: 'insideBottom', offset: -2 }} />
                <YAxis type="number" dataKey="y" name="Goals" domain={[0, Math.ceil(xgMax)]} tick={axis} stroke={grid} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={tooltipStyle}
                  formatter={(v: number, n2: string) => [v, n2]} labelFormatter={() => ''} />
                <ReferenceLine segment={[{ x: 0, y: 0 }, { x: xgMax, y: xgMax }]} stroke="#5f6052" strokeDasharray="6 5" />
                <Scatter name="Clubs" data={xgClubs} fill="#5f6052" />
                <Scatter name="Your club" data={xgYou} fill={color} shape="diamond" />
                <Legend wrapperStyle={{ fontSize: 11, color: '#8d8f7e' }} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* charts row 2 */}
      <div className="grid md:grid-cols-2 gap-4 mt-4">
        <div className="bg-panel border border-border rounded-card p-[22px]">
          <h3 className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-2 font-bold">Your title charge</h3>
          <p className="text-[11px] text-muted-2 font-mono mb-3">Cumulative points vs league average pace</p>
          <div style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={formData} margin={{ left: 4, right: 12, bottom: 8 }}>
                <CartesianGrid stroke={grid} />
                <XAxis dataKey="gw" tick={axis} stroke={grid} label={{ value: 'Matchday', fill: '#8d8f7e', fontSize: 11, position: 'insideBottom', offset: -2 }} />
                <YAxis tick={axis} stroke={grid} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11, color: '#8d8f7e' }} />
                <Line type="monotone" dataKey="you" name={clubName || 'You'} stroke={color} strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="avg" name="League avg pace" stroke="#5f6052" strokeDasharray="6 4" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-panel border border-border rounded-card p-[22px]">
          <h3 className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-2 font-bold">Where you finish — Monte Carlo</h3>
          <p className="text-[11px] text-muted-2 font-mono mb-3">
            {mc ? `${mc.n} seasons · how often you finish in each position` : 'Run the Monte Carlo on the Simulate tab'}
          </p>
          <div style={{ height: 320 }}>
            {mc ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={finishData} margin={{ left: 4, right: 12, bottom: 8 }}>
                  <CartesianGrid stroke={grid} vertical={false} />
                  <XAxis dataKey="pos" tick={axis} stroke={grid} label={{ value: 'Final position', fill: '#8d8f7e', fontSize: 11, position: 'insideBottom', offset: -2 }} />
                  <YAxis tick={axis} stroke={grid} unit="%" />
                  <Tooltip cursor={{ fill: 'rgba(255,255,255,.04)' }} contentStyle={tooltipStyle} formatter={(v: number) => [`${v}%`, 'of seasons']} labelFormatter={(l) => ordinal(Number(l))} />
                  <Bar dataKey="pct" radius={[3, 3, 0, 0]}>
                    {finishData.map((d) => {
                      let c = mutedSeries;
                      if (d.pos <= mc.contCut) c = color;
                      else if (d.pos > mc.relCut) c = '#f5837f';
                      return <Cell key={d.pos} fill={c} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full grid place-items-center text-muted-2 text-sm">No Monte Carlo data yet.</div>
            )}
          </div>
        </div>
      </div>

      {/* fixtures + contributions */}
      <div className="grid md:grid-cols-2 gap-4 mt-4">
        <div className="bg-panel border border-border rounded-card p-[22px]">
          <h3 className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-2 font-bold">Your fixtures &amp; results</h3>
          <div className="flex items-center gap-2 mt-2 mb-2">
            <span className="text-[11px] text-muted-2 font-mono">Recent form</span>
            <div className="flex gap-1">
              {form5.map((r, i) => (
                <b key={i} className="w-5 h-5 rounded grid place-items-center font-mono text-[11px] font-bold"
                  style={{ background: r.r === 'W' ? '#74e6a4' : r.r === 'D' ? '#9ea08e' : '#f5837f', color: r.r === 'L' ? '#fff' : '#0b0c08' }}>{r.r}</b>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1.5 max-h-[430px] overflow-auto scrollbar-thin">
            {you.results.map((r, i) => {
              const hm = r.venue === 'H' ? name : r.opp;
              const aw = r.venue === 'H' ? r.opp : name;
              const sc = r.venue === 'H' ? `${r.gf}–${r.ga}` : `${r.ga}–${r.gf}`;
              return (
                <div key={i} className="grid grid-cols-[24px_1fr_auto_1fr_48px] gap-2 items-center px-3 py-2 rounded-[9px] border border-border bg-panel-2 text-sm">
                  <span className="font-mono text-muted-2 text-[11px]">{i + 1}</span>
                  <span className={`text-right font-bold truncate ${r.venue === 'H' ? 'text-lime' : 'text-muted'}`}>{hm}</span>
                  <span className="font-mono font-bold bg-panel border border-border rounded px-2 py-0.5 text-center text-ink">{sc}</span>
                  <span className={`text-left font-bold truncate ${r.venue === 'A' ? 'text-lime' : 'text-muted'}`}>{aw}</span>
                  <span className="font-mono font-bold text-center rounded py-0.5"
                    style={{ background: r.r === 'W' ? '#74e6a4' : r.r === 'D' ? '#9ea08e' : '#f5837f', color: r.r === 'L' ? '#fff' : '#0b0c08' }}>{r.r}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="bg-panel border border-border rounded-card p-[22px]">
          <h3 className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-2 font-bold">Player contributions</h3>
          <p className="text-[11px] text-muted-2 font-mono mt-0.5 mb-2">Modelled goals + assists from your XI this season</p>
          <div className="flex flex-col gap-1.5 max-h-[420px] overflow-auto scrollbar-thin">
            {contribRows.map((r, i) => (
              <div key={i} className="grid grid-cols-[1fr_auto] gap-2 items-center px-3 py-2 rounded-[9px] border border-border bg-panel-2">
                <div>
                  <div className="font-bold text-sm text-ink">{r.p.name}</div>
                  <div className="text-[9px] uppercase tracking-[0.06em] text-muted-2 font-bold">{r.p.group} · {r.p.ovr}</div>
                </div>
                <div className="font-mono text-xs text-right">
                  <b className="text-lime">{r.g} G</b> · <i className="text-win not-italic">{r.a} A</i>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-10 pt-5 border-t border-border text-muted-2 text-[11px] leading-relaxed">
        <span className="inline-block bg-panel border border-border rounded-full px-3 py-1 font-mono mr-2">Independent model</span>
        THE GAFFER is a fan-made analytics toy. Team and player ratings are independent estimates from public data, used descriptively only. Match outcomes use a Poisson goals model driven by attack/defence strength plus home advantage.
      </div>
    </section>
  );
}
