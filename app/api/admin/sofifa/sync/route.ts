import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { syncSofifaLeague, SOFIFA_LEAGUES } from '@/lib/sofifa-sync';
import { seedSofifaLeagueStatic } from '@/lib/sofifa-static';

export async function GET() {
  try {
    await requireAdmin();
    const logs = await prisma.sofifaSyncLog.findMany({
      orderBy: { startedAt: 'desc' }, take: 10,
    });
    return NextResponse.json({ logs });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const { leagueId } = await req.json().catch(() => ({}));
    const leagueIds = leagueId
      ? [Number(leagueId)]
      : SOFIFA_LEAGUES.map(l => l.id);

    // Create log record
    const log = await prisma.sofifaSyncLog.create({
      data: {
        leagueId: leagueId ?? null,
        leagueName: leagueId
          ? SOFIFA_LEAGUES.find(l => l.id === Number(leagueId))?.name
          : 'All leagues',
        status: 'running',
      },
    });

    // Run sync in background — do NOT await
    (async () => {
      let teamsTotal = 0, playersTotal = 0;
      const fallbackLeagues: string[] = [];
      try {
        for (const id of leagueIds) {
          const lgName = SOFIFA_LEAGUES.find(l => l.id === id)?.name ?? String(id);
          try {
            // Try the live SoFIFA API first (works from allowed IPs).
            const { teamsUpserted, playersUpserted } = await syncSofifaLeague(id);
            teamsTotal += teamsUpserted;
            playersTotal += playersUpserted;
          } catch (liveErr) {
            // Live blocked (Cloudflare 403 from datacenter IPs / Workers, or
            // 429 rate limit) — fall back to bundled static ratings so the
            // app always has usable data.
            console.warn(`[sofifa-sync] live failed for ${lgName}, using static fallback:`,
              liveErr instanceof Error ? liveErr.message : liveErr);
            const { teamsUpserted, playersUpserted } = await seedSofifaLeagueStatic(id);
            teamsTotal += teamsUpserted;
            playersTotal += playersUpserted;
            fallbackLeagues.push(lgName);
          }
        }
        await prisma.sofifaSyncLog.update({
          where: { id: log.id },
          data: {
            status: 'done',
            teamsCount: teamsTotal,
            playersCount: playersTotal,
            errorMsg: fallbackLeagues.length
              ? `Live SoFIFA unreachable — used bundled ratings for: ${fallbackLeagues.join(', ')}`
              : null,
            finishedAt: new Date(),
          },
        });
      } catch (e) {
        await prisma.sofifaSyncLog.update({
          where: { id: log.id },
          data: {
            status: 'error',
            errorMsg: e instanceof Error ? e.message : String(e),
            finishedAt: new Date(),
          },
        });
      }
    })();

    return NextResponse.json({ logId: log.id, status: 'started' }, { status: 202 });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
