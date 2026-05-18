import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const player = await prisma.sbPlayer.findUnique({
    where: { id },
    include: {
      lineupEntries: {
        include: {
          match: { include: { homeTeam: true, awayTeam: true, competition: true } },
          team: true,
        },
        orderBy: { match: { matchDate: 'desc' } },
        take: 100,
      },
      events: {
        where: { typeName: { in: ['Shot', 'Pass'] } },
        orderBy: { match: { matchDate: 'desc' } },
        take: 500,
      },
    },
  });

  if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 });

  const goals = player.events.filter(e => {
    if (e.typeName !== 'Shot') return false;
    try { const ex = JSON.parse(e.extras ?? '{}') as { shot?: { outcome?: string } }; return ex.shot?.outcome === 'Goal'; }
    catch { return false; }
  }).length;

  const assists = player.events.filter(e => {
    if (e.typeName !== 'Pass') return false;
    try { const ex = JSON.parse(e.extras ?? '{}') as { pass?: { goalAssist?: boolean } }; return ex.pass?.goalAssist === true; }
    catch { return false; }
  }).length;

  const shots = player.events.filter(e => e.typeName === 'Shot').length;

  const xg = player.events
    .filter(e => e.typeName === 'Shot')
    .reduce((sum, e) => {
      try { const ex = JSON.parse(e.extras ?? '{}') as { shot?: { xg?: number } }; return sum + (ex.shot?.xg ?? 0); }
      catch { return sum; }
    }, 0);

  return NextResponse.json({
    player: { id: player.id, statsbombId: player.statsbombId, name: player.name, nickname: player.nickname, country: player.country },
    stats: { goals, assists, shots, xg: Math.round(xg * 100) / 100, appearances: player.lineupEntries.length },
    appearances: player.lineupEntries.map(e => ({
      matchId: e.match.id,
      statsbombMatchId: e.match.statsbombId,
      matchDate: e.match.matchDate,
      competition: e.match.competition.competitionName,
      season: e.match.competition.seasonName,
      homeTeam: e.match.homeTeam.name,
      awayTeam: e.match.awayTeam.name,
      homeScore: e.match.homeScore,
      awayScore: e.match.awayScore,
      team: e.team.name,
      jerseyNumber: e.jerseyNumber,
      positions: e.positions ? JSON.parse(e.positions) as Array<{ position: string; start_reason: string; end_reason: string | null }> : [],
      cards: e.cards ? JSON.parse(e.cards) as Array<{ card_type: string; reason: string }> : [],
    })),
  });
}
