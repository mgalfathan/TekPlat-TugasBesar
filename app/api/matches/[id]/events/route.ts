import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const events = await prisma.sbEvent.findMany({
    where: { matchId: id },
    orderBy: [{ period: 'asc' }, { minute: 'asc' }, { second: 'asc' }],
  });

  return NextResponse.json(
    events.map(e => ({
      id: e.id,
      period: e.period,
      minute: e.minute,
      second: e.second,
      type: e.typeName,
      player: e.playerName,
      team: e.teamName,
      location: e.location ? JSON.parse(e.location) as [number, number] : null,
      extras: e.extras ? JSON.parse(e.extras) as Record<string, unknown> : null,
    }))
  );
}
