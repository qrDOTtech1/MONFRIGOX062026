import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { chatCompletion } from '@/lib/ollama';
import { simplifyIngredientName } from '@/lib/recipe-audit';

// POST /api/admin/ingredients/suggest  { name }
// Propose un nom d'ingrédient français propre (générique, sans marque ni poids).
// 1) nettoyage LOCAL déterministe, 2) affinage IA si dispo. Ne renvoie JAMAIS
// d'erreur brute : en dernier recours, renvoie le nettoyage local.
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: 'name requis' }, { status: 400 });

  const local = simplifyIngredientName(name.trim());

  // Un nom d'ingrédient valide : court, sans chiffre/marque, quelques mots max.
  const isValid = (s: string) =>
    !!s && s.length <= 30 && !/\d/.test(s) && s.split(/\s+/).length <= 5 && !/[®™©<>{}]/.test(s);

  try {
    const res = await chatCompletion([
      {
        role: 'system',
        content: `Tu nettoies un nom d'ingrédient de cuisine issu d'un scan de code-barres.
Donne le nom GÉNÉRIQUE le plus simple en français, SANS marque, SANS quantité, SANS poids, SANS conditionnement.
Exemples :
- "Boîte de lait concentré sucré nestlé 397 g" → "Lait concentré sucré"
- "coconut milk" → "Lait de coco"
- "Bâtonnets de surimi le moelleux fleury michon" → "Surimi"
Réponds UNIQUEMENT par le nom (1 à 4 mots), rien d'autre.`,
      },
      { role: 'user', content: name.trim() },
    ], { temperature: 0.1 });

    const aiRaw = (res.message?.content || '').trim().replace(/^["'«»\s]+|["'«».\s]+$/g, '');
    if (isValid(aiRaw)) {
      const suggestion = aiRaw.charAt(0).toUpperCase() + aiRaw.slice(1);
      return NextResponse.json({ suggestion, source: 'ia' });
    }
  } catch (e) {
    console.error('[ingredients/suggest] IA indisponible:', e);
  }

  // Repli : nettoyage local (toujours renvoyé, jamais d'erreur).
  return NextResponse.json({ suggestion: local, source: 'local' });
}
