export interface FDCompetition {
  id: number;
  name: string;
  code: string;
  area: { name: string };
  currentSeason: { startDate: string; endDate: string; winner: null | { name: string } } | null;
}

export interface FDTeam {
  id: number;
  name: string;
  shortName: string;
  tla: string;
  crest: string;
}

export interface FDMatch {
  id: number;
  utcDate: string;
  status: string;
  matchday: number | null;
  stage: string;
  group: string | null;
  lastUpdated: string;
  homeTeam: { id: number; name: string; shortName: string; tla: string; crest: string };
  awayTeam: { id: number; name: string; shortName: string; tla: string; crest: string };
  score: {
    winner: string | null;
    fullTime: { home: number | null; away: number | null };
  };
}

export interface FDStanding {
  position: number;
  team: { id: number; name: string; shortName: string; tla: string; crest: string };
  playedGames: number;
  won: number;
  draw: number;
  lost: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  form: string | null;
}

export interface FootballApiClient {
  fetchCompetition(code: string): Promise<FDCompetition>;
  fetchTeams(code: string): Promise<FDTeam[]>;
  fetchMatches(code: string, options?: { status?: string; dateFrom?: string; dateTo?: string }): Promise<FDMatch[]>;
  fetchLiveMatches(code: string): Promise<FDMatch[]>;
  fetchUpcomingFixtures(code: string): Promise<FDMatch[]>;
  fetchPastResults(code: string): Promise<FDMatch[]>;
  fetchStandings(code: string): Promise<FDStanding[]>;
}

// ─── football-data.org v4 provider ───────────────────────────────────────────

class FootballDataClient implements FootballApiClient {
  private readonly base = 'https://api.football-data.org/v4';
  private readonly key: string;

  constructor(apiKey: string) {
    this.key = apiKey;
  }

  private async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${this.base}${path}`);
    if (params) {
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    }
    const res = await fetch(url.toString(), {
      headers: { 'X-Auth-Token': this.key },
      next: { revalidate: 60 },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new Error(`football-data.org ${res.status}: ${text}`);
    }
    return res.json() as Promise<T>;
  }

  async fetchCompetition(code: string): Promise<FDCompetition> {
    return this.get<FDCompetition>(`/competitions/${code}`);
  }

  async fetchTeams(code: string): Promise<FDTeam[]> {
    const data = await this.get<{ teams: FDTeam[] }>(`/competitions/${code}/teams`);
    return data.teams;
  }

  async fetchMatches(code: string, options?: { status?: string; dateFrom?: string; dateTo?: string }): Promise<FDMatch[]> {
    const params: Record<string, string> = {};
    if (options?.status) params.status = options.status;
    if (options?.dateFrom) params.dateFrom = options.dateFrom;
    if (options?.dateTo) params.dateTo = options.dateTo;
    const data = await this.get<{ matches: FDMatch[] }>(`/competitions/${code}/matches`, params);
    return data.matches;
  }

  async fetchLiveMatches(code: string): Promise<FDMatch[]> {
    return this.fetchMatches(code, { status: 'IN_PLAY,PAUSED,LIVE' });
  }

  async fetchUpcomingFixtures(code: string): Promise<FDMatch[]> {
    return this.fetchMatches(code, { status: 'SCHEDULED,TIMED' });
  }

  async fetchPastResults(code: string): Promise<FDMatch[]> {
    return this.fetchMatches(code, { status: 'FINISHED' });
  }

  async fetchStandings(code: string): Promise<FDStanding[]> {
    const data = await this.get<{ standings: Array<{ type: string; table: FDStanding[] }> }>(
      `/competitions/${code}/standings`
    );
    const total = data.standings.find((s) => s.type === 'TOTAL');
    return total?.table ?? data.standings[0]?.table ?? [];
  }
}

// ─── Factory ─────────────────────────────────────────────────────────────────

export function hasApiKey(): boolean {
  return Boolean(process.env.FOOTBALL_DATA_API_KEY);
}

export function getFootballApiClient(): FootballApiClient | null {
  const provider = process.env.FOOTBALL_API_PROVIDER ?? 'football-data';
  const key = process.env.FOOTBALL_DATA_API_KEY;

  if (!key) return null;

  if (provider === 'football-data') {
    return new FootballDataClient(key);
  }

  // Stub for future providers
  console.warn(`Unknown provider: ${provider}. Falling back to null.`);
  return null;
}
