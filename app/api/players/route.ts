import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') ?? '';
  const country = searchParams.get('country') ?? '';
  const teamId = searchParams.get('teamId');
  const limit = Math.min(Number(searchParams.get('limit') ?? '100'), 500);
  const offset = Number(searchParams.get('offset') ?? '0');

  const where: Record<string, unknown> = {};
  if (search) where.name = { contains: search };
  if (country) where.nationality = { contains: country };
  if (teamId) where.teamId = parseInt(teamId);

  const [players, total] = await Promise.all([
    prisma.player.findMany({
      where,
      orderBy: { name: 'asc' },
      take: limit,
      skip: offset,
      include: { team: { select: { id: true, name: true, logo: true, code: true } } },
    }),
    prisma.player.count({ where }),
  ]);

  return NextResponse.json({ players, total });
}
