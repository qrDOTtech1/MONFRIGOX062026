import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { analyzeImage } from '@/lib/ollama';

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { image } = await req.json();
  if (!image) return NextResponse.json({ error: 'Image manquante' }, { status: 400 });

  const base64 = image.replace(/^data:image\/\w+;base64,/, '');

  try {
    const response = await analyzeImage(base64, `Analyse cette photo et identifie TOUS les ingrédients alimentaires visibles.
Réponds UNIQUEMENT en JSON valide avec ce format exact :
{"ingredients": ["tomate", "oignon", "poulet", "riz"]}

Règles :
- Nomme chaque ingrédient en français, en minuscules
- Sois précis : "poivron rouge" plutôt que "légume"
- Inclus TOUT ce que tu vois : fruits, légumes, viandes, fromages, condiments, etc.
- Si tu vois un plat préparé, liste ses ingrédients probables
- Ne mets PAS d'emballages, ustensiles ou objets non alimentaires`);

    const text = response.message?.content?.trim() || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ ingredients: [], raw: text });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return NextResponse.json({
      ingredients: Array.isArray(parsed.ingredients) ? parsed.ingredients : [],
    });
  } catch {
    return NextResponse.json({ error: 'Erreur IA — vérifie la config Ollama dans /admin' }, { status: 500 });
  }
}
