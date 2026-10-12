import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requestHeaders = new Headers(request.headers);
  if (pathname.startsWith('/admin')) requestHeaders.set('x-admin', '1');
  const next = () => NextResponse.next({ request: { headers: requestHeaders } });
  const protectedPage = pathname.startsWith('/admin') && pathname !== '/admin/login';
  const protectedApi = pathname.startsWith('/api/admin');
  if (!protectedPage && !protectedApi) return next();
  if (request.cookies.get('fluffys_admin')?.value) return next();
  if (protectedApi) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const url = request.nextUrl.clone();
  url.pathname = '/admin/login';
  url.searchParams.set('next', pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*', '/((?!_next|.*\\..*).*)'],
};
