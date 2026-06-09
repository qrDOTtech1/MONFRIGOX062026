import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * POST /api/admin/database
 * Body: { action: "push" | "status" }
 *
 * "push"   → exécute prisma db push (applique le schema sans migration)
 * "status" → vérifie la connexion DB et retourne les infos
 */
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

  const { action } = await req.json();

  try {
    if (action === 'push') {
      const { stdout, stderr } = await execAsync('npx prisma db push --accept-data-loss 2>&1', {
        timeout: 60000,
        env: { ...process.env },
      });
      return NextResponse.json({
        ok: true,
        output: stdout + (stderr || ''),
        message: 'Schema synchronisé avec la base de données',
      });
    }

    if (action === 'status') {
      // Test connexion via prisma
      const { prisma } = await import('@/lib/db');
      const userCount = await prisma.user.count();
      const recipeCount = await prisma.recipe.count();
      const ingredientCount = await prisma.ingredient.count();

      // Lire le schema pour voir les modèles
      const { stdout: schemaInfo } = await execAsync('npx prisma format --schema=prisma/schema.prisma 2>&1 || true', {
        timeout: 15000,
        env: { ...process.env },
      });

      return NextResponse.json({
        ok: true,
        connected: true,
        counts: { users: userCount, recipes: recipeCount, ingredients: ingredientCount },
        dbUrl: process.env.DATABASE_URL?.replace(/\/\/.*@/, '//***@') || 'non défini',
      });
    }

    if (action === 'seed') {
      const { stdout, stderr } = await execAsync('npx tsx prisma/seed.ts 2>&1', {
        timeout: 120000,
        env: { ...process.env },
      });
      return NextResponse.json({
        ok: true,
        output: stdout + (stderr || ''),
        message: 'Seed exécuté avec succès',
      });
    }

    return NextResponse.json({ error: 'Action inconnue' }, { status: 400 });
  } catch (err: any) {
    console.error('Database action error:', err);
    return NextResponse.json({
      ok: false,
      error: err?.message || 'Erreur',
      output: err?.stdout || err?.stderr || '',
    }, { status: 500 });
  }
}
