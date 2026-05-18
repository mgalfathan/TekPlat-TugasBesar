# StatsBomb Open Data Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate StatsBomb Open Data (competitions, matches, lineups, players, key events) into Sportlytics — adding 6 new Prisma models, a Players section, a Match Detail page, and updating all existing pages (dashboard, matches, results, admin/sync, navbar) to expose StatsBomb data.

**Architecture:** Fetch JSON from StatsBomb's GitHub raw URLs (no API key required) and upsert into 6 new SQLite models (SbCompetition, SbTeam, SbPlayer, SbMatch, SbLineupEntry, SbEvent). StatsBomb data is historical and coexists with football-data.org live data. Key events only (shots, substitutions, fouls, cards, goal assists) are stored to keep the database lean.

**Tech Stack:** Next.js 14 App Router, Prisma 5 + SQLite, TypeScript strict, Tailwind CSS, date-fns, StatsBomb Open Data (GitHub raw JSON)

**StatsBomb raw URL pattern:**
- Competitions: `https://raw.githubusercontent.com/statsbomb/open-data/master/data/competitions.json`
- Matches: `…/matches/{competition_id}/{season_id}.json`
- Lineups: `…/lineups/{match_id}.json`
- Events: `…/events/{match_id}.json`

---

## File Map

**Created:**
- `lib/statsbombClient.ts` — typed fetch helpers for StatsBomb GitHub raw data
- `lib/syncStatsbomb.ts` — upsert StatsBomb data into Prisma
- `app/api/sb/sync/route.ts` — POST trigger sync (competitions-only or full season)
- `app/api/sb/competitions/route.ts` — GET list all SbCompetitions
- `app/api/sb/matches/[id]/route.ts` — GET SbMatch detail
- `app/api/players/route.ts` — GET paginated/searched players
- `app/api/players/[id]/route.ts` — GET player profile + computed stats
- `app/api/matches/[id]/lineups/route.ts` — GET match lineups grouped by team
- `app/api/matches/[id]/events/route.ts` — GET key events ordered by time
- `app/players/page.tsx` — players browse page
- `app/players/[id]/page.tsx` — player profile page
- `app/matches/[id]/page.tsx` — match detail page (score card + events + lineups tabs)

**Modified:**
- `prisma/schema.prisma` — append 6 StatsBomb models
- `app/api/dashboard/route.ts` — add `prisma.sbPlayer.count()` → `totalPlayers`
- `app/dashboard/page.tsx` — add Players stat card linking to /players
- `app/matches/page.tsx` — add Detail link column
- `app/results/page.tsx` — make rows clickable → /matches/[id]
- `components/Navbar.tsx` — add Players link
- `app/admin/sync/page.tsx` — add StatsBomb sync section below existing FD section

---

### Task 1: Add StatsBomb Prisma Models

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Append 6 new models to schema**

Open `prisma/schema.prisma` and append after the `CustomMetric` model:

```prisma
model SbCompetition {
  id                Int       @id @default(autoincrement())
  competitionId     Int
  seasonId          Int
  competitionName   String
  countryName       String
  competitionGender String    @default("male")
  seasonName        String
  matches           SbMatch[]

  @@unique([competitionId, seasonId])
}

model SbTeam {
  id            Int             @id @default(autoincrement())
  statsbombId   Int             @unique
  name          String
  gender        String?
  country       String?
  homeMatches   SbMatch[]       @relation("SbHomeTeam")
  awayMatches   SbMatch[]       @relation("SbAwayTeam")
  lineupEntries SbLineupEntry[]
  events        SbEvent[]
}

model SbPlayer {
  id            Int             @id @default(autoincrement())
  statsbombId   Int             @unique
  name          String
  nickname      String?
  country       String?
  lineupEntries SbLineupEntry[]
  events        SbEvent[]
}

model SbMatch {
  id            Int             @id @default(autoincrement())
  statsbombId   Int             @unique
  competitionId Int
  homeTeamId    Int
  awayTeamId    Int
  homeScore     Int?
  awayScore     Int?
  matchDate     DateTime
  kickOff       String?
  matchWeek     Int?
  stage         String?
  stadium       String?
  referee       String?
  competition   SbCompetition   @relation(fields: [competitionId], references: [id])
  homeTeam      SbTeam          @relation("SbHomeTeam", fields: [homeTeamId], references: [id])
  awayTeam      SbTeam          @relation("SbAwayTeam", fields: [awayTeamId], references: [id])
  lineupEntries SbLineupEntry[]
  events        SbEvent[]
}

model SbLineupEntry {
  id           Int      @id @default(autoincrement())
  matchId      Int
  teamId       Int
  playerId     Int
  jerseyNumber Int?
  positions    String?
  cards        String?
  match        SbMatch  @relation(fields: [matchId], references: [id])
  team         SbTeam   @relation(fields: [teamId], references: [id])
  player       SbPlayer @relation(fields: [playerId], references: [id])

  @@unique([matchId, teamId, playerId])
}

model SbEvent {
  id         String    @id
  matchId    Int
  eventIndex Int
  period     Int
  minute     Int
  second     Int
  typeName   String
  playerId   Int?
  playerName String?
  teamId     Int?
  teamName   String?
  location   String?
  extras     String?
  match      SbMatch   @relation(fields: [matchId], references: [id])
  player     SbPlayer? @relation(fields: [playerId], references: [id])
  team       SbTeam?   @relation(fields: [teamId], references: [id])
}
```

- [ ] **Step 2: Run migration**

```bash
npx prisma migrate dev --name add_statsbomb
```

Expected: `✔ Generated Prisma Client` and migration applied.

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add StatsBomb Prisma models"
```

---

### Task 2: StatsBomb API Client

**Files:**
- Create: `lib/statsbombClient.ts`

- [ ] **Step 1: Create `lib/statsbombClient.ts`**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add lib/statsbombClient.ts
git commit -m "feat: add StatsBomb API client"
```

---

### Task 3: StatsBomb Sync Service

**Files:**
- Create: `lib/syncStatsbomb.ts`

- [ ] **Step 1: Create `lib/syncStatsbomb.ts`**

