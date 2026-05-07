import { NextRequest, NextResponse } from 'next/server';

const apiBaseUrl = process.env.QUICKRENT_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1';

export async function POST(request: NextRequest, context: { params: Promise<{ ticketId: string }> }) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Missing Authorization bearer token' }, { status: 401 });
  }

  const requestBody = await request.json();
  const { ticketId } = await context.params;
  const response = await fetch(`${apiBaseUrl.replace(/\/$/, '')}/vendor/tickets/${ticketId}/operational-intents`, {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
    cache: 'no-store',
  });

  const payload = await response.json().catch(() => ({ error: 'Upstream provider response was not valid JSON' }));
  const responseBody = payload && typeof payload === 'object' && 'data' in payload ? payload.data : payload;
  return NextResponse.json(responseBody, { status: response.status });
}
