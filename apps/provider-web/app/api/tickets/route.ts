import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const apiBaseUrl = process.env.QUICKRENT_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Missing Authorization bearer token' }, { status: 401 });
  }

  const response = await fetch(`${apiBaseUrl.replace(/\/$/, '')}/vendor/tickets/me`, {
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  const payload = await response.json().catch(() => ({ error: 'Upstream vendor response was not valid JSON' }));
  const body = payload && typeof payload === 'object' && 'data' in payload ? payload.data : payload;
  return NextResponse.json(body, { status: response.status });
}