import type { FootballProvider, ProviderCountry, ProviderLeague, ProviderSeason, ProviderTeam, ProviderPlayer, ProviderFixture, ProviderStanding } from './types';

const BASE = 'https://api.football-data.org/v4';
const KEY = process.env.FOOTBALL_DATA_API_KEY ?? '';

async function fdFetch(path: string) {
  if (!KEY) throw new Error('FOOTBALL_DATA_API_KEY not set');
  const res = await fetch(`${BASE}${path}`, { headers: { 'X-Auth-Token': KEY }, next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`football-data.org ${path} → ${res.status}`);
  return res.json();
}

export const footballDataProvider: FootballProvider = {
  name: 'football-data',

  async fetchCountries(): Promise<ProviderCountry[]> {
    const json = await fdFetch('/areas');
    return (json.areas ?? []).map((a: { name: string; code?: string; flag?: string }) => ({ name: a.name, code: a.code, flag: a.flag }));
  },

  async fetchLeagues(country?: string): Promise<ProviderLeague[]> {
    const json = await fdFetch('/competitions');
    const comps = json.competitions ?? [];
    const filtered = country ? comps.filter((c: { area?: { name?: string } }) => c.area?.name === country) : comps;
    return filtered.map((c: { id: number; name: string; type?: string; emblem?: string; area?: { name?: string; code?: string; flag?: string } }) => ({
      externalId: String(c.id),
      name: c.name,
      type: c.type,
      logo: c.emblem,
      country: c.area?.name ?? '',
      countryCode: c.area?.code,
      countryFlag: c.area?.flag,
    }));
  },

  async fetchSeasons(leagueExternalId: string): Promise<ProviderSeason[]> {
    const json = await fdFetch(`/competitions/${leagueExternalId}`);
    return (json.seasons ?? []).map((s: { id: number; startDate?: string; endDate?: string; currentMatchday?: number }) => ({
      externalId: String(s.id),
      leagueExternalId,
      year: s.startDate ? String(new Date(s.startDate).getFullYear()) : '',
      startDate: s.startDate,
      endDate: s.endDate,
    }));
  },

  async fetchTeams(leagueExternalId: string, season: string): Promise<ProviderTeam[]> {
    const json = await fdFetch(`/competitions/${leagueExternalId}/teams?season=${season}`);
    return (json.teams ?? []).map((t: { id: number; name: string; shortName?: string; tla?: string; area?: { name?: string }; founded?: number; venue?: string; crest?: string }) => ({
      externalId: String(t.id),
      name: t.name,
      code: t.tla,
      country: t.area?.name,
      founded: t.founded,
      logo: t.crest,
      venueName: t.venue,
    }));
  },

  async fetchPlayers(): Promise<ProviderPlayer[]> { return []; },

  async fetchFixtures(leagueExternalId: string, season: string): Promise<ProviderFixture[]> {
    const json = await fdFetch(`/competitions/${leagueExternalId}/matches?season=${season}`);
    return (json.matches ?? []).map((m: { id: number; utcDate?: string; status?: string; matchday?: number; stage?: string; homeTeam?: { id: number }; awayTeam?: { id: number }; score?: { winner?: string; fullTime?: { home?: number; away?: number }; halfTime?: { home?: number; away?: number } }; referees?: Array<{ name?: string }> }) => ({
      externalId: String(m.id),
      leagueExternalId,
      season,
      homeTeamExternalId: String(m.homeTeam?.id),
      awayTeamExternalId: String(m.awayTeam?.id),
      utcDate: m.utcDate ?? new Date().toISOString(),
      statusShort: m.status,
      venueName: undefined,
      homeScore: m.score?.fullTime?.home ?? undefined,
      awayScore: m.score?.fullTime?.away ?? undefined,
      halftimeHome: m.score?.halfTime?.home ?? undefined,
      halftimeAway: m.score?.halfTime?.away ?? undefined,
      winner: m.score?.winner ?? undefined,
    }));
  },

  async fetchLiveFixtures(): Promise<ProviderFixture[]> { return []; },

  async fetchStandings(leagueExternalId: string, season: string): Promise<ProviderStanding[]> {
    const json = await fdFetch(`/competitions/${leagueExternalId}/standings?season=${season}`);
    const standings = json.standings?.[0]?.table ?? [];
    return standings.map((s: { position: number; team: { id: number }; points: number; goalDifference?: number; form?: string; playedGames?: number; won?: number; draw?: number; lost?: number; goalsFor?: number; goalsAgainst?: number }) => ({
      leagueExternalId,
      season,
      teamExternalId: String(s.team.id),
      rank: s.position,
      points: s.points,
      goalsDiff: s.goalDifference,
      form: s.form,
      played: s.playedGames, win: s.won, draw: s.draw, lose: s.lost,
      goalsFor: s.goalsFor, goalsAgainst: s.goalsAgainst,
    }));
  },
};
