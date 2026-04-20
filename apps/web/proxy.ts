import { NextResponse, NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  if (pathname === '/agent') {
    return NextResponse.redirect(new URL('/agents', request.url));
  }
  
  if (pathname.startsWith('/agent/')) {
    const id = pathname.split('/')[2];
    return NextResponse.redirect(new URL(`/agents/${id}`, request.url));
  }

  if (pathname === '/dashboard/marketplace') {
    return NextResponse.redirect(new URL('/agents', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/agent', '/agent/:path*', '/dashboard/marketplace'],
};
