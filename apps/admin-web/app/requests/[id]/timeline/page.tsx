'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiFetch } from '../../../lib/auth';

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1';

type TimelineAction = {
  type: string;
  createdBy: { type: string; id: string };
  createdAt: string;
  payload: Record<string, unknown>;
};

function asPayloadRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function normalizeHistoryEnvelope(raw: unknown): TimelineAction[] {
  let list: unknown = raw;
  if (raw && typeof raw === 'object' && 'data' in raw) {
    list = (raw as { data: unknown }).data;
  }
  if (!Array.isArray(list)) return [];
  return list
    .filter((row): row is Record<string, unknown> => !!row && typeof row === 'object')
    .map((row) => ({
      type: typeof row.type === 'string' ? row.type : '',
      createdBy:
        row.createdBy && typeof row.createdBy === 'object' && row.createdBy !== null
          ? {
              type: typeof (row.createdBy as { type?: unknown }).type === 'string' ? (row.createdBy as { type: string }).type : '',
              id: typeof (row.createdBy as { id?: unknown }).id === 'string' ? (row.createdBy as { id: string }).id : '',
            }
          : { type: '', id: '' },
      createdAt: typeof row.createdAt === 'string' ? row.createdAt : '',
      payload: asPayloadRecord(row.payload),
    }));
}

function getLoadErrorMessage(payload: unknown): string {
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    if (typeof record.error === 'string') return record.error;
    if (typeof record.message === 'string') return record.message;
  }
  return 'Failed to load timeline';
}

async function fetchTimelineHistory(requestId: string): Promise<TimelineAction[]> {
  const response = await apiFetch(`${apiBase.replace(/\/$/, '')}/unified-requests/${encodeURIComponent(requestId)}/history`, {
    cache: 'no-store',
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(getLoadErrorMessage(payload));
  }
  return normalizeHistoryEnvelope(payload);
}

export default function RequestTimelinePage() {
  const params = useParams();
  const requestId = typeof params?.id === 'string' ? params.id : '';
  const [actions, setActions] = useState<TimelineAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!requestId) {
      setLoading(false);
      setError('Missing request id');
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchTimelineHistory(requestId)
      .then((rows) => {
        if (!cancelled) {
          setActions(rows);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load timeline');
          setActions([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [requestId]);

  return (
    <main style={{ maxWidth: 720, margin: '24px auto', padding: '0 16px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ marginBottom: 16 }}>
        <Link href="/" style={{ color: '#2563EB', fontSize: 14 }}>
          ← Command Center
        </Link>
      </div>
      <h1 style={{ margin: '0 0 8px', fontSize: 22 }}>Request timeline</h1>
      <p style={{ margin: '0 0 20px', color: '#475569', fontSize: 15 }}>
        Timeline for request <strong style={{ fontFamily: 'monospace' }}>{requestId || '—'}</strong>
      </p>
      {loading ? <p style={{ color: '#64748B' }}>Loading…</p> : null}
      {error ? <p style={{ color: '#991B1B' }}>{error}</p> : null}
      {!loading && !error && actions.length === 0 ? (
        <p style={{ color: '#64748B' }}>No timeline events yet.</p>
      ) : null}
      {!loading && !error && actions.length > 0 ? (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 10 }}>
          {actions.map((a, i) => (
            <li
              key={`${a.type}-${a.createdAt}-${i}`}
              style={{
                border: '1px solid #E2E8F0',
                borderRadius: 8,
                padding: '10px 12px',
                background: '#F8FAFC',
                fontSize: 13,
              }}
            >
              <div style={{ fontWeight: 700, color: '#0F172A' }}>{a.type || '—'}</div>
              <div style={{ color: '#64748B', fontSize: 12, marginTop: 4 }}>
                {a.createdAt ? new Date(a.createdAt).toLocaleString() : '—'}
                {a.createdBy?.type || a.createdBy?.id
                  ? ` · ${a.createdBy.type || '?'}:${a.createdBy.id || '?'}`
                  : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </main>
  );
}
