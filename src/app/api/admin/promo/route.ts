import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN') return null;
  return user;
}

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Interdit' }, { status: 403 });

  const codes = await prisma.promoCode.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { uses: true } },
    },
  });

  return NextResponse.json(codes);
}

export async function POST(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Interdit' }, { status: 403 });

  const body = await req.json();

  // Batch mode
  if (Array.isArray(body.batch)) {
    const defaults = body.defaults ?? {};
    const errors: string[] = [];
    let created = 0;

    for (const item of body.batch) {
      const merged = { ...defaults, ...item };
      const { code, description, planGranted, durationMonths, maxUses, expiresAt, firstSignupOnly, minAccountAgeDays, maxAccountAgeDays } = merged;

      if (!code?.trim() || !planGranted || !durationMonths) {
        errors.push(`Code "${code || '(vide)'}": code, plan et durée requis`);
        continue;
      }

      const normalized = code.trim().toUpperCase().replace(/\s+/g, '');
      try {
        await prisma.promoCode.create({
          data: {
            code: normalized,
            description: description ?? '',
            planGranted,
            durationMonths: Number(durationMonths),
            maxUses: maxUses ? Number(maxUses) : null,
            expiresAt: expiresAt ? new Date(expiresAt) : null,
            firstSignupOnly: Boolean(firstSignupOnly),
            minAccountAgeDays: minAccountAgeDays ? Number(minAccountAgeDays) : null,
            maxAccountAgeDays: maxAccountAgeDays ? Number(maxAccountAgeDays) : null,
          },
        });
        created++;
      } catch (e: any) {
        if (e.code === 'P2002') {
          errors.push(`Code "${normalized}": existe déjà`);
        } else {
          errors.push(`Code "${normalized}": ${e.message ?? 'erreur inconnue'}`);
        }
      }
    }

    return NextResponse.json({ created, errors }, { status: created > 0 ? 201 : 400 });
  }

  // Single mode
  const {
    code, description, planGranted, durationMonths,
    maxUses, expiresAt, firstSignupOnly,
    minAccountAgeDays, maxAccountAgeDays,
  } = body;

  if (!code?.trim() || !planGranted || !durationMonths) {
    return NextResponse.json({ error: 'Code, plan et durée requis' }, { status: 400 });
  }

  const normalized = code.trim().toUpperCase().replace(/\s+/g, '');

  try {
    const promo = await prisma.promoCode.create({
      data: {
        code: normalized,
        description: description ?? '',
        planGranted,
        durationMonths: Number(durationMonths),
        maxUses: maxUses ? Number(maxUses) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        firstSignupOnly: Boolean(firstSignupOnly),
        minAccountAgeDays: minAccountAgeDays ? Number(minAccountAgeDays) : null,
        maxAccountAgeDays: maxAccountAgeDays ? Number(maxAccountAgeDays) : null,
      },
    });
    return NextResponse.json(promo, { status: 201 });
  } catch (e: any) {
    if (e.code === 'P2002') {
      return NextResponse.json({ error: 'Ce code existe déjà' }, { status: 409 });
    }
    throw e;
  }
}
