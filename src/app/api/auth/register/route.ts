import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { createToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Tous les champs sont requis' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Le mot de passe doit contenir au moins 6 caractères' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'Cet email est déjà utilisé' }, { status: 409 });
    }

    const isAdminEmail = process.env.ADMIN_EMAIL && email === process.env.ADMIN_EMAIL;

    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { name, email, password: hashed, role: isAdminEmail ? 'ADMIN' : 'USER' },
      select: { id: true, email: true, name: true, role: true },
    });

    // Badge exclusif « Pionnier » pour les 100 premiers inscrits
    try {
      const founders = await prisma.badge.count({ where: { code: 'founder' } });
      if (founders < 100) {
        await prisma.badge.create({ data: { userId: user.id, code: 'founder' } }).catch(() => {});
      }
    } catch { /* non bloquant pour l'inscription */ }

    const token = await createToken({ userId: user.id, email: user.email, role: user.role });

    const response = NextResponse.json({ user });
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,   // 30 jours (cohérent avec la durée du token)
      path: '/',
    });

    return response;
  } catch (err) {
    console.error('Register error:', err);
    const message = err instanceof Error ? err.message : 'Erreur interne du serveur';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
