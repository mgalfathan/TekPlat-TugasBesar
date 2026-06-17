import { prisma } from '@/lib/prisma';
import { SOFIFA_LEAGUES } from '@/lib/sofifa-sync';

// Built-in top-5 league team ratings (independent estimates, from the
// self-contained reference dataset). Used because sofifa.com is fully behind
// Cloudflare bot protection — there is no server-reachable public API, so the
// app ships with this static data instead of live scraping.
//
// Each entry: [name, overall, modifier]
//   attackRating  = overall + modifier
//   defenseRating = overall - modifier
//   midfieldRating = overall
type StaticTeam = readonly [name: string, overall: number, modifier: number];

export const STATIC_LEAGUE_TEAMS: Record<number, StaticTeam[]> = {
  13: [ // Premier League
    ['Manchester City',90,2],['Liverpool',89,1],['Arsenal',88,-1],['Chelsea',84,1],['Newcastle Utd',82,0],
    ['Tottenham',81,2],['Aston Villa',80,1],['Manchester Utd',80,0],['Brighton',78,1],['Nottm Forest',77,-1],
    ['Bournemouth',77,1],['Crystal Palace',76,0],['Brentford',75,1],['Fulham',75,0],['West Ham',75,0],
    ['Everton',74,-2],['Wolves',73,0],['Leeds Utd',72,1],['Burnley',71,-2],['Sunderland',70,0],
  ],
  53: [ // La Liga
    ['Real Madrid',91,1],['Barcelona',89,2],['Atlético Madrid',85,-2],['Athletic Club',80,0],['Villarreal',79,1],
    ['Real Betis',78,1],['Real Sociedad',78,0],['Girona',76,1],['Sevilla',76,0],['Valencia',75,0],
    ['Celta Vigo',74,1],['Osasuna',73,-1],['Mallorca',73,-1],['Rayo Vallecano',73,0],['Getafe',72,-2],
    ['Espanyol',72,0],['Alavés',71,-1],['Elche',70,0],['Levante',69,0],['Real Oviedo',68,-1],
  ],
  19: [ // Bundesliga
    ['Bayern München',90,2],['Bayer Leverkusen',85,1],['Borussia Dortmund',83,1],['RB Leipzig',82,0],['Stuttgart',80,1],
    ['Eintracht Frankfurt',79,1],['Freiburg',77,0],['Wolfsburg',76,0],['Werder Bremen',75,0],['Mainz 05',75,0],
    ["M'gladbach",74,0],['Augsburg',73,-1],['Hoffenheim',73,1],['Union Berlin',73,-2],['St. Pauli',71,-1],
    ['Heidenheim',70,0],['Hamburger SV',70,0],['FC Köln',71,0],
  ],
  31: [ // Serie A
    ['Inter',88,1],['Napoli',87,0],['Juventus',84,-1],['AC Milan',83,0],['Atalanta',83,2],
    ['Roma',80,0],['Lazio',79,-1],['Fiorentina',78,0],['Bologna',78,1],['Como',76,1],
    ['Torino',74,-1],['Udinese',73,0],['Genoa',72,-1],['Cagliari',71,0],['Parma',71,0],
    ['Lecce',70,-1],['Hellas Verona',70,-1],['Pisa',69,0],['Sassuolo',69,1],['Cremonese',68,-1],
  ],
  16: [ // Ligue 1
    ['Paris SG',92,2],['Marseille',82,0],['Monaco',82,1],['Lille',79,0],['Nice',78,0],
    ['Lyon',78,0],['Lens',77,-1],['Rennes',76,1],['Strasbourg',75,1],['Brest',74,0],
    ['Toulouse',73,0],['Nantes',71,-1],['Auxerre',71,0],['Le Havre',70,-1],['Angers',69,-1],
    ['Lorient',69,0],['Metz',68,-1],['Paris FC',70,0],
  ],
};

export async function seedSofifaLeagueStatic(sofifaLeagueId: number): Promise<{
  teamsUpserted: number; playersUpserted: number;
}> {
  const leagueInfo = SOFIFA_LEAGUES.find(l => l.id === sofifaLeagueId);
  if (!leagueInfo) throw new Error(`Unknown leagueId: ${sofifaLeagueId}`);
  const teams = STATIC_LEAGUE_TEAMS[sofifaLeagueId];
  if (!teams) throw new Error(`No static data for leagueId: ${sofifaLeagueId}`);

  await prisma.sofifaLeague.upsert({
    where: { id: sofifaLeagueId },
    create: { id: sofifaLeagueId, name: leagueInfo.name, country: leagueInfo.country },
    update: { name: leagueInfo.name, country: leagueInfo.country },
  });

  let teamsUpserted = 0;
  for (let i = 0; i < teams.length; i++) {
    const [name, ovr, mod] = teams[i];
    const id = sofifaLeagueId * 1000 + (i + 1); // stable synthetic id
    const data = {
      name, leagueId: sofifaLeagueId, country: leagueInfo.country,
      overallRating: ovr,
      attackRating: ovr + mod,
      midfieldRating: ovr,
      defenseRating: ovr - mod,
      latestRoster: null as string | null,
      logoUrl: null as string | null,
    };
    await prisma.sofifaTeam.upsert({
      where: { id },
      create: { id, ...data },
      update: data,
    });
    teamsUpserted++;
  }

  return { teamsUpserted, playersUpserted: 0 };
}
