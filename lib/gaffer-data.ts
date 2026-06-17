export type PosGroup = 'GK' | 'DEF' | 'MID' | 'ATT';

export interface XiSlot {
  group: PosGroup;
  name: string | null;
  ovr: number | null;
  photoUrl?: string;
}

// [group, x%, y%] — x/y adalah posisi di pitch (0-100)
export const FORMATIONS: Record<string, {
  def: number; mid: number; att: number;
  layout: readonly [PosGroup, number, number][];
}> = {
  '4-3-3': { def: 4, mid: 3, att: 3, layout: [
    ['GK',50,90],['DEF',16,72],['DEF',38,76],['DEF',62,76],['DEF',84,72],
    ['MID',30,50],['MID',50,46],['MID',70,50],
    ['ATT',22,22],['ATT',50,16],['ATT',78,22],
  ]},
  '4-4-2': { def: 4, mid: 4, att: 2, layout: [
    ['GK',50,90],['DEF',16,72],['DEF',38,76],['DEF',62,76],['DEF',84,72],
    ['MID',16,48],['MID',40,50],['MID',60,50],['MID',84,48],
    ['ATT',38,18],['ATT',62,18],
  ]},
  '4-2-3-1': { def: 4, mid: 5, att: 1, layout: [
    ['GK',50,90],['DEF',16,72],['DEF',38,76],['DEF',62,76],['DEF',84,72],
    ['MID',36,58],['MID',64,58],['MID',22,36],['MID',50,32],['MID',78,36],
    ['ATT',50,14],
  ]},
  '3-5-2': { def: 3, mid: 5, att: 2, layout: [
    ['GK',50,90],['DEF',26,74],['DEF',50,78],['DEF',74,74],
    ['MID',12,52],['MID',36,48],['MID',50,52],['MID',64,48],['MID',88,52],
    ['ATT',38,18],['ATT',62,18],
  ]},
  '3-4-3': { def: 3, mid: 4, att: 3, layout: [
    ['GK',50,90],['DEF',26,74],['DEF',50,78],['DEF',74,74],
    ['MID',16,50],['MID',40,52],['MID',60,52],['MID',84,50],
    ['ATT',22,20],['ATT',50,14],['ATT',78,20],
  ]},
  '5-3-2': { def: 5, mid: 3, att: 2, layout: [
    ['GK',50,90],['DEF',10,70],['DEF',30,76],['DEF',50,80],['DEF',70,76],['DEF',90,70],
    ['MID',30,48],['MID',50,46],['MID',70,48],
    ['ATT',38,18],['ATT',62,18],
  ]},
};

export const CLUB_COLORS = [
  '#00d4aa','#c6f035','#5d9bff','#ff5d5d',
  '#ff8c42','#c77dff','#ffd23f','#ff5da2','#7dffa0','#e8ece6',
];

// SoFIFA league IDs untuk top 5 liga
export const SOFIFA_LEAGUE_IDS = { EPL:13, LALIGA:53, BUNDES:19, SERIEA:31, LIGUE1:16 } as const;

export const LEAGUE_CONFIG: Record<number, {
  name: string; flag: string; rel: number; cont: number; eur: number;
}> = {
  13: { name: 'Premier League', flag: 'ENGLAND', rel: 3, cont: 4, eur: 6 },
  53: { name: 'La Liga',        flag: 'SPAIN',   rel: 3, cont: 4, eur: 6 },
  19: { name: 'Bundesliga',     flag: 'GERMANY', rel: 2, cont: 4, eur: 5 },
  31: { name: 'Serie A',        flag: 'ITALY',   rel: 3, cont: 4, eur: 6 },
  16: { name: 'Ligue 1',        flag: 'FRANCE',  rel: 2, cont: 3, eur: 5 },
};

// Map SoFIFA league id → fallback-pool league key
export const LEAGUE_KEY: Record<number, FallbackLeague> = {
  13: 'EPL', 53: 'LALIGA', 19: 'BUNDES', 31: 'SERIEA', 16: 'LIGUE1',
};

