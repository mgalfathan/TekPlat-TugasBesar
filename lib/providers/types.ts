export interface ProviderCountry { externalId?: string; name: string; code?: string; flag?: string }
export interface ProviderLeague { externalId: string; name: string; type?: string; logo?: string; country: string; countryCode?: string; countryFlag?: string }
export interface ProviderSeason { externalId?: string; leagueExternalId: string; year: string; startDate?: string; endDate?: string; current?: boolean }
export interface ProviderTeam { externalId: string; name: string; code?: string; country?: string; founded?: number; national?: boolean; logo?: string; venueName?: string; venueCity?: string }
export interface ProviderPlayer { externalId: string; teamExternalId: string; name: string; firstname?: string; lastname?: string; age?: number; birthDate?: string; nationality?: string; height?: string; weight?: string; injured?: boolean; photo?: string }
export interface ProviderFixture {
  externalId: string; leagueExternalId: string; season: string;
  homeTeamExternalId: string; awayTeamExternalId: string;
  utcDate: string; statusLong?: string; statusShort?: string; elapsed?: number;
  referee?: string; timezone?: string; venueName?: string; venueCity?: string;
  homeScore?: number; awayScore?: number;
  halftimeHome?: number; halftimeAway?: number;
  fulltimeHome?: number; fulltimeAway?: number;
  extraHome?: number; extraAway?: number;
  penaltyHome?: number; penaltyAway?: number;
  winner?: string;
}
export interface ProviderStanding {
  leagueExternalId: string; season: string; teamExternalId: string;
  rank: number; points: number; goalsDiff?: number; group?: string; form?: string;
  status?: string; description?: string;
  played?: number; win?: number; draw?: number; lose?: number;
  goalsFor?: number; goalsAgainst?: number;
  homePlayed?: number; homeWin?: number; homeDraw?: number; homeLose?: number; homeGoalsFor?: number; homeGoalsAgainst?: number;
  awayPlayed?: number; awayWin?: number; awayDraw?: number; awayLose?: number; awayGoalsFor?: number; awayGoalsAgainst?: number;
}

export interface FootballProvider {
  name: string;
  fetchCountries(): Promise<ProviderCountry[]>;
  fetchLeagues(country?: string): Promise<ProviderLeague[]>;
  fetchSeasons(leagueExternalId: string): Promise<ProviderSeason[]>;
  fetchTeams(leagueExternalId: string, season: string): Promise<ProviderTeam[]>;
  fetchPlayers(teamExternalId: string, season: string): Promise<ProviderPlayer[]>;
  fetchFixtures(leagueExternalId: string, season: string): Promise<ProviderFixture[]>;
  fetchLiveFixtures(leagueExternalId?: string): Promise<ProviderFixture[]>;
  fetchStandings(leagueExternalId: string, season: string): Promise<ProviderStanding[]>;
}
