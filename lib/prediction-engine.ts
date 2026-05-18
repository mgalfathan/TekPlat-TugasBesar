import { prisma } from '@/lib/prisma';

const FINISHED = ['FT', 'AET', 'PEN', 'FINISHED'];
const MAX_GOALS = 7;

interface MatchScore { homeScore: number | null; awayScore: number | null }
interface MatchScoreWithDate extends MatchScore { utcDate: Date }

interface LeagueAvg { home: number; away: number; count: number }
interface TeamProfile {
  attackHome: number; attackAway: number;
  defenseHome: number; defenseAway: number;
  matches: number;
  recentForm: number;
}

export interface PredictionResult {
  homeWinProbability: number;
  drawProbability: number;
  awayWinProbability: number;
  predictedHomeGoals: number;
  predictedAwayGoals: number;
  confidence: number;
  explanation: string;
  factors: string;
}

function poisson(lambda: number, k: number): number {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  let p = Math.exp(-lambda);
  for (let i = 1; i <= k; i++) p *= lambda / i;
  return p;
}

function buildMatchFilter(leagueId?: number, season?: string) {
  const w: Record<string, unknown> = { statusShort: { in: FINISHED } };
  if (leagueId) w.leagueId = leagueId;
  if (season) w.season = { year: season };
  return w;
}

async function computeLeagueAverages(leagueId?: number, season?: string): Promise<LeagueAvg> {
  const where = buildMatchFilter(leagueId, season);
  const matches = await prisma.match.findMany({ where, select: { homeScore: true, awayScore: true } });
  if (matches.length === 0) return { home: 1.4, away: 1.1, count: 0 };
  let h = 0, a = 0;
  for (const m of matches) { h += m.homeScore ?? 0; a += m.awayScore ?? 0; }
  return { home: h / matches.length, away: a / matches.length, count: matches.length };
}

function recentFormScore(matches: MatchScoreWithDate[], teamId: number, isHomeArray: boolean[]): number {
  if (matches.length === 0) return 0.5;
  const sorted = [...matches].sort((a, b) => b.utcDate.getTime() - a.utcDate.getTime()).slice(0, 5);
  if (sorted.length === 0) return 0.5;
  let points = 0;
  sorted.forEach((m, idx) => {
    const h = m.homeScore ?? 0, a = m.awayScore ?? 0;
    const isHome = isHomeArray[matches.indexOf(m)] ?? true;
    const won = isHome ? h > a : a > h;
    const drew = h === a;
    if (won) points += 3;
    else if (drew) points += 1;
  });
  return points / (sorted.length * 3);
}

async function buildTeamProfile(teamId: number, league: LeagueAvg, leagueId?: number, season?: string): Promise<TeamProfile> {
  const where = buildMatchFilter(leagueId, season);
  const [homeMatches, awayMatches] = await Promise.all([
    prisma.match.findMany({ where: { homeTeamId: teamId, ...where }, select: { homeScore: true, awayScore: true, utcDate: true }, orderBy: { utcDate: 'desc' }, take: 30 }),
    prisma.match.findMany({ where: { awayTeamId: teamId, ...where }, select: { homeScore: true, awayScore: true, utcDate: true }, orderBy: { utcDate: 'desc' }, take: 30 }),
  ]);

  const safe = (n: number, fallback = 1) => (Number.isFinite(n) && n > 0 ? n : fallback);

  let hgf = 0, hga = 0;
  for (const m of homeMatches) { hgf += m.homeScore ?? 0; hga += m.awayScore ?? 0; }
  let agf = 0, aga = 0;
  for (const m of awayMatches) { agf += m.awayScore ?? 0; aga += m.homeScore ?? 0; }

  const homePlayed = homeMatches.length, awayPlayed = awayMatches.length;

  const teamHomeGFAvg = homePlayed > 0 ? hgf / homePlayed : league.home;
  const teamHomeGAAvg = homePlayed > 0 ? hga / homePlayed : league.away;
  const teamAwayGFAvg = awayPlayed > 0 ? agf / awayPlayed : league.away;
  const teamAwayGAAvg = awayPlayed > 0 ? aga / awayPlayed : league.home;

  const attackHome = teamHomeGFAvg / safe(league.home);
  const attackAway = teamAwayGFAvg / safe(league.away);
  const defenseHome = teamHomeGAAvg / safe(league.away);
  const defenseAway = teamAwayGAAvg / safe(league.home);

  // Combined recent form across last 5 matches (home + away interleaved)
  const all: Array<{ m: MatchScoreWithDate; isHome: boolean }> = [
    ...homeMatches.map(m => ({ m, isHome: true })),
    ...awayMatches.map(m => ({ m, isHome: false })),
  ].sort((a, b) => b.m.utcDate.getTime() - a.m.utcDate.getTime()).slice(0, 5);
  let formPoints = 0;
  for (const { m, isHome } of all) {
    const h = m.homeScore ?? 0, a = m.awayScore ?? 0;
    const won = isHome ? h > a : a > h;
    const drew = h === a;
    if (won) formPoints += 3;
    else if (drew) formPoints += 1;
  }
  const recentForm = all.length > 0 ? formPoints / (all.length * 3) : 0.5;

  return {
    attackHome, attackAway, defenseHome, defenseAway,
    matches: homePlayed + awayPlayed,
    recentForm,
  };
}

