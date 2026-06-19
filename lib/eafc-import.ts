import { prisma } from '@/lib/prisma';
import { posToGroup } from '@/lib/sofifa-client';
import { SOFIFA_LEAGUES } from '@/lib/sofifa-sync';
import type { PosGroup } from '@/lib/gaffer-data';

// ============================================================
// EA Sports FC / FIFA player dataset CSV import
// ============================================================
// Handles two common schemas:
//  • FC 26 export: id, overallRating, firstName/lastName/commonName, position,
//    positionType, alternatePositions, team, leagueName (no numeric league id)
//  • FIFA/FC 24 Kaggle (players_24.csv): player_id, overall, short_name,
//    player_positions, club_name, league_id …
//
// Only the top-5 leagues are imported. Team ratings are DERIVED from the squad.

const TOP5 = new Set([13, 53, 19, 31, 16]);

// Normalised league name → sofifa league id. Normalisation strips punctuation
// so "Ligue 1 McDonald's" matches, while 2nd divisions ("Bundesliga 2",
// "LALIGA HYPERMOTION", "Ligue 2 BKT") deliberately do NOT.
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
const LEAGUE_NAME_TO_ID: Record<string, number> = {
  'premier league': 13,
  'laliga ea sports': 53, 'la liga': 53, 'laliga': 53,
  'bundesliga': 19,
  'serie a enilive': 31, 'serie a': 31,
  "ligue 1 mcdonalds": 16, 'ligue 1': 16,
};

const ALIASES: Record<string, string[]> = {
  id:           ['player_id', 'sofifa_id', 'id'],
  overall:      ['overall', 'overall_rating', 'overallrating'],
  potential:    ['potential'],
  name:         ['short_name', 'name'],
  nameLong:     ['long_name'],
  firstName:    ['firstname', 'first_name'],
  lastName:     ['lastname', 'last_name'],
  commonName:   ['commonname', 'common_name'],
  positions:    ['player_positions', 'positions'],
  position:     ['position'],
  altPositions: ['alternatepositions', 'alternate_positions', 'alt_positions'],
  positionType: ['positiontype', 'position_type'],
  club:         ['club_name', 'club_team_name', 'club', 'team'],
  clubId:       ['club_team_id', 'club_id', 'team_id'],
  leagueId:     ['league_id', 'leagueid'],
  leagueName:   ['league_name', 'leaguename', 'league'],
  age:          ['age'],
  birthdate:    ['birthdate', 'dob', 'birth_date'],
  nationality:  ['nationality_name', 'nationality'],
  photo:        ['player_face_url', 'player_face', 'photo'],
  fifaVersion:  ['fifa_version'],
  fifaUpdate:   ['fifa_update'],
};

interface PlayerRec {
  id: number; name: string; positions: string[]; posGroup: PosGroup;
  overall: number; potential: number | null; age: number | null;
  nationality: string | null; photo: string | null;
  clubName: string; clubId: number | null; leagueId: number;
  version: number;
}

/** Stream CSV rows without holding the whole parsed table in memory. */
function forEachCsvRow(text: string, cb: (fields: string[]) => void): void {
  let field = '', row: string[] = [], inQuotes = false;
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field); field = '';
    } else if (c === '\n') {
      row.push(field); field = '';
      cb(row); row = [];
    } else if (c === '\r') {
      // ignore
    } else field += c;
  }
  if (field.length || row.length) { row.push(field); cb(row); }
}

function resolveColumns(header: string[]): Record<string, number> {
  const lower = header.map(h => h.trim().toLowerCase());
  const out: Record<string, number> = {};
  for (const [key, aliases] of Object.entries(ALIASES)) {
    for (const a of aliases) {
      const idx = lower.indexOf(a);
      if (idx !== -1) { out[key] = idx; break; }
    }
  }
  return out;
}

function ageFromBirthdate(s: string): number | null {
  // e.g. "6/15/1992 12:00:00 AM" or "1992-06-15"
  const m = s.match(/(\d{4})/);
  if (!m) return null;
  const year = parseInt(m[1], 10);
  if (!year || year < 1950 || year > 2025) return null;
  return 2025 - year; // approximate season age
}