// Fallback pool — dipakai jika SoFIFA belum di-sync
export type FallbackLeague = 'EPL' | 'LALIGA' | 'BUNDES' | 'SERIEA' | 'LIGUE1';
export interface FallbackPlayer {
  name: string; league: FallbackLeague; group: PosGroup; ovr: number;
}
export const FALLBACK_POOL: FallbackPlayer[] = ([
  // EPL
  ['Alisson','EPL','GK',89],['David Raya','EPL','GK',85],['Virgil van Dijk','EPL','DEF',89],['William Saliba','EPL','DEF',87],
  ['Gabriel Magalhães','EPL','DEF',85],['Joško Gvardiol','EPL','DEF',86],['Rodri','EPL','MID',91],['Cole Palmer','EPL','MID',87],
  ['Martin Ødegaard','EPL','MID',86],['Florian Wirtz','EPL','MID',88],['Alexis Mac Allister','EPL','MID',85],
  ['Erling Haaland','EPL','ATT',91],['Mohamed Salah','EPL','ATT',90],['Bukayo Saka','EPL','ATT',88],['Phil Foden','EPL','ATT',86],
  // LA LIGA
  ['Thibaut Courtois','LALIGA','GK',90],['Marc-André ter Stegen','LALIGA','GK',87],['Antonio Rüdiger','LALIGA','DEF',86],
  ['Pau Cubarsí','LALIGA','DEF',84],['Ronald Araújo','LALIGA','DEF',85],['Dani Carvajal','LALIGA','DEF',84],
  ['Pedri','LALIGA','MID',89],['Jude Bellingham','LALIGA','MID',90],['Gavi','LALIGA','MID',84],['Aurélien Tchouaméni','LALIGA','MID',86],
  ['Kylian Mbappé','LALIGA','ATT',93],['Vinícius Jr','LALIGA','ATT',91],['Lamine Yamal','LALIGA','ATT',89],
  ['Robert Lewandowski','LALIGA','ATT',87],['Raphinha','LALIGA','ATT',87],
  // BUNDES
  ['Manuel Neuer','BUNDES','GK',86],['Gregor Kobel','BUNDES','GK',85],['Jonathan Tah','BUNDES','DEF',84],
  ['Nico Schlotterbeck','BUNDES','DEF',84],['Kim Min-jae','BUNDES','DEF',84],['Alphonso Davies','BUNDES','DEF',85],
  ['Joshua Kimmich','BUNDES','MID',88],['Jamal Musiala','BUNDES','MID',90],['Xavi Simons','BUNDES','MID',85],
  ['Julian Brandt','BUNDES','MID',83],['Harry Kane','BUNDES','ATT',91],['Michael Olise','BUNDES','ATT',87],
  ['Serhou Guirassy','BUNDES','ATT',85],['Karim Adeyemi','BUNDES','ATT',83],
  // SERIE A
  ['Mike Maignan','SERIEA','GK',88],['Michele Di Gregorio','SERIEA','GK',83],['Alessandro Bastoni','SERIEA','DEF',87],
  ['Gleison Bremer','SERIEA','DEF',85],['Alessandro Buongiorno','SERIEA','DEF',84],['Federico Dimarco','SERIEA','DEF',85],
  ['Nicolò Barella','SERIEA','MID',88],['Hakan Çalhanoğlu','SERIEA','MID',86],['Scott McTominay','SERIEA','MID',84],
  ['Teun Koopmeiners','SERIEA','MID',84],['Lautaro Martínez','SERIEA','ATT',90],['Victor Osimhen','SERIEA','ATT',89],
  ['Rafael Leão','SERIEA','ATT',86],['Dušan Vlahović','SERIEA','ATT',85],['Marcus Thuram','SERIEA','ATT',85],
  // LIGUE 1
  ['Gianluigi Donnarumma','LIGUE1','GK',90],['Lucas Chevalier','LIGUE1','GK',84],['Achraf Hakimi','LIGUE1','DEF',87],
  ['Marquinhos','LIGUE1','DEF',86],['Benjamin Pavard','LIGUE1','DEF',84],['William Saliba','LIGUE1','DEF',85],
  ['Vitinha','LIGUE1','MID',87],['João Neves','LIGUE1','MID',85],['Warren Zaïre-Emery','LIGUE1','MID',83],
  ['Ousmane Dembélé','LIGUE1','ATT',89],['Khvicha Kvaratskhelia','LIGUE1','ATT',88],['Bradley Barcola','LIGUE1','ATT',85],
  ['Désiré Doué','LIGUE1','ATT',84],['Mason Greenwood','LIGUE1','ATT',84],
] as [string, FallbackLeague, PosGroup, number][]).map(p => ({
  name: p[0].trim(), league: p[1], group: p[2], ovr: p[3],
}));
