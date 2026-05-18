import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const FINISHED_STATUSES = ['FT', 'AET', 'PEN', 'FINISHED'];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const leagueId = searchParams.get('leagueId');
    const season = searchParams.get('season');
    const limit = parseInt(searchParams.get('limit') ?? '20');

    const where: Record<string, unknown> = { statusShort: { in: FINISHED_STATUSES } };
    if (leagueId) where.leagueId = parseInt(leagueId);
    if (season) where.season = { year: season };

    const [matches, leagues] = await Promise.all([
      prisma.match.findMany({
        where,
        orderBy: { utcDate: 'desc' },
        take: limit,
        include: { homeTeam: true, awayTeam: true, league: { include: { country: true } }, season: true },
      }),
      prisma.league.findMany({ include: { country: true }, orderBy: { name: 'asc' } }),
    ]);
    return NextResponse.json({ matches, leagues });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}
