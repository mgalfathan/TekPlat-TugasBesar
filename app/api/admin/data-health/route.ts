import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const [totalCountries, totalLeagues, totalSeasons, totalTeams, totalPlayers, totalMatches, totalStandings, lastSync] = await Promise.all([
    prisma.country.count(),
    prisma.league.count(),
    prisma.season.count(),
    prisma.team.count(),
    prisma.player.count(),
    prisma.match.count(),
    prisma.standing.count(),
    prisma.syncLog.findFirst({ orderBy: { startedAt: 'desc' } }),
  ]);
  const staleDataWarnings: string[] = [];
  if (totalMatches === 0) staleDataWarnings.push('No matches in database');
  if (totalTeams === 0) staleDataWarnings.push('No teams in database');
  if (totalStandings === 0) staleDataWarnings.push('No standings in database');
  const providerStatus = { apiFootball: !!process.env.API_FOOTBALL_KEY, footballData: !!process.env.FOOTBALL_DATA_API_KEY };
  return NextResponse.json({ totalCountries, totalLeagues, totalSeasons, totalTeams, totalPlayers, totalMatches, totalStandings, lastSync, staleDataWarnings, providerStatus });
}
