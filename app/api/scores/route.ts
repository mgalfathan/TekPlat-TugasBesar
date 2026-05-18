import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const LIVE = ['1H', '2H', 'ET', 'P', 'LIVE', 'BT', 'INT'];
const FINISHED = ['FT', 'AET', 'PEN', 'FINISHED'];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const leagueId = searchParams.get('leagueId');
    const where: Record<string, unknown> = {};
    if (leagueId) where.leagueId = parseInt(leagueId);

    const [live, recent] = await Promise.all([
      prisma.match.findMany({ where: { ...where, statusShort: { in: LIVE } }, orderBy: { utcDate: 'asc' }, include: { homeTeam: true, awayTeam: true, league: true } }),
      prisma.match.findMany({ where: { ...where, statusShort: { in: FINISHED } }, orderBy: { utcDate: 'desc' }, take: 10, include: { homeTeam: true, awayTeam: true, league: true } }),
    ]);
    return NextResponse.json({ live, recent });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}
