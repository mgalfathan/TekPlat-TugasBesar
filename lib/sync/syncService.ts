import { prisma } from '@/lib/prisma';
import { getProvider } from '@/lib/providers/providerFactory';
import type { ProviderFixture, ProviderStanding } from '@/lib/providers/types';

type SyncResult = { created: number; updated: number; errors: string[] };

async function ensureCountryAndLeague(provider: string, leagueExternalId: string, countryName: string, leagueName: string, logo?: string, type?: string) {
  let country = await prisma.country.findFirst({ where: { name: countryName } });
  if (!country) {
    country = await prisma.country.create({ data: { provider, name: countryName } });
  }
  return prisma.league.upsert({
    where: { provider_externalId: { provider, externalId: leagueExternalId } },
    create: { provider, externalId: leagueExternalId, name: leagueName, logo, type, countryId: country.id },
    update: { name: leagueName, logo, type },
  });
}

async function ensureSeason(provider: string, leagueId: number, year: string) {
  return prisma.season.upsert({
    where: { provider_leagueId_year: { provider, leagueId, year } },
    create: { provider, leagueId, year, current: true },
    update: {},
  });
}

async function upsertTeam(provider: string, externalId: string, name: string, extra: Partial<{ code: string; country: string; founded: number; national: boolean; logo: string; venueName: string; venueCity: string }>) {
  return prisma.team.upsert({
    where: { provider_externalId: { provider, externalId } },
    create: { provider, externalId, name, ...extra },
    update: { name, ...extra },
  });
}

export async function syncLeagues(providerName?: string, countryFilter?: string) {
  const p = getProvider(providerName);
  const result: SyncResult = { created: 0, updated: 0, errors: [] };
  const log = await prisma.syncLog.create({ data: { provider: p.name, syncType: 'leagues', country: countryFilter } });
  try {
    const leagues = await p.fetchLeagues(countryFilter);
    for (const l of leagues) {
      try {
        let country = await prisma.country.findFirst({ where: { name: l.country } });
        if (!country) { country = await prisma.country.create({ data: { provider: p.name, name: l.country, code: l.countryCode, flag: l.countryFlag } }); result.created++; }
        const existing = await prisma.league.findFirst({ where: { provider: p.name, externalId: l.externalId } });
        if (existing) { await prisma.league.update({ where: { id: existing.id }, data: { name: l.name, logo: l.logo, type: l.type } }); result.updated++; }
        else { await prisma.league.create({ data: { provider: p.name, externalId: l.externalId, name: l.name, logo: l.logo, type: l.type, countryId: country.id } }); result.created++; }
      } catch (e) { result.errors.push(String(e)); }
    }
    await prisma.syncLog.update({ where: { id: log.id }, data: { status: 'success', recordsFetched: leagues.length, recordsCreated: result.created, recordsUpdated: result.updated, finishedAt: new Date() } });
  } catch (e) {
    await prisma.syncLog.update({ where: { id: log.id }, data: { status: 'error', errorMessage: String(e), finishedAt: new Date() } });
    result.errors.push(String(e));
  }
  return result;
}

export async function syncTeams(providerName: string, leagueExternalId: string, season: string) {
  const p = getProvider(providerName);
  const result: SyncResult = { created: 0, updated: 0, errors: [] };
  const log = await prisma.syncLog.create({ data: { provider: p.name, syncType: 'teams', leagueId: leagueExternalId, season } });
  try {
    const teams = await p.fetchTeams(leagueExternalId, season);
    for (const t of teams) {
      try {
        const existing = await prisma.team.findFirst({ where: { provider: p.name, externalId: t.externalId } });
        const data = { name: t.name, code: t.code, country: t.country, founded: t.founded, national: t.national ?? false, logo: t.logo, venueName: t.venueName, venueCity: t.venueCity };
        if (existing) { await prisma.team.update({ where: { id: existing.id }, data }); result.updated++; }
        else { await prisma.team.create({ data: { provider: p.name, externalId: t.externalId, ...data } }); result.created++; }
      } catch (e) { result.errors.push(String(e)); }
    }
    await prisma.syncLog.update({ where: { id: log.id }, data: { status: 'success', recordsFetched: teams.length, recordsCreated: result.created, recordsUpdated: result.updated, finishedAt: new Date() } });
  } catch (e) {
    await prisma.syncLog.update({ where: { id: log.id }, data: { status: 'error', errorMessage: String(e), finishedAt: new Date() } });
    result.errors.push(String(e));
  }
  return result;
}

async function upsertFixture(p: string, league: { id: number }, seasonRec: { id: number }, f: ProviderFixture) {
  const homeTeam = await prisma.team.findFirst({ where: { provider: p, externalId: f.homeTeamExternalId } });
  const awayTeam = await prisma.team.findFirst({ where: { provider: p, externalId: f.awayTeamExternalId } });
  if (!homeTeam || !awayTeam) return false;
  const data = {
    leagueId: league.id, seasonId: seasonRec.id,
    homeTeamId: homeTeam.id, awayTeamId: awayTeam.id,
    utcDate: new Date(f.utcDate),
    statusShort: f.statusShort ?? 'NS', statusLong: f.statusLong,
    elapsed: f.elapsed, referee: f.referee, timezone: f.timezone,
    venueName: f.venueName, venueCity: f.venueCity,
    homeScore: f.homeScore, awayScore: f.awayScore,
    halftimeHomeScore: f.halftimeHome, halftimeAwayScore: f.halftimeAway,
    fulltimeHomeScore: f.fulltimeHome, fulltimeAwayScore: f.fulltimeAway,
    extraHomeScore: f.extraHome, extraAwayScore: f.extraAway,
    penaltyHomeScore: f.penaltyHome, penaltyAwayScore: f.penaltyAway,
    winner: f.winner, lastSyncedAt: new Date(),
  };
  await prisma.match.upsert({
    where: { provider_externalId: { provider: p, externalId: f.externalId } },
    create: { provider: p, externalId: f.externalId, ...data },
    update: data,
  });
  return true;
}

