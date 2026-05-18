import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { evaluateFormula } from '@/lib/metrics/customMetricEngine';

const FINISHED = ['FT', 'AET', 'PEN', 'FINISHED'];

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const metricId = parseInt(params.id);
    if (isNaN(metricId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

    const metric = await prisma.customMetric.findUniqueOrThrow({ where: { id: metricId } });

    const teams = await prisma.team.findMany({
      include: {
        homeMatches: { where: { statusShort: { in: FINISHED } }, select: { homeScore: true, awayScore: true } },
        awayMatches: { where: { statusShort: { in: FINISHED } }, select: { homeScore: true, awayScore: true } },
      },
    });

    const results = teams.map(team => {
      let wins = 0, draws = 0, losses = 0, gf = 0, ga = 0;
      for (const m of team.homeMatches) {
        const h = m.homeScore ?? 0, a = m.awayScore ?? 0;
        gf += h; ga += a;
        if (h > a) wins++; else if (h === a) draws++; else losses++;
      }
      for (const m of team.awayMatches) {
        const h = m.homeScore ?? 0, a = m.awayScore ?? 0;
        gf += a; ga += h;
        if (a > h) wins++; else if (a === h) draws++; else losses++;
      }
      const mp = wins + draws + losses;
      if (mp === 0) return null;
      const vars: Record<string, number> = {
        matches_played: mp, wins, draws, losses, points: wins * 3 + draws,
        goals_for: gf, goals_against: ga, goal_difference: gf - ga,
        win_rate: wins / mp, draw_rate: draws / mp, loss_rate: losses / mp,
        goals_for_per_match: gf / mp, goals_against_per_match: ga / mp,
        clean_sheets: team.awayMatches.filter(m => (m.homeScore ?? 0) === 0).length,
        failed_to_score: team.homeMatches.filter(m => (m.homeScore ?? 0) === 0).length,
        home_wins: team.homeMatches.filter(m => (m.homeScore ?? 0) > (m.awayScore ?? 0)).length,
        away_wins: team.awayMatches.filter(m => (m.awayScore ?? 0) > (m.homeScore ?? 0)).length,
        shots_on_goal: 0, total_shots: 0, fouls: 0, corner_kicks: 0,
        yellow_cards: 0, red_cards: 0, possession: 0, pass_accuracy: 0, expected_goals: 0,
      };
      try {
        const score = evaluateFormula(metric.formula, vars);
        return { teamId: team.id, teamName: team.name, logo: team.logo, score, matches_played: mp };
      } catch { return null; }
    }).filter(Boolean).sort((a, b) => b!.score - a!.score);

    return NextResponse.json({ metric, results });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}
