import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { predictMatch } from '@/lib/prediction-engine';

const UPCOMING = ['NS', 'TBD', 'SCHEDULED', 'TIMED'];

export async function POST(req: NextRequest) {
  try {
    const { matchId, leagueId, season } = await req.json().catch(() => ({}));

    if (matchId) {
      const match = await prisma.match.findUniqueOrThrow({ where: { id: matchId } });
      const result = await predictMatch(match.homeTeamId, match.awayTeamId, match.leagueId, season);
      const prediction = await prisma.prediction.create({
        data: { matchId, homeTeamId: match.homeTeamId, awayTeamId: match.awayTeamId, leagueId: match.leagueId, season, ...result },
        include: { homeTeam: true, awayTeam: true },
      });
      return NextResponse.json({ predictions: [prediction] });
    }

    const where: Record<string, unknown> = { statusShort: { in: UPCOMING } };
    if (leagueId) where.leagueId = parseInt(leagueId);

    const matches = await prisma.match.findMany({ where, take: 20 });
    const predictions = [];
    for (const m of matches) {
      try {
        const result = await predictMatch(m.homeTeamId, m.awayTeamId, m.leagueId, season);
        const p = await prisma.prediction.create({
          data: { matchId: m.id, homeTeamId: m.homeTeamId, awayTeamId: m.awayTeamId, leagueId: m.leagueId, season, ...result },
        });
        predictions.push(p);
      } catch { /* skip */ }
    }
    return NextResponse.json({ predictions, count: predictions.length });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}