async function h2hRecord(homeTeamId: number, awayTeamId: number) {
  const matches = await prisma.match.findMany({
    where: {
      statusShort: { in: FINISHED },
      OR: [
        { homeTeamId, awayTeamId },
        { homeTeamId: awayTeamId, awayTeamId: homeTeamId },
      ],
    },
    select: { homeTeamId: true, homeScore: true, awayScore: true },
    orderBy: { utcDate: 'desc' },
    take: 10,
  });
  let homeWins = 0, draws = 0, awayWins = 0;
  for (const m of matches) {
    const h = m.homeScore ?? 0, a = m.awayScore ?? 0;
    const fromHomeTeamsPerspective = m.homeTeamId === homeTeamId ? h - a : a - h;
    if (fromHomeTeamsPerspective > 0) homeWins++;
    else if (fromHomeTeamsPerspective < 0) awayWins++;
    else draws++;
  }
  return { homeWins, draws, awayWins, count: matches.length };
}

export async function predictMatch(homeTeamId: number, awayTeamId: number, leagueId?: number, season?: string): Promise<PredictionResult> {
  const league = await computeLeagueAverages(leagueId, season);
  const [home, away, h2h] = await Promise.all([
    buildTeamProfile(homeTeamId, league, leagueId, season),
    buildTeamProfile(awayTeamId, league, leagueId, season),
    h2hRecord(homeTeamId, awayTeamId),
  ]);

  // Expected goals from Poisson model
  let lambdaH = home.attackHome * away.defenseAway * league.home;
  let lambdaA = away.attackAway * home.defenseHome * league.away;

  // Recent form adjustment: ±15% based on deviation from 0.5
  lambdaH *= 1 + (home.recentForm - 0.5) * 0.3;
  lambdaA *= 1 + (away.recentForm - 0.5) * 0.3;

  // Guard rails
  lambdaH = Math.max(0.2, Math.min(5, lambdaH));
  lambdaA = Math.max(0.2, Math.min(5, lambdaA));

  // Build scoreline matrix
  let pHome = 0, pDraw = 0, pAway = 0;
  for (let x = 0; x <= MAX_GOALS; x++) {
    for (let y = 0; y <= MAX_GOALS; y++) {
      const p = poisson(lambdaH, x) * poisson(lambdaA, y);
      if (x > y) pHome += p;
      else if (x === y) pDraw += p;
      else pAway += p;
    }
  }

  // Apply H2H adjustment (max ±10% shift) only when H2H sample is meaningful
  if (h2h.count >= 3) {
    const h2hHome = h2h.homeWins / h2h.count;
    const h2hAway = h2h.awayWins / h2h.count;
    const weight = Math.min(0.2, h2h.count / 50); // up to 20% weight
    pHome = pHome * (1 - weight) + h2hHome * weight;
    pAway = pAway * (1 - weight) + h2hAway * weight;
    pDraw = 1 - pHome - pAway;
  }

  // Normalise (numerical safety)
  const total = pHome + pDraw + pAway;
  if (total > 0) { pHome /= total; pDraw /= total; pAway /= total; }

  // Confidence: based on data volume
  const sampleScore = Math.min(1, (home.matches + away.matches) / 40);
  const h2hScore = Math.min(1, h2h.count / 6);
  const confidence = Math.max(0.4, Math.min(0.95, 0.45 + sampleScore * 0.35 + h2hScore * 0.15));

  const factors = JSON.stringify({
    lambdaHome: lambdaH.toFixed(2),
    lambdaAway: lambdaA.toFixed(2),
    leagueHomeAvg: league.home.toFixed(2),
    leagueAwayAvg: league.away.toFixed(2),
    homeAttackStrength: home.attackHome.toFixed(2),
    homeDefenseHome: home.defenseHome.toFixed(2),
    awayAttackStrength: away.attackAway.toFixed(2),
    awayDefenseAway: away.defenseAway.toFixed(2),
    homeForm: home.recentForm.toFixed(2),
    awayForm: away.recentForm.toFixed(2),
    h2hSample: h2h.count, h2hHomeWins: h2h.homeWins, h2hDraws: h2h.draws, h2hAwayWins: h2h.awayWins,
    sampleSize: home.matches + away.matches,
  });

  const dominantP = Math.max(pHome, pDraw, pAway);
  const dominant = dominantP === pHome ? 'home win' : dominantP === pAway ? 'away win' : 'draw';
  const margin = Math.round((dominantP - Math.min(pHome, pAway)) * 100);
  const homeExpStr = lambdaH.toFixed(2);
  const awayExpStr = lambdaA.toFixed(2);
  const h2hPart = h2h.count > 0
    ? ` H2H (${h2h.count} matches, home-perspective): ${h2h.homeWins}W-${h2h.draws}D-${h2h.awayWins}L.`
    : ' No head-to-head history.';
  const explanation = `Poisson model: home expected goals ${homeExpStr}, away ${awayExpStr}. Most likely outcome: ${dominant} (+${margin}%).${h2hPart} Recent form: home ${(home.recentForm * 100).toFixed(0)}%, away ${(away.recentForm * 100).toFixed(0)}%.`;

  return {
    homeWinProbability: Math.round(pHome * 100) / 100,
    drawProbability: Math.round(pDraw * 100) / 100,
    awayWinProbability: Math.round(pAway * 100) / 100,
    predictedHomeGoals: Math.round(lambdaH * 10) / 10,
    predictedAwayGoals: Math.round(lambdaA * 10) / 10,
    confidence: Math.round(confidence * 100) / 100,
    explanation,
    factors,
  };
}
