import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';

const FINISHED = ['FT', 'AET', 'PEN', 'FINISHED'];

export async function GET() {
  try {
    const session = await requireUser();
    const [totalTeams, totalMatches, totalPredictions, totalPlayers, finishedCount, recentMatches, topStandings] = await Promise.all([
      prisma.team.count(),
      prisma.match.count(),
      prisma.prediction.count({ where: { userId: session.userId } }),
      prisma.player.count(),
      prisma.match.count({ where: { statusShort: { in: FINISHED } } }),
      prisma.match.findMany({
        where: { statusShort: { in: FINISHED } },
        orderBy: { utcDate: 'desc' }, take: 5,
        include: { homeTeam: true, awayTeam: true, league: true },
      }),
      prisma.standing.findMany({
        orderBy: { rank: 'asc' }, take: 10,
        include: { team: true, league: true },
      }),
    ]);

    return NextResponse.json({
      stats: { totalTeams, totalMatches, totalPredictions, totalPlayers, finishedCount },
      recentMatches, topStandings,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed';
    return NextResponse.json({ error: message }, { status: message === 'Unauthorized' ? 401 : 500 });
  }
}
