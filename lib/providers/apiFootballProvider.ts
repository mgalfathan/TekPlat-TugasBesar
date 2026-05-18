import type { FootballProvider, ProviderCountry, ProviderLeague, ProviderSeason, ProviderTeam, ProviderPlayer, ProviderFixture, ProviderStanding } from './types';
import { acquireToken, sleep } from './rateLimit';

const BASE = 'https://v3.football.api-sports.io';
const KEY = process.env.API_FOOTBALL_KEY ?? '';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function apiFetch(path: string, attempt = 0): Promise<any[]> {
  if (!KEY) throw new Error('API_FOOTBALL_KEY not set');
  await acquireToken();
  const res = await fetch(`${BASE}${path}`, { headers: { 'x-apisports-key': KEY }, next: { revalidate: 0 } });

  if (res.status === 429) {
    if (attempt >= 2) throw new Error(`API-Football ${path} → 429 (rate limit; retries exhausted)`);
    const retryAfter = Number(res.headers.get('retry-after'));
    const waitMs = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 60_000;
    await sleep(waitMs);
    return apiFetch(path, attempt + 1);
  }

  if (!res.ok) throw new Error(`API-Football ${path} → ${res.status}`);
  const json = await res.json();
  return json.response ?? [];
}

export const apiFootballProvider: FootballProvider = {
  name: 'api-football',

  async fetchCountries(): Promise<ProviderCountry[]> {
    const data = await apiFetch('/countries');
    return data.map((c: { name: string; code?: string; flag?: string }) => ({ name: c.name, code: c.code, flag: c.flag }));
  },

  async fetchLeagues(country?: string): Promise<ProviderLeague[]> {
    const qs = country ? `?country=${encodeURIComponent(country)}` : '';
    const data = await apiFetch(`/leagues${qs}`);
    return data.map((d: { league: { id: number; name: string; type?: string; logo?: string }; country: { name: string; code?: string; flag?: string } }) => ({
      externalId: String(d.league.id),
      name: d.league.name,
      type: d.league.type,
      logo: d.league.logo,
      country: d.country.name,
      countryCode: d.country.code,
      countryFlag: d.country.flag,
    }));
  },

  async fetchSeasons(leagueExternalId: string): Promise<ProviderSeason[]> {
    const data = await apiFetch(`/leagues?id=${leagueExternalId}`);
    if (!data[0]) return [];
    return (data[0].seasons ?? []).map((s: { year: number; start?: string; end?: string; current?: boolean }) => ({
      leagueExternalId,
      year: String(s.year),
      startDate: s.start,
      endDate: s.end,
      current: s.current,
    }));
  },

  async fetchTeams(leagueExternalId: string, season: string): Promise<ProviderTeam[]> {
    const data = await apiFetch(`/teams?league=${leagueExternalId}&season=${season}`);
    return data.map((d: { team: { id: number; name: string; code?: string; country?: string; founded?: number; national?: boolean; logo?: string }; venue?: { name?: string; city?: string } }) => ({
      externalId: String(d.team.id),
      name: d.team.name,
      code: d.team.code,
      country: d.team.country,
      founded: d.team.founded,
      national: d.team.national,
      logo: d.team.logo,
      venueName: d.venue?.name,
      venueCity: d.venue?.city,
    }));
  },

  async fetchPlayers(teamExternalId: string, season: string): Promise<ProviderPlayer[]> {
    const data = await apiFetch(`/players?team=${teamExternalId}&season=${season}`);
    return data.map((d: { player: { id: number; name: string; firstname?: string; lastname?: string; age?: number; birth?: { date?: string }; nationality?: string; height?: string; weight?: string; injured?: boolean; photo?: string } }) => ({
      externalId: String(d.player.id),
      teamExternalId,
      name: d.player.name,
      firstname: d.player.firstname,
      lastname: d.player.lastname,
      age: d.player.age,
      birthDate: d.player.birth?.date,
      nationality: d.player.nationality,
      height: d.player.height,
      weight: d.player.weight,
      injured: d.player.injured,
      photo: d.player.photo,
    }));
  },

  async fetchFixtures(leagueExternalId: string, season: string): Promise<ProviderFixture[]> {
    const data = await apiFetch(`/fixtures?league=${leagueExternalId}&season=${season}`);
    return mapFixtures(data, leagueExternalId, season);
  },

  async fetchLiveFixtures(leagueExternalId?: string): Promise<ProviderFixture[]> {
    const qs = leagueExternalId ? `?league=${leagueExternalId}` : '';
    const data = await apiFetch(`/fixtures?live=all${qs}`);
    return mapFixtures(data, leagueExternalId ?? '', '');
  },

  async fetchStandings(leagueExternalId: string, season: string): Promise<ProviderStanding[]> {
    const data = await apiFetch(`/standings?league=${leagueExternalId}&season=${season}`);
    if (!data[0]?.league?.standings) return [];
    const groups: Array<Array<{ rank: number; team: { id: number }; points: number; goalsDiff?: number; group?: string; form?: string; status?: string; description?: string; all?: { played?: number; win?: number; draw?: number; lose?: number; goals?: { for?: number; against?: number } }; home?: { played?: number; win?: number; draw?: number; lose?: number; goals?: { for?: number; against?: number } }; away?: { played?: number; win?: number; draw?: number; lose?: number; goals?: { for?: number; against?: number } } }>> = data[0].league.standings;
    return groups.flat().map(s => ({
      leagueExternalId,
      season,
      teamExternalId: String(s.team.id),
      rank: s.rank,
      points: s.points,
      goalsDiff: s.goalsDiff,
      group: s.group,
      form: s.form,
      status: s.status,
      description: s.description,
      played: s.all?.played, win: s.all?.win, draw: s.all?.draw, lose: s.all?.lose,
      goalsFor: s.all?.goals?.for, goalsAgainst: s.all?.goals?.against,
      homePlayed: s.home?.played, homeWin: s.home?.win, homeDraw: s.home?.draw, homeLose: s.home?.lose,
      homeGoalsFor: s.home?.goals?.for, homeGoalsAgainst: s.home?.goals?.against,
      awayPlayed: s.away?.played, awayWin: s.away?.win, awayDraw: s.away?.draw, awayLose: s.away?.lose,
      awayGoalsFor: s.away?.goals?.for, awayGoalsAgainst: s.away?.goals?.against,
    }));
  },
};

