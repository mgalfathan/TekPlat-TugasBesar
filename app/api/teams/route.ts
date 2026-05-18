import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const leagueId = searchParams.get('leagueId');
    const search = searchParams.get('search');

    const where: Record<string, unknown> = {};
    if (search) where.name = { contains: search };
    if (leagueId) {
      where.OR = [
        { homeMatches: { some: { leagueId: parseInt(leagueId) } } },
        { awayMatches: { some: { leagueId: parseInt(leagueId) } } },
      ];
    }

    const teams = await prisma.team.findMany({
      where,
      orderBy: { name: 'asc' },
      include: { _count: { select: { homeMatches: true, awayMatches: true } } },
    });
    return NextResponse.json(teams);
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}
