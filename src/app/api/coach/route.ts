import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// GET /api/coach — get or create coach profile
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  let profile = await prisma.coachProfile.findUnique({ where: { userId: user.id } });
  if (!profile) {
    profile = await prisma.coachProfile.create({ data: { userId: user.id } });
  }

  const supplements = await prisma.supplement.findMany({
    where: { userId: user.id, active: true },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json({ profile, supplements });
}

// PUT /api/coach — update coach profile
export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const body = await req.json();
  const {
    height, weight, age, sex,
    activityLevel, sportTypes, sportFrequency,
    goal, targetCalories, schedule,
  } = body;

  // Calculate BMR (Mifflin-St Jeor)
  let bmr: number | null = null;
  let tdee: number | null = null;
  if (weight && height && age && sex) {
    if (sex === 'M') {
      bmr = Math.round(10 * weight + 6.25 * height - 5 * age + 5);
    } else {
      bmr = Math.round(10 * weight + 6.25 * height - 5 * age - 161);
    }
    const multipliers: Record<string, number> = {
      sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9,
    };
    tdee = Math.round(bmr * (multipliers[activityLevel || 'moderate'] || 1.55));

    if (goal === 'lose') tdee = Math.round(tdee * 0.85);
    else if (goal === 'gain') tdee = Math.round(tdee * 1.15);
  }

  const profile = await prisma.coachProfile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      height, weight, age, sex,
      activityLevel: activityLevel || 'moderate',
      sportTypes: JSON.stringify(sportTypes || []),
      sportFrequency,
      goal: goal || 'maintain',
      targetCalories,
      schedule: JSON.stringify(schedule || {}),
      bmr, tdee,
    },
    update: {
      ...(height !== undefined && { height }),
      ...(weight !== undefined && { weight }),
      ...(age !== undefined && { age }),
      ...(sex !== undefined && { sex }),
      ...(activityLevel && { activityLevel }),
      ...(sportTypes && { sportTypes: JSON.stringify(sportTypes) }),
      ...(sportFrequency !== undefined && { sportFrequency }),
      ...(goal && { goal }),
      ...(targetCalories !== undefined && { targetCalories }),
      ...(schedule && { schedule: JSON.stringify(schedule) }),
      ...(bmr && { bmr }),
      ...(tdee && { tdee }),
    },
  });

  return NextResponse.json(profile);
}