function mapFixtures(data: Array<{ fixture: { id: number; referee?: string; timezone?: string; date?: string; status?: { long?: string; short?: string; elapsed?: number }; venue?: { name?: string; city?: string } }; league: { id: number; season?: number }; teams: { home: { id: number; winner?: boolean }; away: { id: number; winner?: boolean } }; goals: { home?: number; away?: number }; score?: { halftime?: { home?: number; away?: number }; fulltime?: { home?: number; away?: number }; extratime?: { home?: number; away?: number }; penalty?: { home?: number; away?: number } } }>, leagueExternalId: string, season: string): ProviderFixture[] {
  return data.map(d => ({
    externalId: String(d.fixture.id),
    leagueExternalId: leagueExternalId || String(d.league.id),
    season: season || String(d.league.season),
    homeTeamExternalId: String(d.teams.home.id),
    awayTeamExternalId: String(d.teams.away.id),
    utcDate: d.fixture.date ?? new Date().toISOString(),
    statusLong: d.fixture.status?.long,
    statusShort: d.fixture.status?.short,
    elapsed: d.fixture.status?.elapsed,
    referee: d.fixture.referee,
    timezone: d.fixture.timezone,
    venueName: d.fixture.venue?.name,
    venueCity: d.fixture.venue?.city,
    homeScore: d.goals.home ?? undefined,
    awayScore: d.goals.away ?? undefined,
    halftimeHome: d.score?.halftime?.home ?? undefined,
    halftimeAway: d.score?.halftime?.away ?? undefined,
    fulltimeHome: d.score?.fulltime?.home ?? undefined,
    fulltimeAway: d.score?.fulltime?.away ?? undefined,
    extraHome: d.score?.extratime?.home ?? undefined,
    extraAway: d.score?.extratime?.away ?? undefined,
    penaltyHome: d.score?.penalty?.home ?? undefined,
    penaltyAway: d.score?.penalty?.away ?? undefined,
    winner: d.teams.home.winner ? 'HOME_TEAM' : d.teams.away.winner ? 'AWAY_TEAM' : undefined,
  }));
}
