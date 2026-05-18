import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateFormula } from '@/lib/metrics/customMetricEngine';

export async function GET() {
  try {
    const metrics = await prisma.customMetric.findMany({ orderBy: { createdAt: 'desc' } });
    return NextResponse.json(metrics);
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, formula, description, scope = 'team' } = await req.json();
    if (!name || !formula) return NextResponse.json({ error: 'name and formula required' }, { status: 400 });
    const validation = validateFormula(formula, scope);
    if (!validation.valid) return NextResponse.json({ error: `Invalid formula: ${validation.error}` }, { status: 400 });
    const metric = await prisma.customMetric.create({ data: { name, formula, description, scope } });
    return NextResponse.json(metric, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    await prisma.customMetric.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 });
  }
}