const PT_TO_GROUP: Record<string, PosGroup> = {
  attack: 'ATT', forward: 'ATT', attacker: 'ATT',
  midfielder: 'MID', midfield: 'MID',
  defense: 'DEF', defence: 'DEF', defender: 'DEF',
  goalkeeper: 'GK',
};

export interface EafcParseResult {
  players: PlayerRec[];
  leagueIds: number[];
  totalRows: number;
  missingColumns: string[];
}

export function parseEafcCsv(text: string): EafcParseResult {
  let cols: Record<string, number> | null = null;
  let missing: string[] = [];
  const byId = new Map<number, PlayerRec>();
  let total = 0;

  forEachCsvRow(text, (fields) => {
    if (!cols) {
      cols = resolveColumns(fields);
      const m: string[] = [];
      if (cols.overall === undefined) m.push('overall/overallRating');
      if (cols.club === undefined) m.push('club_name/team');
      if (cols.name === undefined && cols.commonName === undefined &&
          cols.firstName === undefined && cols.lastName === undefined && cols.nameLong === undefined) m.push('name');
      if (cols.leagueId === undefined && cols.leagueName === undefined) m.push('league_id/leagueName');
      if (cols.positions === undefined && cols.position === undefined && cols.positionType === undefined) m.push('positions/positionType');
      missing = m;
      return;
    }
    if (missing.length) return;
    total++;
    const get = (k: string) => {
      const i = cols![k];
      return i === undefined ? '' : (fields[i] ?? '').trim();
    };

    // league
    let leagueId = NaN;
    const rawLid = get('leagueId');
    if (rawLid) leagueId = parseInt(rawLid, 10);
    if (!TOP5.has(leagueId)) {
      const mapped = LEAGUE_NAME_TO_ID[norm(get('leagueName'))];
      if (mapped === undefined) return;
      leagueId = mapped;
    }

    const club = get('club');
    if (!club) return;

    const overall = parseInt(get('overall'), 10);
    if (!Number.isFinite(overall)) return;

    // name
    const name = get('commonName')
      || `${get('firstName')} ${get('lastName')}`.trim()
      || get('name') || get('nameLong') || 'Unknown';

    // positions
    let positions: string[];
    if (get('positions')) {
      positions = get('positions').split(',').map(s => s.trim()).filter(Boolean);
    } else {
      positions = [get('position'), ...get('altPositions').split(',')]
        .map(s => s.trim()).filter(Boolean);
    }

    // position group: GK from position token; else positionType; else infer
    let posGroup: PosGroup;
    if (positions.some(p => p.toUpperCase() === 'GK')) posGroup = 'GK';
    else if (get('positionType') && PT_TO_GROUP[norm(get('positionType'))]) posGroup = PT_TO_GROUP[norm(get('positionType'))];
    else posGroup = posToGroup(positions);

    const version = (parseInt(get('fifaVersion') || '0', 10) * 100) + parseInt(get('fifaUpdate') || '0', 10);
    const rawId = parseInt(get('id'), 10);
    const id = Number.isFinite(rawId) ? rawId : (byId.size + 1) * 1_000_000;

    const age = parseInt(get('age'), 10) || (get('birthdate') ? ageFromBirthdate(get('birthdate')) : null);

    const rec: PlayerRec = {
      id, name, positions, posGroup, overall,
      potential: parseInt(get('potential'), 10) || null,
      age: age || null,
      nationality: get('nationality') || null,
      photo: get('photo') || null,
      clubName: club, clubId: parseInt(get('clubId'), 10) || null,
      leagueId, version,
    };
    const prev = byId.get(id);
    if (!prev || rec.version >= prev.version) byId.set(id, rec);
  });

  if (missing.length) return { players: [], leagueIds: [], totalRows: total, missingColumns: missing };

  const players = Array.from(byId.values());
  const leagueIds = Array.from(new Set(players.map(p => p.leagueId)));
  return { players, leagueIds, totalRows: total, missingColumns: [] };
}

const mean = (arr: number[], fallback: number) =>
  arr.length ? Math.round(arr.reduce((s, v) => s + v, 0) / arr.length) : fallback;

interface DerivedTeam {
  id: number; name: string; leagueId: number; country: string | null;
  overallRating: number; attackRating: number; midfieldRating: number; defenseRating: number;
}

