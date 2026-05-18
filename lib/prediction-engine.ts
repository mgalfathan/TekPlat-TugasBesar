import { prisma } from '@/lib/prisma';

const FINISHED = ['FT', 'AET', 'PEN', 'FINISHED'];

interface TeamProfile {
  avgGoalsFor: number; avgGoalsAgainst: number;
  winRate: number; drawRate: number;
  homeWinRate: number; awayWinRate: number;
  recentForm: number; rank: number; played: number;
}

async function buildTeamProfile(teamId: number, leagueId?: number, season?: string): Promise<TeamProfile> {
  const base: Record<string, unknown> = { statusShort: { in: FINISHED } };
  if (leagueId) base.leagueId = leagueId;
  if (season) base.season = { year: season };

  const [homeMatches, awayMatches, standing] = await Promise.all([
    prisma.match.findMany({ where: { homeTeamId: teamId, ...base }, orderBy: { utcDate: 'desc' }, take: 20, select: { homeScore: true, awayScore: true } }),
    prisma.match.findMany({ where: { awayTeamId: teamId, ...base }, orderBy: { utcDate: 'desc' }, take: 20, select: { homeScore: true, awayScore: true } }),
    prisma.standing.findFirst({ where: { teamId, ...(leagueId ? { leagueId } : {}) }, orderBy: { createdAt: 'desc' } }),
  ]);

  let gf = 0, ga = 0, wins = 0, draws = 0, losses = 0, homeWins = 0, awayWins = 0;
  for (const m of homeMatches) {
    const h = m.homeScore ?? 0, a = m.awayScore ?? 0;
    gf += h; ga += a;
    if (h > a) { wins++; homeWins++; } else if (h === a) draws++; else losses++;
  }
  for (const m of awayMatches) {
    const h = m.homeScore ?? 0, a = m.awayScore ?? 0;
    gf += a; ga += h;
    if (a > h) { wins++; awayWins++; } else if (a === h) draws++; else losses++;
  }
  const played = wins + draws + losses || 1;
  const recent5: number[] = [
    ...homeMatches.slice(0, 5).map(m => (m.homeScore ?? 0) > (m.awayScore ?? 0) ? 3 : (m.homeScore ?? 0) === (m.awayScore ?? 0) ? 1 : 0),
    ...awayMatches.slice(0, 5).map(m => (m.awayScore ?? 0) > (m.homeScore ?? 0) ? 3 : (m.awayScore ?? 0) === (m.homeScore ?? 0) ? 1 : 0),
  ].slice(0, 5);
  return {
    avgGoalsFor: gf / played, avgGoalsAgainst: ga / played,
    winRate: wins / played, drawRate: draws / played,
    homeWinRate: homeWins / (homeMatches.length || 1),
    awayWinRate: awayWins / (awayMatches.length || 1),
    recentForm: recent5.reduce((s, v) => s + v, 0) / 15,
    rank: standing?.rank ?? 99, played,
  };
}

export interface PredictionResult {
  homeWinProbability: number; drawProbability: number; awayWinProbability: number;
  predictedHomeGoals: number; predictedAwayGoals: number;
  confidence: number; explanation: string; factors: string;
}

export async function predictMatch(homeTeamId: number, awayTeamId: number, leagueId?: number, season?: string): Promise<PredictionResult> {
  const [home, away] = await Promise.all([
    buildTeamProfile(homeTeamId, leagueId, season),
    buildTeamProfile(awayTeamId, leagueId, season),
  ]);

  const h2h = await prisma.match.findMany({
    where: { statusShort: { in: FINISHED }, OR: [{ homeTeamId, awayTeamId }, { homeTeamId: awayTeamId, awayTeamId: homeTeamId }] },
    orderBy: { utcDate: 'desc' }, take: 10, select: { homeTeamId: true, homeScore: true, awayScore: true },
  });
  let h2hHome = 0, h2hDraw = 0, h2hAway = 0;
  for (const m of h2h) {
    const isHome = m.homeTeamId === homeTeamId;
    const hg = m.homeScore ?? 0, ag = m.awayScore ?? 0;
    if (hg > ag) { isHome ? h2hHome++ : h2hAway++; }
    else if (hg === ag) h2hDraw++;
    else { isHome ? h2hAway++ : h2hHome++; }
  }
  const h2hT = h2h.length || 1;
  const rankAdv = Math.max(-1, Math.min(1, (away.rank - home.rank) / 20));

  const hs = home.winRate * 3 + home.recentForm * 2 + home.homeWinRate * 2 + h2hHome / h2hT + rankAdv * 0.5 + 0.3;
  const as_ = away.winRate * 3 + away.recentForm * 2 + away.awayWinRate * 2 + h2hAway / h2hT - rankAdv * 0.5;
  const ds = (home.drawRate + away.drawRate) * 2 + (h2hDraw / h2hT) * 1.5 + 1.2;
  const tot = hs + as_ + ds;

  const homeWin = hs / tot, awayWin = as_ / tot, draw = ds / tot;
  const phg = Math.max(0, home.avgGoalsFor * 0.6 + away.avgGoalsAgainst * 0.4);
  const pag = Math.max(0, away.avgGoalsFor * 0.6 + home.avgGoalsAgainst * 0.4);
  const confidence = Math.min(0.95, 0.4 + Math.min(home.played, away.played) / 40 + (h2h.length > 3 ? 0.1 : 0));

  const factors = JSON.stringify({ homeForm: home.recentForm.toFixed(2), awayForm: away.recentForm.toFixed(2), homeWinRate: home.winRate.toFixed(2), awayWinRate: away.winRate.toFixed(2), homeRank: home.rank, awayRank: away.rank, h2hMatches: h2h.length, h2hHome, h2hDraw, h2hAway });
  const dominant = homeWin > 0.5 ? 'home team' : awayWin > 0.5 ? 'away team' : 'neither team';
  const explanation = `${dominant !== 'neither team' ? `${dominant} shows stronger metrics.` : 'Teams evenly matched.'} ${h2h.length > 0 ? `H2H: ${h2hHome}W-${h2hDraw}D-${h2hAway}L (home perspective).` : 'No H2H history.'} Probabilistic prediction based on available historical data.`;

  return {
    homeWinProbability: Math.round(homeWin * 100) / 100,
    drawProbability: Math.round(draw * 100) / 100,
    awayWinProbability: Math.round(awayWin * 100) / 100,
    predictedHomeGoals: Math.round(phg * 10) / 10,
    predictedAwayGoals: Math.round(pag * 10) / 10,
    confidence: Math.round(confidence * 100) / 100,
    explanation, factors,
  };
}
