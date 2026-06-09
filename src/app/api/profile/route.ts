import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  await prisma.user.delete({ where: { id: user.id } });

  const response = NextResponse.json({ ok: true });
  response.cookies.delete('token');
  return response;
}
