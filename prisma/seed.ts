import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Users
  const adminHash = await bcrypt.hash('admin12345', 10);
  const userHash = await bcrypt.hash('user12345', 10);
  await prisma.user.upsert({ where: { email: 'admin@sportlytics.local' }, create: { email: 'admin@sportlytics.local', name: 'Admin', password: adminHash, role: 'ADMIN' }, update: {} });
  await prisma.user.upsert({ where: { email: 'user@sportlytics.local' }, create: { email: 'user@sportlytics.local', name: 'Demo User', password: userHash, role: 'USER' }, update: {} });

  // Countries
  const england = await prisma.country.upsert({ where: { provider_name: { provider: 'seed', name: 'England' } }, create: { provider: 'seed', name: 'England', code: 'GB', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' }, update: {} });
  const spain = await prisma.country.upsert({ where: { provider_name: { provider: 'seed', name: 'Spain' } }, create: { provider: 'seed', name: 'Spain', code: 'ES', flag: '🇪🇸' }, update: {} });
  const italy = await prisma.country.upsert({ where: { provider_name: { provider: 'seed', name: 'Italy' } }, create: { provider: 'seed', name: 'Italy', code: 'IT', flag: '🇮🇹' }, update: {} });
  const germany = await prisma.country.upsert({ where: { provider_name: { provider: 'seed', name: 'Germany' } }, create: { provider: 'seed', name: 'Germany', code: 'DE', flag: '🇩🇪' }, update: {} });

  // Leagues
  const pl = await prisma.league.upsert({ where: { provider_externalId: { provider: 'seed', externalId: '39' } }, create: { provider: 'seed', externalId: '39', name: 'Premier League', type: 'League', countryId: england.id }, update: {} });
  const laliga = await prisma.league.upsert({ where: { provider_externalId: { provider: 'seed', externalId: '140' } }, create: { provider: 'seed', externalId: '140', name: 'La Liga', type: 'League', countryId: spain.id }, update: {} });
  const seriea = await prisma.league.upsert({ where: { provider_externalId: { provider: 'seed', externalId: '135' } }, create: { provider: 'seed', externalId: '135', name: 'Serie A', type: 'League', countryId: italy.id }, update: {} });
  const bundesliga = await prisma.league.upsert({ where: { provider_externalId: { provider: 'seed', externalId: '78' } }, create: { provider: 'seed', externalId: '78', name: 'Bundesliga', type: 'League', countryId: germany.id }, update: {} });

  // Seasons
  const s25pl = await prisma.season.upsert({ where: { provider_leagueId_year: { provider: 'seed', leagueId: pl.id, year: '2025' } }, create: { provider: 'seed', leagueId: pl.id, year: '2025', current: true }, update: {} });
  const s25ll = await prisma.season.upsert({ where: { provider_leagueId_year: { provider: 'seed', leagueId: laliga.id, year: '2025' } }, create: { provider: 'seed', leagueId: laliga.id, year: '2025', current: true }, update: {} });
  const s25sa = await prisma.season.upsert({ where: { provider_leagueId_year: { provider: 'seed', leagueId: seriea.id, year: '2025' } }, create: { provider: 'seed', leagueId: seriea.id, year: '2025', current: true }, update: {} });
  const s25bl = await prisma.season.upsert({ where: { provider_leagueId_year: { provider: 'seed', leagueId: bundesliga.id, year: '2025' } }, create: { provider: 'seed', leagueId: bundesliga.id, year: '2025', current: true }, update: {} });

  // Teams — Premier League (5)
  const plTeams = [
    { ext: 't1', name: 'Manchester City', code: 'MCI', country: 'England', venue: 'Etihad Stadium', city: 'Manchester' },
    { ext: 't2', name: 'Arsenal', code: 'ARS', country: 'England', venue: 'Emirates Stadium', city: 'London' },
    { ext: 't3', name: 'Liverpool', code: 'LIV', country: 'England', venue: 'Anfield', city: 'Liverpool' },
    { ext: 't4', name: 'Chelsea', code: 'CHE', country: 'England', venue: 'Stamford Bridge', city: 'London' },
    { ext: 't5', name: 'Manchester United', code: 'MUN', country: 'England', venue: 'Old Trafford', city: 'Manchester' },
  ];
  // La Liga (4)
  const laTeams = [
    { ext: 't6', name: 'Real Madrid', code: 'RMA', country: 'Spain', venue: 'Santiago Bernabéu', city: 'Madrid' },
    { ext: 't7', name: 'Barcelona', code: 'BAR', country: 'Spain', venue: 'Camp Nou', city: 'Barcelona' },
    { ext: 't8', name: 'Atletico Madrid', code: 'ATM', country: 'Spain', venue: 'Metropolitano', city: 'Madrid' },
    { ext: 't9', name: 'Sevilla', code: 'SEV', country: 'Spain', venue: 'Ramón Sánchez Pizjuán', city: 'Sevilla' },
  ];
  // Serie A (4)
  const saTeams = [
    { ext: 't10', name: 'Juventus', code: 'JUV', country: 'Italy', venue: 'Allianz Stadium', city: 'Turin' },
    { ext: 't11', name: 'AC Milan', code: 'MIL', country: 'Italy', venue: 'San Siro', city: 'Milan' },
    { ext: 't12', name: 'Inter Milan', code: 'INT', country: 'Italy', venue: 'San Siro', city: 'Milan' },
    { ext: 't13', name: 'Napoli', code: 'NAP', country: 'Italy', venue: 'Diego Armando Maradona', city: 'Naples' },
  ];
  // Bundesliga (4)
  const blTeams = [
    { ext: 't14', name: 'Bayern Munich', code: 'BAY', country: 'Germany', venue: 'Allianz Arena', city: 'Munich' },
    { ext: 't15', name: 'Borussia Dortmund', code: 'BVB', country: 'Germany', venue: 'Signal Iduna Park', city: 'Dortmund' },
    { ext: 't16', name: 'RB Leipzig', code: 'RBL', country: 'Germany', venue: 'Red Bull Arena', city: 'Leipzig' },
    { ext: 't17', name: 'Bayer Leverkusen', code: 'LEV', country: 'Germany', venue: 'BayArena', city: 'Leverkusen' },
  ];
  // Extra PL teams
  const extraTeams = [
    { ext: 't18', name: 'Tottenham Hotspur', code: 'TOT', country: 'England', venue: 'Tottenham Hotspur Stadium', city: 'London' },
    { ext: 't19', name: 'Newcastle United', code: 'NEW', country: 'England', venue: "St. James' Park", city: 'Newcastle' },
    { ext: 't20', name: 'Aston Villa', code: 'AVL', country: 'England', venue: 'Villa Park', city: 'Birmingham' },
  ];

  const allTeamDefs = [...plTeams, ...laTeams, ...saTeams, ...blTeams, ...extraTeams];
  const teamMap: Record<string, { id: number }> = {};
  for (const t of allTeamDefs) {
    const rec = await prisma.team.upsert({
      where: { provider_externalId: { provider: 'seed', externalId: t.ext } },
      create: { provider: 'seed', externalId: t.ext, name: t.name, code: t.code, country: t.country, venueName: t.venue, venueCity: t.city },
      update: {},
    });
    teamMap[t.ext] = rec;
  }

  // Players — 5 per team = 100 players
  const playerNames: Record<string, string[]> = {
    t1: ['Ederson', 'Ruben Dias', 'Manuel Akanji', 'Kyle Walker', 'Rodri', 'Kevin De Bruyne', 'Bernardo Silva', 'Phil Foden', 'Jack Grealish', 'Erling Haaland', 'Julian Alvarez'],
    t2: ['David Raya', 'William Saliba', 'Gabriel Magalhaes', 'Ben White', 'Thomas Partey', 'Martin Odegaard', 'Declan Rice', 'Bukayo Saka', 'Leandro Trossard', 'Kai Havertz', 'Gabriel Martinelli'],
    t3: ['Alisson', 'Virgil van Dijk', 'Ibrahima Konate', 'Trent Alexander-Arnold', 'Wataru Endo', 'Alexis Mac Allister', 'Dominik Szoboszlai', 'Mohamed Salah', 'Luis Diaz', 'Darwin Nunez', 'Diogo Jota'],
    t4: ['Robert Sanchez', 'Thiago Silva', 'Wesley Fofana', 'Reece James', 'Moises Caicedo', 'Enzo Fernandez', 'Cole Palmer', 'Raheem Sterling', 'Noni Madueke', 'Nicolas Jackson', 'Mykhaylo Mudryk'],
    t5: ['Andre Onana', 'Raphael Varane', 'Lisandro Martinez', 'Luke Shaw', 'Casemiro', 'Bruno Fernandes', 'Mason Mount', 'Marcus Rashford', 'Jadon Sancho', 'Rasmus Hojlund', 'Anthony Martial'],
    t6: ['Thibaut Courtois', 'David Alaba', 'Eder Militao', 'Dani Carvajal', 'Aurelien Tchouameni', 'Luka Modric', 'Toni Kroos', 'Vinicius Jr', 'Rodrygo', 'Jude Bellingham', 'Kylian Mbappe'],
    t7: ['Marc-Andre ter Stegen', 'Ronald Araujo', 'Jules Kounde', 'Alejandro Balde', 'Frenkie de Jong', 'Pedri', 'Gavi', 'Raphinha', 'Ferran Torres', 'Robert Lewandowski', 'Ansu Fati'],
    t8: ['Jan Oblak', 'Stefan Savic', 'Jose Gimenez', 'Nahuel Molina', 'Rodrigo De Paul', 'Marcos Llorente', 'Koke', 'Angel Correa', 'Saul Niguez', 'Antoine Griezmann', 'Alvaro Morata'],
    t9: ['Yassine Bounou', 'Loic Bade', 'Marcao', 'Marcos Acuna', 'Joan Jordan', 'Fernando', 'Ivan Rakitic', 'Suso', 'Lucas Ocampos', 'Youssef En-Nesyri', 'Erik Lamela'],
    t10: ['Wojciech Szczesny', 'Leonardo Bonucci', 'Gleison Bremer', 'Danilo', 'Adrien Rabiot', 'Manuel Locatelli', 'Nicolo Fagioli', 'Federico Chiesa', 'Angel Di Maria', 'Dusan Vlahovic', 'Moise Kean'],
    t11: ['Mike Maignan', 'Fikayo Tomori', 'Malick Thiaw', 'Theo Hernandez', 'Ismael Bennacer', 'Sandro Tonali', 'Ruben Loftus-Cheek', 'Christian Pulisic', 'Rafael Leao', 'Olivier Giroud', 'Alexis Saelemaekers'],
    t12: ['Andre Onana-INT', 'Francesco Acerbi', 'Alessandro Bastoni', 'Federico Dimarco', 'Marcelo Brozovic', 'Nicolo Barella', 'Henrikh Mkhitaryan', 'Denzel Dumfries', 'Ivan Perisic', 'Lautaro Martinez', 'Romelu Lukaku'],
    t13: ['Alex Meret', 'Amir Rrahmani', 'Min-jae Kim', 'Mario Rui', 'Stanislav Lobotka', 'Andre-Frank Anguissa', 'Piotr Zielinski', 'Matteo Politano', 'Khvicha Kvaratskhelia', 'Victor Osimhen', 'Giacomo Raspadori'],
    t14: ['Manuel Neuer', 'Dayot Upamecano', 'Matthijs de Ligt', 'Alphonso Davies', 'Joshua Kimmich', 'Leon Goretzka', 'Serge Gnabry', 'Leroy Sane', 'Kingsley Coman', 'Harry Kane', 'Thomas Muller'],
    t15: ['Gregor Kobel', 'Mats Hummels', 'Niklas Sule', 'Raphael Guerreiro', 'Emre Can', 'Axel Witsel', 'Julian Brandt', 'Karim Adeyemi', 'Marco Reus', 'Sebastien Haller', 'Donyell Malen'],
    t16: ['Peter Gulacsi', 'Willi Orban', 'Mohamed Simakan', 'Angelino', 'Konrad Laimer', 'Christopher Nkunku', 'Dani Olmo', 'Dominik Szoboszlai-RBL', 'Timo Werner', 'Yussuf Poulsen', 'Andre Silva'],
    t17: ['Lukasz Hradecky', 'Jonathan Tah', 'Edmond Tapsoba', 'Mitchel Bakker', 'Robert Andrich', 'Granit Xhaka', 'Jonas Hofmann', 'Florian Wirtz', 'Amine Adli', 'Victor Boniface', 'Patrik Schick'],
    t18: ['Hugo Lloris', 'Cristian Romero', 'Eric Dier', 'Pedro Porro', 'Pierre-Emile Hojbjerg', 'Yves Bissouma', 'James Maddison', 'Dejan Kulusevski', 'Richarlison', 'Harry Kane-TOT', 'Son Heung-min'],
    t19: ['Nick Pope', 'Sven Botman', 'Fabian Schar', 'Kieran Trippier', 'Bruno Guimaraes', 'Joe Willock', 'Joelinton', 'Anthony Gordon', 'Jacob Murphy', 'Callum Wilson', 'Alexander Isak'],
    t20: ['Emiliano Martinez', 'Ezri Konsa', 'Tyrone Mings', 'Lucas Digne', 'Douglas Luiz', 'John McGinn', 'Jacob Ramsey', 'Leon Bailey', 'Philippe Coutinho', 'Ollie Watkins', 'Bertrand Traore'],
  };

  for (const [ext, names] of Object.entries(playerNames)) {
    const team = teamMap[ext];
    if (!team) continue;
    for (let i = 0; i < Math.min(names.length, 5); i++) {
      const externalId = `${ext}_p${i}`;
      await prisma.player.upsert({
        where: { provider_externalId: { provider: 'seed', externalId } },
        create: { provider: 'seed', externalId, teamId: team.id, name: names[i], nationality: 'International' },
        update: {},
      });
    }
  }

  // Helper to create match
  async function createMatch(homeExt: string, awayExt: string, leagueId: number, seasonId: number, daysAgo: number, status: string, hg?: number, ag?: number) {
    const homeTeam = teamMap[homeExt], awayTeam = teamMap[awayExt];
    if (!homeTeam || !awayTeam) return null;
    const d = new Date(); d.setDate(d.getDate() - daysAgo);
    const externalId = `seed_${homeExt}_${awayExt}_${daysAgo}`;
    return prisma.match.upsert({
      where: { provider_externalId: { provider: 'seed', externalId } },
      create: {
        provider: 'seed', externalId, leagueId, seasonId,
        homeTeamId: homeTeam.id, awayTeamId: awayTeam.id,
        utcDate: d, statusShort: status,
        statusLong: status === 'FT' ? 'Match Finished' : status === 'NS' ? 'Not Started' : status,
        homeScore: hg ?? null, awayScore: ag ?? null,
        fulltimeHomeScore: hg ?? null, fulltimeAwayScore: ag ?? null,
        lastSyncedAt: new Date(),
      },
      update: {},
    });
  }

  // PL matches (25 finished, 5 upcoming, 2 live)
  const plPairs = [
    ['t1','t2',14,'FT',3,1],['t3','t4',13,'FT',2,2],['t5','t1',12,'FT',0,2],['t2','t3',11,'FT',1,0],
    ['t4','t5',10,'FT',3,0],['t1','t3',9,'FT',4,0],['t2','t4',8,'FT',2,1],['t3','t5',7,'FT',1,1],
    ['t5','t2',6,'FT',1,2],['t4','t1',5,'FT',0,1],['t18','t19',4,'FT',2,0],['t19','t20',3,'FT',1,3],
    ['t20','t18',2,'FT',0,0],['t1','t18',1,'FT',2,1],['t2','t19',1,'FT',3,0],
    ['t3','t20',2,'FT',2,1],['t4','t18',3,'FT',1,1],['t5','t19',4,'FT',0,1],
    ['t18','t1',5,'FT',1,3],['t19','t2',6,'FT',0,2],['t20','t3',7,'FT',1,1],
    ['t18','t4',8,'FT',2,2],['t19','t5',9,'FT',3,1],['t20','t1',10,'FT',0,4],['t1','t4',11,'FT',2,0],
  ] as const;
  for (const [h,a,d,s,hg,ag] of plPairs) await createMatch(h,a,pl.id,s25pl.id,d,s,hg,ag);
  // Upcoming
  await createMatch('t1','t19',pl.id,s25pl.id,-3,'NS');
  await createMatch('t2','t20',pl.id,s25pl.id,-5,'NS');
  await createMatch('t3','t18',pl.id,s25pl.id,-7,'NS');
  await createMatch('t4','t19',pl.id,s25pl.id,-10,'NS');
  await createMatch('t5','t20',pl.id,s25pl.id,-14,'NS');
  // Live
  await createMatch('t1','t3',pl.id,s25pl.id,0,'1H',1,0);
  await createMatch('t2','t5',pl.id,s25pl.id,0,'2H',2,1);

  // La Liga matches (20 finished, 2 upcoming)
  const laPairs = [
    ['t6','t7',14,'FT',2,0],['t8','t9',12,'FT',1,1],['t7','t8',10,'FT',3,1],['t9','t6',8,'FT',0,3],
    ['t6','t8',7,'FT',2,1],['t7','t9',6,'FT',4,0],['t8','t6',5,'FT',1,2],['t9','t7',4,'FT',0,2],
    ['t6','t9',3,'FT',3,0],['t7','t6',2,'FT',1,2],['t8','t7',1,'FT',0,1],['t9','t8',1,'FT',2,0],
    ['t6','t7',20,'FT',1,1],['t8','t9',18,'FT',2,2],['t7','t8',16,'FT',2,1],
    ['t9','t6',15,'FT',0,1],['t6','t8',13,'FT',2,0],['t7','t9',11,'FT',3,2],
    ['t8','t6',9,'FT',1,3],['t9','t7',17,'FT',1,2],
  ] as const;
  for (const [h,a,d,s,hg,ag] of laPairs) await createMatch(h,a,laliga.id,s25ll.id,d,s,hg,ag);
  await createMatch('t6','t8',laliga.id,s25ll.id,-4,'NS');
  await createMatch('t7','t9',laliga.id,s25ll.id,-6,'NS');

  // Serie A matches (18 finished)
  const saPairs = [
    ['t10','t11',14,'FT',1,1],['t12','t13',12,'FT',3,0],['t11','t12',10,'FT',2,1],['t13','t10',8,'FT',1,2],
    ['t10','t12',7,'FT',0,2],['t11','t13',6,'FT',2,0],['t12','t10',5,'FT',1,0],['t13','t11',4,'FT',2,1],
    ['t10','t13',3,'FT',2,0],['t11','t10',2,'FT',1,1],['t12','t11',1,'FT',2,0],['t13','t12',1,'FT',1,3],
    ['t10','t11',20,'FT',3,1],['t12','t13',18,'FT',0,1],['t11','t12',16,'FT',1,1],
    ['t13','t10',15,'FT',2,3],['t10','t12',13,'FT',1,0],['t11','t13',11,'FT',3,2],
  ] as const;
  for (const [h,a,d,s,hg,ag] of saPairs) await createMatch(h,a,seriea.id,s25sa.id,d,s,hg,ag);

  // Bundesliga matches (17 finished)
  const blPairs = [
    ['t14','t15',14,'FT',3,1],['t16','t17',12,'FT',1,2],['t15','t16',10,'FT',2,1],['t17','t14',8,'FT',0,2],
    ['t14','t16',7,'FT',4,0],['t15','t17',6,'FT',1,1],['t16','t14',5,'FT',1,3],['t17','t15',4,'FT',2,0],
    ['t14','t17',3,'FT',2,1],['t15','t14',2,'FT',0,3],['t16','t15',1,'FT',2,1],['t17','t16',1,'FT',1,1],
    ['t14','t15',20,'FT',2,2],['t16','t17',18,'FT',3,0],['t15','t16',16,'FT',1,2],
    ['t17','t14',15,'FT',1,4],['t14','t16',13,'FT',2,0],
  ] as const;
  for (const [h,a,d,s,hg,ag] of blPairs) await createMatch(h,a,bundesliga.id,s25bl.id,d,s,hg,ag);

  // Standings for PL
  const plStandingsData = [
    { ext: 't1', rank: 1, pts: 67, played: 28, w: 21, d: 4, l: 3, gf: 72, ga: 28 },
    { ext: 't2', rank: 2, pts: 62, played: 28, w: 19, d: 5, l: 4, gf: 63, ga: 32 },
    { ext: 't3', rank: 3, pts: 58, played: 28, w: 18, d: 4, l: 6, gf: 68, ga: 38 },
    { ext: 't4', rank: 4, pts: 52, played: 28, w: 15, d: 7, l: 6, gf: 55, ga: 40 },
    { ext: 't5', rank: 5, pts: 44, played: 28, w: 13, d: 5, l: 10, gf: 44, ga: 47 },
    { ext: 't18', rank: 6, pts: 42, played: 28, w: 12, d: 6, l: 10, gf: 50, ga: 48 },
    { ext: 't19', rank: 7, pts: 39, played: 28, w: 11, d: 6, l: 11, gf: 42, ga: 46 },
    { ext: 't20', rank: 8, pts: 36, played: 28, w: 10, d: 6, l: 12, gf: 38, ga: 50 },
  ];
  for (const s of plStandingsData) {
    const team = teamMap[s.ext];
    if (!team) continue;
    await prisma.standing.upsert({
      where: { provider_leagueId_teamId: { provider: 'seed', leagueId: pl.id, teamId: team.id } },
      create: { provider: 'seed', leagueId: pl.id, seasonId: s25pl.id, teamId: team.id, rank: s.rank, points: s.pts, played: s.played, win: s.w, draw: s.d, lose: s.l, goalsFor: s.gf, goalsAgainst: s.ga, goalsDiff: s.gf - s.ga },
      update: { rank: s.rank, points: s.pts },
    });
  }

  // La Liga standings
  const laStandings = [
    { ext: 't6', rank: 1, pts: 72, played: 28, w: 23, d: 3, l: 2, gf: 78, ga: 22 },
    { ext: 't7', rank: 2, pts: 65, played: 28, w: 20, d: 5, l: 3, gf: 70, ga: 30 },
    { ext: 't8', rank: 3, pts: 54, played: 28, w: 16, d: 6, l: 6, gf: 48, ga: 32 },
    { ext: 't9', rank: 4, pts: 42, played: 28, w: 12, d: 6, l: 10, gf: 40, ga: 48 },
  ];
  for (const s of laStandings) {
    const team = teamMap[s.ext]; if (!team) continue;
    await prisma.standing.upsert({
      where: { provider_leagueId_teamId: { provider: 'seed', leagueId: laliga.id, teamId: team.id } },
      create: { provider: 'seed', leagueId: laliga.id, seasonId: s25ll.id, teamId: team.id, rank: s.rank, points: s.pts, played: s.played, win: s.w, draw: s.d, lose: s.l, goalsFor: s.gf, goalsAgainst: s.ga, goalsDiff: s.gf - s.ga },
      update: { rank: s.rank, points: s.pts },
    });
  }

  // Serie A standings
  const saStandings = [
    { ext: 't12', rank: 1, pts: 60, played: 27, w: 18, d: 6, l: 3, gf: 58, ga: 28 },
    { ext: 't14', rank: 2, pts: 55, played: 27, w: 17, d: 4, l: 6, gf: 52, ga: 30 },
    { ext: 't11', rank: 3, pts: 50, played: 27, w: 15, d: 5, l: 7, gf: 48, ga: 36 },
    { ext: 't10', rank: 4, pts: 44, played: 27, w: 13, d: 5, l: 9, gf: 42, ga: 40 },
  ];
  for (const s of saStandings) {
    const team = teamMap[s.ext]; if (!team) continue;
    await prisma.standing.upsert({
      where: { provider_leagueId_teamId: { provider: 'seed', leagueId: seriea.id, teamId: team.id } },
      create: { provider: 'seed', leagueId: seriea.id, seasonId: s25sa.id, teamId: team.id, rank: s.rank, points: s.pts, played: s.played, win: s.w, draw: s.d, lose: s.l, goalsFor: s.gf, goalsAgainst: s.ga, goalsDiff: s.gf - s.ga },
      update: { rank: s.rank, points: s.pts },
    });
  }

  // Bundesliga standings
  const blStandings = [
    { ext: 't14', rank: 1, pts: 68, played: 28, w: 21, d: 5, l: 2, gf: 82, ga: 30 },
    { ext: 't15', rank: 2, pts: 52, played: 28, w: 16, d: 4, l: 8, gf: 60, ga: 42 },
    { ext: 't16', rank: 3, pts: 48, played: 28, w: 14, d: 6, l: 8, gf: 54, ga: 44 },
    { ext: 't17', rank: 4, pts: 45, played: 28, w: 13, d: 6, l: 9, gf: 50, ga: 42 },
  ];
  for (const s of blStandings) {
    const team = teamMap[s.ext]; if (!team) continue;
    await prisma.standing.upsert({
      where: { provider_leagueId_teamId: { provider: 'seed', leagueId: bundesliga.id, teamId: team.id } },
      create: { provider: 'seed', leagueId: bundesliga.id, seasonId: s25bl.id, teamId: team.id, rank: s.rank, points: s.pts, played: s.played, win: s.w, draw: s.d, lose: s.l, goalsFor: s.gf, goalsAgainst: s.ga, goalsDiff: s.gf - s.ga },
      update: { rank: s.rank, points: s.pts },
    });
  }

  // Custom metrics
  await prisma.customMetric.upsert({ where: { id: 1 }, create: { id: 1, name: 'Attacking Strength', scope: 'team', formula: '(goals_for_per_match * 3) + (total_shots * 0.1) + (expected_goals * 2)', description: 'Measures offensive output' }, update: {} });
  await prisma.customMetric.upsert({ where: { id: 2 }, create: { id: 2, name: 'Striker Score', scope: 'player', formula: '(goals * 4) + assists + (shots_on * 0.5)', description: 'Rates striker contribution' }, update: {} });

  // Sync log
  await prisma.syncLog.create({ data: { provider: 'seed', syncType: 'all', status: 'success', recordsFetched: 200, recordsCreated: 200, recordsUpdated: 0, finishedAt: new Date() } });

  console.log('Seed complete.');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
