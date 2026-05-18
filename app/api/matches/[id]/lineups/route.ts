import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const entries = await prisma.sbLineupEntry.findMany({
    where: { matchId: id },
    include: { player: true, team: true },
    orderBy: [{ teamId: 'asc' }, { jerseyNumber: 'asc' }],
  });

  const grouped: Record<number, { team: { id: number; name: string }; players: typeof entries }> = {};
  for (const e of entries) {
    if (!grouped[e.teamId]) grouped[e.teamId] = { team: { id: e.team.id, name: e.team.name }, players: [] };
    grouped[e.teamId].players.push(e);
  }

  return NextResponse.json(
    Object.values(grouped).map(g => ({
      team: g.team,
      players: g.players.map(e => ({
        id: e.player.id,
        name: e.player.name,
        nickname: e.player.nickname,
        jerseyNumber: e.jerseyNumber,
        country: e.player.country,
        positions: e.positions ? JSON.parse(e.positions) as Array<{ position: string; start_reason: string; end_reason: string | null }> : [],
        cards: e.cards ? JSON.parse(e.cards) as Array<{ card_type: string; reason: string }> : [],
      })),
    }))
  );
}
