import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Cleaning seed data (provider="seed")...');

  const seedTeams = await prisma.team.findMany({ where: { provider: 'seed' }, select: { id: true } });
  const seedMatches = await prisma.match.findMany({ where: { provider: 'seed' }, select: { id: true } });
  const seedPlayers = await prisma.player.findMany({ where: { provider: 'seed' }, select: { id: true } });
  const seedTeamIds = seedTeams.map(t => t.id);
  const seedMatchIds = seedMatches.map(m => m.id);
  const seedPlayerIds = seedPlayers.map(p => p.id);

  const delPred = await prisma.prediction.deleteMany({
    where: {
      OR: [
        { homeTeamId: { in: seedTeamIds } },
        { awayTeamId: { in: seedTeamIds } },
        { matchId: { in: seedMatchIds } },
      ],
    },
  });
  console.log(`  predictions deleted: ${delPred.count}`);

  const delMR = await prisma.metricResult.deleteMany({ where: { OR: [{ teamId: { in: seedTeamIds } }, { playerId: { in: seedPlayerIds } }] } });
  console.log(`  metricResults deleted: ${delMR.count}`);

  const delME = await prisma.matchEvent.deleteMany({ where: { matchId: { in: seedMatchIds } } });
  console.log(`  matchEvents deleted: ${delME.count}`);

  const delPMS = await prisma.playerMatchStats.deleteMany({ where: { matchId: { in: seedMatchIds } } });
  console.log(`  playerMatchStats deleted: ${delPMS.count}`);

  const delTMS = await prisma.teamMatchStats.deleteMany({ where: { matchId: { in: seedMatchIds } } });
  console.log(`  teamMatchStats deleted: ${delTMS.count}`);

  const delStanding = await prisma.standing.deleteMany({ where: { provider: 'seed' } });
  console.log(`  standings deleted: ${delStanding.count}`);

  const delMatch = await prisma.match.deleteMany({ where: { provider: 'seed' } });
  console.log(`  matches deleted: ${delMatch.count}`);

  const delPlayer = await prisma.player.deleteMany({ where: { provider: 'seed' } });
  console.log(`  players deleted: ${delPlayer.count}`);

  const delTeam = await prisma.team.deleteMany({ where: { provider: 'seed' } });
  console.log(`  teams deleted: ${delTeam.count}`);

  const delSeason = await prisma.season.deleteMany({ where: { provider: 'seed' } });
  console.log(`  seasons deleted: ${delSeason.count}`);

  const delLeague = await prisma.league.deleteMany({ where: { provider: 'seed' } });
  console.log(`  leagues deleted: ${delLeague.count}`);

  // Country: only delete if no leagues still reference it.
  const seedCountries = await prisma.country.findMany({ where: { provider: 'seed' }, include: { leagues: true } });
  let countryDel = 0;
  for (const c of seedCountries) {
    if (c.leagues.length === 0) {
      await prisma.country.delete({ where: { id: c.id } });
      countryDel++;
    } else {
      console.log(`  keeping country "${c.name}" — referenced by ${c.leagues.length} non-seed league(s)`);
    }
  }
  console.log(`  countries deleted: ${countryDel}`);

  console.log('Cleanup complete.');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
