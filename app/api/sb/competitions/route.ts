import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const competitions = await prisma.sbCompetition.findMany({
      orderBy: [{ competitionName: 'asc' }, { seasonName: 'desc' }],
      include: { _count: { select: { matches: true } } },
    });
    return NextResponse.json(competitions);
  } catch {
    return NextResponse.json([]);
  }
}
