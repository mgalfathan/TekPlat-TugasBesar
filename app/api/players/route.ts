import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') ?? '';
  const country = searchParams.get('country') ?? '';
  const limit = Math.min(Number(searchParams.get('limit') ?? '100'), 500);
  const offset = Number(searchParams.get('offset') ?? '0');

  const where = {
    AND: [
      search ? { name: { contains: search } } : {},
      country ? { country: { contains: country } } : {},
    ],
  };

  const [players, total] = await Promise.all([
    prisma.sbPlayer.findMany({
      where,
      orderBy: { name: 'asc' },
      take: limit,
      skip: offset,
      include: { _count: { select: { lineupEntries: true } } },
    }),
    prisma.sbPlayer.count({ where }),
  ]);

  return NextResponse.json({ players, total });
}
