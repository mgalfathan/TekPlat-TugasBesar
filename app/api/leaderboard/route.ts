import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const FINISHED = ['FT', 'AET', 'PEN', 'FINISHED'];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const leagueId = searchParams.get('leagueId');
    const metric = searchParams.get('metric') ?? 'points';

    const where: Record<string, unknown> = {};
    if (leagueId) where.leagueId = parseInt(leagueId);

    // Use standings if available (official data)
    const standings = await prisma.standing.findMany({
      where,
      orderBy: { rank: 'asc' },
      include: { team: true, league: true },
    });

    if (standings.length > 0) {
      const rows = standings.map(s => ({
        teamId: s.teamId, teamName: s.team.name, logo: s.team.logo,
        played: s.played ?? 0, wins: s.win ?? 0, draws: s.draw ?? 0, losses: s.lose ?? 0,
        goalsFor: s.goalsFor ?? 0, goalsAgainst: s.goalsAgainst ?? 0,
        goalDifference: s.goalsDiff ?? 0, points: s.points, form: s.form,
        leagueName: s.league.name,
      }));
      const sorted = sortBy(rows, metric);
      const leagues = await prisma.league.findMany({ include: { country: true }, orderBy: { name: 'asc' } });
      return NextResponse.json({ leaderboard: sorted, leagues });
    }

    // Fallback: compute from match data
    const matchWhere: Record<string, unknown> = { statusShort: { in: FINISHED } };
    if (leagueId) matchWhere.leagueId = parseInt(leagueId);

    const teams = await prisma.team.findMany({
      include: {
        homeMatches: { where: { statusShort: { in: FINISHED }, ...(leagueId ? { leagueId: parseInt(leagueId) } : {}) }, select: { homeScore: true, awayScore: true } },
        awayMatches: { where: { statusShort: { in: FINISHED }, ...(leagueId ? { leagueId: parseInt(leagueId) } : {}) }, select: { homeScore: true, awayScore: true } },
      },
    });

    const rows = teams.map(team => {
      let wins = 0, draws = 0, losses = 0, goalsFor = 0, goalsAgainst = 0;
      for (const m of team.homeMatches) {
        const h = m.homeScore ?? 0, a = m.awayScore ?? 0;
        goalsFor += h; goalsAgainst += a;
        if (h > a) wins++; else if (h === a) draws++; else losses++;
      }
      for (const m of team.awayMatches) {
        const h = m.homeScore ?? 0, a = m.awayScore ?? 0;
        goalsFor += a; goalsAgainst += h;
        if (a > h) wins++; else if (a === h) draws++; else losses++;
      }
      const played = wins + draws + losses;
      return { teamId: team.id, teamName: team.name, logo: team.logo, played, wins, draws, losses, goalsFor, goalsAgainst, goalDifference: goalsFor - goalsAgainst, points: wins * 3 + draws };
    }).filter(t => t.played > 0);

    const leagues = await prisma.league.findMany({ include: { country: true }, orderBy: { name: 'asc' } });
    return NextResponse.json({ leaderboard: sortBy(rows, metric), leagues });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}

function sortBy(rows: Array<Record<string, unknown>>, metric: string) {
  return [...rows].sort((a, b) => {
    switch (metric) {
      case 'goals': return (b.goalsFor as number) - (a.goalsFor as number);
      case 'gd': return (b.goalDifference as number) - (a.goalDifference as number);
      case 'wins': return (b.wins as number) - (a.wins as number);
      case 'attacking': {
        const scoreA = (a.goalsFor as number) / Math.max(1, a.played as number);
        const scoreB = (b.goalsFor as number) / Math.max(1, b.played as number);
        return scoreB - scoreA;
      }
      case 'defensive': {
        const scoreA = (a.goalsAgainst as number) / Math.max(1, a.played as number);
        const scoreB = (b.goalsAgainst as number) / Math.max(1, b.played as number);
        return scoreA - scoreB;
      }
      default: return (b.points as number) - (a.points as number) || (b.goalDifference as number) - (a.goalDifference as number);
    }
  });
}
