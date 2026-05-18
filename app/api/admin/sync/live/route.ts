import { NextRequest, NextResponse } from 'next/server';
import { syncLive } from '@/lib/sync/syncService';

export async function POST(req: NextRequest) {
  try {
    const { provider = 'api-football', leagueId } = await req.json().catch(() => ({}));
    const result = await syncLive(provider, leagueId);
    return NextResponse.json({ success: true, result });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Sync failed' }, { status: 500 });
  }
}
