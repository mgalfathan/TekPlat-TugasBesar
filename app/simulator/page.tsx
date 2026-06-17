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
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* tab bar */}
      <div className="flex justify-center sm:justify-end mb-6">
        <div className="flex gap-1 bg-[#111827] border border-white/5 rounded-xl p-1">
          {([['setup', '01 Setup'], ['squad', '02 Squad'], ['simulate', '03 Simulate'], ['analytics', '04 Analytics']] as [Tab, string][]).map(([t, label]) => {
            const disabled =
              (t === 'squad' && !leagueId) ||
              (t === 'simulate' && !canSimulate) ||
              (t === 'analytics' && !season);
            return (
              <button key={t} disabled={disabled} onClick={() => !disabled && setTab(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition
                  ${tab === t ? 'bg-[#00d4aa] text-black'
                    : disabled ? 'text-slate-700 cursor-not-allowed'
                    : 'text-slate-400 hover:text-white'}`}>
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ============ SETUP ============ */}
      {tab === 'setup' && (
        <section>
          <p className="text-[#00d4aa] text-xs font-bold uppercase tracking-[0.3em] mb-2">Step 01 — Choose your league</p>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white leading-tight">Pick a league. Build your club.</h1>
          <p className="text-slate-400 max-w-xl mt-3 mb-6 text-sm leading-relaxed">
            Drop your club into one of Europe&apos;s top-5 leagues and simulate a full home-and-away season.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {LEAGUE_IDS.map(id => {
              const c = LEAGUE_CONFIG[id];
              const on = leagueId === id;
              return (
                <button key={id} onClick={() => selectLeague(id)}
                  className={`relative text-left rounded-2xl border p-4 transition
                    ${on ? 'border-[#00d4aa] bg-[#00d4aa]/5 shadow-lg shadow-[#00d4aa]/10'
                      : 'border-white/5 bg-[#111827] hover:border-white/20'}`}>
                  <div className="text-[11px] tracking-[0.2em] text-slate-500 font-bold">{c.flag}</div>
                  <div className="text-xl font-extrabold text-white mt-1">{c.name}</div>
                  <div className="text-[11px] text-slate-500 mt-2 font-mono">
                    Top {c.cont} → UCL · {c.rel} relegated
                  </div>
                  {on && <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#00d4aa] text-black grid place-items-center text-xs">✓</div>}
                </button>
              );
            })}
          </div>

          {teamsLoading && <p className="text-slate-500 text-sm mt-4">Loading teams…</p>}
          {noData && (
            <div className="mt-4 bg-yellow-900/20 border border-yellow-500/20 rounded-lg p-4">
              <p className="text-yellow-400 text-sm">
                ⚠ Data untuk liga ini belum ada. Pergi ke{' '}
                <Link href="/admin/sofifa" className="underline font-semibold">Admin → SoFIFA Sync</Link>{' '}
                untuk import / seed data tim & pemain.
              </p>
            </div>
          )}

          <div className="bg-[#111827] border border-white/5 rounded-xl p-5 mt-6">
            <h3 className="text-xs text-slate-500 uppercase tracking-wide font-bold mb-4">Your club</h3>
            <div className="grid md:grid-cols-2 gap-5">
              <label className="block">
                <span className="text-[11px] uppercase tracking-wider text-slate-500 font-bold block mb-2">Club name</span>
                <input value={clubName} maxLength={22} onChange={e => setClubName(e.target.value)}
                  placeholder="e.g. Banjar Athletic"
                  className="w-full bg-[#0d1117] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm font-semibold outline-none focus:border-[#00d4aa]" />
              </label>
              <label className="block">
                <span className="text-[11px] uppercase tracking-wider text-slate-500 font-bold block mb-2">Club colour</span>
                <div className="flex gap-2 flex-wrap">
                  {CLUB_COLORS.map(c => (
                    <button key={c} onClick={() => setColor(c)}
                      style={{ background: c }}
                      className={`w-8 h-8 rounded-lg border-2 transition ${color === c ? 'border-white scale-110' : 'border-transparent'}`} />
                  ))}
                </div>
              </label>
              <div className="md:col-span-2">
                <span className="text-[11px] uppercase tracking-wider text-slate-500 font-bold block mb-2">Formation</span>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                  {Object.keys(FORMATIONS).map(f => (
                    <button key={f} onClick={() => setFormation(f)}
                      className={`rounded-lg border px-2 py-2.5 text-center font-mono font-bold text-sm transition
                        ${formation === f ? 'border-[#00d4aa] text-[#00d4aa] bg-[#00d4aa]/5'
                          : 'border-white/10 text-slate-400 hover:border-white/20'}`}>
                      {f}
                      <span className="block text-[9px] tracking-wide text-slate-600 mt-1 uppercase font-sans">
                        {FORMATIONS[f].def} def · {FORMATIONS[f].att} att
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-5 flex-wrap">
              <button onClick={goSquad} disabled={!leagueId || leagueTeams.length === 0}
                className="px-5 py-2.5 bg-[#00d4aa] hover:bg-[#00b899] text-black font-bold rounded-lg transition disabled:opacity-40 text-sm">
                Build the squad →
              </button>
              <span className="text-xs text-slate-500 font-mono">
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
          <p className="text-[#00d4aa] text-xs font-bold uppercase tracking-[0.3em] mb-2">Step 02 — The starting XI</p>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white">
            PICK YOUR <span className="text-[#00d4aa]">{(clubName || 'SQUAD').toUpperCase()}</span>
          </h1>
          <p className="text-slate-400 max-w-xl mt-2 text-sm">Tap any position to assign a player. Your team strength updates live.</p>

          <div className="grid lg:grid-cols-[1.25fr_1fr] gap-5 mt-5 items-start">
            <div>
              <div className="relative rounded-2xl border border-white/10 overflow-hidden"
                style={{ aspectRatio: '3/3.7', background: 'repeating-linear-gradient(0deg,#10180f 0 9%,#0c130c 9% 18%)' }}>
                <div className="absolute inset-2.5 border border-white/5 rounded-lg" />
                <div className="absolute left-2.5 right-2.5 top-1/2 border-t border-white/5" />
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
                          ? { background: color, color: '#0b0f08', border: `2px solid ${color}` }
                          : { background: 'rgba(8,11,8,.55)', color: '#5d6a5d', border: '2px dashed #28342a' }}>
                        {filled && <span className="absolute -top-1 right-1 bg-[#00d4aa] text-black text-[9px] font-bold px-1 rounded">{slot.ovr}</span>}
                        {filled ? init : '+'}
                      </div>
                      <div className="text-[10px] font-bold mt-1 text-white truncate drop-shadow"
                        style={{ textShadow: '0 1px 3px #000' }}>
                        {slot.name ?? <span className="text-slate-500 tracking-wider uppercase text-[9px]">{slot.group}</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2 flex-wrap mt-3">
                <button onClick={autoFill} className="px-3 py-2 rounded-lg border border-white/10 text-slate-300 text-xs hover:border-[#00d4aa] hover:text-[#00d4aa] transition">⚡ Auto-pick league stars</button>
                <button onClick={clearXi} className="px-3 py-2 rounded-lg border border-white/10 text-slate-300 text-xs hover:border-white/20 transition">Clear</button>
              </div>
              <div className="text-[11px] text-slate-500 font-mono mt-3">Or fill all empty slots at a tier:</div>
              <div className="grid grid-cols-5 gap-1.5 mt-2">
                {([['World', 89], ['Elite', 84], ['Strong', 79], ['Solid', 74], ['Plucky', 69]] as [string, number][]).map(([lab, base]) => (
                  <button key={lab} onClick={() => fillTier(base)}
                    className="rounded-lg border border-white/10 px-1 py-2 text-center text-[10px] font-bold uppercase text-slate-400 hover:border-[#00d4aa] hover:text-[#00d4aa] transition">
                    {lab}<b className="block font-mono text-sm text-white">{base}</b>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="bg-[#111827] border border-white/5 rounded-xl p-5">
                <h3 className="text-xs text-slate-500 uppercase tracking-wide font-bold mb-3">Team rating</h3>
                <div className="flex items-end gap-4">
                  <div>
                    <div className="text-6xl font-extrabold text-[#00d4aa] leading-none">{ratings.filled ? ratings.ovr : '--'}</div>
                    <div className="text-[11px] uppercase tracking-wider text-slate-500 font-bold mt-1">Overall</div>
                  </div>
                  <div className="ml-auto text-right">
                    <div className="font-mono text-sm text-slate-400">{ratings.filled}/{xi.length} picked</div>
                    {ratings.filled > 0 && lgAvg > 0 && (
                      <div className="font-mono text-xs mt-1"
                        style={{ color: ratings.ovr - lgAvg >= 0 ? '#7dffa0' : '#ff5d5d' }}>
                        {ratings.ovr - lgAvg >= 0 ? '+' : ''}{(ratings.ovr - lgAvg).toFixed(1)} vs avg · best {lgBest}
                      </div>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-4">
                  {([['Attack', ratings.attLine, '#ff5d5d'], ['Midfield', ratings.midLine, '#00d4aa'], ['Defence', ratings.defLine, '#2fe0bf']] as [string, number, string][]).map(([k, v, col]) => (
                    <div key={k} className="bg-[#0d1117] border border-white/5 rounded-lg p-3 text-center">
                      <div className="font-mono text-2xl font-bold" style={{ color: col }}>{ratings.filled ? Math.round(v) : '--'}</div>
                      <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mt-1">{k}</div>
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={() => setTab('simulate')} disabled={!xiFilled}
                className="w-full mt-4 px-5 py-2.5 bg-[#00d4aa] hover:bg-[#00b899] text-black font-bold rounded-lg transition disabled:opacity-40 text-sm">
                Go to simulation →
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ============ SIMULATE ============ */}
      {tab === 'simulate' && (
        <section>
          <p className="text-[#00d4aa] text-xs font-bold uppercase tracking-[0.3em] mb-2">Step 03 — Run the season</p>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white">SIMULATE</h1>
          <p className="text-slate-400 max-w-xl mt-2 text-sm">
            Your club plays everyone home and away. One season gives the full table; the Monte Carlo
            runs hundreds of seasons for your true title, top-four and relegation probabilities.
          </p>

          <div className="grid md:grid-cols-2 gap-4 mt-5">
            <div className="bg-[#111827] border border-white/5 rounded-xl p-5">
              <h3 className="text-xs text-slate-500 uppercase tracking-wide font-bold mb-2">① Headline season</h3>
              <p className="text-slate-400 text-sm mb-4">One full simulated campaign — builds the table, fixtures, xG and player contributions.</p>
              <button onClick={runOne} className="px-5 py-2.5 bg-[#00d4aa] hover:bg-[#00b899] text-black font-bold rounded-lg transition text-sm">▶ Simulate one season</button>
            </div>
            <div className="bg-[#111827] border border-white/5 rounded-xl p-5">
              <h3 className="text-xs text-slate-500 uppercase tracking-wide font-bold mb-2">② Monte Carlo</h3>
              <p className="text-slate-400 text-sm mb-3">Repeat the season many times to find where your club really finishes.</p>
              <label className="block mb-3">
                <span className="text-[11px] uppercase tracking-wider text-slate-500 font-bold block mb-2">Number of seasons</span>
                <select value={mcN} onChange={e => setMcN(Number(e.target.value))}
                  className="w-full bg-[#0d1117] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm font-semibold outline-none focus:border-[#00d4aa]">
                  <option value={200}>200 (fast)</option>
                  <option value={500}>500</option>
                  <option value={1000}>1000</option>
                  <option value={2000}>2000 (slow)</option>
                </select>
              </label>
              <div className="flex items-center gap-3">
                <button onClick={runMC} disabled={mcRunning}
                  className="px-5 py-2.5 bg-[#00d4aa] hover:bg-[#00b899] text-black font-bold rounded-lg transition text-sm disabled:opacity-40 whitespace-nowrap">▶ Run Monte Carlo</button>
                <div className="flex-1 h-2 bg-[#0d1117] border border-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#00d4aa] to-[#2fe0bf] transition-all" style={{ width: `${mcProgress}%` }} />
                </div>
              </div>
            </div>
          </div>

          {simStatus && <p className="mt-5 text-slate-300 font-mono text-sm">{simStatus}</p>}
          <button onClick={() => setTab('analytics')} disabled={!season}
            className="mt-5 px-5 py-2.5 border border-white/10 text-slate-300 rounded-lg text-sm hover:border-[#00d4aa] hover:text-[#00d4aa] transition disabled:opacity-40">
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
          <div className="w-full max-w-lg bg-[#111827] border border-white/10 rounded-2xl p-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-extrabold text-white">Pick a player</h3>
                <p className="text-slate-500 text-xs font-mono mt-0.5">{POS_LABEL[xi[activeSlot].group]}</p>
              </div>
              <button onClick={() => setActiveSlot(null)} className="text-slate-500 text-2xl leading-none hover:text-white">×</button>
            </div>
            <input value={search} onChange={e => setSearch(e.target.value)} autoFocus placeholder="Search players…"
              className="w-full mt-4 bg-[#0d1117] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-[#00d4aa]" />
            <div className="max-h-72 overflow-auto flex flex-col gap-1.5 mt-3">
              {pickList.length === 0
                ? <p className="text-slate-600 text-sm font-mono p-2">No match — create a custom player below.</p>
                : pickList.slice(0, 50).map((p, i) => (
                  <button key={`${p.name}-${i}`} onClick={() => assign(p.name, p.ovr)}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg border border-white/5 bg-[#0d1117] hover:border-[#00d4aa] transition text-left">
                    <span className="w-9 h-9 rounded-lg grid place-items-center font-mono font-bold text-sm bg-[#00d4aa] text-black">{p.ovr}</span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-bold text-white truncate">{p.name}</span>
                      <span className="block text-[10px] uppercase tracking-wider text-slate-500 font-bold">{xi[activeSlot].group}</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-600 truncate max-w-[120px]">{p.sub}</span>
                  </button>
                ))}
            </div>
            <div className="border-t border-white/5 mt-4 pt-4">
              <div className="text-[11px] uppercase tracking-wider text-slate-500 font-bold mb-2">Or create your own</div>
              <input value={customName} onChange={e => setCustomName(e.target.value)} placeholder="Player name"
                className="w-full bg-[#0d1117] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-[#00d4aa] mb-3" />
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-slate-500 font-bold tracking-wide">RATING</span>
                <input type="range" min={45} max={99} value={customOvr} onChange={e => setCustomOvr(Number(e.target.value))}
                  className="flex-1 accent-[#00d4aa]" />
                <span className="font-mono font-bold bg-[#00d4aa] text-black rounded-lg px-2.5 py-1.5 min-w-[42px] text-center text-sm">{customOvr}</span>
                <button onClick={() => assign(customName.trim() || `${xi[activeSlot!].group} player`, customOvr)}
                  className="px-4 py-2 bg-[#00d4aa] hover:bg-[#00b899] text-black font-bold rounded-lg text-sm">Add</button>
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
      <div className="text-center py-20 text-slate-500">
        <div className="text-5xl opacity-40">📊</div>
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

  const axis = { fill: '#869186', fontSize: 11 };
  const grid = 'rgba(255,255,255,.06)';

  return (
    <section>
      <p className="text-[#00d4aa] text-xs font-bold uppercase tracking-[0.3em] mb-2">Step 04 — The numbers</p>
      <h1 className="text-2xl md:text-3xl font-extrabold text-white mb-5">ANALYTICS</h1>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {kpis.map((k, i) => (
          <div key={i} className="bg-[#111827] border border-white/5 rounded-xl p-4">
            <div className="text-3xl font-extrabold text-[#00d4aa] leading-none">{k.v}</div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mt-2">{k.k}</div>
            {k.sub && <div className="text-[11px] text-slate-600 font-mono mt-1">{k.sub}</div>}
          </div>
        ))}
      </div>

      {/* table */}
      <div className="bg-[#111827] border border-white/5 rounded-xl p-5 mt-5">
        <h3 className="text-xs text-slate-500 uppercase tracking-wide font-bold mb-3">{cfg.name} — final table</h3>
        <div className="overflow-auto rounded-lg border border-white/5">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="text-[10px] uppercase tracking-wide text-slate-500 bg-[#0d1117]">
                <th className="text-right px-2 py-2.5">#</th>
                <th className="text-left px-2 py-2.5">Club</th>
                {['P', 'W', 'D', 'L', 'GF', 'GA', 'GD', 'xG', 'Pts'].map(h => <th key={h} className="text-right px-2 py-2.5">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {season.map((r, i) => {
                const pos = i + 1;
                let zone = '';
                if (pos <= cfg.cont) zone = 'bg-[#164e3a]/40';
                else if (pos <= cfg.eur) zone = 'bg-[#1a3a2a]/30';
                else if (pos > relCut) zone = 'bg-[#3a1a1a]/30';
                const gd = r.GF - r.GA;
                return (
                  <tr key={r.team.name} className={r.team.isUser ? 'bg-[#00d4aa]/15' : zone}>
                    <td className={`text-right px-2 py-2 font-mono text-slate-500${r.team.isUser ? ' border-l-4 border-l-[#00d4aa]' : ''}`}>{pos}</td>
                    <td className={`text-left px-2 py-2 font-bold ${r.team.isUser ? 'text-[#00d4aa]' : 'text-white'}`}>
                      <span className="inline-block w-2 h-2 rounded-full mr-2 align-middle" style={{ background: r.team.isUser ? color : '#3a4a3a' }} />
                      {r.team.name}
                    </td>
                    <td className="text-right px-2 py-2 font-mono text-slate-400">{r.P}</td>
                    <td className="text-right px-2 py-2 font-mono text-slate-400">{r.W}</td>
                    <td className="text-right px-2 py-2 font-mono text-slate-400">{r.D}</td>
                    <td className="text-right px-2 py-2 font-mono text-slate-400">{r.L}</td>
                    <td className="text-right px-2 py-2 font-mono text-slate-400">{r.GF}</td>
                    <td className="text-right px-2 py-2 font-mono text-slate-400">{r.GA}</td>
                    <td className="text-right px-2 py-2 font-mono text-slate-400">{gd >= 0 ? '+' : ''}{gd}</td>
                    <td className="text-right px-2 py-2 font-mono text-slate-600">{r.xGF.toFixed(0)}</td>
                    <td className="text-right px-2 py-2 font-mono font-bold text-white">{r.pts}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex gap-4 flex-wrap mt-3 text-[11px] text-slate-500 font-mono">
          <span className="flex items-center gap-1.5"><b className="w-2 h-2 rounded-sm bg-[#2fe0bf]" />Champions / continental</span>
          <span className="flex items-center gap-1.5"><b className="w-2 h-2 rounded-sm bg-[#00d4aa]" />Europe</span>
          <span className="flex items-center gap-1.5"><b className="w-2 h-2 rounded-sm bg-[#ff5d5d]" />Relegation</span>
          <span className="flex items-center gap-1.5"><b className="w-2 h-2 rounded-sm bg-[#00d4aa] ring-2 ring-[#00d4aa]" />Your club</span>
        </div>
      </div>

      {/* charts row 1 */}
      <div className="grid md:grid-cols-2 gap-4 mt-4">
        <div className="bg-[#111827] border border-white/5 rounded-xl p-5">
          <h3 className="text-xs uppercase tracking-wide text-slate-500 font-bold">Title race — points by position</h3>
          <p className="text-[11px] text-slate-600 font-mono mb-3">Final points of every club, your team highlighted</p>
          <div style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pointsData} layout="vertical" margin={{ left: 8, right: 12 }}>
                <CartesianGrid stroke={grid} horizontal={false} />
                <XAxis type="number" tick={axis} stroke={grid} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#869186', fontSize: 9 }} width={90} stroke={grid} />
                <Tooltip cursor={{ fill: 'rgba(255,255,255,.04)' }} contentStyle={{ background: '#0d1117', border: '1px solid #28342a', borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [`${v} pts`, 'Points']} />
                <Bar dataKey="pts" radius={[0, 4, 4, 0]}>
                  {pointsData.map((d, i) => <Cell key={i} fill={d.isUser ? color : '#243024'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-[#111827] border border-white/5 rounded-xl p-5">
          <h3 className="text-xs uppercase tracking-wide text-slate-500 font-bold">xG vs actual goals</h3>
          <p className="text-[11px] text-slate-600 font-mono mb-3">Over the line = clinical · under = wasteful</p>
          <div style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ left: 4, right: 12, bottom: 8 }}>
                <CartesianGrid stroke={grid} />
                <XAxis type="number" dataKey="x" name="xG" domain={[0, Math.ceil(xgMax)]} tick={axis} stroke={grid} label={{ value: 'Expected goals (xG)', fill: '#869186', fontSize: 11, position: 'insideBottom', offset: -2 }} />
                <YAxis type="number" dataKey="y" name="Goals" domain={[0, Math.ceil(xgMax)]} tick={axis} stroke={grid} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ background: '#0d1117', border: '1px solid #28342a', borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number, n2: string) => [v, n2]} labelFormatter={() => ''} />
                <ReferenceLine segment={[{ x: 0, y: 0 }, { x: xgMax, y: xgMax }]} stroke="#5d6a5d" strokeDasharray="6 5" />
                <Scatter name="Clubs" data={xgClubs} fill="#4a5a4a" />
                <Scatter name="Your club" data={xgYou} fill={color} shape="diamond" />
                <Legend wrapperStyle={{ fontSize: 11, color: '#869186' }} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* charts row 2 */}
      <div className="grid md:grid-cols-2 gap-4 mt-4">
        <div className="bg-[#111827] border border-white/5 rounded-xl p-5">
          <h3 className="text-xs uppercase tracking-wide text-slate-500 font-bold">Your title charge</h3>
          <p className="text-[11px] text-slate-600 font-mono mb-3">Cumulative points vs league average pace</p>
          <div style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={formData} margin={{ left: 4, right: 12, bottom: 8 }}>
                <CartesianGrid stroke={grid} />
                <XAxis dataKey="gw" tick={axis} stroke={grid} label={{ value: 'Matchday', fill: '#869186', fontSize: 11, position: 'insideBottom', offset: -2 }} />
                <YAxis tick={axis} stroke={grid} />
                <Tooltip contentStyle={{ background: '#0d1117', border: '1px solid #28342a', borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="you" name={clubName || 'You'} stroke={color} strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="avg" name="League avg pace" stroke="#5d6a5d" strokeDasharray="6 4" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-[#111827] border border-white/5 rounded-xl p-5">
          <h3 className="text-xs uppercase tracking-wide text-slate-500 font-bold">Where you finish — Monte Carlo</h3>
          <p className="text-[11px] text-slate-600 font-mono mb-3">
            {mc ? `${mc.n} seasons · how often you finish in each position` : 'Run the Monte Carlo on the Simulate tab'}
          </p>
          <div style={{ height: 320 }}>
            {mc ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={finishData} margin={{ left: 4, right: 12, bottom: 8 }}>
                  <CartesianGrid stroke={grid} vertical={false} />
                  <XAxis dataKey="pos" tick={axis} stroke={grid} label={{ value: 'Final position', fill: '#869186', fontSize: 11, position: 'insideBottom', offset: -2 }} />
                  <YAxis tick={axis} stroke={grid} unit="%" />
                  <Tooltip cursor={{ fill: 'rgba(255,255,255,.04)' }} contentStyle={{ background: '#0d1117', border: '1px solid #28342a', borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [`${v}%`, 'of seasons']} labelFormatter={(l) => ordinal(Number(l))} />
                  <Bar dataKey="pct" radius={[3, 3, 0, 0]}>
                    {finishData.map((d) => {
                      let c = '#2f4a3a';
                      if (d.pos <= mc.contCut) c = color;
                      else if (d.pos > mc.relCut) c = '#ff5d5d';
                      return <Cell key={d.pos} fill={c} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full grid place-items-center text-slate-600 text-sm">No Monte Carlo data yet.</div>
            )}
          </div>
        </div>
      </div>

      {/* fixtures + contributions */}
      <div className="grid md:grid-cols-2 gap-4 mt-4">
        <div className="bg-[#111827] border border-white/5 rounded-xl p-5">
          <h3 className="text-xs uppercase tracking-wide text-slate-500 font-bold">Your fixtures &amp; results</h3>
          <div className="flex items-center gap-2 mt-2 mb-2">
            <span className="text-[11px] text-slate-500 font-mono">Recent form</span>
            <div className="flex gap-1">
              {form5.map((r, i) => (
                <b key={i} className="w-5 h-5 rounded grid place-items-center font-mono text-[11px] font-bold"
                  style={{ background: r.r === 'W' ? '#7dffa0' : r.r === 'D' ? '#869186' : '#ff5d5d', color: r.r === 'L' ? '#fff' : '#0b0f08' }}>{r.r}</b>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1.5 max-h-[430px] overflow-auto">
            {you.results.map((r, i) => {
              const hm = r.venue === 'H' ? name : r.opp;
              const aw = r.venue === 'H' ? r.opp : name;
              const sc = r.venue === 'H' ? `${r.gf}–${r.ga}` : `${r.ga}–${r.gf}`;
              return (
                <div key={i} className="grid grid-cols-[24px_1fr_auto_1fr_48px] gap-2 items-center px-3 py-2 rounded-lg border border-white/5 bg-[#0d1117] text-sm">
                  <span className="font-mono text-slate-600 text-[11px]">{i + 1}</span>
                  <span className={`text-right font-bold truncate ${r.venue === 'H' ? 'text-[#00d4aa]' : 'text-slate-300'}`}>{hm}</span>
                  <span className="font-mono font-bold bg-[#111827] border border-white/10 rounded px-2 py-0.5 text-center text-white">{sc}</span>
                  <span className={`text-left font-bold truncate ${r.venue === 'A' ? 'text-[#00d4aa]' : 'text-slate-300'}`}>{aw}</span>
                  <span className="font-mono font-bold text-center rounded py-0.5"
                    style={{ background: r.r === 'W' ? '#7dffa0' : r.r === 'D' ? '#869186' : '#ff5d5d', color: r.r === 'L' ? '#fff' : '#0b0f08' }}>{r.r}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="bg-[#111827] border border-white/5 rounded-xl p-5">
          <h3 className="text-xs uppercase tracking-wide text-slate-500 font-bold">Player contributions</h3>
          <p className="text-[11px] text-slate-600 font-mono mt-0.5 mb-2">Modelled goals + assists from your XI this season</p>
          <div className="flex flex-col gap-1.5 max-h-[420px] overflow-auto">
            {contribRows.map((r, i) => (
              <div key={i} className="grid grid-cols-[1fr_auto] gap-2 items-center px-3 py-2 rounded-lg border border-white/5 bg-[#0d1117]">
                <div>
                  <div className="font-bold text-sm text-white">{r.p.name}</div>
                  <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">{r.p.group} · {r.p.ovr}</div>
                </div>
                <div className="font-mono text-xs text-right">
                  <b className="text-[#00d4aa]">{r.g} G</b> · <i className="text-[#2fe0bf] not-italic">{r.a} A</i>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-10 pt-5 border-t border-white/5 text-slate-600 text-[11px] leading-relaxed">
        <span className="inline-block bg-[#111827] border border-white/5 rounded-full px-3 py-1 font-mono mr-2">Independent model</span>
        THE GAFFER is a fan-made analytics toy. Team and player ratings are independent estimates from public data, used descriptively only. Match outcomes use a Poisson goals model driven by attack/defence strength plus home advantage.
      </div>
    </section>
  );
}
