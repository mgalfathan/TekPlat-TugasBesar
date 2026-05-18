import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const FINISHED = ['FT', 'AET', 'PEN', 'FINISHED'];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const leagueId = searchParams.get('leagueId');
    const season = searchParams.get('season');

    const matchWhere: Record<string, unknown> = { statusShort: { in: FINISHED } };
    if (leagueId) matchWhere.leagueId = parseInt(leagueId);
    if (season) matchWhere.season = { year: season };

    const teamWhere = leagueId
      ? {
          OR: [
            { homeMatches: { some: matchWhere } },
            { awayMatches: { some: matchWhere } },
          ],
        }
      : {};

    const [teams, leagues] = await Promise.all([
      prisma.team.findMany({
        where: teamWhere,
        include: {
          homeMatches: { where: matchWhere, orderBy: { utcDate: 'desc' }, select: { id: true, utcDate: true, homeScore: true, awayScore: true, winner: true } },
          awayMatches: { where: matchWhere, orderBy: { utcDate: 'desc' }, select: { id: true, utcDate: true, homeScore: true, awayScore: true, winner: true } },
        },
      }),
      prisma.league.findMany({ include: { country: true }, orderBy: { name: 'asc' } }),
    ]);

    const stats = teams.map(team => {
      type Result = { date: Date; outcome: 'W' | 'D' | 'L'; gf: number; ga: number };
      const results: Result[] = [];
      let wins = 0, draws = 0, losses = 0, gf = 0, ga = 0;
      let cleanSheets = 0, failedToScore = 0;
      let homeWins = 0, awayWins = 0;

      for (const m of team.homeMatches) {
        const h = m.homeScore ?? 0, a = m.awayScore ?? 0;
        gf += h; ga += a;
        if (a === 0) cleanSheets++;
        if (h === 0) failedToScore++;
        let outcome: 'W' | 'D' | 'L';
        if (h > a) { wins++; homeWins++; outcome = 'W'; }
        else if (h === a) { draws++; outcome = 'D'; }
        else { losses++; outcome = 'L'; }
        results.push({ date: m.utcDate, outcome, gf: h, ga: a });
      }
      for (const m of team.awayMatches) {
        const h = m.homeScore ?? 0, a = m.awayScore ?? 0;
        gf += a; ga += h;
        if (h === 0) cleanSheets++;
        if (a === 0) failedToScore++;
        let outcome: 'W' | 'D' | 'L';
        if (a > h) { wins++; awayWins++; outcome = 'W'; }
        else if (h === a) { draws++; outcome = 'D'; }
        else { losses++; outcome = 'L'; }
        results.push({ date: m.utcDate, outcome, gf: a, ga: h });
      }

      const played = wins + draws + losses;
      const form = results.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5).map(r => r.outcome);

      return {
        teamId: team.id,
        teamName: team.name,
        code: team.code,
        logo: team.logo,
        country: team.country,
        played,
        wins, draws, losses,
        winRate: played > 0 ? Math.round((wins / played) * 100) : 0,
        goalsFor: gf,
        goalsAgainst: ga,
        goalDifference: gf - ga,
        goalsPerMatch: played > 0 ? Number((gf / played).toFixed(2)) : 0,
        concededPerMatch: played > 0 ? Number((ga / played).toFixed(2)) : 0,
        cleanSheets,
        failedToScore,
        homeWins,
        awayWins,
        points: wins * 3 + draws,
        form,
      };
    }).filter(t => t.played > 0)
      .sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference);

    return NextResponse.json({ teams: stats, leagues });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}
