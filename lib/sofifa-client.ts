// SoFIFA API — public, no API key required
// Base: https://sofifa.com/api
//
// Endpoints:
//   GET /teams?leagueId={id}          → list teams in league
//   GET /teams/{id}?roster={rosterId} → team detail + squad
//
// Response shapes (from official docs):
//
// /teams?leagueId=13:
// { data: [{ id, name, leagueId, overallRating, attackRating,
//            midfieldRating, defenseRating, latestRoster, logoUrl? }] }
//
// /teams/{id}?roster={rosterId}:
// { data: { id, name, overallRating, attackRating, midfieldRating,
//           defenseRating, players: [{id, commonName, name, positions,
//           overallRating, potential, age, nationality, photoUrl?}] } }

const BASE = process.env.SOFIFA_BASE_URL ?? 'https://sofifa.com/api';
const HEADERS = {
  'Accept': 'application/json',
  'Referer': 'https://sofifa.com',
  'User-Agent': 'Mozilla/5.0 (compatible; TheGaffer/1.0)',
};

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchJson<T>(url: string, retries = 1): Promise<T> {
  try {
    const res = await fetch(url, { headers: HEADERS });
    if (res.status === 429) {
      if (retries > 0) { await sleep(2500); return fetchJson(url, retries - 1); }
      throw new Error(`SoFIFA rate limit: ${url}`);
    }
    if (!res.ok) throw new Error(`SoFIFA ${res.status}: ${url}`);
    return res.json() as Promise<T>;
  } catch (e) {
    throw new Error(`SoFIFA fetch failed: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export interface SofifaTeamItem {
  id: number; name: string; leagueId: number;
  overallRating: number; attackRating: number;
  midfieldRating: number; defenseRating: number;
  latestRoster: string; logoUrl?: string;
}

export interface SofifaSquadPlayer {
  id: number; name: string; commonName?: string;
  positions: string[]; overallRating: number;
  potential?: number; age?: number;
  nationality?: string; photoUrl?: string;
}

export interface SofifaTeamDetail extends SofifaTeamItem {
  players: SofifaSquadPlayer[];
}

export function posToGroup(positions: string[]): 'GK' | 'DEF' | 'MID' | 'ATT' {
  const p = (positions[0] ?? '').toUpperCase();
  if (p === 'GK') return 'GK';
  if (['CB', 'LB', 'RB', 'LWB', 'RWB', 'SW', 'RES'].includes(p)) return 'DEF';
  if (['CM', 'CDM', 'CAM', 'LM', 'RM', 'DM'].includes(p)) return 'MID';
  return 'ATT';
}

export async function fetchTeamsByLeague(leagueId: number): Promise<SofifaTeamItem[]> {
  const data = await fetchJson<{ data: SofifaTeamItem[] }>(`${BASE}/teams?leagueId=${leagueId}`);
  return data.data ?? [];
}

export async function fetchTeamDetail(teamId: number, roster: string): Promise<SofifaTeamDetail> {
  const data = await fetchJson<{ data: SofifaTeamDetail }>(`${BASE}/teams/${teamId}?roster=${roster}`);
  return data.data;
}

// SoFIFA docs: max 60 requests/minute (else HTTP 429, blocked 1 min).
// 60/min = 1 req/sec; use 1100ms for a safety margin under the limit.
export const RATE_LIMIT_MS = 1100; // ms between calls
