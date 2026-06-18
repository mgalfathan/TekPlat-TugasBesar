import { NextRequest, NextResponse } from 'next/server';
import { getSofifaPlayers } from '@/lib/sofifa-dataset';

// Served from the static EA FC26 CSV-derived dataset (no database).
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const teamId   = searchParams.get('teamId');
  const leagueId = searchParams.get('leagueId');
  const posGroup = searchParams.get('posGroup');
  const search   = searchParams.get('search') ?? '';
  const limit    = Math.min(Number(searchParams.get('limit') ?? '60'), 200);

  const players = getSofifaPlayers({
    teamId: teamId ? parseInt(teamId) : undefined,
    leagueId: leagueId ? parseInt(leagueId) : undefined,
    posGroup: posGroup ?? undefined,
    search,
    limit,
  });

  return NextResponse.json({ players });
}
