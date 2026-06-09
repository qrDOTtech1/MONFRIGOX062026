import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { getApiStatus } from '@/lib/food-apis';

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  try {
    const status = await getApiStatus();
    return NextResponse.json(status);
  } catch (err: any) {
    console.error('API status error:', err);
    return NextResponse.json({
      themealdb:     { configured: true, label: 'TheMealDB', free: true },
      openfoodfacts: { configured: true, label: 'Open Food Facts', free: true },
      usda:          { configured: false, label: 'USDA FoodData', free: true },
      spoonacular:   { configured: false, label: 'Spoonacular', free: false },
    });
  }
}
