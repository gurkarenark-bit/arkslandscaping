import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith('/portal')) return NextResponse.next();

  const publicPortalPaths = ['/portal/auth', '/portal/magic-link/consume'];
  if (publicPortalPaths.some((path) => pathname.startsWith(path))) return NextResponse.next();

  const raw = request.cookies.get('portal_session')?.value;
  if (!raw) {
    const redirectUrl = new URL('/portal/auth', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/portal/:path*']
};
