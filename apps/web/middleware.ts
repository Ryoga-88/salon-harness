import { NextResponse, type NextRequest } from 'next/server';

const PROTECTED_PREFIXES = [
  '/admin',
  '/analytics',
  '/campaigns',
  '/coupons',
  '/customers',
  '/menus',
  '/messages',
  '/reservations',
  '/settings',
  '/stylists'
];

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  if (!isProtected) return NextResponse.next();

  const hasSession = Boolean(request.cookies.get('salon_session')?.value || request.cookies.get('salon_api_key')?.value);
  if (hasSession) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = '/login';
  url.searchParams.set('next', pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/analytics/:path*',
    '/campaigns/:path*',
    '/coupons/:path*',
    '/customers/:path*',
    '/menus/:path*',
    '/messages/:path*',
    '/reservations/:path*',
    '/settings/:path*',
    '/stylists/:path*'
  ]
};
