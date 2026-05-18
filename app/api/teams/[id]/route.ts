import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const FINISHED = ['FT', 'AET', 'PEN', 'FINISHED'];

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const team = await prisma.team.findUnique({
    where: { id },
    include: {
      players: { orderBy: { name: 'asc' } },
      standings: {
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { league: true, season: true },
      },
      homeMatches: {
        where: { statusShort: { in: FINISHED } },
        orderBy: { utcDate: 'desc' },
        take: 10,
        include: { awayTeam: { select: { id: true, name: true, code: true, logo: true } }, league: { select: { id: true, name: true } } },
      },
      awayMatches: {
        where: { statusShort: { in: FINISHED } },
        orderBy: { utcDate: 'desc' },
        take: 10,
        include: { homeTeam: { select: { id: true, name: true, code: true, logo: true } }, league: { select: { id: true, name: true } } },
      },
    },
  });

  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });

  const recent = [...team.homeMatches.map(m => ({
    id: m.id, utcDate: m.utcDate, leagueName: m.league.name,
    homeScore: m.homeScore, awayScore: m.awayScore,
    side: 'home' as const,
    opponent: m.awayTeam,
  })), ...team.awayMatches.map(m => ({
    id: m.id, utcDate: m.utcDate, leagueName: m.league.name,
    homeScore: m.homeScore, awayScore: m.awayScore,
    side: 'away' as const,
    opponent: m.homeTeam,
  }))].sort((a, b) => b.utcDate.getTime() - a.utcDate.getTime()).slice(0, 10);

  return NextResponse.json({
    team: {
      id: team.id, name: team.name, code: team.code, country: team.country,
      founded: team.founded, national: team.national, logo: team.logo,
      venueName: team.venueName, venueCity: team.venueCity,
    },
    players: team.players,
    standings: team.standings,
    recentMatches: recent,
  });
}
