import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateFormula } from '@/lib/metrics/customMetricEngine';
import { requireUser } from '@/lib/auth';

export async function GET() {
  try {
    const session = await requireUser();
    const metrics = await prisma.customMetric.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(metrics);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed';
    return NextResponse.json({ error: message }, { status: message === 'Unauthorized' ? 401 : 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireUser();
    const { name, formula, description, scope = 'team' } = await req.json();
    if (!name || !formula) return NextResponse.json({ error: 'name and formula required' }, { status: 400 });
    const validation = validateFormula(formula, scope);
    if (!validation.valid) return NextResponse.json({ error: `Invalid formula: ${validation.error}` }, { status: 400 });
    const metric = await prisma.customMetric.create({
      data: { userId: session.userId, name, formula, description, scope },
    });
    return NextResponse.json(metric, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed';
    return NextResponse.json({ error: message }, { status: message === 'Unauthorized' ? 401 : 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireUser();
    const { id } = await req.json();
    const metricId = parseInt(id);
    const deleted = await prisma.customMetric.deleteMany({ where: { id: metricId, userId: session.userId } });
    if (deleted.count === 0) return NextResponse.json({ error: 'Metric not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed';
    return NextResponse.json({ error: message }, { status: message === 'Unauthorized' ? 401 : 500 });
  }
}
