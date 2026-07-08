import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { translateToFrench } from '@/lib/ollama';

// POST /api/admin/ingredients/suggest  { name }
// Demande à l'IA un nom d'ingrédient français propre, à la demande (pour les
// ingrédients que le dictionnaire ne couvre pas). Ne modifie rien.
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: 'name requis' }, { status: 400 });

  const fr = await translateToFrench(name.trim(), 'ingredient');
  // L'IA renvoie en minuscules ; on capitalise la première lettre pour l'affichage.
  const clean = fr.trim();
  const suggestion = clean ? clean.charAt(0).toUpperCase() + clean.slice(1) : name;

  return NextResponse.json({ suggestion });
}