```typescript
import { prisma } from './prisma';
import {
  fetchSbCompetitions, fetchSbMatches, fetchSbLineups, fetchSbEvents,
  SbRawEvent,
} from './statsbombClient';

export interface SbSyncResult {
  competitions: number;
  teams: number;
  players: number;
  matches: number;
  lineupEntries: number;
  events: number;
  errors: string[];
}

const KEY_EVENT_TYPES = new Set([
  'Shot', 'Substitution', 'Foul Committed', 'Bad Behaviour',
  'Own Goal For', 'Own Goal Against',
]);

function isKeyEvent(event: SbRawEvent): boolean {
  if (KEY_EVENT_TYPES.has(event.type.name)) return true;
  if (event.type.name === 'Pass' && (event.pass?.goal_assist || event.pass?.shot_assist)) return true;
  return false;
}

function buildExtras(event: SbRawEvent): string | null {
  const data: Record<string, unknown> = {};
  if (event.shot) {
    data.shot = {
      xg: event.shot.statsbomb_xg,
      outcome: event.shot.outcome?.name,
      technique: event.shot.technique?.name,
      bodyPart: event.shot.body_part?.name,
      endLocation: event.shot.end_location,
    };
  }
  if (event.pass) {
    data.pass = {
      goalAssist: event.pass.goal_assist,
      shotAssist: event.pass.shot_assist,
      outcome: event.pass.outcome?.name,
      recipient: event.pass.recipient?.name,
    };
  }
  if (event.substitution) {
    data.substitution = {
      replacement: event.substitution.replacement?.name,
      outcome: event.substitution.outcome?.name,
    };
  }
  if (event.bad_behaviour) data.card = event.bad_behaviour.card?.name;
  if (event.foul_committed) {
    data.foul = {
      card: event.foul_committed.card?.name,
      type: event.foul_committed.type?.name,
    };
  }
  return Object.keys(data).length ? JSON.stringify(data) : null;
}

export async function syncSbCompetitions(): Promise<number> {
  const list = await fetchSbCompetitions();
  for (const c of list) {
    await prisma.sbCompetition.upsert({
      where: { competitionId_seasonId: { competitionId: c.competition_id, seasonId: c.season_id } },
      update: { competitionName: c.competition_name, countryName: c.country_name, seasonName: c.season_name, competitionGender: c.competition_gender },
      create: {
        competitionId: c.competition_id,
        seasonId: c.season_id,
        competitionName: c.competition_name,
        countryName: c.country_name,
        competitionGender: c.competition_gender,
        seasonName: c.season_name,
      },
    });
  }
  return list.length;
}

export async function syncSbAll(competitionId: number, seasonId: number): Promise<SbSyncResult> {
  const errors: string[] = [];
  let teams = 0, players = 0, lineupEntries = 0, events = 0;

  const competition = await prisma.sbCompetition.findUnique({
    where: { competitionId_seasonId: { competitionId, seasonId } },
  });
  if (!competition) {
    throw new Error(`Competition ${competitionId}/${seasonId} not found — run syncSbCompetitions first`);
  }

  const rawMatches = await fetchSbMatches(competitionId, seasonId);
  let matchCount = 0;

  for (const rm of rawMatches) {
    try {
      const homeTeam = await prisma.sbTeam.upsert({
        where: { statsbombId: rm.home_team.home_team_id },
        update: { name: rm.home_team.home_team_name },
        create: {
          statsbombId: rm.home_team.home_team_id,
          name: rm.home_team.home_team_name,
          gender: rm.home_team.home_team_gender,
          country: rm.home_team.country?.name,
        },
      });

      const awayTeam = await prisma.sbTeam.upsert({
        where: { statsbombId: rm.away_team.away_team_id },
        update: { name: rm.away_team.away_team_name },
        create: {
          statsbombId: rm.away_team.away_team_id,
          name: rm.away_team.away_team_name,
          gender: rm.away_team.away_team_gender,
          country: rm.away_team.country?.name,
        },
      });
      teams += 2;

      const sbMatch = await prisma.sbMatch.upsert({
        where: { statsbombId: rm.match_id },
        update: { homeScore: rm.home_score, awayScore: rm.away_score },
        create: {
          statsbombId: rm.match_id,
          competitionId: competition.id,
          homeTeamId: homeTeam.id,
          awayTeamId: awayTeam.id,
          homeScore: rm.home_score,
          awayScore: rm.away_score,
          matchDate: new Date(`${rm.match_date}T${(rm.kick_off ?? '00:00:00').slice(0, 8)}Z`),
          kickOff: rm.kick_off,
          matchWeek: rm.match_week,
          stage: rm.competition_stage?.name,
          stadium: rm.stadium?.name,
          referee: rm.referee?.name,
        },
      });
      matchCount++;

      // Sync lineups
      const lineups = await fetchSbLineups(rm.match_id);
      for (const lt of lineups) {
        const team = lt.team_id === rm.home_team.home_team_id ? homeTeam : awayTeam;
        for (const lp of lt.lineup) {
          const player = await prisma.sbPlayer.upsert({
            where: { statsbombId: lp.player_id },
            update: { name: lp.player_name, nickname: lp.player_nickname, country: lp.country?.name },
            create: {
              statsbombId: lp.player_id,
              name: lp.player_name,
              nickname: lp.player_nickname,
              country: lp.country?.name,
            },
          });
          players++;
          await prisma.sbLineupEntry.upsert({
            where: { matchId_teamId_playerId: { matchId: sbMatch.id, teamId: team.id, playerId: player.id } },
            update: {},
            create: {
              matchId: sbMatch.id,
              teamId: team.id,
              playerId: player.id,
              jerseyNumber: lp.jersey_number,
              positions: JSON.stringify(lp.positions),
              cards: JSON.stringify(lp.cards),
            },
          });
          lineupEntries++;
        }
      }

      // Sync key events
      await prisma.sbEvent.deleteMany({ where: { matchId: sbMatch.id } });
      const rawEvents = await fetchSbEvents(rm.match_id);
      const keyEvents = rawEvents.filter(isKeyEvent);

      for (const ev of keyEvents) {
        const player = ev.player
          ? await prisma.sbPlayer.findUnique({ where: { statsbombId: ev.player.id } })
          : null;
        const evTeam = await prisma.sbTeam.findUnique({ where: { statsbombId: ev.team.id } });

        await prisma.sbEvent.create({
          data: {
            id: ev.id,
            matchId: sbMatch.id,
            eventIndex: ev.index,
            period: ev.period,
            minute: ev.minute,
            second: ev.second,
            typeName: ev.type.name,
            playerId: player?.id ?? null,
            playerName: ev.player?.name ?? null,
            teamId: evTeam?.id ?? null,
            teamName: ev.team.name,
            location: ev.location ? JSON.stringify(ev.location) : null,
            extras: buildExtras(ev),
          },
        });
        events++;
      }
    } catch (err) {
      errors.push(`Match ${rm.match_id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return { competitions: 1, teams, players, matches: matchCount, lineupEntries, events, errors };
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/syncStatsbomb.ts
git commit -m "feat: add StatsBomb sync service with key-event filtering"
```

---

### Task 4: StatsBomb API Routes

**Files:**
- Create: `app/api/sb/sync/route.ts`
- Create: `app/api/sb/competitions/route.ts`
- Create: `app/api/sb/matches/[id]/route.ts`
- Create: `app/api/players/route.ts`
- Create: `app/api/players/[id]/route.ts`
- Create: `app/api/matches/[id]/lineups/route.ts`
- Create: `app/api/matches/[id]/events/route.ts`

- [ ] **Step 1: Create `app/api/sb/sync/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { syncSbCompetitions, syncSbAll } from '@/lib/syncStatsbomb';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { competitionId?: number; seasonId?: number; competitionsOnly?: boolean };

    if (body.competitionsOnly) {
      const count = await syncSbCompetitions();
      return NextResponse.json({ success: true, competitions: count });
    }

    if (!body.competitionId || !body.seasonId) {
      return NextResponse.json({ error: 'competitionId and seasonId required' }, { status: 400 });
    }

    const result = await syncSbAll(body.competitionId, body.seasonId);
    return NextResponse.json({ success: true, result });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Sync failed' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Create `app/api/sb/competitions/route.ts`**

```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const competitions = await prisma.sbCompetition.findMany({
      orderBy: [{ competitionName: 'asc' }, { seasonName: 'desc' }],
      include: { _count: { select: { matches: true } } },
    });
    return NextResponse.json(competitions);
  } catch {
    return NextResponse.json([]);
  }
}
```

- [ ] **Step 3: Create `app/api/sb/matches/[id]/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const match = await prisma.sbMatch.findUnique({
    where: { id },
    include: { homeTeam: true, awayTeam: true, competition: true },
  });

  if (!match) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(match);
}
```

- [ ] **Step 4: Create `app/api/players/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') ?? '';
  const country = searchParams.get('country') ?? '';
  const limit = Math.min(Number(searchParams.get('limit') ?? '100'), 500);
  const offset = Number(searchParams.get('offset') ?? '0');

  const where = {
    AND: [
      search ? { name: { contains: search } } : {},
      country ? { country: { contains: country } } : {},
    ],
  };

  const [players, total] = await Promise.all([
    prisma.sbPlayer.findMany({
      where,
      orderBy: { name: 'asc' },
      take: limit,
      skip: offset,
      include: { _count: { select: { lineupEntries: true } } },
    }),
    prisma.sbPlayer.count({ where }),
  ]);

  return NextResponse.json({ players, total });
}
```

- [ ] **Step 5: Create `app/api/players/[id]/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const player = await prisma.sbPlayer.findUnique({
    where: { id },
    include: {
      lineupEntries: {
        include: {
          match: { include: { homeTeam: true, awayTeam: true, competition: true } },
          team: true,
        },
        orderBy: { match: { matchDate: 'desc' } },
        take: 100,
      },
      events: {
        where: { typeName: { in: ['Shot', 'Pass'] } },
        orderBy: { match: { matchDate: 'desc' } },
        take: 500,
      },
    },
  });

  if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 });

  const goals = player.events.filter(e => {
    if (e.typeName !== 'Shot') return false;
    try { const ex = JSON.parse(e.extras ?? '{}') as { shot?: { outcome?: string } }; return ex.shot?.outcome === 'Goal'; }
    catch { return false; }
  }).length;

  const assists = player.events.filter(e => {
    if (e.typeName !== 'Pass') return false;
    try { const ex = JSON.parse(e.extras ?? '{}') as { pass?: { goalAssist?: boolean } }; return ex.pass?.goalAssist === true; }
    catch { return false; }
  }).length;

  const shots = player.events.filter(e => e.typeName === 'Shot').length;

  const xg = player.events
    .filter(e => e.typeName === 'Shot')
    .reduce((sum, e) => {
      try { const ex = JSON.parse(e.extras ?? '{}') as { shot?: { xg?: number } }; return sum + (ex.shot?.xg ?? 0); }
      catch { return sum; }
    }, 0);

  return NextResponse.json({
    player: { id: player.id, statsbombId: player.statsbombId, name: player.name, nickname: player.nickname, country: player.country },
    stats: { goals, assists, shots, xg: Math.round(xg * 100) / 100, appearances: player.lineupEntries.length },
    appearances: player.lineupEntries.map(e => ({
      matchId: e.match.id,
      statsbombMatchId: e.match.statsbombId,
      matchDate: e.match.matchDate,
      competition: e.match.competition.competitionName,
      season: e.match.competition.seasonName,
      homeTeam: e.match.homeTeam.name,
      awayTeam: e.match.awayTeam.name,
      homeScore: e.match.homeScore,
      awayScore: e.match.awayScore,
      team: e.team.name,
      jerseyNumber: e.jerseyNumber,
      positions: e.positions ? JSON.parse(e.positions) as Array<{ position: string; start_reason: string; end_reason: string | null }> : [],
      cards: e.cards ? JSON.parse(e.cards) as Array<{ card_type: string; reason: string }> : [],
    })),
  });
}
```

- [ ] **Step 6: Create `app/api/matches/[id]/lineups/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const entries = await prisma.sbLineupEntry.findMany({
    where: { matchId: id },
    include: { player: true, team: true },
    orderBy: [{ teamId: 'asc' }, { jerseyNumber: 'asc' }],
  });

  const grouped: Record<number, { team: { id: number; name: string }; players: typeof entries }> = {};
  for (const e of entries) {
    if (!grouped[e.teamId]) grouped[e.teamId] = { team: { id: e.team.id, name: e.team.name }, players: [] };
    grouped[e.teamId].players.push(e);
  }

  return NextResponse.json(
    Object.values(grouped).map(g => ({
      team: g.team,
      players: g.players.map(e => ({
        id: e.player.id,
        name: e.player.name,
        nickname: e.player.nickname,
        jerseyNumber: e.jerseyNumber,
        country: e.player.country,
        positions: e.positions ? JSON.parse(e.positions) as Array<{ position: string; start_reason: string; end_reason: string | null }> : [],
        cards: e.cards ? JSON.parse(e.cards) as Array<{ card_type: string; reason: string }> : [],
      })),
    }))
  );
}
```

- [ ] **Step 7: Create `app/api/matches/[id]/events/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const events = await prisma.sbEvent.findMany({
    where: { matchId: id },
    orderBy: [{ period: 'asc' }, { minute: 'asc' }, { second: 'asc' }],
  });

  return NextResponse.json(
    events.map(e => ({
      id: e.id,
      period: e.period,
      minute: e.minute,
      second: e.second,
      type: e.typeName,
      player: e.playerName,
      team: e.teamName,
      location: e.location ? JSON.parse(e.location) as [number, number] : null,
      extras: e.extras ? JSON.parse(e.extras) as Record<string, unknown> : null,
    }))
  );
}
```

- [ ] **Step 8: Commit**

```bash
git add app/api/sb/ app/api/players/ app/api/matches/
git commit -m "feat: add StatsBomb API routes"
```

---

### Task 5: Players UI Pages

**Files:**
- Create: `app/players/page.tsx`
- Create: `app/players/[id]/page.tsx`

- [ ] **Step 1: Create `app/players/page.tsx`**

```tsx
'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';

interface Player {
  id: number;
  name: string;
  nickname: string | null;
  country: string | null;
  _count: { lineupEntries: number };
}

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [country, setCountry] = useState('');

  const fetchPlayers = useCallback((s: string, c: string) => {
    setLoading(true);
    const params = new URLSearchParams({ limit: '100' });
    if (s) params.set('search', s);
    if (c) params.set('country', c);
    fetch(`/api/players?${params}`)
      .then(r => r.json())
      .then((d: { players?: Player[]; total?: number }) => {
        setPlayers(d.players ?? []);
        setTotal(d.total ?? 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { fetchPlayers('', ''); }, [fetchPlayers]);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); fetchPlayers(search, country); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-black text-white mb-1">Players</h1>
          <p className="text-slate-400">{total} players from StatsBomb open data</p>
        </div>
        <form onSubmit={handleSearch} className="flex gap-2 flex-wrap">
          <input
            type="text" placeholder="Search name..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-[#111827] border border-gray-700 rounded-lg px-4 py-2 text-slate-100 text-sm focus:outline-none focus:border-[#00d4aa] w-48"
          />
          <input
            type="text" placeholder="Country..." value={country}
            onChange={e => setCountry(e.target.value)}
            className="bg-[#111827] border border-gray-700 rounded-lg px-4 py-2 text-slate-100 text-sm focus:outline-none focus:border-[#00d4aa] w-36"
          />
          <button type="submit" className="bg-[#00d4aa] text-[#0a0f1e] font-bold px-4 py-2 rounded-lg text-sm hover:bg-[#00d4aa]/90 transition-colors">
            Search
          </button>
        </form>
      </div>

      {loading ? (
        <LoadingSpinner message="Loading players..." />
      ) : players.length === 0 ? (
        <EmptyState
          title="No players found"
          description="Sync StatsBomb data from Admin → Sync to load players."
        />
      ) : (
        <div className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-slate-400 text-xs uppercase">
                <th className="text-left px-4 py-3">Player</th>
                <th className="text-left px-4 py-3">Country</th>
                <th className="text-center px-4 py-3">Appearances</th>
                <th className="text-right px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {players.map(p => (
                <tr key={p.id} className="border-b border-gray-800/50 last:border-0 hover:bg-gray-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-slate-200 font-medium">{p.name}</p>
                    {p.nickname && <p className="text-slate-500 text-xs">{p.nickname}</p>}
                  </td>
                  <td className="px-4 py-3 text-slate-400">{p.country ?? '—'}</td>
                  <td className="px-4 py-3 text-center text-slate-300">{p._count.lineupEntries}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/players/${p.id}`} className="text-xs text-[#00d4aa] hover:underline">
                      Profile →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create `app/players/[id]/page.tsx`**

