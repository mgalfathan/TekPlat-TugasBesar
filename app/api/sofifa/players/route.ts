import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const teamId   = searchParams.get('teamId');
  const leagueId = searchParams.get('leagueId');
  const posGroup = searchParams.get('posGroup');
  const search   = searchParams.get('search') ?? '';
  const limit    = Math.min(Number(searchParams.get('limit') ?? '60'), 200);

  const where: Record<string, unknown> = {};
  if (teamId)   where.teamId = parseInt(teamId);
  if (posGroup) where.posGroup = posGroup;
  if (search)   where.name = { contains: search, mode: 'insensitive' };

  if (leagueId && !teamId) {
    where.team = { leagueId: parseInt(leagueId) };
  }

  const players = await prisma.sofifaPlayer.findMany({
    where,
    orderBy: { overallRating: 'desc' },
    take: limit,
    include: { team: { select: { name: true } } },
  });

  return NextResponse.json({ players });
}
