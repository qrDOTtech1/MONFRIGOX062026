import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN') return null;
  return user;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Interdit' }, { status: 403 });
  const { id } = await params;
  const body = await req.json();

  const allowed = ['isActive', 'description', 'maxUses', 'expiresAt', 'durationMonths',
    'planGranted', 'firstSignupOnly', 'minAccountAgeDays', 'maxAccountAgeDays'];
  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) {
      if (key === 'expiresAt') data[key] = body[key] ? new Date(body[key]) : null;
      else if (['maxUses', 'durationMonths', 'minAccountAgeDays', 'maxAccountAgeDays'].includes(key)) {
        data[key] = body[key] !== null && body[key] !== '' ? Number(body[key]) : null;
      } else {
        data[key] = body[key];
      }
    }
  }

  const updated = await prisma.promoCode.update({ where: { id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Interdit' }, { status: 403 });
  const { id } = await params;
  await prisma.promoCode.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
