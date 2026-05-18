import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const LIVE = ['1H', '2H', 'ET', 'P', 'LIVE', 'BT', 'INT'];
const UPCOMING = ['NS', 'TBD', 'SCHEDULED', 'TIMED'];
const FINISHED = ['FT', 'AET', 'PEN', 'FINISHED'];

export async function GET() {
  try {
    const [totalTeams, totalMatches, totalPredictions, totalPlayers, liveCount, upcomingCount, finishedCount, recentMatches, upcomingMatches, topStandings] = await Promise.all([
      prisma.team.count(),
      prisma.match.count(),
      prisma.prediction.count(),
      prisma.player.count(),
      prisma.match.count({ where: { statusShort: { in: LIVE } } }),
      prisma.match.count({ where: { statusShort: { in: UPCOMING } } }),
      prisma.match.count({ where: { statusShort: { in: FINISHED } } }),
      prisma.match.findMany({
        where: { statusShort: { in: FINISHED } },
        orderBy: { utcDate: 'desc' }, take: 5,
        include: { homeTeam: true, awayTeam: true, league: true },
      }),
      prisma.match.findMany({
        where: { statusShort: { in: UPCOMING } },
        orderBy: { utcDate: 'asc' }, take: 5,
        include: { homeTeam: true, awayTeam: true, league: true },
      }),
      prisma.standing.findMany({
        orderBy: { rank: 'asc' }, take: 10,
        include: { team: true, league: true },
      }),
    ]);

    return NextResponse.json({
      stats: { totalTeams, totalMatches, totalPredictions, totalPlayers, liveCount, upcomingCount, finishedCount },
      recentMatches, upcomingMatches, topStandings,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}
