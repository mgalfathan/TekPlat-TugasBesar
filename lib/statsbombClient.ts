const SB_BASE = 'https://raw.githubusercontent.com/statsbomb/open-data/master/data';

export interface SbRawCompetition {
  competition_id: number;
  season_id: number;
  country_name: string;
  competition_name: string;
  competition_gender: string;
  competition_youth: boolean;
  competition_international: boolean;
  season_name: string;
}

export interface SbRawMatch {
  match_id: number;
  match_date: string;
  kick_off: string;
  competition: { competition_id: number; competition_name: string };
  season: { season_id: number; season_name: string };
  home_team: { home_team_id: number; home_team_name: string; home_team_gender: string; country: { id: number; name: string } };
  away_team: { away_team_id: number; away_team_name: string; away_team_gender: string; country: { id: number; name: string } };
  home_score: number;
  away_score: number;
  match_week: number;
  competition_stage: { id: number; name: string };
  stadium?: { id: number; name: string };
  referee?: { id: number; name: string };
}

export interface SbRawLineupPlayer {
  player_id: number;
  player_name: string;
  player_nickname: string | null;
  jersey_number: number;
  country: { id: number; name: string };
  cards: Array<{ time: string; card_type: string; reason: string; period: number }>;
  positions: Array<{
    position_id: number; position: string; from: string; to: string | null;
    from_period: number; to_period: number | null; start_reason: string; end_reason: string | null;
  }>;
}

export interface SbRawLineupTeam {
  team_id: number;
  team_name: string;
  lineup: SbRawLineupPlayer[];
}

export interface SbRawEvent {
  id: string;
  index: number;
  period: number;
  timestamp: string;
  minute: number;
  second: number;
  type: { id: number; name: string };
  team: { id: number; name: string };
  player?: { id: number; name: string };
  location?: [number, number];
  shot?: {
    statsbomb_xg?: number;
    outcome?: { id: number; name: string };
    technique?: { id: number; name: string };
    body_part?: { id: number; name: string };
    end_location?: [number, number, number?];
  };
  pass?: {
    recipient?: { id: number; name: string };
    length?: number;
    goal_assist?: boolean;
    shot_assist?: boolean;
    outcome?: { id: number; name: string };
  };
  substitution?: {
    outcome?: { id: number; name: string };
    replacement?: { id: number; name: string };
  };
  bad_behaviour?: { card?: { id: number; name: string } };
  foul_committed?: { card?: { id: number; name: string }; type?: { id: number; name: string } };
}

async function sbFetch<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`StatsBomb fetch failed: ${url} (${res.status})`);
  return res.json() as Promise<T>;
}

export const fetchSbCompetitions = () =>
  sbFetch<SbRawCompetition[]>(`${SB_BASE}/competitions.json`);

export const fetchSbMatches = (competitionId: number, seasonId: number) =>
  sbFetch<SbRawMatch[]>(`${SB_BASE}/matches/${competitionId}/${seasonId}.json`);

export const fetchSbLineups = (matchId: number) =>
  sbFetch<SbRawLineupTeam[]>(`${SB_BASE}/lineups/${matchId}.json`);

export const fetchSbEvents = (matchId: number) =>
  sbFetch<SbRawEvent[]>(`${SB_BASE}/events/${matchId}.json`);
