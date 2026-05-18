import { NextRequest, NextResponse } from 'next/server';
import { syncSbCompetitions, syncSbAll } from '@/lib/syncStatsbomb';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { competitionId?: number; seasonId?: number; competitionsOnly?: boolean };

    if (body.competitionsOnly) {
      const count = await syncSbCompetitions();
      return NextResponse.json({ success: true, competitions: count });
    }

    if (!body.competitionId || !body.seasonId) {
      return NextResponse.json({ error: 'competitionId and seasonId required' }, { status: 400 });
    }

    const result = await syncSbAll(body.competitionId, body.seasonId);
    return NextResponse.json({ success: true, result });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Sync failed' }, { status: 500 });
  }
}
