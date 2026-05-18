import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const player = await prisma.player.findUnique({
    where: { id },
    include: { team: true },
  });

  if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 });

  return NextResponse.json({ player });
}
