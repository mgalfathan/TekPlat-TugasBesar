import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';

export async function GET() {
  try {
    const session = await requireUser();
    const predictions = await prisma.prediction.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        homeTeam: true, awayTeam: true,
        match: { include: { league: true } },
      },
    });
    const leagues = await prisma.league.findMany({ include: { country: true }, orderBy: { name: 'asc' } });
    return NextResponse.json({ predictions, leagues });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed';
    return NextResponse.json({ error: message }, { status: message === 'Unauthorized' ? 401 : 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireUser();
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const deleted = await prisma.prediction.deleteMany({
      where: { id: parseInt(id), userId: session.userId },
    });
    if (deleted.count === 0) return NextResponse.json({ error: 'Prediction not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed';
    return NextResponse.json({ error: message }, { status: message === 'Unauthorized' ? 401 : 500 });
  }
}
