import { NextResponse } from 'next/server';

// Deprecated — use POST /api/admin/sync instead
export async function POST() {
  return NextResponse.json({ message: 'Use POST /api/admin/sync instead' }, { status: 301 });
}
