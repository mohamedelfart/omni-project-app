import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest): NextResponse {
  return NextResponse.json(
    {
      message: 'Landlord portal has been decommissioned. QuickRent now operates as an operator-based residential system.',
      code: 'PORTAL_DECOMMISSIONED',
    },
    { status: 410 },
  );
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
