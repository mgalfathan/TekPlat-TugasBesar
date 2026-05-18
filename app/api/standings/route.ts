import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const leagueId = searchParams.get('leagueId');
    const season = searchParams.get('season');

    const where: Record<string, unknown> = {};
    if (leagueId) where.leagueId = parseInt(leagueId);
    if (season) where.season = { year: season };

    const [standings, leagues] = await Promise.all([
      prisma.standing.findMany({
        where,
        orderBy: { rank: 'asc' },
        include: { team: true, league: { include: { country: true } }, season: true },
      }),
      prisma.league.findMany({ include: { country: true }, orderBy: { name: 'asc' } }),
    ]);
    return NextResponse.json({ standings, leagues });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}
