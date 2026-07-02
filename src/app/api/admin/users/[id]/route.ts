import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isAdmin } from '@/lib/auth';

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  const { id } = await params;
  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  const { id } = await params;
  const body = await req.json();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: Record<string, any> = {};
  if (body.role !== undefined) data.role = body.role;
  if (body.plan !== undefined) {
    if (!['FREE', 'PREMIUM', 'VIP'].includes(body.plan)) {
      return NextResponse.json({ error: 'Plan invalide' }, { status: 400 });
    }
    data.plan = body.plan;
    // Passage manuel en PREMIUM/VIP : accorde 1 mois par défaut si aucune date fournie
    if (body.plan !== 'FREE' && !body.planExpiresAt) {
      const expires = new Date();
      expires.setMonth(expires.getMonth() + 1);
      data.planExpiresAt = expires;
    }
    if (body.plan === 'FREE') data.planExpiresAt = null;
  }
  if (body.planExpiresAt !== undefined && body.planExpiresAt !== null) {
    data.planExpiresAt = new Date(body.planExpiresAt);
  }
  if (body.extraQuota !== undefined) data.extraQuota = Math.max(0, parseInt(body.extraQuota) || 0);
  if (body.resetQuota) {
    data.aiCallsMonth = 0;
    data.aiCallsToday = 0;
    data.aiCallsTodayDate = '';
  }

  const user = await prisma.user.update({
    where: { id },
    data,
    select: {
      id: true, name: true, email: true, role: true,
      plan: true, planExpiresAt: true, extraQuota: true,
      aiCallsMonth: true, aiCallsToday: true, aiCallsTodayDate: true,
    },
  });

  return NextResponse.json(user);
}
