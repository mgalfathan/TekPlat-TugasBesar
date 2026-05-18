import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const match = await prisma.sbMatch.findUnique({
    where: { id },
    include: { homeTeam: true, awayTeam: true, competition: true },
  });

  if (!match) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(match);
}
