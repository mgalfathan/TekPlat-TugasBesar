import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const match = await prisma.match.findUnique({
    where: { id },
    include: {
      homeTeam: true,
      awayTeam: true,
      league: { include: { country: true } },
      season: true,
      predictions: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  });

  if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });

  return NextResponse.json({ match });
}
