import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { getImportStatus, setImportEnabled, importNextBatch } from '@/lib/marmiton-importer';

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  const status = await getImportStatus();
  return NextResponse.json(status);
}

/**
 * POST /api/admin/recipe-import
 * body: { action: 'toggle', enabled: boolean } — play/pause le job automatique
 * body: { action: 'run' } — déclenche un lot immédiatement (hors du cycle automatique)
 */
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

  const body = await req.json().catch(() => ({}));

  if (body.action === 'toggle') {
    await setImportEnabled(!!body.enabled);
    const status = await getImportStatus();
    return NextResponse.json(status);
  }

  if (body.action === 'run') {
    const result = await importNextBatch(body.batchSize || 10);
    return NextResponse.json(result);
  }

  return NextResponse.json({ error: 'Action invalide' }, { status: 400 });
}
