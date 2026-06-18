// Build a static SoFIFA dataset for the Season Simulator straight from the
// EA FC26 CSV — no database required. Mirrors lib/eafc-import.ts
// (parseEafcCsv + deriveTeams) so the output matches a full admin import.
//
//   node scripts/build-sofifa-dataset.mjs
//
// Writes lib/sofifa-dataset.json (committed). Re-run if the CSV changes.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CSV = join(root, 'ea_fc26_players.csv');
const OUT = join(root, 'lib', 'sofifa-dataset.json');

const TOP5 = new Set([13, 53, 19, 31, 16]);
const SOFIFA_LEAGUES = [
  { id: 13, name: 'Premier League', country: 'England' },
  { id: 53, name: 'La Liga',        country: 'Spain'   },
  { id: 19, name: 'Bundesliga',     country: 'Germany' },
  { id: 31, name: 'Serie A',        country: 'Italy'   },
  { id: 16, name: 'Ligue 1',        country: 'France'  },
];

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
const LEAGUE_NAME_TO_ID = {
  'premier league': 13,
  'laliga ea sports': 53, 'la liga': 53, 'laliga': 53,
  'bundesliga': 19,
  'serie a enilive': 31, 'serie a': 31,
  "ligue 1 mcdonalds": 16, 'ligue 1': 16,
};
const PT_TO_GROUP = {
  attack: 'ATT', forward: 'ATT', attacker: 'ATT',
  midfielder: 'MID', midfield: 'MID',
  defense: 'DEF', defence: 'DEF', defender: 'DEF',
  goalkeeper: 'GK',
};
const ALIASES = {
  id: ['player_id', 'sofifa_id', 'id'],
  overall: ['overall', 'overall_rating', 'overallrating'],
  name: ['short_name', 'name'],
  nameLong: ['long_name'],
  firstName: ['firstname', 'first_name'],
  lastName: ['lastname', 'last_name'],
  commonName: ['commonname', 'common_name'],
  positions: ['player_positions', 'positions'],
  position: ['position'],
  altPositions: ['alternatepositions', 'alternate_positions', 'alt_positions'],
  positionType: ['positiontype', 'position_type'],
  club: ['club_name', 'club_team_name', 'club', 'team'],
  clubId: ['club_team_id', 'club_id', 'team_id'],
  leagueId: ['league_id', 'leagueid'],
  leagueName: ['league_name', 'leaguename', 'league'],
  nationality: ['nationality_name', 'nationality'],
  photo: ['player_face_url', 'player_face', 'photo'],
};

function posToGroup(positions) {
  const p = (positions[0] ?? '').toUpperCase();
  if (p === 'GK') return 'GK';
  if (['CB', 'LB', 'RB', 'LWB', 'RWB', 'SW', 'RES'].includes(p)) return 'DEF';
  if (['CM', 'CDM', 'CAM', 'LM', 'RM', 'DM'].includes(p)) return 'MID';
  return 'ATT';
}

function forEachCsvRow(text, cb) {
  let field = '', row = [], inQuotes = false;
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false; }
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); field = ''; cb(row); row = []; }
    else if (c === '\r') { /* ignore */ }
    else field += c;
  }
  if (field.length || row.length) { row.push(field); cb(row); }
}

function resolveColumns(header) {
  const lower = header.map(h => h.trim().toLowerCase());
  const out = {};
  for (const [key, aliases] of Object.entries(ALIASES)) {
    for (const a of aliases) { const idx = lower.indexOf(a); if (idx !== -1) { out[key] = idx; break; } }
  }
  return out;
}

function parse(text) {
  let cols = null;
  const byId = new Map();
  forEachCsvRow(text, (fields) => {
    if (!cols) { cols = resolveColumns(fields); return; }
    const get = (k) => { const i = cols[k]; return i === undefined ? '' : (fields[i] ?? '').trim(); };

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

    const name = get('commonName') || `${get('firstName')} ${get('lastName')}`.trim() || get('name') || get('nameLong') || 'Unknown';

    let positions;
    if (get('positions')) positions = get('positions').split(',').map(s => s.trim()).filter(Boolean);
    else positions = [get('position'), ...get('altPositions').split(',')].map(s => s.trim()).filter(Boolean);

    let posGroup;
    if (positions.some(p => p.toUpperCase() === 'GK')) posGroup = 'GK';
    else if (get('positionType') && PT_TO_GROUP[norm(get('positionType'))]) posGroup = PT_TO_GROUP[norm(get('positionType'))];
    else posGroup = posToGroup(positions);

    const rawId = parseInt(get('id'), 10);
    const id = Number.isFinite(rawId) ? rawId : (byId.size + 1) * 1_000_000;

    const rec = {
      id, name, posGroup, overall,
      photoUrl: get('photo') || null,
      clubName: club, clubId: parseInt(get('clubId'), 10) || null, leagueId,
    };
    if (!byId.has(id)) byId.set(id, rec);
  });
  return Array.from(byId.values());
}

const mean = (arr, fallback) => arr.length ? Math.round(arr.reduce((s, v) => s + v, 0) / arr.length) : fallback;

function deriveTeams(players) {
  const byClub = new Map();
  for (const p of players) { const a = byClub.get(p.clubName) ?? []; a.push(p); byClub.set(p.clubName, a); }
  const teams = [];
  const teamIdByName = new Map();
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
      overallRating: ovr, attackRating: mean(att, ovr), midfieldRating: mean(mid, ovr), defenseRating: mean(def, ovr),
    });
    teamIdByName.set(club, id);
  });
  return { teams, teamIdByName };
}

// ---- run ----
const text = readFileSync(CSV, 'utf8');
const players = parse(text);
const { teams, teamIdByName } = deriveTeams(players);
const leagues = SOFIFA_LEAGUES.filter(l => teams.some(t => t.leagueId === l.id));

const outPlayers = players
  .map(p => ({
    id: p.id, name: p.name, posGroup: p.posGroup, overallRating: p.overall,
    photoUrl: p.photoUrl, teamId: teamIdByName.get(p.clubName) ?? null,
    teamName: p.clubName, leagueId: p.leagueId,
  }))
  .sort((a, b) => b.overallRating - a.overallRating);

const dataset = { generatedAt: new Date().toISOString(), leagues, teams, players: outPlayers };
writeFileSync(OUT, JSON.stringify(dataset));

const byLeague = Object.fromEntries(leagues.map(l => [l.name, {
  teams: teams.filter(t => t.leagueId === l.id).length,
  players: outPlayers.filter(p => p.leagueId === l.id).length,
}]));
console.log(`✓ ${OUT}`);
console.log(`  leagues=${leagues.length} teams=${teams.length} players=${outPlayers.length}`);
console.table(byLeague);
