import { NextRequest, NextResponse } from 'next/server';

const apiBaseUrl = process.env.QUICKRENT_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1';

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Missing Authorization bearer token' }, { status: 401 });
  }

  const requestBody = await request.json().catch(() => ({}));
  const response = await fetch(`${apiBaseUrl.replace(/\/$/, '')}/auth/switch-provider-context`, {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
    cache: 'no-store',
  });

  const payload = await response.json().catch(() => ({ error: 'Upstream auth response was not valid JSON' }));
  return NextResponse.json(payload, { status: response.status });
}
