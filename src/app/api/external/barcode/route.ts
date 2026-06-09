import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { openfoodfacts_barcode, openfoodfacts_search } from '@/lib/food-apis';

/**
 * GET /api/external/barcode
 * Params:
 *   code = code-barres (EAN13, etc.)
 *   q    = recherche texte dans Open Food Facts
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const code = sp.get('code') || '';
  const query = sp.get('q') || '';

  try {
    if (code) {
      const product = await openfoodfacts_barcode(code);
      if (!product) return NextResponse.json({ error: 'Produit non trouvé' }, { status: 404 });
      return NextResponse.json(product);
    }

    if (query) {
      const products = await openfoodfacts_search(query);
      return NextResponse.json(products);
    }

    return NextResponse.json({ error: 'Paramètre "code" ou "q" requis' }, { status: 400 });
  } catch (err: any) {
    console.error('Barcode API error:', err);
    return NextResponse.json({ error: err?.message || 'Erreur' }, { status: 500 });
  }
}
