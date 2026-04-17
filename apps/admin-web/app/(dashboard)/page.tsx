'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { getAccessToken } from '../lib/auth';

type DashboardRequest = {
  id: string;
  tenantId: string;
  vendorId?: string;
  type: 'cleaning' | 'moving' | 'maintenance';
  status: 'pending' | 'assigned' | 'in_progress' | 'completed';
  createdAt: string;
  updatedAt: string;
  propertyIds?: string[];
  primaryPropertyId?: string;
  /** Present when upstream list payload includes `priority` (Prisma `RequestPriority`). */
  priority?: string;
};

const DASHBOARD_STATUSES: DashboardRequest['status'][] = ['pending', 'assigned', 'in_progress', 'completed'];
const DASHBOARD_PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT', 'CRITICAL'] as const;

/** Read model for `GET /api/v1/unified-requests/:id/history` (shared TicketAction shape). */
type TimelineAction = {
  type: string;
  createdBy: { type: string; id: string };
  createdAt: string;
  payload: Record<string, unknown>;
};

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1';
const socketBase = apiBase.replace(/\/api\/v1\/?$/, '');

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function normalizeRequestsResponseBody(raw: unknown): DashboardRequest[] {
  let list: unknown = raw;
  if (raw && typeof raw === 'object' && 'data' in raw) {
    list = (raw as { data: unknown }).data;
  }
  if (!Array.isArray(list)) return [];
  return list
    .filter((row): row is Record<string, unknown> => !!row && typeof row === 'object')
    .map((row) => ({
      ...(row as unknown as DashboardRequest),
      priority: typeof row.priority === 'string' ? row.priority : undefined,
    }));
}

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

function timelinePayloadSummary(action: TimelineAction): string | null {
  const { type, payload } = action;
  if (type === 'ASSIGN' || type === 'ASSIGN_VENDOR') {
    const vendorId = payload.vendorId;
    if (typeof vendorId === 'string' && vendorId.trim()) return `vendor ${vendorId}`;
    return null;
  }
  if (type === 'PRIORITY_CHANGE') {
    const from = typeof payload.from === 'string' ? payload.from : '';
    const to = typeof payload.to === 'string' ? payload.to : '';
    if (from && to) return `priority ${from} → ${to}`;
    if (to) return `priority → ${to}`;
    if (from) return `priority ${from} →`;
  }
  if (type === 'STATUS_UPDATE' || type === 'CHANGE_STATUS') {
    const from =
      (typeof payload.fromStatus === 'string' && payload.fromStatus)
      || (typeof payload.from === 'string' && payload.from)
      || null;
    const to =
      (typeof payload.toStatus === 'string' && payload.toStatus)
      || (typeof payload.to === 'string' && payload.to)
      || null;
    if (from && to) return `${from} → ${to}`;
    if (to) return `→ ${to}`;
    if (from) return `${from} →`;
  }
  if (type === 'ESCALATE') {
    const reason = payload.reason;
    if (typeof reason === 'string' && reason.trim()) {
      return reason.length > 96 ? `${reason.slice(0, 96)}…` : reason;
    }
  }
  return null;
}

function getLoadErrorMessage(payload: unknown): string {
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    if (typeof record.error === 'string') return record.error;
    if (typeof record.message === 'string') return record.message;
    if (record.message && typeof record.message === 'object' && record.message !== null && 'message' in record.message) {
      const nested = (record.message as { message?: unknown }).message;
      if (typeof nested === 'string') return nested;
    }
  }
  return 'Failed to load requests';
}

function extractRequestIdFromSocketPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const record = payload as { request?: unknown };
  const request = record.request;
  if (request && typeof request === 'object' && request !== null && 'id' in request) {
    const id = (request as { id: unknown }).id;
    if (typeof id === 'string' && id.length > 0) return id;
  }
  return null;
}

