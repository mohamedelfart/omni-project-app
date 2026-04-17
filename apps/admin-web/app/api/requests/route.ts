import { NextRequest, NextResponse } from 'next/server';

import { DEV_ACCESS_TOKEN_FALLBACK } from '../../lib/auth';

const apiBaseUrl = process.env.QUICKRENT_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1';
const isDev = process.env.NODE_ENV === 'development';

function normalizeToRequestArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === 'object' && 'data' in payload) {
    const inner = (payload as { data: unknown }).data;
    if (Array.isArray(inner)) return inner;
  }
  return [];
}

/** In development, always use the known-good JWT for upstream; production uses the incoming Bearer only. */
function upstreamAuthorization(request: NextRequest): string | null {
  if (isDev) {
    return `Bearer ${DEV_ACCESS_TOKEN_FALLBACK}`;
  }
  const authHeader = request.headers.get('authorization');
  return authHeader?.startsWith('Bearer ') ? authHeader : null;
}

export async function GET(request: NextRequest) {
  const authorization = upstreamAuthorization(request);
  if (!authorization) {
    return NextResponse.json({ error: 'Missing Authorization bearer token' }, { status: 401 });
  }

  const upstreamUrl = new URL(`${apiBaseUrl.replace(/\/$/, '')}/unified-requests/realtime`);
  request.nextUrl.searchParams.forEach((value, key) => {
    upstreamUrl.searchParams.set(key, value);
  });

  const response = await fetch(upstreamUrl.toString(), {
    headers: {
      Authorization: authorization,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  const payload = await response.json().catch(() => ({ error: 'Upstream command center response was not valid JSON' }));
  if (!response.ok) {
    if (isDev) {
      console.error('Admin requests proxy GET failed', {
        upstreamUrl: upstreamUrl.toString(),
        status: response.status,
        payload,
      });
    }
    return NextResponse.json(payload, { status: response.status });
  }
  const unwrapped = payload && typeof payload === 'object' && 'data' in payload ? (payload as { data: unknown }).data : payload;
  const array = normalizeToRequestArray(unwrapped);
  return NextResponse.json(array, { status: response.status });
}

export async function POST(request: NextRequest) {
  const authorization = upstreamAuthorization(request);
  if (!authorization) {
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
        Authorization: authorization,
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
