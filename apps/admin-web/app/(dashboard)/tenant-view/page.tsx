'use client';

import { useEffect, useState } from 'react';
import {
  ensureAdminRequestsRealtimeSocket,
  setAdminRequestsRealtimeGetAccessToken,
  setAdminRequestsRealtimeHandlers,
} from '../../lib/admin-requests-socket';
import { apiFetch, getAuthSession, getSocketAccessToken } from '../../lib/auth';

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1';
const socketBase = apiBase.replace(/\/api\/v1\/?$/, '');

type TenantRequestRow = {
  id: string;
  type: string;
  status: 'pending' | 'assigned' | 'in_progress' | 'completed';
  createdAt: string;
};

const STATUS_LABEL: Record<TenantRequestRow['status'], string> = {
  pending: 'Pending',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  completed: 'Completed',
};

function normalizeList(raw: unknown): TenantRequestRow[] {
  let list: unknown = raw;
  if (raw && typeof raw === 'object' && 'data' in raw) {
    list = (raw as { data: unknown }).data;
  }
  if (!Array.isArray(list)) return [];
  return list
    .filter((row): row is Record<string, unknown> => !!row && typeof row === 'object')
    .map((row) => {
      const statusRaw = row.status;
      const status: TenantRequestRow['status'] =
        statusRaw === 'pending'
        || statusRaw === 'assigned'
        || statusRaw === 'in_progress'
        || statusRaw === 'completed'
          ? statusRaw
          : 'pending';
      return {
        id: typeof row.id === 'string' ? row.id : '',
        type: typeof row.type === 'string' ? row.type : '',
        status,
        createdAt: typeof row.createdAt === 'string' ? row.createdAt : '',
      };
    })
    .filter((r) => r.id.length > 0);
}

function formatWhen(iso: string) {
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? d.toLocaleString() : iso || '—';
}

export default function TenantViewPage() {
  const [rows, setRows] = useState<TenantRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let loadAbortController: AbortController | null = null;

    const loadRequests = async (opts?: { isInitial?: boolean }) => {
      const isInitial = opts?.isInitial ?? false;
      if (isInitial) {
        setLoading(true);
        setError(null);
      }
      loadAbortController?.abort();
      loadAbortController = new AbortController();
      const { signal } = loadAbortController;
      try {
        const response = await apiFetch('/api/requests', {
          cache: 'no-store',
          signal,
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          const msg =
            payload && typeof payload === 'object' && 'message' in payload && typeof (payload as { message: unknown }).message === 'string'
              ? (payload as { message: string }).message
              : 'Could not load requests';
          throw new Error(msg);
        }
        if (!cancelled) {
          setRows(normalizeList(payload));
          setError(null);
        }
      } catch (e) {
        if (cancelled || (e instanceof DOMException && e.name === 'AbortError')) return;
        if (!cancelled && isInitial) {
          setError(e instanceof Error ? e.message : 'Could not load requests');
        }
      } finally {
        if (!cancelled && isInitial) setLoading(false);
      }
    };

    void loadRequests({ isInitial: true });

    if (getSocketAccessToken()) {
      setAdminRequestsRealtimeHandlers({
        onRequestCreated: () => {
          if (cancelled) return false;
          setTimeout(() => {
            void loadRequests();
          }, 0);
          return true;
        },
        onRequestAssigned: () => {
          if (cancelled) return;
          void loadRequests();
        },
        onRequestUpdated: () => {
          if (cancelled) return;
          void loadRequests();
        },
      });
      setAdminRequestsRealtimeGetAccessToken(() => getSocketAccessToken());
      ensureAdminRequestsRealtimeSocket(socketBase);
    }

    return () => {
      cancelled = true;
      loadAbortController?.abort();
    };
  }, []);

  return (
    <section style={{ maxWidth: 560 }}>
      <h1 style={{ margin: '0 0 8px', fontSize: 22 }}>My requests</h1>
      <p style={{ margin: '0 0 16px', fontSize: 14, color: '#64748B' }}>
        Preview of the tenant list (same data as the admin feed for now).
      </p>
      {error ? (
        <p style={{ color: '#991B1B', fontSize: 14 }}>{error}</p>
      ) : null}
      {loading ? <p style={{ color: '#64748B', fontSize: 14 }}>Loading…</p> : null}
      {!loading && !error && rows.length === 0 ? (
        <p style={{ color: '#64748B', fontSize: 14 }}>No requests yet.</p>
      ) : null}
      {!loading && rows.length > 0 ? (
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 10 }}>
          {rows.map((r) => (
            <li
              key={r.id}
              style={{
                border: '1px solid #E2E8F0',
                borderRadius: 8,
                padding: '12px 14px',
                background: '#fff',
                fontSize: 14,
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{r.type}</div>
              <div style={{ color: '#334155' }}>
                <strong>Status:</strong> {STATUS_LABEL[r.status] ?? r.status}
              </div>
              <div style={{ color: '#64748B', fontSize: 13, marginTop: 4 }}>
                <strong>Created:</strong> {formatWhen(r.createdAt)}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
