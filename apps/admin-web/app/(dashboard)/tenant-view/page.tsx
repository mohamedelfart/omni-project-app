'use client';

import { useEffect, useState } from 'react';
import {
  ensureAdminRequestsRealtimeSocket,
  setAdminRequestsRealtimeGetAccessToken,
  setAdminRequestsRealtimeHandlers,
} from '../../lib/admin-requests-socket';
import { apiFetch, getSocketAccessToken } from '../../lib/auth';
import { normalizeDashboardRequestStatus, type DashboardRequestStatus } from '../../lib/request-status-ui';

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1';
const socketBase = apiBase.replace(/\/api\/v1\/?$/, '');

type TenantRequestRow = {
  id: string;
  type: string;
  status: DashboardRequestStatus;
  createdAt: string;
  operationalJourney?: TenantJourneyStep[];
};

type TenantJourneyStep = {
  at?: string;
  label: string;
  advisory?: boolean;
};

type TimelineAction = {
  type: string;
  createdAt: string;
  payload: Record<string, unknown>;
};

const STATUS_LABEL: Record<DashboardRequestStatus, string> = {
  pending: 'Pending',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  completed: 'Completed',
  unknown: 'Unknown',
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
      const status = normalizeDashboardRequestStatus(row.status);
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

function parseOperationalJourney(raw: unknown): TenantJourneyStep[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const steps = raw
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .map((item) => {
      const label = typeof item.label === 'string' ? item.label.trim() : '';
      const at = typeof item.at === 'string' ? item.at : undefined;
      const advisory = item.advisory === true ? true : undefined;
      return { label, at, advisory };
    })
    .filter((step) => step.label.length > 0);
  return steps.length ? steps : undefined;
}

function parseTimelineActions(raw: unknown): TimelineAction[] {
  let list: unknown = raw;
  if (raw && typeof raw === 'object' && 'data' in raw) {
    list = (raw as { data: unknown }).data;
  }
  if (!Array.isArray(list)) return [];
  return list
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .map((item) => ({
      type: typeof item.type === 'string' ? item.type : '',
      createdAt: typeof item.createdAt === 'string' ? item.createdAt : '',
      payload:
        item.payload && typeof item.payload === 'object' && !Array.isArray(item.payload)
          ? (item.payload as Record<string, unknown>)
          : {},
    }))
    .filter((a) => a.type.length > 0);
}

function signalLabel(intent: string): string {
  const u = intent.trim().toUpperCase();
  if (u === 'ARRIVED_ON_SITE') return 'Provider arrived on site';
  if (u === 'RUNNING_LATE') return 'Provider is running a little late';
  if (u === 'TENANT_UNREACHABLE') return 'We could not reach you just now';
  if (u === 'BLOCKED_ACCESS') return 'Access to the location was delayed';
  if (u === 'REQUEST_SUPPORT') return 'Support is assisting your request';
  if (u === 'VIEWING_STARTED') return 'Viewing has started';
  if (u === 'VIEWING_COMPLETED') return 'Viewing is complete';
  return 'Provider shared an update';
}

function buildJourneyFromHistory(actions: TimelineAction[]): TenantJourneyStep[] | undefined {
  const steps: TenantJourneyStep[] = [];
  for (const action of actions) {
    if (action.type !== 'PROVIDER_OPERATIONAL_INTENT') continue;
    const intent = typeof action.payload.intent === 'string' ? action.payload.intent : '';
    if (!intent) continue;
    const step: TenantJourneyStep = {
      label: signalLabel(intent),
      advisory: true,
      ...(action.createdAt ? { at: action.createdAt } : {}),
    };
    steps.push(step);
  }
  return steps.length ? steps : undefined;
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
        const listRows = normalizeList(payload);
        const detailRows = await Promise.all(
          listRows.map(async (row) => {
            try {
              const detailResponse = await apiFetch(`${apiBase.replace(/\/$/, '')}/unified-requests/${encodeURIComponent(row.id)}`, {
                cache: 'no-store',
                signal,
              });
              const detailPayload = await detailResponse.json().catch(() => null);
              if (!detailResponse.ok || !detailPayload || typeof detailPayload !== 'object') {
                return row;
              }
              const body = detailPayload as Record<string, unknown>;
              const source =
                body.data && typeof body.data === 'object'
                  ? (body.data as Record<string, unknown>)
                  : body;
              const journey = parseOperationalJourney(source.operationalJourney);
              if (journey) {
                return { ...row, operationalJourney: journey };
              }
              const historyResponse = await apiFetch(
                `${apiBase.replace(/\/$/, '')}/unified-requests/${encodeURIComponent(row.id)}/history`,
                {
                  cache: 'no-store',
                  signal,
                },
              );
              const historyPayload = await historyResponse.json().catch(() => null);
              if (!historyResponse.ok) {
                return row;
              }
              const fallbackJourney = buildJourneyFromHistory(parseTimelineActions(historyPayload));
              return fallbackJourney ? { ...row, operationalJourney: fallbackJourney } : row;
            } catch {
              return row;
            }
          }),
        );
        if (!cancelled) {
          setRows(detailRows);
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
              {r.operationalJourney && r.operationalJourney.length > 0 ? (
                <div style={{ marginTop: 10, borderTop: '1px solid #E2E8F0', paddingTop: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    Journey updates
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 6 }}>
                    {r.operationalJourney.map((step, index) => (
                      <li key={`${r.id}-${index}`} style={{ color: '#334155', fontSize: 13, lineHeight: 1.35 }}>
                        <span>{step.label}</span>
                        {step.advisory ? (
                          <span style={{ color: '#0F766E', fontWeight: 600 }}> (advisory)</span>
                        ) : null}
                        {step.at ? (
                          <span style={{ color: '#64748B' }}> · {formatWhen(step.at)}</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
