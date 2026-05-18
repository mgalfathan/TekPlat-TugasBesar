import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const statusShort = searchParams.get('status');
    const leagueId = searchParams.get('leagueId');
    const page = parseInt(searchParams.get('page') ?? '1');
    const limit = parseInt(searchParams.get('limit') ?? '20');

    const where: Record<string, unknown> = {};
    if (statusShort) where.statusShort = statusShort;
    if (leagueId) where.leagueId = parseInt(leagueId);

    const [matches, total] = await Promise.all([
      prisma.match.findMany({
        where,
        orderBy: { utcDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { homeTeam: true, awayTeam: true, league: true },
      }),
      prisma.match.count({ where }),
    ]);

    return NextResponse.json({ matches, total, page, limit });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}