```tsx
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { LoadingSpinner } from '@/components/LoadingSpinner';

interface Position { position: string; start_reason: string; end_reason: string | null }
interface Card { card_type: string; reason: string }

interface Appearance {
  matchId: number; statsbombMatchId: number; matchDate: string;
  competition: string; season: string;
  homeTeam: string; awayTeam: string;
  homeScore: number | null; awayScore: number | null;
  team: string; jerseyNumber: number | null;
  positions: Position[];
  cards: Card[];
}

interface PlayerDetail {
  player: { id: number; statsbombId: number; name: string; nickname: string | null; country: string | null };
  stats: { goals: number; assists: number; shots: number; xg: number; appearances: number };
  appearances: Appearance[];
}

function StatBubble({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-[#0a0f1e] rounded-xl p-4 text-center">
      <p className="text-2xl font-black text-[#00d4aa]">{value}</p>
      <p className="text-slate-400 text-xs mt-1">{label}</p>
    </div>
  );
}

export default function PlayerPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<PlayerDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/players/${params.id}`)
      .then(r => r.json())
      .then((d: PlayerDetail & { error?: string }) => {
        if (!d.error) setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [params.id]);

  if (loading) return <LoadingSpinner message="Loading player profile..." />;
  if (!data) return <div className="text-center py-20 text-red-400">Player not found.</div>;

  const { player, stats, appearances } = data;

  return (
    <div className="space-y-8">
      <div>
        <Link href="/players" className="text-sm text-slate-500 hover:text-[#00d4aa] mb-2 inline-block">
          ← Players
        </Link>
        <h1 className="text-3xl font-black text-white">{player.name}</h1>
        {player.nickname && <p className="text-slate-400 text-sm mt-0.5">"{player.nickname}"</p>}
        {player.country && <p className="text-slate-500 text-sm mt-0.5">{player.country}</p>}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatBubble label="Appearances" value={stats.appearances} />
        <StatBubble label="Goals" value={stats.goals} />
        <StatBubble label="Assists" value={stats.assists} />
        <StatBubble label="Shots" value={stats.shots} />
        <StatBubble label="xG" value={stats.xg} />
      </div>

      <div className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800">
          <h2 className="text-white font-bold">Match History</h2>
        </div>
        {appearances.length === 0 ? (
          <p className="text-slate-500 text-sm p-5">No appearances recorded.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-400 text-xs uppercase border-b border-gray-800">
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-left px-4 py-3">Match</th>
                <th className="text-center px-4 py-3">Score</th>
                <th className="text-left px-4 py-3">Competition</th>
                <th className="text-center px-4 py-3">Position</th>
                <th className="text-center px-4 py-3">Cards</th>
                <th className="text-right px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {appearances.map((a) => (
                <tr key={a.matchId} className="border-b border-gray-800/50 last:border-0 hover:bg-gray-800/30">
                  <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                    {format(new Date(a.matchDate), 'dd MMM yy')}
                  </td>
                  <td className="px-4 py-3 text-slate-200 font-medium whitespace-nowrap">
                    {a.homeTeam} <span className="text-slate-500">vs</span> {a.awayTeam}
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-[#00d4aa] whitespace-nowrap">
                    {a.homeScore} – {a.awayScore}
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {a.competition}
                    <span className="text-slate-600 ml-1">{a.season}</span>
                  </td>
                  <td className="px-4 py-3 text-center text-slate-400 text-xs">
                    {a.positions[0]?.position ?? '—'}
                    {a.positions[0]?.start_reason === 'Substitution' && (
                      <span className="text-blue-400 ml-1">sub</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {a.cards.map((c, i) => (
                      <span
                        key={i}
                        className={`inline-block w-3 h-4 rounded-sm mr-0.5 ${c.card_type.toLowerCase().includes('yellow') ? 'bg-yellow-400' : 'bg-red-500'}`}
                        title={`${c.card_type}: ${c.reason}`}
                      />
                    ))}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/matches/${a.matchId}`} className="text-xs text-[#00d4aa] hover:underline">
                      Detail →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/players/
git commit -m "feat: add Players browse and player profile pages"
```

---

### Task 6: Match Detail Page + Update Existing Pages

**Files:**
- Create: `app/matches/[id]/page.tsx`
- Modify: `app/matches/page.tsx`
- Modify: `app/results/page.tsx`
- Modify: `app/api/dashboard/route.ts`
- Modify: `app/dashboard/page.tsx`
- Modify: `components/Navbar.tsx`
- Modify: `app/admin/sync/page.tsx`

- [ ] **Step 1: Create `app/matches/[id]/page.tsx`**

```tsx
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { LoadingSpinner } from '@/components/LoadingSpinner';

interface SbMatchDetail {
  id: number; statsbombId: number;
  homeScore: number | null; awayScore: number | null;
  matchDate: string; kickOff: string | null;
  matchWeek: number | null; stage: string | null;
  stadium: string | null; referee: string | null;
  homeTeam: { id: number; name: string };
  awayTeam: { id: number; name: string };
  competition: { competitionName: string; seasonName: string };
}

interface LineupTeam {
  team: { id: number; name: string };
  players: Array<{
    id: number; name: string; nickname: string | null;
    jerseyNumber: number | null; country: string | null;
    positions: Array<{ position: string; start_reason: string; end_reason: string | null }>;
    cards: Array<{ card_type: string; reason: string }>;
  }>;
}

interface MatchEvent {
  id: string; period: number; minute: number; second: number;
  type: string; player: string | null; team: string | null;
  extras: {
    shot?: { xg?: number; outcome?: string; bodyPart?: string };
    substitution?: { replacement?: string; outcome?: string };
    card?: string;
    foul?: { card?: string; type?: string };
    pass?: { goalAssist?: boolean; recipient?: string };
  } | null;
}

function eventIcon(type: string): string {
  if (type === 'Shot') return '⚽';
  if (type === 'Substitution') return '🔄';
  if (type === 'Foul Committed') return '⚠️';
  if (type === 'Bad Behaviour') return '🟨';
  if (type === 'Own Goal For' || type === 'Own Goal Against') return '😬';
  if (type === 'Pass') return '🎯';
  return '•';
}

function eventDesc(ev: MatchEvent): string {
  if (ev.type === 'Shot') {
    const outcome = ev.extras?.shot?.outcome ?? '';
    const xg = ev.extras?.shot?.xg != null ? ` (xG ${ev.extras.shot.xg.toFixed(2)})` : '';
    return `${outcome}${xg}`;
  }
  if (ev.type === 'Substitution') return `→ ${ev.extras?.substitution?.replacement ?? ''}`;
  if (ev.type === 'Bad Behaviour') return ev.extras?.card ?? '';
  if (ev.type === 'Foul Committed') return ev.extras?.foul?.card ? `+ ${ev.extras.foul.card}` : '';
  if (ev.type === 'Pass') return 'Goal assist';
  return '';
}

export default function MatchDetailPage({ params }: { params: { id: string } }) {
  const [match, setMatch] = useState<SbMatchDetail | null>(null);
  const [lineups, setLineups] = useState<LineupTeam[]>([]);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'events' | 'lineups'>('events');

  useEffect(() => {
    const id = params.id;
    Promise.all([
      fetch(`/api/sb/matches/${id}`).then(r => r.json()),
      fetch(`/api/matches/${id}/lineups`).then(r => r.json()),
      fetch(`/api/matches/${id}/events`).then(r => r.json()),
    ]).then(([m, l, e]: [SbMatchDetail & { error?: string }, LineupTeam[], MatchEvent[]]) => {
      if (!m.error) setMatch(m);
      setLineups(Array.isArray(l) ? l : []);
      setEvents(Array.isArray(e) ? e : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [params.id]);

  if (loading) return <LoadingSpinner message="Loading match..." />;
  if (!match) return <div className="text-center py-20 text-red-400">Match not found.</div>;

  const goals = events.filter(e => e.type === 'Shot' && e.extras?.shot?.outcome === 'Goal');

  return (
    <div className="space-y-8">
      <div>
        <Link href="/matches" className="text-sm text-slate-500 hover:text-[#00d4aa] mb-2 inline-block">
          ← Matches
        </Link>

        <div className="bg-[#111827] border border-gray-800 rounded-xl p-6">
          <p className="text-slate-400 text-sm text-center mb-4">
            {match.competition.competitionName} · {match.competition.seasonName}
            {match.stage ? ` · ${match.stage}` : ''}
            {match.matchWeek ? ` · MD ${match.matchWeek}` : ''}
          </p>
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 text-right">
              <p className="text-2xl font-black text-white">{match.homeTeam.name}</p>
            </div>
            <div className="text-center px-6 shrink-0">
              <p className="text-5xl font-black text-[#00d4aa]">
                {match.homeScore ?? '–'} – {match.awayScore ?? '–'}
              </p>
              <p className="text-slate-500 text-xs mt-2">{format(new Date(match.matchDate), 'dd MMM yyyy')}</p>
              {match.stadium && <p className="text-slate-500 text-xs">{match.stadium}</p>}
              {match.referee && <p className="text-slate-600 text-xs">Ref: {match.referee}</p>}
            </div>
            <div className="flex-1 text-left">
              <p className="text-2xl font-black text-white">{match.awayTeam.name}</p>
            </div>
          </div>
          {goals.length > 0 && (
            <div className="mt-5 pt-4 border-t border-gray-800 flex flex-wrap gap-x-6 gap-y-1 justify-center text-sm text-slate-400">
              {goals.map(g => (
                <span key={g.id}>⚽ {g.player} {g.minute}&apos;</span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        {(['events', 'lineups'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-colors capitalize ${
              tab === t
                ? 'bg-[#00d4aa] text-[#0a0f1e]'
                : 'bg-[#111827] border border-gray-700 text-slate-300 hover:border-gray-500'
            }`}
          >
            {t} {t === 'events' ? `(${events.length})` : `(${lineups.reduce((s, l) => s + l.players.length, 0)})`}
          </button>
        ))}
      </div>

      {tab === 'events' && (
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-5">
          {events.length === 0 ? (
            <p className="text-slate-500 text-sm">No key events recorded for this match.</p>
          ) : (
            <div className="space-y-0">
              {events.map(ev => (
                <div key={ev.id} className="flex items-center gap-3 py-2 border-b border-gray-800/40 last:border-0">
                  <span className="text-slate-500 text-xs w-10 text-right shrink-0 font-mono">{ev.minute}&apos;</span>
                  <span className="text-base shrink-0">{eventIcon(ev.type)}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-slate-200 text-sm font-medium">{ev.player ?? ev.team}</span>
                    {eventDesc(ev) && (
                      <span className="text-slate-400 text-xs ml-2">{eventDesc(ev)}</span>
                    )}
                  </div>
                  <span className="text-slate-600 text-xs shrink-0">{ev.team}</span>
                  <span className="text-slate-700 text-xs shrink-0 w-5 text-center">{ev.period}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'lineups' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {lineups.length === 0 ? (
            <p className="text-slate-500 text-sm col-span-2">No lineup data for this match.</p>
          ) : lineups.map(lineup => (
            <div key={lineup.team.id} className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-800">
                <h3 className="text-white font-bold">{lineup.team.name}</h3>
                <p className="text-slate-500 text-xs">{lineup.players.length} players</p>
              </div>
              <div className="divide-y divide-gray-800/40">
                {lineup.players.map(p => (
                  <div key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="text-slate-600 text-xs w-5 text-center font-mono shrink-0">
                      {p.jerseyNumber ?? ''}
                    </span>
                    <Link href={`/players/${p.id}`} className="text-slate-200 text-sm flex-1 hover:text-[#00d4aa] transition-colors">
                      {p.name}
                    </Link>
                    <span className="text-slate-500 text-xs">{p.positions[0]?.position ?? ''}</span>
                    {p.positions[0]?.start_reason === 'Substitution' && (
                      <span className="text-blue-400 text-xs">sub</span>
                    )}
                    {p.cards.map((c, i) => (
                      <span
                        key={i}
                        className={`w-2.5 h-3.5 rounded-sm ${c.card_type.toLowerCase().includes('yellow') ? 'bg-yellow-400' : 'bg-red-500'}`}
                        title={`${c.card_type}: ${c.reason}`}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Update `app/matches/page.tsx`** — add Detail link column

Add `import Link from 'next/link';` at top.

In `<thead>`, after the `Competition` `<th>`, add:
```tsx
<th className="text-right px-4 py-3"></th>
```

In each `<tr>`, after the competition `<td>`, add:
```tsx
<td className="px-4 py-3 text-right">
  <Link href={`/matches/${m.id}`} className="text-xs text-[#00d4aa] hover:underline">
    Detail →
  </Link>
</td>
```

- [ ] **Step 3: Update `app/results/page.tsx`** — make rows navigate to match detail

Add `import { useRouter } from 'next/navigation';` at top.

Inside `ResultsPage`, add: `const router = useRouter();`

Change `<tr key={r.id} className="border-b ...">` to:
```tsx
<tr
  key={r.id}
  className="border-b border-gray-800/50 last:border-0 hover:bg-gray-800/30 cursor-pointer"
  onClick={() => router.push(`/matches/${r.id}`)}
>
```

- [ ] **Step 4: Update `app/api/dashboard/route.ts`** — add totalPlayers

Add `prisma.sbPlayer.count()` to the `Promise.all` destructure:

```typescript
const [
  totalTeams, totalMatches, totalPredictions, totalPlayers,
  liveCount, upcomingCount, finishedCount,
  recentMatches, upcomingMatches, topStandings, topScorers,
] = await Promise.all([
  prisma.team.count(),
  prisma.match.count(),
  prisma.prediction.count(),
  prisma.sbPlayer.count(),
  prisma.match.count({ where: { status: { in: ['IN_PLAY', 'PAUSED', 'LIVE'] } } }),
  prisma.match.count({ where: { status: { in: ['SCHEDULED', 'TIMED'] } } }),
  prisma.match.count({ where: { status: 'FINISHED' } }),
  // ... rest of the Promise.all entries unchanged
]);
```

Update the returned stats object:
```typescript
stats: { totalTeams, totalMatches, totalPredictions, totalPlayers, liveCount, upcomingCount, finishedCount },
```

- [ ] **Step 5: Update `app/dashboard/page.tsx`** — add Players stat card

Update `DashboardData.stats` type:
```typescript
stats: { totalTeams: number; totalMatches: number; totalPredictions: number; totalPlayers: number; liveCount: number; upcomingCount: number; finishedCount: number };
```

Change grid from `lg:grid-cols-6` to `lg:grid-cols-7` and add the Players card:
```tsx
<div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
  <StatCard label="Teams" value={data.stats.totalTeams} accent="green" />
  <StatCard label="Matches" value={data.stats.totalMatches} accent="blue" />
  <StatCard label="Predictions" value={data.stats.totalPredictions} accent="amber" />
  <Link href="/players"><StatCard label="Players" value={data.stats.totalPlayers} sub="StatsBomb" accent="green" /></Link>
  <Link href="/live"><StatCard label="🔴 Live" value={data.stats.liveCount} sub="In play now" accent="green" /></Link>
  <Link href="/fixtures"><StatCard label="Upcoming" value={data.stats.upcomingCount} sub="Fixtures" accent="blue" /></Link>
  <StatCard label="Finished" value={data.stats.finishedCount} accent="amber" />
</div>
```

- [ ] **Step 6: Update `components/Navbar.tsx`** — add Players link

In the `links` array, insert after the Standings entry:
```typescript
{ href: '/players', label: 'Players' },
```

- [ ] **Step 7: Replace `app/admin/sync/page.tsx`** — add StatsBomb sync section

```tsx
'use client';
import { useState } from 'react';

interface SyncResult { source: string; competitions: number; teams: number; matches: number; standings: number; errors: string[] }
interface SbSyncResult { competitions: number; teams: number; players: number; matches: number; lineupEntries: number; events: number; errors: string[] }
interface SbCompetition { id: number; competitionId: number; seasonId: number; competitionName: string; countryName: string; seasonName: string; _count: { matches: number } }

const FD_COMPETITIONS = [
  { code: 'PL', name: 'Premier League' },
  { code: 'CL', name: 'Champions League' },
  { code: 'BL1', name: 'Bundesliga' },
  { code: 'SA', name: 'Serie A' },
  { code: 'PD', name: 'La Liga' },
];

export default function AdminSyncPage() {
  const [code, setCode] = useState('PL');
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState('');

  const [sbComps, setSbComps] = useState<SbCompetition[]>([]);
  const [sbSelected, setSbSelected] = useState<{ compId: number; seasonId: number } | null>(null);
  const [sbSyncing, setSbSyncing] = useState(false);
  const [sbLoadingComps, setSbLoadingComps] = useState(false);
  const [sbResult, setSbResult] = useState<SbSyncResult | null>(null);
  const [sbError, setSbError] = useState('');

  const handleSync = async () => {
    setSyncing(true); setError(''); setResult(null);
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ competitionCode: code }),
      });
      const data = await res.json() as { success: boolean; result?: SyncResult; error?: string };
      if (data.success && data.result) setResult(data.result);
      else setError(data.error ?? 'Sync failed');
    } catch { setError('Network error'); }
    setSyncing(false);
  };

  const loadSbCompetitions = async () => {
    setSbLoadingComps(true); setSbError('');
    try {
      await fetch('/api/sb/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ competitionsOnly: true }),
      });
      const res = await fetch('/api/sb/competitions');
      const data = await res.json() as SbCompetition[];
      const list = Array.isArray(data) ? data : [];
      setSbComps(list);
      if (list.length > 0) setSbSelected({ compId: list[0].competitionId, seasonId: list[0].seasonId });
    } catch { setSbError('Failed to load StatsBomb competitions'); }
    setSbLoadingComps(false);
  };

  const handleSbSync = async () => {
    if (!sbSelected) return;
    setSbSyncing(true); setSbError(''); setSbResult(null);
    try {
      const res = await fetch('/api/sb/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ competitionId: sbSelected.compId, seasonId: sbSelected.seasonId }),
      });
      const data = await res.json() as { success: boolean; result?: SbSyncResult; error?: string };
      if (data.success && data.result) setSbResult(data.result);
      else setSbError(data.error ?? 'Sync failed');
    } catch { setSbError('Network error'); }
    setSbSyncing(false);
  };

  const Spinner = () => (
    <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
  );

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-3xl font-black text-white mb-1">Admin: Data Sync</h1>
        <p className="text-slate-400">Sync football data from multiple sources</p>
      </div>

      {/* football-data.org */}
      <div className="bg-[#111827] border border-gray-800 rounded-xl p-6 space-y-4">
        <h2 className="text-white font-bold">
          football-data.org
          <span className="text-xs text-slate-500 font-normal ml-2">(Live &amp; Current Season)</span>
        </h2>
        <div>
          <label className="text-slate-400 text-sm block mb-2">Competition</label>
          <select value={code} onChange={e => setCode(e.target.value)}
            className="w-full bg-[#0a0f1e] border border-gray-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-[#00d4aa]">
            {FD_COMPETITIONS.map(c => <option key={c.code} value={c.code}>{c.name} ({c.code})</option>)}
          </select>
        </div>
        <p className="text-slate-500 text-sm">
          Requires <code className="text-[#00d4aa]">FOOTBALL_DATA_API_KEY</code> in .env. Without it, uses seed data.
        </p>
        <button onClick={handleSync} disabled={syncing}
          className="bg-[#00d4aa] text-[#0a0f1e] font-bold px-6 py-3 rounded-lg hover:bg-[#00d4aa]/90 transition-colors disabled:opacity-50 w-full">
          {syncing ? <span className="flex items-center justify-center gap-2"><Spinner />Syncing…</span> : `Sync ${code}`}
        </button>
        {error && <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4"><p className="text-red-400">{error}</p></div>}
        {result && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-emerald-400">✓</span>
              <h3 className="text-white font-bold">Sync Complete</h3>
              <span className={`ml-auto text-xs px-2 py-0.5 rounded ${result.source === 'api' ? 'bg-blue-500/20 text-blue-400' : 'bg-amber-500/20 text-amber-400'}`}>
                {result.source === 'api' ? 'Live API' : 'Cache'}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-4 text-center">
              {([['Competitions', result.competitions], ['Teams', result.teams], ['Matches', result.matches], ['Standings', result.standings]] as [string, number][]).map(([label, val]) => (
                <div key={label}><p className="text-2xl font-black text-[#00d4aa]">{val}</p><p className="text-slate-400 text-xs">{label}</p></div>
              ))}
            </div>
            {result.errors.length > 0 && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                {result.errors.map((e, i) => <p key={i} className="text-amber-300 text-xs">{e}</p>)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* StatsBomb */}
      <div className="bg-[#111827] border border-gray-800 rounded-xl p-6 space-y-4">
        <h2 className="text-white font-bold">
          StatsBomb Open Data
          <span className="text-xs text-slate-500 font-normal ml-2">(Historical · No API key needed)</span>
        </h2>
        <p className="text-slate-500 text-sm">
          Load the competition list first, then pick a competition/season to sync players, lineups, and match events.
          Syncing a full season may take 1–3 minutes.
        </p>

        {sbComps.length === 0 ? (
          <button onClick={loadSbCompetitions} disabled={sbLoadingComps}
            className="bg-slate-700 text-white font-bold px-6 py-3 rounded-lg hover:bg-slate-600 transition-colors disabled:opacity-50 w-full">
            {sbLoadingComps
              ? <span className="flex items-center justify-center gap-2"><Spinner />Loading competitions…</span>
              : 'Load StatsBomb Competitions'}
          </button>
        ) : (
          <>
            <div>
              <label className="text-slate-400 text-sm block mb-2">
                Competition / Season ({sbComps.length} available)
              </label>
              <select
                onChange={e => {
                  const [cId, sId] = e.target.value.split(':').map(Number);
                  setSbSelected({ compId: cId, seasonId: sId });
                }}
                className="w-full bg-[#0a0f1e] border border-gray-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-[#00d4aa]"
              >
                {sbComps.map(c => (
                  <option key={`${c.competitionId}:${c.seasonId}`} value={`${c.competitionId}:${c.seasonId}`}>
                    {c.competitionName} — {c.seasonName} ({c.countryName}) · {c._count.matches} matches synced
                  </option>
                ))}
              </select>
            </div>
            <button onClick={handleSbSync} disabled={sbSyncing || !sbSelected}
              className="bg-[#00d4aa] text-[#0a0f1e] font-bold px-6 py-3 rounded-lg hover:bg-[#00d4aa]/90 transition-colors disabled:opacity-50 w-full">
              {sbSyncing
                ? <span className="flex items-center justify-center gap-2"><Spinner />Syncing… (this may take a minute)</span>
                : 'Sync StatsBomb Data'}
            </button>
          </>
        )}

        {sbError && <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4"><p className="text-red-400 text-sm">{sbError}</p></div>}
        {sbResult && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-emerald-400">✓</span>
              <h3 className="text-white font-bold">StatsBomb Sync Complete</h3>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              {([['Teams', sbResult.teams], ['Players', sbResult.players], ['Matches', sbResult.matches], ['Lineups', sbResult.lineupEntries], ['Events', sbResult.events], ['Errors', sbResult.errors.length]] as [string, number][]).map(([label, val]) => (
                <div key={label} className="bg-[#0a0f1e] rounded-lg p-3">
                  <p className="text-xl font-black text-[#00d4aa]">{val}</p>
                  <p className="text-slate-400 text-xs">{label}</p>
                </div>
              ))}
            </div>
            {sbResult.errors.length > 0 && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 max-h-32 overflow-y-auto">
                {sbResult.errors.map((e, i) => <p key={i} className="text-amber-300 text-xs">{e}</p>)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Commit**

```bash
git add app/matches/ app/results/page.tsx app/api/dashboard/route.ts app/dashboard/page.tsx components/Navbar.tsx app/admin/sync/page.tsx
git commit -m "feat: add match detail page, Players navbar link, StatsBomb sync UI, and dashboard player count"
```

---

### Task 7: Migration + Build + Fix Errors

**Files:** None created — run commands and fix any TypeScript errors

- [ ] **Step 1: Stop dev server**

```powershell
Stop-Process -Id (Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty OwningProcess) -Force -ErrorAction SilentlyContinue
```

- [ ] **Step 2: Run migration and generate**

```bash
npx prisma migrate dev --name add_statsbomb
npx prisma generate
```

Expected: `✔ Generated Prisma Client`

- [ ] **Step 3: Run build**

```bash
npx next build
```

**Common errors and fixes:**

If `prisma.sbPlayer` / `prisma.sbMatch` not found: `npx prisma generate` did not complete — re-run.

If `Property 'sbPlayer' does not exist on type 'PrismaClient'`: the generated client is stale — delete `node_modules/.prisma` and re-run `npx prisma generate`.

If `Type '...' is not assignable`: check that interface field names in pages match the API route return shapes exactly (e.g. `competitionName` not `competition_name`).

If `Cannot find module '@/lib/syncStatsbomb'`: verify the file was saved to `lib/syncStatsbomb.ts` (not a different casing).

- [ ] **Step 4: Restart dev server**

```powershell
Start-Process -FilePath "cmd.exe" -ArgumentList "/c bun run dev > dev-server.log 2>&1" -WindowStyle Hidden
Start-Sleep -Seconds 4
Get-Content dev-server.log
```

Expected: `✔ Ready in ...s` on port 3001.

- [ ] **Step 5: Smoke test**

Visit these routes and confirm no crashes:
- `http://localhost:3001/players` — shows EmptyState (no data yet — that's correct)
- `http://localhost:3001/admin/sync` — shows both sync sections
- `http://localhost:3001/dashboard` — Players card visible (shows 0)
- `http://localhost:3001/matches` — Detail → link visible
- `http://localhost:3001/results` — rows are clickable

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "chore: StatsBomb migration applied, build verified"
```
