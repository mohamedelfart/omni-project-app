import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const apiBaseUrl = process.env.QUICKRENT_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1';

export async function middleware(request: NextRequest): Promise<NextResponse> {
  // Temporary local-dev bypass: allow admin app routes and API proxies without bearer auth.
  void request;
  void apiBaseUrl;
  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