export async function syncFixtures(providerName: string, leagueExternalId: string, season: string) {
  const p = getProvider(providerName);
  const result: SyncResult = { created: 0, updated: 0, errors: [] };
  const log = await prisma.syncLog.create({ data: { provider: p.name, syncType: 'fixtures', leagueId: leagueExternalId, season } });
  try {
    const fixtures = await p.fetchFixtures(leagueExternalId, season);
    const league = await prisma.league.findFirst({ where: { provider: p.name, externalId: leagueExternalId } });
    if (!league) throw new Error('League not synced yet');
    const seasonRec = await ensureSeason(p.name, league.id, season);
    for (const f of fixtures) {
      try { await upsertFixture(p.name, league, seasonRec, f); result.updated++; }
      catch (e) { result.errors.push(String(e)); }
    }
    await prisma.syncLog.update({ where: { id: log.id }, data: { status: 'success', recordsFetched: fixtures.length, recordsCreated: result.created, recordsUpdated: result.updated, finishedAt: new Date() } });
  } catch (e) {
    await prisma.syncLog.update({ where: { id: log.id }, data: { status: 'error', errorMessage: String(e), finishedAt: new Date() } });
    result.errors.push(String(e));
  }
  return result;
}

export async function syncLive(providerName: string, leagueExternalId?: string) {
  const p = getProvider(providerName);
  const result: SyncResult = { created: 0, updated: 0, errors: [] };
  const log = await prisma.syncLog.create({ data: { provider: p.name, syncType: 'live', leagueId: leagueExternalId } });
  try {
    const fixtures = await p.fetchLiveFixtures(leagueExternalId);
    for (const f of fixtures) {
      try {
        const league = await prisma.league.findFirst({ where: { provider: p.name, externalId: f.leagueExternalId } });
        if (!league) continue;
        const seasonRec = await ensureSeason(p.name, league.id, f.season);
        await upsertFixture(p.name, league, seasonRec, f);
        result.updated++;
      } catch (e) { result.errors.push(String(e)); }
    }
    await prisma.syncLog.update({ where: { id: log.id }, data: { status: 'success', recordsFetched: fixtures.length, recordsUpdated: result.updated, finishedAt: new Date() } });
  } catch (e) {
    await prisma.syncLog.update({ where: { id: log.id }, data: { status: 'error', errorMessage: String(e), finishedAt: new Date() } });
    result.errors.push(String(e));
  }
  return result;
}

export async function syncStandings(providerName: string, leagueExternalId: string, season: string) {
  const p = getProvider(providerName);
  const result: SyncResult = { created: 0, updated: 0, errors: [] };
  const log = await prisma.syncLog.create({ data: { provider: p.name, syncType: 'standings', leagueId: leagueExternalId, season } });
  try {
    const standings = await p.fetchStandings(leagueExternalId, season);
    const league = await prisma.league.findFirst({ where: { provider: p.name, externalId: leagueExternalId } });
    if (!league) throw new Error('League not synced yet');
    const seasonRec = await ensureSeason(p.name, league.id, season);
    for (const s of standings) {
      try {
        const team = await prisma.team.findFirst({ where: { provider: p.name, externalId: s.teamExternalId } });
        if (!team) continue;
        const data: Omit<ProviderStanding, 'leagueExternalId' | 'season' | 'teamExternalId'> & { leagueId: number; seasonId: number; teamId: number; provider: string } = {
          provider: p.name, leagueId: league.id, seasonId: seasonRec.id, teamId: team.id,
          rank: s.rank, points: s.points, goalsDiff: s.goalsDiff, group: s.group, form: s.form,
          status: s.status, description: s.description,
          played: s.played, win: s.win, draw: s.draw, lose: s.lose,
          goalsFor: s.goalsFor, goalsAgainst: s.goalsAgainst,
          homePlayed: s.homePlayed, homeWin: s.homeWin, homeDraw: s.homeDraw, homeLose: s.homeLose,
          homeGoalsFor: s.homeGoalsFor, homeGoalsAgainst: s.homeGoalsAgainst,
          awayPlayed: s.awayPlayed, awayWin: s.awayWin, awayDraw: s.awayDraw, awayLose: s.awayLose,
          awayGoalsFor: s.awayGoalsFor, awayGoalsAgainst: s.awayGoalsAgainst,
        };
        const existing = await prisma.standing.findFirst({ where: { provider: p.name, leagueId: league.id, teamId: team.id } });
        if (existing) { await prisma.standing.update({ where: { id: existing.id }, data }); result.updated++; }
        else { await prisma.standing.create({ data }); result.created++; }
      } catch (e) { result.errors.push(String(e)); }
    }
    await prisma.syncLog.update({ where: { id: log.id }, data: { status: 'success', recordsFetched: standings.length, recordsCreated: result.created, recordsUpdated: result.updated, finishedAt: new Date() } });
  } catch (e) {
    await prisma.syncLog.update({ where: { id: log.id }, data: { status: 'error', errorMessage: String(e), finishedAt: new Date() } });
    result.errors.push(String(e));
  }
  return result;
}

export async function syncAll(providerName: string, leagueExternalId: string, season: string, country?: string) {
  await syncLeagues(providerName, country);
  await syncTeams(providerName, leagueExternalId, season);
  const [fixtures, standings] = await Promise.all([
    syncFixtures(providerName, leagueExternalId, season),
    syncStandings(providerName, leagueExternalId, season),
  ]);
  return { fixtures, standings };
}
