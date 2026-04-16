import { NextRequest, NextResponse } from 'next/server';

const apiBaseUrl = process.env.QUICKRENT_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Missing Authorization bearer token' }, { status: 401 });
  }

  const upstreamUrl = new URL(`${apiBaseUrl.replace(/\/$/, '')}/unified-requests/realtime`);
  request.nextUrl.searchParams.forEach((value, key) => {
    upstreamUrl.searchParams.set(key, value);
  });

  const response = await fetch(upstreamUrl.toString(), {
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  const payload = await response.json().catch(() => ({ error: 'Upstream command center response was not valid JSON' }));
  const body = payload && typeof payload === 'object' && 'data' in payload ? payload.data : payload;
  return NextResponse.json(body, { status: response.status });
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Missing Authorization bearer token' }, { status: 401 });
  }

  const body = await request.json();
  const requestId = typeof body?.requestId === 'string' ? body.requestId : '';
  const vendorId = typeof body?.vendorId === 'string' ? body.vendorId : '';
  if (!requestId || !vendorId) {
    return NextResponse.json({ error: 'requestId and vendorId are required' }, { status: 400 });
  }

  const response = await fetch(
    `${apiBaseUrl.replace(/\/$/, '')}/unified-requests/realtime/${requestId}/assign`,
    {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ vendorId }),
      cache: 'no-store',
    },
  );

  const payload = await response.json().catch(() => ({ error: 'Upstream command center response was not valid JSON' }));
  const responseBody = payload && typeof payload === 'object' && 'data' in payload ? payload.data : payload;
  return NextResponse.json(responseBody, { status: response.status });
}