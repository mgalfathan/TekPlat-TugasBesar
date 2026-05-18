import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { evaluateFormula } from '@/lib/metrics/customMetricEngine';

const FINISHED = ['FT', 'AET', 'PEN', 'FINISHED'];

function parseFirstNumber(s: string | null | undefined): number {
  if (!s) return 0;
  const m = s.match(/(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : 0;
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const metricId = parseInt(params.id);
    if (isNaN(metricId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const leagueId = searchParams.get('leagueId');
    const season = searchParams.get('season');

    const metric = await prisma.customMetric.findUniqueOrThrow({ where: { id: metricId } });

    if (metric.scope === 'team') {
      return await computeTeamResults(metric, leagueId, season);
    }
    return await computePlayerResults(metric, leagueId, season);
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}

async function computeTeamResults(metric: { id: number; name: string; formula: string; scope: string }, leagueId: string | null, season: string | null) {
  const matchWhere: Record<string, unknown> = { statusShort: { in: FINISHED } };
  if (leagueId) matchWhere.leagueId = parseInt(leagueId);
  if (season) matchWhere.season = { year: season };

  const teamWhere = leagueId
    ? { OR: [{ homeMatches: { some: matchWhere } }, { awayMatches: { some: matchWhere } }] }
    : {};

  const teams = await prisma.team.findMany({
    where: teamWhere,
    include: {
      homeMatches: { where: matchWhere, select: { homeScore: true, awayScore: true } },
      awayMatches: { where: matchWhere, select: { homeScore: true, awayScore: true } },
    },
  });

  const results = teams.map(team => {
    let homeWins = 0, homeDraws = 0, homeLosses = 0, homeGf = 0, homeGa = 0;
    let awayWins = 0, awayDraws = 0, awayLosses = 0, awayGf = 0, awayGa = 0;
    let cleanSheets = 0, failedToScore = 0, bigWins = 0, heavyLosses = 0;

    for (const m of team.homeMatches) {
      const h = m.homeScore ?? 0, a = m.awayScore ?? 0;
      homeGf += h; homeGa += a;
      if (a === 0) cleanSheets++;
      if (h === 0) failedToScore++;
      if (h - a >= 3) bigWins++;
      if (a - h >= 3) heavyLosses++;
      if (h > a) homeWins++; else if (h === a) homeDraws++; else homeLosses++;
    }
    for (const m of team.awayMatches) {
      const h = m.homeScore ?? 0, a = m.awayScore ?? 0;
      awayGf += a; awayGa += h;
      if (h === 0) cleanSheets++;
      if (a === 0) failedToScore++;
      if (a - h >= 3) bigWins++;
      if (h - a >= 3) heavyLosses++;
      if (a > h) awayWins++; else if (h === a) awayDraws++; else awayLosses++;
    }

    const wins = homeWins + awayWins;
    const draws = homeDraws + awayDraws;
    const losses = homeLosses + awayLosses;
    const homePlayed = homeWins + homeDraws + homeLosses;
    const awayPlayed = awayWins + awayDraws + awayLosses;
    const mp = wins + draws + losses;
    if (mp === 0) return null;

    const gf = homeGf + awayGf;
    const ga = homeGa + awayGa;

    const vars: Record<string, number> = {
      matches_played: mp, wins, draws, losses, points: wins * 3 + draws,
      goals_for: gf, goals_against: ga, goal_difference: gf - ga,
      win_rate: wins / mp, draw_rate: draws / mp, loss_rate: losses / mp,
      goals_for_per_match: gf / mp, goals_against_per_match: ga / mp,
      clean_sheets: cleanSheets, failed_to_score: failedToScore,
      home_wins: homeWins, away_wins: awayWins,
      home_played: homePlayed, away_played: awayPlayed,
      home_goals_for: homeGf, home_goals_against: homeGa,
      away_goals_for: awayGf, away_goals_against: awayGa,
      big_wins: bigWins, heavy_losses: heavyLosses,
    };

    try {
      const score = evaluateFormula(metric.formula, vars);
      if (!Number.isFinite(score)) return null;
      return { teamId: team.id, teamName: team.name, logo: team.logo, score, matches_played: mp };
    } catch { return null; }
  }).filter(Boolean).sort((a, b) => b!.score - a!.score);

  return NextResponse.json({ metric, results });
}

async function computePlayerResults(metric: { id: number; name: string; formula: string; scope: string }, leagueId: string | null, season: string | null) {
  const matchWhere: Record<string, unknown> = { statusShort: { in: FINISHED } };
  if (leagueId) matchWhere.leagueId = parseInt(leagueId);
  if (season) matchWhere.season = { year: season };

  const players = await prisma.player.findMany({
    where: leagueId
      ? { team: { OR: [{ homeMatches: { some: matchWhere } }, { awayMatches: { some: matchWhere } }] } }
      : {},
    include: {
      team: {
        include: {
          homeMatches: { where: matchWhere, select: { homeScore: true, awayScore: true } },
          awayMatches: { where: matchWhere, select: { homeScore: true, awayScore: true } },
        },
      },
    },
  });

  const results = players.map(p => {
    if (!p.team) return null;
    let wins = 0, draws = 0, losses = 0, gf = 0, ga = 0;
    for (const m of p.team.homeMatches) {
      const h = m.homeScore ?? 0, a = m.awayScore ?? 0;
      gf += h; ga += a;
      if (h > a) wins++; else if (h === a) draws++; else losses++;
    }
    for (const m of p.team.awayMatches) {
      const h = m.homeScore ?? 0, a = m.awayScore ?? 0;
      gf += a; ga += h;
      if (a > h) wins++; else if (h === a) draws++; else losses++;
    }
    const mp = wins + draws + losses;
    if (mp === 0) return null;
    const vars: Record<string, number> = {
      age: p.age ?? 0,
      height_cm: parseFirstNumber(p.height),
      weight_kg: parseFirstNumber(p.weight),
      is_injured: p.injured ? 1 : 0,
      team_points: wins * 3 + draws,
      team_win_rate: wins / mp,
      team_goals_per_match: gf / mp,
    };
    try {
      const score = evaluateFormula(metric.formula, vars);
      if (!Number.isFinite(score)) return null;
      return { playerId: p.id, playerName: p.name, logo: p.photo, score, teamName: p.team.name };
    } catch { return null; }
  }).filter(Boolean).sort((a, b) => b!.score - a!.score);

  return NextResponse.json({ metric, results });
}
