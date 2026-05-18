import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { predictMatch } from '@/lib/prediction-engine';

export async function POST(req: NextRequest) {
  try {
    const { homeTeamId, awayTeamId, leagueId, season } = await req.json();
    if (!homeTeamId || !awayTeamId) return NextResponse.json({ error: 'homeTeamId and awayTeamId required' }, { status: 400 });
    if (homeTeamId === awayTeamId) return NextResponse.json({ error: 'Teams must be different' }, { status: 400 });

    const result = await predictMatch(homeTeamId, awayTeamId, leagueId ? parseInt(leagueId) : undefined, season);

    const prediction = await prisma.prediction.create({
      data: { homeTeamId, awayTeamId, leagueId: leagueId ? parseInt(leagueId) : null, season: season ?? null, ...result },
      include: { homeTeam: true, awayTeam: true },
    });

    return NextResponse.json(prediction);
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}
