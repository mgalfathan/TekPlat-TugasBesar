import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const TOP_FIVE_LEAGUES = [
  'Premier League',
  'La Liga',
  'Primera Division',
  'Serie A',
  'Bundesliga',
  'Ligue 1',
];

type SortMode = 'points' | 'rank';

function sortStandings<T extends { points: number; rank: number; goalsDiff: number | null; goalsFor: number | null }>(
  standings: T[],
  sort: SortMode
) {
  return standings.sort((a, b) => {
    if (sort === 'rank') {
      const rankDiff = a.rank - b.rank;
      if (rankDiff !== 0) return rankDiff;
    }

    const pointsDiff = b.points - a.points;
    if (pointsDiff !== 0) return pointsDiff;

    if (sort === 'points') {
      const rankDiff = a.rank - b.rank;
      if (rankDiff !== 0) return rankDiff;
    }

    const gdDiff = (b.goalsDiff ?? 0) - (a.goalsDiff ?? 0);
    if (gdDiff !== 0) return gdDiff;
    return (b.goalsFor ?? 0) - (a.goalsFor ?? 0);
  });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const leagueId = searchParams.get('leagueId');
    const season = searchParams.get('season');
    const sort = (searchParams.get('sort') === 'rank' ? 'rank' : 'points') satisfies SortMode;

    const where: Record<string, unknown> = {};
    if (leagueId) where.leagueId = parseInt(leagueId);
    else where.league = { name: { in: TOP_FIVE_LEAGUES } };
    if (season) where.season = { year: season };

    const [standings, leagues] = await Promise.all([
      prisma.standing.findMany({
        where,
        include: { team: true, league: { include: { country: true } }, season: true },
      }),
      prisma.league.findMany({ include: { country: true }, orderBy: { name: 'asc' } }),
    ]);
    return NextResponse.json({ standings: sortStandings(standings, sort), leagues });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}
