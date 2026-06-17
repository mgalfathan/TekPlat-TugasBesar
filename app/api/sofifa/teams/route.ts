import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const leagueId = req.nextUrl.searchParams.get('leagueId');
  if (!leagueId) {
    return NextResponse.json({ error: 'leagueId required' }, { status: 400 });
  }
  const teams = await prisma.sofifaTeam.findMany({
    where: { leagueId: parseInt(leagueId) },
    orderBy: { overallRating: 'desc' },
  });
  return NextResponse.json({ teams }, {
    headers: { 'Cache-Control': 'public, max-age=3600' },
  });
}
