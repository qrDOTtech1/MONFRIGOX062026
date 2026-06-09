import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { getApiStatus } from '@/lib/food-apis';

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  const status = await getApiStatus();
  return NextResponse.json(status);
}
