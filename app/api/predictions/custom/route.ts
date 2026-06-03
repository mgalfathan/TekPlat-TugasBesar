import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { predictMatch } from '@/lib/prediction-engine';
import { requireUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const session = await requireUser();
    const { homeTeamId, awayTeamId, leagueId, season } = await req.json();
    if (!homeTeamId || !awayTeamId) return NextResponse.json({ error: 'homeTeamId and awayTeamId required' }, { status: 400 });
    if (homeTeamId === awayTeamId) return NextResponse.json({ error: 'Teams must be different' }, { status: 400 });

    const result = await predictMatch(homeTeamId, awayTeamId, leagueId ? parseInt(leagueId) : undefined, season);

    const prediction = await prisma.prediction.create({
      data: { userId: session.userId, homeTeamId, awayTeamId, leagueId: leagueId ? parseInt(leagueId) : null, season: season ?? null, ...result },
      include: { homeTeam: true, awayTeam: true },
    });

    return NextResponse.json(prediction);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed';
    return NextResponse.json({ error: message }, { status: message === 'Unauthorized' ? 401 : 500 });
  }
}
