import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret-change-me');

// Pages de l'app accessibles en mode invité (sans redirection vers /login)
const guestAppPaths = [
  '/dashboard', '/recipes', '/fridge', '/scan', '/photo-scan',
  '/shopping', '/home', '/rappels', '/collections', '/community',
  '/favorites', '/coach', '/profile', '/s/',
];

const publicPaths = ['/', '/login', '/register', '/api/auth/login', '/api/auth/register', '/api/analytics', '/privacy'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Chemins toujours publics (exact ou préfixe)
  if (
    publicPaths.some(p => pathname === p || pathname.startsWith(p)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/.well-known') // Digital Asset Links (vérification TWA Play Store)
  ) {
    return NextResponse.next();
  }

  const isGuestAppPage = guestAppPaths.some(p => pathname.startsWith(p));
  const token = request.cookies.get('token')?.value;

  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    // Pages app : invité autorisé à naviguer, le composant gère la modale
    if (isGuestAppPage) return NextResponse.next();
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    const { payload } = await jwtVerify(token, secret);

    if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
      if (payload.role !== 'ADMIN') {
        if (pathname.startsWith('/api/')) {
          return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
        }
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }

    return NextResponse.next();
  } catch {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }
    const response = isGuestAppPage ? NextResponse.next() : NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('token');
    return response;
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$).*)'],
};
