import { NextRequest, NextResponse } from 'next/server';
import { syncAll, syncLeagues, syncTeams, syncFixtures, syncStandings, syncLive } from '@/lib/sync/syncService';

export async function POST(req: NextRequest) {
  try {
    const { provider = 'api-football', syncType = 'all', country, leagueId, season = '2025' } = await req.json();
    let result;
    switch (syncType) {
      case 'leagues': result = await syncLeagues(provider, country); break;
      case 'teams': result = await syncTeams(provider, leagueId, season); break;
      case 'fixtures': result = await syncFixtures(provider, leagueId, season); break;
      case 'standings': result = await syncStandings(provider, leagueId, season); break;
      case 'live': result = await syncLive(provider, leagueId); break;
      default: result = await syncAll(provider, leagueId, season, country);
    }
    return NextResponse.json({ success: true, result });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Sync failed' }, { status: 500 });
  }
}