function deriveTeams(players: PlayerRec[]): { teams: DerivedTeam[]; teamIdByName: Map<string, number> } {
  const byClub = new Map<string, PlayerRec[]>();
  for (const p of players) {
    const arr = byClub.get(p.clubName) ?? [];
    arr.push(p); byClub.set(p.clubName, arr);
  }
  const teams: DerivedTeam[] = [];
  const teamIdByName = new Map<string, number>();
  let synthetic = 900_000;
  byClub.forEach((squad, club) => {
    squad.sort((a, b) => b.overall - a.overall);
    const top11 = squad.slice(0, 11).map(p => p.overall);
    const att = squad.filter(p => p.posGroup === 'ATT').sort((a, b) => b.overall - a.overall).slice(0, 4).map(p => p.overall);
    const mid = squad.filter(p => p.posGroup === 'MID').sort((a, b) => b.overall - a.overall).slice(0, 4).map(p => p.overall);
    const def = squad.filter(p => p.posGroup === 'GK' || p.posGroup === 'DEF').sort((a, b) => b.overall - a.overall).slice(0, 5).map(p => p.overall);
    const ovr = mean(top11, 75);
    const id = squad[0].clubId ?? (synthetic += 1);
    teams.push({
      id, name: club, leagueId: squad[0].leagueId,
      country: SOFIFA_LEAGUES.find(l => l.id === squad[0].leagueId)?.country ?? null,
      overallRating: ovr,
      attackRating: mean(att, ovr),
      midfieldRating: mean(mid, ovr),
      defenseRating: mean(def, ovr),
    });
    teamIdByName.set(club, id);
  });
  return { teams, teamIdByName };
}

async function chunked<T>(items: T[], size: number, fn: (batch: T[]) => Promise<unknown>) {
  for (let i = 0; i < items.length; i += size) await fn(items.slice(i, i + size));
}

export interface EafcImportResult {
  leagueIds: number[]; teamsImported: number; playersImported: number;
  totalRows: number; missingColumns: string[];
}

export async function importEafcCsv(text: string): Promise<EafcImportResult> {
  const parsed = parseEafcCsv(text);
  if (parsed.missingColumns.length) {
    throw new Error(`CSV missing required column(s): ${parsed.missingColumns.join(', ')}. ` +
      `Expected an EA FC / FIFA player dataset.`);
  }
  if (!parsed.players.length) {
    throw new Error('No top-5 league players found in CSV (Premier League, La Liga, Bundesliga, Serie A, Ligue 1).');
  }

  const { teams, teamIdByName } = deriveTeams(parsed.players);
  const leagueIds = parsed.leagueIds;

  // make this import authoritative for the leagues present: clear & reload
  await prisma.sofifaPlayer.deleteMany({ where: { team: { leagueId: { in: leagueIds } } } });
  await prisma.sofifaTeam.deleteMany({ where: { leagueId: { in: leagueIds } } });

  for (const id of leagueIds) {
    const info = SOFIFA_LEAGUES.find(l => l.id === id);
    if (!info) continue;
    await prisma.sofifaLeague.upsert({
      where: { id },
      create: { id, name: info.name, country: info.country },
      update: { name: info.name, country: info.country },
    });
  }

  await chunked(teams, 500, batch =>
    prisma.sofifaTeam.createMany({
      data: batch.map(t => ({
        id: t.id, name: t.name, leagueId: t.leagueId, country: t.country,
        overallRating: t.overallRating, attackRating: t.attackRating,
        midfieldRating: t.midfieldRating, defenseRating: t.defenseRating,
        latestRoster: null, logoUrl: null,
      })),
    }),
  );

  await chunked(parsed.players, 1000, batch =>
    prisma.sofifaPlayer.createMany({
      data: batch.map(p => ({
        id: p.id, teamId: teamIdByName.get(p.clubName) ?? null, name: p.name,
        positions: JSON.stringify(p.positions), posGroup: p.posGroup,
        overallRating: p.overall, potential: p.potential, age: p.age,
        nationality: p.nationality, photoUrl: p.photo,
      })),
    }),
  );

  return {
    leagueIds, teamsImported: teams.length, playersImported: parsed.players.length,
    totalRows: parsed.totalRows, missingColumns: [],
  };
}
