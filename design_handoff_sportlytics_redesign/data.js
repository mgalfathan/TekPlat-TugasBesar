// Sportlytics mock data — shapes mirror the real API (analytics/teams, predictions, dashboard, custom-metrics)
(function () {
  // Premier League 2024 — realistic-ish stats for 15 clubs
  const TEAMS = [
    { id:1,  name:'Manchester City', code:'MCI', city:'Manchester', primary:'#6CABDD', played:24, wins:17, draws:4, losses:3,  gf:58, ga:24 },
    { id:2,  name:'Arsenal',         code:'ARS', city:'London',     primary:'#EF0107', played:24, wins:16, draws:5, losses:3,  gf:52, ga:22 },
    { id:3,  name:'Liverpool',       code:'LIV', city:'Liverpool',  primary:'#C8102E', played:24, wins:16, draws:6, losses:2,  gf:55, ga:26 },
    { id:4,  name:'Aston Villa',     code:'AVL', city:'Birmingham', primary:'#95BFE5', played:24, wins:14, draws:4, losses:6,  gf:49, ga:35 },
    { id:5,  name:'Tottenham',       code:'TOT', city:'London',     primary:'#132257', played:24, wins:13, draws:4, losses:7,  gf:51, ga:38 },
    { id:6,  name:'Chelsea',         code:'CHE', city:'London',     primary:'#034694', played:24, wins:11, draws:7, losses:6,  gf:44, ga:33 },
    { id:7,  name:'Newcastle',       code:'NEW', city:'Newcastle',  primary:'#241F20', played:24, wins:12, draws:4, losses:8,  gf:48, ga:36 },
    { id:8,  name:'Manchester Utd',  code:'MUN', city:'Manchester', primary:'#DA291C', played:24, wins:12, draws:3, losses:9,  gf:38, ga:35 },
    { id:9,  name:'West Ham',        code:'WHU', city:'London',     primary:'#7A263A', played:24, wins:10, draws:6, losses:8,  gf:39, ga:42 },
    { id:10, name:'Brighton',        code:'BHA', city:'Brighton',   primary:'#0057B8', played:24, wins:9,  draws:9, losses:6,  gf:42, ga:38 },
    { id:11, name:'Bournemouth',     code:'BOU', city:'Bournemouth',primary:'#DA291C', played:24, wins:9,  draws:6, losses:9,  gf:36, ga:42 },
    { id:12, name:'Fulham',          code:'FUL', city:'London',     primary:'#000000', played:24, wins:9,  draws:5, losses:10, gf:35, ga:39 },
    { id:13, name:'Wolves',          code:'WOL', city:'Wolverhampton',primary:'#FDB913',played:24, wins:9,  draws:4, losses:11, gf:36, ga:43 },
    { id:14, name:'Brentford',       code:'BRE', city:'London',     primary:'#E30613', played:24, wins:7,  draws:6, losses:11, gf:38, ga:45 },
    { id:15, name:'Everton',         code:'EVE', city:'Liverpool',  primary:'#003399', played:24, wins:8,  draws:7, losses:9,  gf:30, ga:34 },
  ];

  const FORM_POOL = ['W','W','D','L','W','W','D','W','L','W'];
  function seededForm(id) {
    const out = [];
    for (let i = 0; i < 5; i++) out.push(FORM_POOL[(id * 7 + i * 3) % FORM_POOL.length]);
    return out;
  }

  const teams = TEAMS.map((t) => {
    const points = t.wins * 3 + t.draws;
    const gd = t.gf - t.ga;
    const winRate = Math.round((t.wins / t.played) * 100);
    return {
      teamId: t.id, teamName: t.name, code: t.code, city: t.city, primary: t.primary,
      played: t.played, wins: t.wins, draws: t.draws, losses: t.losses,
      goalsFor: t.gf, goalsAgainst: t.ga, goalDifference: gd, points, winRate,
      goalsPerMatch: +(t.gf / t.played).toFixed(2),
      concededPerMatch: +(t.ga / t.played).toFixed(2),
      cleanSheets: Math.max(2, Math.round(t.played * (0.12 + (gd > 0 ? 0.22 : 0.08)))),
      failedToScore: Math.max(1, Math.round(t.played * (t.gf < 40 ? 0.22 : 0.1))),
      homeWins: Math.round(t.wins * 0.62),
      awayWins: t.wins - Math.round(t.wins * 0.62),
      form: seededForm(t.id),
    };
  }).sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference);

  // Recent results
  const RESULTS = [
    { home:'MCI', away:'CHE', hs:3, as:1, date:'15 Feb' },
    { home:'ARS', away:'NEW', hs:2, as:0, date:'15 Feb' },
    { home:'LIV', away:'BHA', hs:2, as:2, date:'14 Feb' },
    { home:'TOT', away:'MUN', hs:1, as:1, date:'14 Feb' },
    { home:'AVL', away:'WOL', hs:3, as:0, date:'13 Feb' },
    { home:'WHU', away:'EVE', hs:0, as:1, date:'13 Feb' },
    { home:'BRE', away:'FUL', hs:2, as:1, date:'12 Feb' },
  ];

  // Upcoming fixtures
  const FIXTURES = [
    { home:'LIV', away:'MCI', date:'Sat 22 Feb', time:'17:30' },
    { home:'ARS', away:'TOT', date:'Sun 23 Feb', time:'16:00' },
    { home:'CHE', away:'MUN', date:'Sun 23 Feb', time:'14:00' },
    { home:'NEW', away:'AVL', date:'Sat 22 Feb', time:'15:00' },
  ];

  // Predictions (probabilistic, mirrors prediction engine output)
  const PREDICTIONS = [
    { id:1, home:'LIV', away:'MCI', hp:0.41, dp:0.27, ap:0.32, phg:2, pag:2, conf:0.58,
      note:'Even contest. Liverpool edge on home form (4W in last 5); City regress to mean away from home.' },
    { id:2, home:'ARS', away:'TOT', hp:0.56, dp:0.24, ap:0.20, phg:2, pag:1, conf:0.71,
      note:'Arsenal strong defensively (22 GA). North London derby skews home; Spurs leak goals away.' },
    { id:3, home:'CHE', away:'MUN', hp:0.47, dp:0.28, ap:0.25, phg:2, pag:1, conf:0.62,
      note:'Chelsea unbeaten in 4 at home. United inconsistent on the road, low away win rate.' },
    { id:4, home:'NEW', away:'AVL', hp:0.44, dp:0.26, ap:0.30, phg:2, pag:1, conf:0.55,
      note:'Tight one. Newcastle home advantage (+15%) offsets Villa\u2019s superior goal difference.' },
  ];

  // Saved custom metrics
  const METRICS = [
    { id:1, name:'Attacking Threat', scope:'team', formula:'(goals_for * 2) + goal_difference',
      desc:'Rewards high-scoring sides and net dominance.' },
    { id:2, name:'Title Index',      scope:'team', formula:'(win_rate * 100) + goal_difference',
      desc:'Composite of consistency and margin.' },
    { id:3, name:'Defensive Wall',   scope:'team', formula:'clean_sheets * 4 - goals_against',
      desc:'Favours mean defences.' },
  ];

  function evalMetric(formula, t) {
    const vars = {
      goals_for: t.goalsFor, goals_against: t.goalsAgainst, goal_difference: t.goalDifference,
      wins: t.wins, draws: t.draws, losses: t.losses, win_rate: t.winRate / 100,
      matches_played: t.played, clean_sheets: t.cleanSheets,
    };
    let expr = formula;
    Object.keys(vars).forEach((k) => { expr = expr.split(k).join('(' + vars[k] + ')'); });
    try { /* eslint-disable no-new-func */ return Function('"use strict";return (' + expr + ')')(); }
    catch { return 0; }
  }

  const VARIABLES = [
    'goals_for','goals_against','goal_difference','wins','draws','losses',
    'win_rate','matches_played','clean_sheets',
  ];

  function byCode(c) { return teams.find((t) => t.code === c); }

  window.SPORT = { teams, RESULTS, FIXTURES, PREDICTIONS, METRICS, VARIABLES, evalMetric, byCode };
})();
