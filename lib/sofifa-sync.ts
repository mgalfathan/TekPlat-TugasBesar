import { prisma } from '@/lib/prisma';
import {
  fetchTeamsByLeague, fetchTeamDetail,
  posToGroup, RATE_LIMIT_MS
} from '@/lib/sofifa-client';

export const SOFIFA_LEAGUES = [
  { id: 13, name: 'Premier League', country: 'England' },
  { id: 53, name: 'La Liga',        country: 'Spain'   },
  { id: 19, name: 'Bundesliga',     country: 'Germany' },
  { id: 31, name: 'Serie A',        country: 'Italy'   },
  { id: 16, name: 'Ligue 1',        country: 'France'  },
];

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

export async function syncSofifaLeague(sofifaLeagueId: number): Promise<{
  teamsUpserted: number; playersUpserted: number;
}> {
  const leagueInfo = SOFIFA_LEAGUES.find(l => l.id === sofifaLeagueId);
  if (!leagueInfo) throw new Error(`Unknown leagueId: ${sofifaLeagueId}`);

  await prisma.sofifaLeague.upsert({
    where: { id: sofifaLeagueId },
    create: { id: sofifaLeagueId, name: leagueInfo.name, country: leagueInfo.country },
    update: { name: leagueInfo.name, country: leagueInfo.country },
  });

  const teams = await fetchTeamsByLeague(sofifaLeagueId);
  let teamsUpserted = 0, playersUpserted = 0;

  for (const team of teams) {
    await sleep(RATE_LIMIT_MS);
    console.log(`[sofifa-sync] fetching ${team.name} (id:${team.id}, roster:${team.latestRoster})`);

    const detail = await fetchTeamDetail(team.id, team.latestRoster);

    await prisma.sofifaTeam.upsert({
      where: { id: team.id },
      create: {
        id: team.id, name: team.name, leagueId: sofifaLeagueId,
        overallRating: detail.overallRating,
        attackRating: detail.attackRating,
        midfieldRating: detail.midfieldRating,
        defenseRating: detail.defenseRating,
        latestRoster: team.latestRoster,
        logoUrl: team.logoUrl ?? null,
      },
      update: {
        name: team.name,
        overallRating: detail.overallRating,
        attackRating: detail.attackRating,
        midfieldRating: detail.midfieldRating,
        defenseRating: detail.defenseRating,
        latestRoster: team.latestRoster,
        logoUrl: team.logoUrl ?? null,
      },
    });
    teamsUpserted++;

    for (const p of (detail.players ?? [])) {
      const displayName = p.commonName ?? p.name;
      const posGroup = posToGroup(p.positions ?? []);
      await prisma.sofifaPlayer.upsert({
        where: { id: p.id },
        create: {
          id: p.id, teamId: team.id, name: displayName,
          positions: JSON.stringify(p.positions ?? []),
          posGroup, overallRating: p.overallRating,
          potential: p.potential ?? null,
          age: p.age ?? null,
          nationality: p.nationality ?? null,
          photoUrl: p.photoUrl ?? null,
        },
        update: {
          teamId: team.id, name: displayName,
          positions: JSON.stringify(p.positions ?? []),
          posGroup, overallRating: p.overallRating,
          potential: p.potential ?? null,
          age: p.age ?? null,
          nationality: p.nationality ?? null,
          photoUrl: p.photoUrl ?? null,
        },
      });
      playersUpserted++;
    }
  }

  return { teamsUpserted, playersUpserted };
}
