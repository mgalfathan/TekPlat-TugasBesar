// Static SoFIFA dataset for the Season Simulator, built from the EA FC26 CSV.
// Source of truth: lib/sofifa-dataset.json (regenerate with
// `node scripts/build-sofifa-dataset.mjs`). No database access — this powers
// /api/sofifa/teams and /api/sofifa/players directly from the CSV-derived data.
import type { PosGroup } from '@/lib/gaffer-data';
import dataset from './sofifa-dataset.json';

export interface DatasetTeam {
  id: number; name: string; leagueId: number; country: string | null;
  overallRating: number; attackRating: number; midfieldRating: number; defenseRating: number;
}
export interface DatasetPlayer {
  id: number; name: string; posGroup: PosGroup; overallRating: number;
  photoUrl: string | null; teamId: number | null; teamName: string; leagueId: number;
}

const TEAMS = dataset.teams as DatasetTeam[];
const PLAYERS = dataset.players as DatasetPlayer[];

/** Teams in a league, strongest first — matches the old Prisma query shape. */
export function getSofifaTeams(leagueId: number): DatasetTeam[] {
  return TEAMS
    .filter(t => t.leagueId === leagueId)
    .sort((a, b) => b.overallRating - a.overallRating);
}

interface PlayerQuery {
  teamId?: number; leagueId?: number; posGroup?: string; search?: string; limit?: number;
}

/** Players matching the picker filters, strongest first, shaped like the API of old. */
export function getSofifaPlayers(q: PlayerQuery) {
  const search = q.search?.trim().toLowerCase();
  let rows = PLAYERS;
  if (q.teamId != null) rows = rows.filter(p => p.teamId === q.teamId);
  else if (q.leagueId != null) rows = rows.filter(p => p.leagueId === q.leagueId);
  if (q.posGroup) rows = rows.filter(p => p.posGroup === q.posGroup);
  if (search) rows = rows.filter(p => p.name.toLowerCase().includes(search));

  return rows
    .slice() // already sorted desc in the JSON, but keep stable
    .sort((a, b) => b.overallRating - a.overallRating)
    .slice(0, q.limit ?? 60)
    .map(p => ({
      id: p.id, name: p.name, posGroup: p.posGroup, overallRating: p.overallRating,
      photoUrl: p.photoUrl, teamId: p.teamId, team: { name: p.teamName },
    }));
}
