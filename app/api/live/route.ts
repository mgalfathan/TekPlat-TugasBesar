import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const LIVE_STATUSES = ['1H', '2H', 'ET', 'P', 'LIVE', 'BT', 'INT'];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const leagueId = searchParams.get('leagueId');

    const where: Record<string, unknown> = { statusShort: { in: LIVE_STATUSES } };
    if (leagueId) where.leagueId = parseInt(leagueId);

    const matches = await prisma.match.findMany({
      where,
      orderBy: { utcDate: 'asc' },
      include: { homeTeam: true, awayTeam: true, league: { include: { country: true } }, season: true },
    });
    return NextResponse.json({ matches, lastSyncedAt: matches[0]?.lastSyncedAt ?? null });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}
