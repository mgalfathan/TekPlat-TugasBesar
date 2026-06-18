import { NextRequest, NextResponse } from 'next/server';
import { getSofifaTeams } from '@/lib/sofifa-dataset';

// Served from the static EA FC26 CSV-derived dataset (no database).
export async function GET(req: NextRequest) {
  const leagueId = req.nextUrl.searchParams.get('leagueId');
  if (!leagueId) {
    return NextResponse.json({ error: 'leagueId required' }, { status: 400 });
  }
  const teams = getSofifaTeams(parseInt(leagueId));
  return NextResponse.json({ teams }, {
    headers: { 'Cache-Control': 'public, max-age=3600' },
  });
}
