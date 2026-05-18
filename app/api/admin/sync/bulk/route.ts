import { NextRequest, NextResponse } from 'next/server';
import { syncLeagues, syncTeams, syncFixtures, syncStandings } from '@/lib/sync/syncService';

interface BulkLeague { name: string; leagueId: string; country: string }

const TOP_5: BulkLeague[] = [
  { name: 'Premier League', leagueId: '39', country: 'England' },
  { name: 'La Liga', leagueId: '140', country: 'Spain' },
  { name: 'Serie A', leagueId: '135', country: 'Italy' },
  { name: 'Bundesliga', leagueId: '78', country: 'Germany' },
  { name: 'Ligue 1', leagueId: '61', country: 'France' },
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const provider: string = body.provider ?? 'api-football';
    const season: string = body.season ?? process.env.DEFAULT_SEASON ?? '2024';
    const preset: string = body.preset ?? 'top5';
    const customLeagues: BulkLeague[] = Array.isArray(body.leagues) ? body.leagues : [];

    const leagues = preset === 'custom' && customLeagues.length ? customLeagues : TOP_5;
    const seenCountries = new Set<string>();
    const perLeague: Array<{ league: string; leagueId: string; results: Record<string, unknown> }> = [];

    for (const L of leagues) {
      const results: Record<string, unknown> = {};

      if (!seenCountries.has(L.country)) {
        seenCountries.add(L.country);
        results.leagues = await syncLeagues(provider, L.country);
      }

      results.teams = await syncTeams(provider, L.leagueId, season);

      const [fixtures, standings] = await Promise.all([
        syncFixtures(provider, L.leagueId, season),
        syncStandings(provider, L.leagueId, season),
      ]);
      results.fixtures = fixtures;
      results.standings = standings;

      perLeague.push({ league: L.name, leagueId: L.leagueId, results });
    }

    return NextResponse.json({ success: true, season, perLeague });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Bulk sync failed' }, { status: 500 });
  }
}
