import type { XiSlot } from './gaffer-data';

// Validated constants — DO NOT change
const MU   = 0.18;
const HOME = 0.26;
const DIV  = 32;

export interface GafferTeam {
  name: string; att: number; def: number;
  ovr: number; color: string; isUser: boolean;
}

export interface FixtureResult {
  opp: string; venue: 'H' | 'A';
  gf: number; ga: number; r: 'W' | 'D' | 'L';
  xg: number; xga: number;
}

export interface StandingRow {
  team: GafferTeam; pos: number;
  P: number; W: number; D: number; L: number;
  GF: number; GA: number; xGF: number; xGA: number;
  pts: number; results: FixtureResult[];
}

export interface MCResult {
  n: number; finish: number[];
  titlePct: number; top4Pct: number; relPct: number;
  avgPts: number; avgPos: number; minPts: number; maxPts: number;
  relCut: number; contCut: number;
}

export function poissonGoals(lambda: number): number {
  const L = Math.exp(-lambda);
  let k = 0, p = 1;
  do { k++; p *= Math.random(); } while (p > L);
  return k - 1;
}

export function expGoals(home: GafferTeam, away: GafferTeam): [number, number] {
  const ha = (home.att - 75) / DIV, hd = (home.def - 75) / DIV;
  const aa = (away.att - 75) / DIV, ad = (away.def - 75) / DIV;
  return [
    Math.min(Math.exp(MU + HOME + ha - ad), 5.6),
    Math.min(Math.exp(MU + aa - hd), 5.6),
  ];
}

function blankRow(team: GafferTeam): StandingRow {
  return { team, pos: 0, P:0, W:0, D:0, L:0, GF:0, GA:0, xGF:0, xGA:0, pts:0, results:[] };
}

function sortRows(a: StandingRow, b: StandingRow): number {
  return b.pts - a.pts || (b.GF - b.GA) - (a.GF - a.GA) || b.GF - a.GF;
}

export function simulateSeasonFull(teams: GafferTeam[]): StandingRow[] {
  const rows = teams.map(blankRow);
  for (let i = 0; i < teams.length; i++) {
    for (let j = 0; j < teams.length; j++) {
      if (i === j) continue;
      const [lh, la] = expGoals(teams[i], teams[j]);
      const gh = poissonGoals(lh), ga = poissonGoals(la);
      const H = rows[i], A = rows[j];
      H.P++; A.P++; H.GF += gh; H.GA += ga; A.GF += ga; A.GA += gh;
      H.xGF += lh; H.xGA += la; A.xGF += la; A.xGA += lh;
      let rH: 'W'|'D'|'L', rA: 'W'|'D'|'L';
      if (gh > ga)       { H.W++; A.L++; H.pts += 3; rH='W'; rA='L'; }
      else if (gh < ga)  { A.W++; H.L++; A.pts += 3; rH='L'; rA='W'; }
      else               { H.D++; A.D++; H.pts++; A.pts++; rH='D'; rA='D'; }
      if (teams[i].isUser) H.results.push({ opp:teams[j].name, venue:'H', gf:gh, ga, r:rH, xg:lh, xga:la });
      if (teams[j].isUser) A.results.push({ opp:teams[i].name, venue:'A', gf:ga, ga:gh, r:rA, xg:la, xga:lh });
    }
  }
  const sorted = [...rows].sort(sortRows);
  sorted.forEach((r, i) => { r.pos = i + 1; });
  return sorted;
}

export function simulateSeasonLean(teams: GafferTeam[], userIdx: number): { pos: number; pts: number } {
  const n = teams.length;
  const pts = new Array<number>(n).fill(0);
  const gd  = new Array<number>(n).fill(0);
  const gf  = new Array<number>(n).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const [lh, la] = expGoals(teams[i], teams[j]);
      const gh = poissonGoals(lh), ga = poissonGoals(la);
      gf[i] += gh; gf[j] += ga; gd[i] += gh-ga; gd[j] += ga-gh;
      if (gh > ga) pts[i] += 3; else if (gh < ga) pts[j] += 3;
      else { pts[i]++; pts[j]++; }
    }
  }
  const order = Array.from({ length: n }, (_, i) => i).sort((a, b) =>
    pts[b] - pts[a] || gd[b] - gd[a] || gf[b] - gf[a]
  );
  let pos = 0;
  for (let k = 0; k < n; k++) if (order[k] === userIdx) { pos = k + 1; break; }
  return { pos, pts: pts[userIdx] };
}

export function runMonteCarlo(
  teams: GafferTeam[], userIdx: number, n: number,
  cfg: { rel: number; contCut: number },
  onProgress: (done: number) => void,
  onDone: (result: MCResult) => void,
): void {
  const finish = new Array<number>(teams.length + 1).fill(0);
  const ptsArr: number[] = [];
  let titles = 0, top4 = 0, releg = 0, sumPts = 0, sumPos = 0, done = 0;
  const BATCH = 50;
  const relCut = teams.length - cfg.rel;

  function runBatch() {
    const end = Math.min(n, done + BATCH);
    for (; done < end; done++) {
      const { pos, pts } = simulateSeasonLean(teams, userIdx);
      finish[pos]++; ptsArr.push(pts); sumPts += pts; sumPos += pos;
      if (pos === 1) titles++;
      if (pos <= cfg.contCut) top4++;
      if (pos > relCut) releg++;
    }
    onProgress(done);
    if (done < n) { setTimeout(runBatch, 0); return; }

    ptsArr.sort((a, b) => a - b);
    onDone({
      n, finish,
      titlePct: 100 * titles / n,
      top4Pct:  100 * top4  / n,
      relPct:   100 * releg / n,
      avgPts:   sumPts / n,
      avgPos:   sumPos / n,
      minPts:   ptsArr[0],
      maxPts:   ptsArr[ptsArr.length - 1],
      relCut, contCut: cfg.contCut,
    });
  }
  setTimeout(runBatch, 0);
}

export function computeTeamRatings(xi: XiSlot[]) {
  const get = (g: string) => xi.filter(p => p && p.group === g && p.ovr);
  const avg = (arr: XiSlot[]) =>
    arr.length ? arr.reduce((s, p) => s + (p.ovr ?? 0), 0) / arr.length : 75;
  const gk = get('GK'), df = get('DEF'), md = get('MID'), at = get('ATT');
  const defLine = (gk.length + df.length) > 0
    ? (avg(gk) * gk.length + avg(df) * df.length) / (gk.length + df.length)
    : 75;
  const midLine = avg(md), attLine = avg(at);
  const attk = 0.55 * attLine + 0.35 * midLine + 0.10 * defLine;
  const defn = 0.55 * defLine + 0.35 * midLine + 0.10 * attLine;
  return {
    attk: +attk.toFixed(1), defn: +defn.toFixed(1),
    ovr: Math.round((attk + defn) / 2),
    attLine, midLine, defLine,
    filled: xi.filter(p => p?.ovr).length,
  };
}

export function buildTeamList(
  leagueTeams: { name: string; attackRating: number; defenseRating: number; overallRating: number }[],
  user: { name: string; color: string; att: number; def: number; ovr: number },
): GafferTeam[] {
  const teams: GafferTeam[] = leagueTeams.map(t => ({
    name: t.name, att: t.attackRating, def: t.defenseRating,
    ovr: t.overallRating, color: '#2a3a2a', isUser: false,
  }));
  teams.push({ ...user, isUser: true });
  return teams;
}
