import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? 'the-gaffer-dev-secret-only');

async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as { role?: string };
  } catch { return null; }
}

const ADMIN_PATHS = ['/admin', '/api/admin'];
const USER_PATHS = [
  '/dashboard',
  '/predictions',
  '/metrics',
  '/leaderboard',
  '/api/dashboard',
  '/api/predictions',
  '/api/custom-metrics',
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isAdminPath = ADMIN_PATHS.some(p => pathname.startsWith(p));
  const isUserPath = USER_PATHS.some(p => pathname.startsWith(p));
  const isLoginPage = pathname === '/admin/login' || pathname === '/login';

  if ((!isAdminPath && !isUserPath) || isLoginPage) return NextResponse.next();

  const token = req.cookies.get('session')?.value;
  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL(isAdminPath ? '/admin/login' : '/login', req.url));
  }

  const payload = await verifyToken(token);
  if (!payload) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL(isAdminPath ? '/admin/login' : '/login', req.url));
  }

  if (isAdminPath && payload.role !== 'ADMIN') {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.redirect(new URL('/admin/login', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*',
    '/dashboard/:path*',
    '/predictions/:path*',
    '/metrics/:path*',
    '/leaderboard/:path*',
    '/api/dashboard/:path*',
    '/api/predictions/:path*',
    '/api/custom-metrics/:path*',
  ],
};
