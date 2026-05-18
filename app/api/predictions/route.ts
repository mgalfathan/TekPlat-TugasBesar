import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const predictions = await prisma.prediction.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        homeTeam: true, awayTeam: true,
        match: { include: { league: true } },
      },
    });
    const leagues = await prisma.league.findMany({ include: { country: true }, orderBy: { name: 'asc' } });
    return NextResponse.json({ predictions, leagues });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}
