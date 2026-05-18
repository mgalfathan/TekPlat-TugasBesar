import axios from 'axios';

const BASE_URL = 'https://api.football-data.org/v4';

const client = axios.create({
  baseURL: BASE_URL,
  headers: {
    'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY ?? '',
  },
  timeout: 10000,
});

export interface FDCompetition {
  id: number;
  name: string;
  code: string;
  area: { name: string };
  currentSeason: { startDate: string; endDate: string } | null;
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
  homeTeam: { id: number; name: string; shortName: string; tla: string; crest: string };
  awayTeam: { id: number; name: string; shortName: string; tla: string; crest: string };
  score: {
    fullTime: { home: number | null; away: number | null };
  };
}

export async function fetchCompetition(code: string): Promise<FDCompetition> {
  const res = await client.get(`/competitions/${code}`);
  return res.data;
}

export async function fetchTeams(competitionCode: string): Promise<FDTeam[]> {
  const res = await client.get(`/competitions/${competitionCode}/teams`);
  return res.data.teams;
}

export async function fetchMatches(competitionCode: string, season?: string): Promise<FDMatch[]> {
  const params: Record<string, string> = {};
  if (season) params.season = season;
  const res = await client.get(`/competitions/${competitionCode}/matches`, { params });
  return res.data.matches;
}

export function hasApiKey(): boolean {
  return Boolean(process.env.FOOTBALL_DATA_API_KEY);
}