async function fetchTimelineHistory(requestId: string): Promise<TimelineAction[]> {
  const accessToken = getAccessToken();
  const response = await fetch(`${apiBase.replace(/\/$/, '')}/unified-requests/${encodeURIComponent(requestId)}/history`, {
    cache: 'no-store',
    headers: buildAuthHeaders(accessToken),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(getLoadErrorMessage(payload));
  }
  return normalizeHistoryEnvelope(payload);
}

export default function AdminOverviewPage() {
  const [requests, setRequests] = useState<DashboardRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vendorId, setVendorId] = useState('');
  const [timelineForId, setTimelineForId] = useState<string | null>(null);
  const [timelineActions, setTimelineActions] = useState<TimelineAction[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineError, setTimelineError] = useState<string | null>(null);
  const [escalateForId, setEscalateForId] = useState<string | null>(null);
  const [escalateReason, setEscalateReason] = useState('');
  const [escalateLevel, setEscalateLevel] = useState('');
  const [escalateTarget, setEscalateTarget] = useState('');
  const [escalateSubmitting, setEscalateSubmitting] = useState(false);
  const [escalateError, setEscalateError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [sortCreatedAt, setSortCreatedAt] = useState<'desc' | 'asc'>('desc');
  const timelineForIdRef = useRef<string | null>(null);
  timelineForIdRef.current = timelineForId;

  const displayedRequests = useMemo(() => {
    let list = requests;
    if (statusFilter) list = list.filter((r) => r.status === statusFilter);
    if (priorityFilter) list = list.filter((r) => r.priority === priorityFilter);
    const dir = sortCreatedAt === 'asc' ? 1 : -1;
    const t = (value: string) => {
      const ms = new Date(value).getTime();
      return Number.isFinite(ms) ? ms : 0;
    };
    return [...list].sort((a, b) => (t(a.createdAt) - t(b.createdAt)) * dir);
  }, [requests, statusFilter, priorityFilter, sortCreatedAt]);

  useEffect(() => {
    let cancelled = false;
    const accessToken = getAccessToken();
    let socket: ReturnType<typeof io> | null = null;

    const load = async () => {
      try {
        const requestHeaders = buildAuthHeaders(accessToken);
        const response = await fetch('/api/requests', {
          cache: 'no-store',
          headers: requestHeaders,
        });
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          if (process.env.NODE_ENV === 'development') {
            console.error('Dashboard load requests failed', { status: response.status, payload });
          }
          throw new Error(getLoadErrorMessage(payload));
        }

        if (!cancelled) {
          setRequests(normalizeRequestsResponseBody(payload));
          setError(null);
        }
      } catch (loadError) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Dashboard load requests error:', loadError);
        }
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load requests');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    if (!accessToken) {
      const socketError = 'Missing auth token for socket connection';
      if (process.env.NODE_ENV === 'development') {
        console.error(`[socket] ${socketError}`);
      }
      if (!cancelled) {
        setError(socketError);
      }
    } else {
      socket = io(`${socketBase}/requests`, {
        transports: ['websocket'],
        auth: { token: accessToken },
      });
      socket.on('request.created', () => void load());
      socket.on('request.assigned', () => void load());
      socket.on('request.updated', (payload: unknown) => {
        void load();
        const updatedId = extractRequestIdFromSocketPayload(payload);
        if (!updatedId || timelineForIdRef.current !== updatedId) return;
        void (async () => {
          try {
            const actions = await fetchTimelineHistory(updatedId);
            if (!cancelled && timelineForIdRef.current === updatedId) {
              setTimelineActions(actions);
              setTimelineError(null);
            }
          } catch (refreshError) {
            if (!cancelled && timelineForIdRef.current === updatedId) {
              setTimelineError(refreshError instanceof Error ? refreshError.message : 'Failed to refresh timeline');
            }
          }
        })();
      });
    }

    return () => {
      cancelled = true;
      socket?.disconnect();
    };
  }, []);

  const loadTimeline = async (requestId: string) => {
    setTimelineForId(requestId);
    setTimelineLoading(true);
    setTimelineError(null);
    setTimelineActions([]);
    try {
      setTimelineActions(await fetchTimelineHistory(requestId));
    } catch (e) {
      setTimelineError(e instanceof Error ? e.message : 'Failed to load timeline');
    } finally {
      setTimelineLoading(false);
    }
  };

  const openEscalateForm = (requestId: string) => {
    if (escalateForId === requestId) {
      setEscalateForId(null);
      setEscalateError(null);
      return;
    }
    setEscalateForId(requestId);
    setEscalateReason('');
    setEscalateLevel('');
    setEscalateTarget('');
    setEscalateError(null);
  };

  const submitEscalate = async (requestId: string) => {
    if (!escalateReason.trim()) {
      setEscalateError('Reason is required');
      return;
    }
    const accessToken = getAccessToken();
    setEscalateSubmitting(true);
    setEscalateError(null);
    const body: Record<string, unknown> = { reason: escalateReason.trim() };
    if (escalateLevel.trim()) body.level = escalateLevel.trim();
    if (escalateTarget.trim()) body.target = escalateTarget.trim();
    try {
      const response = await fetch(`${apiBase.replace(/\/$/, '')}/unified-requests/${encodeURIComponent(requestId)}/escalate`, {
        method: 'POST',
        cache: 'no-store',
        headers: buildAuthHeaders(accessToken),
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(getLoadErrorMessage(payload));
      }
      setEscalateForId(null);
      setEscalateReason('');
      setEscalateLevel('');
      setEscalateTarget('');
      if (timelineForId === requestId) {
        await loadTimeline(requestId);
      }
    } catch (e) {
      setEscalateError(e instanceof Error ? e.message : 'Escalation failed');
    } finally {
      setEscalateSubmitting(false);
    }
  };

  const assignVendor = async (requestId: string) => {
    const accessToken = getAccessToken();
    if (!vendorId.trim()) {
      setError('Provide vendor id to assign');
      return;
    }
    const response = await fetch('/api/requests', {
      method: 'POST',
      headers: buildAuthHeaders(accessToken),
      body: JSON.stringify({ requestId, vendorId: vendorId.trim() }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload?.error ?? 'Failed to assign vendor');
      return;
    }
    setRequests((current) => current.map((request) => (request.id === requestId ? payload : request)));
    setError(null);
  };

  return (
    <section style={{ display: 'grid', gap: 18 }}>
      <h1 style={{ margin: 0 }}>Dashboard Requests</h1>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={vendorId}
          onChange={(event) => setVendorId(event.target.value)}
          placeholder="Vendor ID"
          style={{ padding: 8, border: '1px solid #ddd', borderRadius: 6 }}
        />
        <span style={{ fontSize: 12, color: '#666', alignSelf: 'center' }}>Used for Assign action</span>
      </div>

      {error ? (
        <article style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: 12, color: '#991B1B' }}>
          {error}
        </article>
      ) : null}

      <article style={{ background: '#FFF', border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
        <h2 style={{ marginTop: 0 }}>All Requests</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 12 }}>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13 }}>
            <span style={{ color: '#64748B' }}>Status</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: '6px 8px', border: '1px solid #ddd', borderRadius: 6 }}
            >
              <option value="">All</option>
              {DASHBOARD_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13 }}>
            <span style={{ color: '#64748B' }}>Priority</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              style={{ padding: '6px 8px', border: '1px solid #ddd', borderRadius: 6 }}
            >
              <option value="">All</option>
              {DASHBOARD_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13 }}>
            <span style={{ color: '#64748B' }}>Sort by created</span>
            <select
              value={sortCreatedAt}
              onChange={(e) => setSortCreatedAt(e.target.value === 'asc' ? 'asc' : 'desc')}
              style={{ padding: '6px 8px', border: '1px solid #ddd', borderRadius: 6 }}
            >
              <option value="desc">Newest first</option>
              <option value="asc">Oldest first</option>
            </select>
          </label>
        </div>
        <div style={{ display: 'grid', gap: 12 }}>
          {!loading && requests.length === 0 ? (
            <div style={{ border: '1px dashed #CBD5E1', borderRadius: 8, padding: 12, color: '#64748B' }}>
              No requests
            </div>
          ) : null}
          {!loading && requests.length > 0 && displayedRequests.length === 0 ? (
            <div style={{ border: '1px dashed #CBD5E1', borderRadius: 8, padding: 12, color: '#64748B' }}>
              No requests match the current filters
            </div>
          ) : null}
          {displayedRequests.map((request) => (
            <div key={request.id} style={{ border: '1px solid #E5EDF5', borderRadius: 8, padding: 12, display: 'grid', gap: 8 }}>
              <div>
                <strong>{request.id}</strong> - {request.type} - {request.status}
              </div>
              <div style={{ color: '#64748B', fontSize: 14 }}>
                tenant: {request.tenantId} | vendor: {request.vendorId ?? 'unassigned'}
              </div>
              <div style={{ color: '#64748B', fontSize: 14 }}>
                <span>{formatDate(request.createdAt)}</span>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <button type="button" onClick={() => void loadTimeline(request.id)} style={{ padding: '6px 10px' }}>
                  Timeline
                </button>
                <button type="button" onClick={() => openEscalateForm(request.id)} style={{ padding: '6px 10px' }}>
                  {escalateForId === request.id ? 'Cancel escalate' : 'Escalate'}
                </button>
                {request.status === 'pending' ? (
                  <button type="button" onClick={() => void assignVendor(request.id)} style={{ width: 140, padding: 8 }}>
                    Assign Vendor
                  </button>
                ) : null}
              </div>
              {escalateForId === request.id ? (
                <div style={{ display: 'grid', gap: 6, borderTop: '1px solid #E5EDF5', paddingTop: 8 }}>
                  <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
                    <span>Reason (required)</span>
                    <input
                      value={escalateReason}
                      onChange={(e) => setEscalateReason(e.target.value)}
                      placeholder="Why escalate?"
                      style={{ padding: 6, border: '1px solid #ddd', borderRadius: 4 }}
                    />
                  </label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <label style={{ display: 'grid', gap: 4, fontSize: 12, flex: '1 1 120px' }}>
                      Level (optional)
                      <input
                        value={escalateLevel}
                        onChange={(e) => setEscalateLevel(e.target.value)}
                        style={{ padding: 6, border: '1px solid #ddd', borderRadius: 4 }}
                      />
                    </label>
                    <label style={{ display: 'grid', gap: 4, fontSize: 12, flex: '1 1 120px' }}>
                      Target (optional)
                      <input
                        value={escalateTarget}
                        onChange={(e) => setEscalateTarget(e.target.value)}
                        style={{ padding: 6, border: '1px solid #ddd', borderRadius: 4 }}
                      />
                    </label>
                  </div>
                  {escalateError ? <span style={{ color: '#991B1B', fontSize: 13 }}>{escalateError}</span> : null}
                  <button
                    type="button"
                    disabled={escalateSubmitting}
                    onClick={() => void submitEscalate(request.id)}
                    style={{ padding: '6px 12px', width: 'fit-content' }}
                  >
                    {escalateSubmitting ? 'Submitting…' : 'Submit escalation'}
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </article>

      {timelineForId ? (
        <article style={{ background: '#FFF', border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <h2 style={{ margin: 0 }}>Timeline — {timelineForId}</h2>
            <button type="button" onClick={() => { setTimelineForId(null); setTimelineActions([]); setTimelineError(null); }} style={{ padding: '6px 10px' }}>
              Close
            </button>
          </div>
          {timelineLoading ? <p style={{ color: '#64748B', marginTop: 8 }}>Loading…</p> : null}
          {timelineError ? (
            <p style={{ color: '#991B1B', marginTop: 8 }}>{timelineError}</p>
          ) : null}
          {!timelineLoading && !timelineError ? (
            <ul style={{ margin: '8px 0 0', paddingLeft: 18, color: '#334155', fontSize: 14 }}>
              {timelineActions.length === 0 ? (
                <li style={{ listStyle: 'none', marginLeft: -18, color: '#64748B' }}>No actions</li>
              ) : (
                timelineActions.map((action, index) => {
                  const summary = timelinePayloadSummary(action);
                  return (
                    <li key={`${action.type}-${action.createdAt}-${index}`} style={{ marginBottom: 8 }}>
                      <div>
                        <strong>{action.type}</strong> · by {action.createdBy.type} · {action.createdAt ? formatDate(action.createdAt) : ''}
                      </div>
                      {summary ? (
                        <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{summary}</div>
                      ) : null}
                    </li>
                  );
                })
              )}
            </ul>
          ) : null}
        </article>
      ) : null}
    </section>
  );
}

function buildAuthHeaders(token: string | null) {
  if (!token && process.env.NODE_ENV === 'development') {
    console.warn('[auth] Missing access token; sending request without Authorization header.');
  }
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}
