import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// POST /api/ingredients — crée un ingrédient custom (texte libre)
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: 'Nom requis' }, { status: 400 });

  const normalized = name.trim().toLowerCase();

  // Cherche d'abord un existant (case-insensitive)
  const existing = await prisma.ingredient.findFirst({
    where: { name: { equals: normalized, mode: 'insensitive' } },
  });
  if (existing) return NextResponse.json(existing);

  // Crée sinon
  const ingredient = await prisma.ingredient.create({
    data: {
      name: normalized,
      emoji: '🥘',
      category: 'Autre',
    },
  });

  return NextResponse.json(ingredient);
}
