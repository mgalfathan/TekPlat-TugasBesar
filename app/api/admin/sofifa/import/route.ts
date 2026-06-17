import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { importEafcCsv } from '@/lib/eafc-import';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const text = await req.text();
    if (!text || text.length < 50) {
      return NextResponse.json({ error: 'Empty or invalid CSV body' }, { status: 400 });
    }
    const result = await importEafcCsv(text);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Import failed' },
      { status: 422 },
    );
  }
}
