'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  ensureAdminRequestsRealtimeSocket,
  setAdminRequestsRealtimeGetAccessToken,
  setAdminRequestsRealtimeHandlers,
} from '../lib/admin-requests-socket';
import { apiFetch, getAuthSession, getSocketAccessToken } from '../lib/auth';
import { extractSocketRequestId } from '../lib/extract-socket-request-id';

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

/** Default operator view: all statuses except `completed` (sentinel; not a real request status). */
const STATUS_FILTER_NON_COMPLETED = '__non_completed__';

/** Primary row CTA (pending → Assign, assigned → Start, in_progress → Complete); logic unchanged. */
const DASHBOARD_PRIMARY_ACTION_BTN: Record<string, string | number> = {
  fontWeight: 700,
  background: '#2563EB',
  color: '#FFFFFF',
  border: '1px solid #1D4ED8',
  borderRadius: 6,
};

const SLA_QUICK_ESCALATE_REASON = 'Auto escalation due to SLA breach';
const SIMPLE_VENDOR_OPTIONS = [
  { id: 'vendor-001', name: 'Vendor One' },
  { id: 'vendor-002', name: 'Vendor Two' },
  { id: 'vendor-003', name: 'Vendor Three' },
] as const;

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

/** Open requests older than this (hours since `createdAt`) are flagged as aging. */
const SLA_AGING_HOURS = 24;
/** Open requests older than this are flagged as overdue / high stale risk. */
const SLA_OVERDUE_HOURS = 48;

function hoursSinceCreated(createdAt: string): number {
  const ms = new Date(createdAt).getTime();
  const start = Number.isFinite(ms) ? ms : Date.now();
  return (Date.now() - start) / (1000 * 60 * 60);
}

function isOpenForSla(status: DashboardRequest['status']): boolean {
  return status !== 'completed';
}

type AgingTier = 'none' | 'aging' | 'overdue';

function getAgingTier(createdAt: string, status: DashboardRequest['status']): AgingTier {
  if (!isOpenForSla(status)) return 'none';
  const h = hoursSinceCreated(createdAt);
  if (h >= SLA_OVERDUE_HOURS) return 'overdue';
  if (h >= SLA_AGING_HOURS) return 'aging';
  return 'none';
}

type PrioritySlaTier = 'none' | 'elevated' | 'critical';

function getPrioritySlaTier(priority: string | undefined): PrioritySlaTier {
  if (priority === 'URGENT' || priority === 'CRITICAL') return 'critical';
  if (priority === 'HIGH') return 'elevated';
  return 'none';
}

/** Lower rank sorts first: overdue → aging → critical → high → rest (uses only createdAt, status, priority). */
function getDashboardSlaSortBucket(request: DashboardRequest): number {
  const aging = getAgingTier(request.createdAt, request.status);
  if (aging === 'overdue') return 0;
  if (aging === 'aging') return 1;
  const priorityTier = getPrioritySlaTier(request.priority);
  if (priorityTier === 'critical') return 2;
  if (priorityTier === 'elevated') return 3;
  return 4;
}

function requestSlaAccentColor(aging: AgingTier, priorityTier: PrioritySlaTier): string | null {
  if (aging === 'overdue') return '#DC2626';
  if (aging === 'aging') return '#EA580C';
  if (priorityTier === 'critical') return '#BE123C';
  if (priorityTier === 'elevated') return '#CA8A04';
  return null;
}

type RequestSectionGroup = 'attention' | 'in_progress' | 'completed';

/** Uses `status`, `priority`, and SLA helpers on `createdAt` (same rules as row badges). */
function getRequestSectionGroup(request: DashboardRequest): RequestSectionGroup {
  if (request.status === 'completed') return 'completed';
  const aging = getAgingTier(request.createdAt, request.status);
  if (aging === 'overdue' || getPrioritySlaTier(request.priority) === 'critical') return 'attention';
  return 'in_progress';
}

function normalizeUiStatus(value: unknown): 'pending' | 'assigned' | 'in_progress' | 'completed' {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';

  if (normalized === 'submitted' || normalized === 'under_review') return 'pending';
  if (normalized === 'assigned') return 'assigned';
  if (normalized === 'in_progress') return 'in_progress';
  if (normalized === 'completed') return 'completed';

  return 'pending';
}

function normalizeRequestsResponseBody(raw: unknown): DashboardRequest[] {
  let list: unknown = raw;
  if (raw && typeof raw === 'object' && 'data' in raw) {
    list = (raw as { data: unknown }).data;
  }
  if (!Array.isArray(list)) return [];
  return list
    .filter((row): row is Record<string, unknown> => !!row && typeof row === 'object')
    .map((row) => {
      const rec = row as Record<string, unknown>;
      const rawId = rec.id;
      const id =
        typeof rawId === 'string'
          ? rawId.trim()
          : typeof rawId === 'number' && Number.isFinite(rawId)
            ? String(rawId)
            : '';
      return {
        ...(row as unknown as DashboardRequest),
        id,
        status: normalizeUiStatus(rec.status) as DashboardRequest['status'],
        priority: typeof row.priority === 'string' ? row.priority : undefined,
      };
    })
    .filter((row) => row.id.length > 0);
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

let sharedChimeAudioContext: AudioContext | null = null;

function getChimeAudioContext(): AudioContext | null {
  const ACtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!ACtx) return null;
  if (!sharedChimeAudioContext || sharedChimeAudioContext.state === 'closed') {
    sharedChimeAudioContext = new ACtx();
  }
  return sharedChimeAudioContext;
}

/** Prime AudioContext after a user gesture (autoplay policy); safe to call repeatedly. */
function unlockChimeAudioContext(): void {
  try {
    const ctx = getChimeAudioContext();
    if (ctx && ctx.state === 'suspended') {
      void ctx.resume();
    }
  } catch {
    /* ignore */
  }
}

/** Very short, low-volume tone — only for `request.created` (new rows), not status churn. */
function playNewRequestChime() {
  void (async () => {
    try {
      unlockChimeAudioContext();
      const ctx = getChimeAudioContext();
      console.log('[admin-arrival] playNewRequestChime invoked', {
        audioContextState: ctx?.state ?? 'no-context',
      });
      if (!ctx) {
        console.log('[admin-arrival] playNewRequestChime skip', { reason: 'no-context' });
        return;
      }
      if (ctx.state === 'suspended') {
        await ctx.resume().catch(() => {});
      }
      console.log('[admin-arrival] playNewRequestChime after resume attempt', {
        audioContextState: ctx.state,
      });
      if (ctx.state !== 'running') {
        console.log('[admin-arrival] playNewRequestChime skip', {
          reason: 'context-not-running',
          audioContextState: ctx.state,
        });
        return;
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(784, ctx.currentTime);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.035, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      console.log('[admin-arrival] playNewRequestChime playing', { audioContextState: 'running' });
      osc.start();
      osc.stop(ctx.currentTime + 0.13);
    } catch {
      /* ignore — autoplay / AudioContext policy */
    }
  })();
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

export default function AdminOverviewPage() {
  const [requests, setRequests] = useState<DashboardRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assignForId, setAssignForId] = useState<string | null>(null);
  const [assignVendorSelection, setAssignVendorSelection] = useState<string>(SIMPLE_VENDOR_OPTIONS[0]?.id ?? '');
  const [assignSubmittingRequestId, setAssignSubmittingRequestId] = useState<string | null>(null);
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
  const [statusFilter, setStatusFilter] = useState<string>(STATUS_FILTER_NON_COMPLETED);
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [sortCreatedAt, setSortCreatedAt] = useState<'desc' | 'asc'>('desc');
  const [statusActionRequestId, setStatusActionRequestId] = useState<string | null>(null);
  const [selectedRequestIds, setSelectedRequestIds] = useState<string[]>([]);
  const [bulkEscalating, setBulkEscalating] = useState(false);
  const [bulkFeedback, setBulkFeedback] = useState<{ text: string; kind: 'success' | 'error' } | null>(null);
  /** Request ids to pulse-highlight after `request.created` (cleared ~4.5s each). */
  const [arrivalFlashIds, setArrivalFlashIds] = useState<Set<string>>(() => new Set());
  const requestsRef = useRef<DashboardRequest[]>([]);
  const arrivalFlashIdsRef = useRef<Set<string>>(new Set());
  const timelineForIdRef = useRef<string | null>(null);
  const selectAllCheckboxRef = useRef<HTMLInputElement>(null);
  const bulkFeedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  timelineForIdRef.current = timelineForId;

  useEffect(() => {
    requestsRef.current = requests;
  }, [requests]);

  useEffect(() => {
    arrivalFlashIdsRef.current = arrivalFlashIds;
  }, [arrivalFlashIds]);

  const displayedRequests = useMemo(() => {
    let list = requests;
    if (statusFilter === STATUS_FILTER_NON_COMPLETED) list = list.filter((r) => r.status !== 'completed');
    else if (statusFilter) list = list.filter((r) => r.status === statusFilter);
    if (priorityFilter) list = list.filter((r) => r.priority === priorityFilter);
    const dir = sortCreatedAt === 'asc' ? 1 : -1;
    const t = (value: string) => {
      const ms = new Date(value).getTime();
      return Number.isFinite(ms) ? ms : 0;
    };
    return [...list].sort((a, b) => {
      const bucketA = getDashboardSlaSortBucket(a);
      const bucketB = getDashboardSlaSortBucket(b);
      if (bucketA !== bucketB) return bucketA - bucketB;
      return (t(a.createdAt) - t(b.createdAt)) * dir;
    });
  }, [requests, statusFilter, priorityFilter, sortCreatedAt]);

  const slaSummaryCounts = useMemo(() => {
    let overdue = 0;
    let aging = 0;
    let critical = 0;
    let openTotal = 0;
    for (const r of displayedRequests) {
      if (r.status !== 'completed') openTotal += 1;
      const agingTier = getAgingTier(r.createdAt, r.status);
      if (agingTier === 'overdue') overdue += 1;
      else if (agingTier === 'aging') aging += 1;
      if (getPrioritySlaTier(r.priority) === 'critical') critical += 1;
    }
    return { overdue, aging, critical, openTotal };
  }, [displayedRequests]);

  const sectionedRequests = useMemo(() => {
    const attention: DashboardRequest[] = [];
    const inProgress: DashboardRequest[] = [];
    const completed: DashboardRequest[] = [];
    for (const row of displayedRequests) {
      const g = getRequestSectionGroup(row);
      if (g === 'attention') attention.push(row);
      else if (g === 'in_progress') inProgress.push(row);
      else completed.push(row);
    }
    return { attention, inProgress, completed };
  }, [displayedRequests]);

  const displayedRequestIds = useMemo(() => displayedRequests.map((r) => r.id), [displayedRequests]);
  const allDisplayedSelected = useMemo(
    () => displayedRequestIds.length > 0 && displayedRequestIds.every((id) => selectedRequestIds.includes(id)),
    [displayedRequestIds, selectedRequestIds],
  );

  useEffect(() => {
    const valid = new Set(requests.map((r) => r.id));
    setSelectedRequestIds((prev) => prev.filter((id) => valid.has(id)));
  }, [requests]);

  useEffect(() => {
    const el = selectAllCheckboxRef.current;
    if (!el || displayedRequestIds.length === 0) return;
    const selectedInView = displayedRequestIds.filter((id) => selectedRequestIds.includes(id)).length;
    el.indeterminate = selectedInView > 0 && selectedInView < displayedRequestIds.length;
  }, [displayedRequestIds, selectedRequestIds]);

  useEffect(
    () => () => {
      if (bulkFeedbackTimerRef.current) {
        clearTimeout(bulkFeedbackTimerRef.current);
        bulkFeedbackTimerRef.current = null;
      }
    },
    [],
  );

  useEffect(() => {
    const onPointerDown = () => {
      unlockChimeAudioContext();
    };
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const authSession = getAuthSession();
    const socketAccessToken = getSocketAccessToken();
    let arrivalFlashTimers: Map<string, ReturnType<typeof setTimeout>> | null = null;
    let loadAbortController: AbortController | null = null;

    const load = async () => {
      loadAbortController?.abort();
      const ac = new AbortController();
      loadAbortController = ac;
      const { signal } = ac;

      try {
        const response = await apiFetch('/api/requests', {
          cache: 'no-store',
          signal,
        });
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          if (process.env.NODE_ENV === 'development') {
            console.error('Dashboard load requests failed', { status: response.status, payload });
          }
          throw new Error(getLoadErrorMessage(payload));
        }

        if (!cancelled && !signal.aborted) {
          setRequests(normalizeRequestsResponseBody(payload));
          setError(null);
        }
      } catch (loadError) {
        if (signal.aborted) {
          return;
        }
        if (process.env.NODE_ENV === 'development') {
          console.error('Dashboard load requests error:', loadError);
        }
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load requests');
        }
      } finally {
        if (!cancelled && !signal.aborted) {
          setLoading(false);
        }
      }
    };

    /** Collapse back-to-back `request.assigned` + `request.updated` into one list refetch. */
    let listReloadDebounceTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleListReload = () => {
      if (listReloadDebounceTimer !== null) {
        clearTimeout(listReloadDebounceTimer);
      }
      listReloadDebounceTimer = setTimeout(() => {
        listReloadDebounceTimer = null;
        if (!cancelled) {
          void load();
        }
      }, 80);
    };

    void load();
    if (!socketAccessToken) {
      const socketError = 'Missing auth token for socket connection';
      if (process.env.NODE_ENV === 'development') {
        console.error(`[socket] ${socketError}`);
      }
      if (!cancelled) {
        setError(socketError);
      }
    } else {
      const flashTimers = new Map<string, ReturnType<typeof setTimeout>>();
      arrivalFlashTimers = flashTimers;

      const markArrivalFlash = (id: string) => {
        const key = String(id).trim();
        if (!key) return;
        setArrivalFlashIds((prev) => {
          const next = new Set(prev);
          next.add(key);
          console.log('[admin-arrival] markArrivalFlash id committed', {
            id: key,
            arrivalFlashIdCount: next.size,
          });
          return next;
        });
        const prevTimer = flashTimers.get(key);
        if (prevTimer) clearTimeout(prevTimer);
        const t = setTimeout(() => {
          setArrivalFlashIds((prev) => {
            const next = new Set(prev);
            next.delete(key);
            return next;
          });
          flashTimers.delete(key);
        }, 5000);
        flashTimers.set(key, t);
      };

      setAdminRequestsRealtimeHandlers({
        onRequestCreated: (payload: unknown) => {
          console.log('[page] onRequestCreated called', payload);
          if (cancelled) {
            console.log('[admin-debug] request.created skipped: effect cancelled');
            return false;
          }
          console.log('[admin-debug] request.created received', payload);
          const newIdRaw = extractSocketRequestId(payload);
          const requestId = newIdRaw ? String(newIdRaw).trim() : '';
          console.log('[admin-debug] extracted request id', requestId);
          if (cancelled) return false;
          if (requestId) {
            markArrivalFlash(requestId);
            unlockChimeAudioContext();
            playNewRequestChime();
          } else {
            console.log('[admin-debug] no newId — skip flash/chime', payload);
          }
          // Defer refetch so flash/chime state can commit and paint before `setRequests` from load().
          setTimeout(() => {
            void (async () => {
              if (cancelled) return;
              await load();
              if (cancelled) return;
              if (requestId) {
                const listed = requestsRef.current.some((r) => String(r.id).trim() === requestId);
                if (!listed) {
                  await new Promise((r) => setTimeout(r, 400));
                  if (!cancelled) await load();
                }
              }
            })();
          }, 0);
          return true;
        },
        onRequestAssigned: () => {
          if (cancelled) return;
          scheduleListReload();
        },
        onRequestUpdated: (payload: unknown) => {
          if (cancelled) return;
          scheduleListReload();
          const updatedId = extractSocketRequestId(payload);
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
        },
      });
      setAdminRequestsRealtimeGetAccessToken(() => getSocketAccessToken());
      ensureAdminRequestsRealtimeSocket(socketBase);
    }

    return () => {
      cancelled = true;
      // Do not replace module handlers with no-ops: the realtime socket singleton can still
      // deliver events between this cleanup and the next mount (e.g. React Strict Mode).
      // Registered handlers already guard with `cancelled` so no state updates run after unmount.
      loadAbortController?.abort();
      if (listReloadDebounceTimer !== null) {
        clearTimeout(listReloadDebounceTimer);
        listReloadDebounceTimer = null;
      }
      if (arrivalFlashTimers) {
        for (const t of arrivalFlashTimers.values()) {
          clearTimeout(t);
        }
        arrivalFlashTimers.clear();
      }
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
    setEscalateSubmitting(true);
    setEscalateError(null);
    const body: Record<string, unknown> = { reason: escalateReason.trim() };
    if (escalateLevel.trim()) body.level = escalateLevel.trim();
    if (escalateTarget.trim()) body.target = escalateTarget.trim();
    try {
      const response = await apiFetch(`${apiBase.replace(/\/$/, '')}/unified-requests/${encodeURIComponent(requestId)}/escalate`, {
        method: 'POST',
        cache: 'no-store',
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

  const quickEscalateFromSla = async (requestId: string) => {
    setEscalateSubmitting(true);
    setEscalateError(null);
    setError(null);
    try {
      const response = await apiFetch(`${apiBase.replace(/\/$/, '')}/unified-requests/${encodeURIComponent(requestId)}/escalate`, {
        method: 'POST',
        cache: 'no-store',
        body: JSON.stringify({ reason: SLA_QUICK_ESCALATE_REASON }),
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
      const msg = e instanceof Error ? e.message : 'Escalation failed';
      setEscalateError(msg);
      setError(msg);
    } finally {
      setEscalateSubmitting(false);
    }
  };

  const showBulkFeedback = (payload: { text: string; kind: 'success' | 'error' }) => {
    if (bulkFeedbackTimerRef.current) {
      clearTimeout(bulkFeedbackTimerRef.current);
      bulkFeedbackTimerRef.current = null;
    }
    setBulkFeedback(payload);
    bulkFeedbackTimerRef.current = setTimeout(() => {
      setBulkFeedback(null);
      bulkFeedbackTimerRef.current = null;
    }, 5000);
  };

  const bulkEscalateSelected = async () => {
    if (selectedRequestIds.length === 0) return;
    setBulkEscalating(true);
    setError(null);
    const ids = [...selectedRequestIds];
    let failures = 0;
    try {
      for (const requestId of ids) {
        try {
          const response = await apiFetch(`${apiBase.replace(/\/$/, '')}/unified-requests/${encodeURIComponent(requestId)}/escalate`, {
            method: 'POST',
            cache: 'no-store',
            body: JSON.stringify({ reason: SLA_QUICK_ESCALATE_REASON }),
          });
          const payload = await response.json().catch(() => null);
          if (!response.ok) {
            throw new Error(getLoadErrorMessage(payload));
          }
        } catch {
          failures += 1;
        }
      }
      if (failures === 0) {
        setSelectedRequestIds((prev) => prev.filter((id) => !ids.includes(id)));
        setEscalateForId(null);
        setEscalateReason('');
        setEscalateLevel('');
        setEscalateTarget('');
        if (timelineForId && ids.includes(timelineForId)) {
          await loadTimeline(timelineForId);
        }
        showBulkFeedback({ text: 'All selected requests escalated successfully', kind: 'success' });
      } else {
        showBulkFeedback({
          text: `${failures} of ${ids.length} requests failed to escalate`,
          kind: 'error',
        });
      }
    } catch (e) {
      showBulkFeedback({
        text: e instanceof Error ? e.message : 'Bulk escalation failed',
        kind: 'error',
      });
    } finally {
      setBulkEscalating(false);
    }
  };

  const openAssignVendor = (requestId: string) => {
    if (assignForId === requestId) {
      setAssignForId(null);
      return;
    }
    setAssignForId(requestId);
    setAssignVendorSelection(SIMPLE_VENDOR_OPTIONS[0]?.id ?? '');
  };

  const assignVendor = async (requestId: string, selectedVendorId: string) => {
    if (!selectedVendorId.trim()) {
      setError('Select a vendor to assign');
      return;
    }
    setAssignSubmittingRequestId(requestId);
    try {
      const response = await apiFetch('/api/requests', {
        method: 'POST',
        body: JSON.stringify({ requestId, vendorId: selectedVendorId.trim() }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload?.error ?? 'Failed to assign vendor');
        return;
      }
      await refreshRequestList();
      setAssignForId(null);
      setError(null);
    } finally {
      setAssignSubmittingRequestId(null);
    }
  };

  const refreshRequestList = async () => {
    const response = await apiFetch('/api/requests', {
      cache: 'no-store',
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(getLoadErrorMessage(payload));
    }
    setRequests(normalizeRequestsResponseBody(payload));
    setError(null);
  };

  const postCommandCenterStatus = async (requestId: string, nextStatus: 'in_progress' | 'completed') => {
    setStatusActionRequestId(requestId);
    try {
      const response = await apiFetch(
        `${apiBase.replace(/\/$/, '')}/unified-requests/${encodeURIComponent(requestId)}/status`,
        {
          method: 'POST',
          cache: 'no-store',
          body: JSON.stringify({ status: nextStatus }),
        },
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(getLoadErrorMessage(payload));
      }
      await refreshRequestList();
      if (timelineForId === requestId) {
        await loadTimeline(requestId);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update status');
    } finally {
      setStatusActionRequestId(null);
    }
  };

  const toggleRequestSelected = (id: string) => {
    setSelectedRequestIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleSelectAllDisplayed = () => {
    setSelectedRequestIds((prev) => {
      if (displayedRequestIds.length === 0) return prev;
      const allOn = displayedRequestIds.every((id) => prev.includes(id));
      if (allOn) return prev.filter((id) => !displayedRequestIds.includes(id));
      return [...new Set([...prev, ...displayedRequestIds])];
    });
  };

  function renderRequestRow(request: DashboardRequest) {
    const normalizedStatus = normalizeUiStatus(request.status);
    const agingTier = getAgingTier(request.createdAt, request.status);
    const priorityTier = getPrioritySlaTier(request.priority);
    const hoursOpen = hoursSinceCreated(request.createdAt);
    const hoursOpenHint = `${Math.floor(hoursOpen)}h+ open`;
    const criticalPriorityLabel =
      request.priority === 'CRITICAL' || request.priority === 'URGENT' ? request.priority : 'URGENT';
    const accent = requestSlaAccentColor(agingTier, priorityTier);
    const slaBadges =
      agingTier === 'overdue' || agingTier === 'aging' || priorityTier === 'critical' || priorityTier === 'elevated';
    const firstDisplayed = displayedRequests[0];
    const isTopSlaRow = firstDisplayed !== undefined && request.id === firstDisplayed.id;
    const isRowSelected = selectedRequestIds.includes(request.id);
    const isArrivalFlash = arrivalFlashIds.has(String(request.id).trim());
    if (isArrivalFlash) {
      console.log('[admin-arrival] renderRequestRow arrival flash visible', {
        requestId: request.id,
        isArrivalFlash: true,
      });
    }
    const rowActionBusy =
      statusActionRequestId === request.id || escalateSubmitting || bulkEscalating || assignSubmittingRequestId === request.id;

    const rowCardStyle: CSSProperties = {
      borderRadius: 8,
      padding: 12,
      display: 'grid',
      gap: 8,
      ...(isTopSlaRow
        ? {
            border: '1px solid #60A5FA',
            background: '#EFF6FF',
            boxShadow: isRowSelected
              ? '0 0 0 1px rgba(37, 99, 235, 0.22), 0 2px 12px rgba(37, 99, 235, 0.2), inset 0 0 0 2px rgba(71, 85, 105, 0.32)'
              : '0 0 0 1px rgba(37, 99, 235, 0.22), 0 2px 12px rgba(37, 99, 235, 0.2)',
          }
        : {
            border: '1px solid #E5EDF5',
            ...(isRowSelected
              ? {
                  background: '#F8FAFC',
                  boxShadow: 'inset 0 0 0 1px #CBD5E1',
                }
              : {}),
          }),
      ...(accent ? { borderLeft: `4px solid ${accent}` } : {}),
    };

    if (isArrivalFlash) {
      const arrivalGlow = '0 0 0 2px rgba(52, 211, 153, 0.55), 0 0 22px rgba(16, 185, 129, 0.22)';
      const existingShadow = typeof rowCardStyle.boxShadow === 'string' ? rowCardStyle.boxShadow : '';
      rowCardStyle.boxShadow = existingShadow ? `${existingShadow}, ${arrivalGlow}` : arrivalGlow;
      if (isTopSlaRow) {
        // Top SLA row uses blue fill by default; blend so arrival is still visible without dropping SLA emphasis.
        rowCardStyle.background = isRowSelected ? '#E6F4F0' : '#E8F4F2';
      } else {
        rowCardStyle.background = isRowSelected ? '#EDFAF4' : '#F0FDF9';
      }
    }

    return (
      <div
        key={request.id}
        style={rowCardStyle}
      >
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <input
            type="checkbox"
            checked={selectedRequestIds.includes(request.id)}
            onChange={() => toggleRequestSelected(request.id)}
            style={{ marginTop: 3, flexShrink: 0 }}
            aria-label={`Select request ${request.id}`}
          />
          <div style={{ display: 'grid', gap: 8, flex: 1, minWidth: 0 }}>
        <div>
          <strong>{request.id}</strong> - {request.type} - {request.status}
        </div>
        {slaBadges ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            {priorityTier === 'critical' ? (
              <span
                title={`Priority: ${criticalPriorityLabel}`}
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: 4,
                  background: '#FEE2E2',
                  color: '#991B1B',
                }}
              >
                Urgent priority
                <span style={{ fontWeight: 500, opacity: 0.9 }}> · {criticalPriorityLabel}</span>
              </span>
            ) : null}
            {priorityTier === 'elevated' ? (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: 4,
                  background: '#FEF9C3',
                  color: '#854D0E',
                }}
              >
                High priority
              </span>
            ) : null}
            {agingTier === 'overdue' ? (
              <span
                title={hoursOpenHint}
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: 4,
                  background: '#FEE2E2',
                  color: '#991B1B',
                }}
              >
                Overdue / stale
                <span style={{ fontWeight: 500, opacity: 0.88 }}> · {hoursOpenHint}</span>
              </span>
            ) : null}
            {agingTier === 'aging' ? (
              <span
                title={hoursOpenHint}
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: 4,
                  background: '#FFEDD5',
                  color: '#9A3412',
                }}
              >
                Aging
                <span style={{ fontWeight: 500, opacity: 0.88 }}> · {hoursOpenHint}</span>
              </span>
            ) : null}
          </div>
        ) : null}
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
          {agingTier === 'overdue' || priorityTier === 'critical' ? (
            <button
              type="button"
              disabled={escalateSubmitting}
              title={SLA_QUICK_ESCALATE_REASON}
              onClick={() => void quickEscalateFromSla(request.id)}
              style={{ padding: '4px 8px', fontSize: 11 }}
            >
              Quick Escalate
            </button>
          ) : null}
          {normalizedStatus === 'pending' ? (
            <button
              type="button"
              disabled={assignSubmittingRequestId === request.id}
              onClick={() => openAssignVendor(request.id)}
              style={{ width: 140, padding: 8, ...DASHBOARD_PRIMARY_ACTION_BTN }}
            >
              {assignForId === request.id ? 'Cancel Assign' : 'Assign Vendor'}
            </button>
          ) : null}
          {normalizedStatus === 'assigned' ? (
            <span style={{ fontSize: 12, color: '#166534', fontWeight: 600 }}>Assigned</span>
          ) : null}
          {normalizedStatus === 'assigned' ? (
            <button
              type="button"
              disabled={statusActionRequestId === request.id}
              onClick={() => void postCommandCenterStatus(request.id, 'in_progress')}
              style={{
                padding: '4px 8px',
                fontSize: 12,
                ...DASHBOARD_PRIMARY_ACTION_BTN,
                ...(statusActionRequestId === request.id ? { opacity: 0.55 } : {}),
              }}
            >
              Start
            </button>
          ) : null}
          {normalizedStatus === 'in_progress' ? (
            <button
              type="button"
              disabled={statusActionRequestId === request.id}
              onClick={() => void postCommandCenterStatus(request.id, 'completed')}
              style={{
                padding: '4px 8px',
                fontSize: 12,
                ...DASHBOARD_PRIMARY_ACTION_BTN,
                ...(statusActionRequestId === request.id ? { opacity: 0.55 } : {}),
              }}
            >
              Complete
            </button>
          ) : null}
          {rowActionBusy ? (
            <span style={{ fontSize: 11, color: '#64748B', fontStyle: 'italic' }}>Processing...</span>
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
        {assignForId === request.id ? (
          <div style={{ display: 'grid', gap: 6, borderTop: '1px solid #E5EDF5', paddingTop: 8 }}>
            <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
              <span>Select vendor</span>
              <select
                value={assignVendorSelection}
                onChange={(e) => setAssignVendorSelection(e.target.value)}
                style={{ padding: 6, border: '1px solid #ddd', borderRadius: 4, maxWidth: 280 }}
              >
                {SIMPLE_VENDOR_OPTIONS.map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.name} ({vendor.id})
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              disabled={assignSubmittingRequestId === request.id}
              onClick={() => void assignVendor(request.id, assignVendorSelection)}
              style={{ padding: '6px 12px', width: 'fit-content' }}
            >
              {assignSubmittingRequestId === request.id ? 'Assigning…' : 'Confirm Assign'}
            </button>
          </div>
        ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <section style={{ display: 'grid', gap: 18 }}>
      <h1 style={{ margin: 0 }}>Dashboard Requests</h1>
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
              <option value={STATUS_FILTER_NON_COMPLETED}>Open (not completed)</option>
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
        {!loading && displayedRequests.length > 0 ? (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 12,
              marginBottom: 12,
              fontSize: 13,
            }}
          >
            <label style={{ display: 'flex', gap: 6, alignItems: 'center', color: '#64748B' }}>
              <input
                ref={selectAllCheckboxRef}
                type="checkbox"
                checked={allDisplayedSelected}
                onChange={toggleSelectAllDisplayed}
              />
              <span>Select all in view</span>
            </label>
            {selectedRequestIds.length > 0 ? (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 8,
                  alignItems: 'center',
                  paddingLeft: 10,
                  borderLeft: '1px solid #E2E8F0',
                }}
              >
                <span style={{ fontSize: 12, color: '#475569' }}>{selectedRequestIds.length} selected</span>
                <button type="button" disabled title="Coming soon" style={{ padding: '4px 8px', fontSize: 12, opacity: 0.5 }}>
                  Bulk Assign
                </button>
                <button type="button" disabled title="Coming soon" style={{ padding: '4px 8px', fontSize: 12, opacity: 0.5 }}>
                  Bulk Start
                </button>
                <button type="button" disabled title="Coming soon" style={{ padding: '4px 8px', fontSize: 12, opacity: 0.5 }}>
                  Bulk Complete
                </button>
                <button
                  type="button"
                  disabled={bulkEscalating || escalateSubmitting}
                  title={SLA_QUICK_ESCALATE_REASON}
                  onClick={() => void bulkEscalateSelected()}
                  style={{ padding: '4px 8px', fontSize: 12 }}
                >
                  {bulkEscalating ? 'Escalating…' : 'Bulk Escalate'}
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
        {bulkFeedback ? (
          <div
            style={{
              marginBottom: 12,
              padding: '8px 10px',
              borderRadius: 6,
              fontSize: 13,
              border: bulkFeedback.kind === 'success' ? '1px solid #A7F3D0' : '1px solid #FECACA',
              background: bulkFeedback.kind === 'success' ? '#ECFDF5' : '#FEF2F2',
              color: bulkFeedback.kind === 'success' ? '#065F46' : '#991B1B',
            }}
          >
            {bulkFeedback.text}
          </div>
        ) : null}
        {!loading && requests.length > 0 ? (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 14,
              alignItems: 'baseline',
              marginBottom: 12,
              padding: '8px 10px',
              background: '#F8FAFC',
              borderRadius: 6,
              border: '1px solid #E2E8F0',
              fontSize: 12,
              color: '#64748B',
            }}
          >
            <span>
              <strong style={{ color: '#991B1B' }}>{slaSummaryCounts.overdue}</strong> Overdue
            </span>
            <span>
              <strong style={{ color: '#9A3412' }}>{slaSummaryCounts.aging}</strong> Aging
            </span>
            <span>
              <strong style={{ color: '#BE123C' }}>{slaSummaryCounts.critical}</strong> Critical
            </span>
            <span>
              <strong style={{ color: '#0F172A' }}>{slaSummaryCounts.openTotal}</strong> Open
            </span>
          </div>
        ) : null}
        <div style={{ display: 'grid', gap: 12 }}>
          {!loading && requests.length === 0 ? (
            <div style={{ border: '1px dashed #CBD5E1', borderRadius: 8, padding: 12, color: '#64748B' }}>
              No active requests. System is clear.
            </div>
          ) : null}
          {!loading && requests.length > 0 && displayedRequests.length === 0 ? (
            <div style={{ border: '1px dashed #CBD5E1', borderRadius: 8, padding: 12, color: '#64748B' }}>
              No requests match current filters
            </div>
          ) : null}
          {displayedRequests.length > 0 ? (
            <div style={{ display: 'grid', gap: 18 }}>
              <div>
                <h3 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 600, color: '#1E293B' }}>
                  🚨 Needs Attention{' '}
                  <span style={{ fontWeight: 400, color: '#64748B', fontSize: 13 }}>({sectionedRequests.attention.length})</span>
                </h3>
                {sectionedRequests.attention.length === 0 ? (
                  <p style={{ margin: 0, fontSize: 13, color: '#94A3B8' }}>None</p>
                ) : (
                  <div style={{ display: 'grid', gap: 12 }}>{sectionedRequests.attention.map(renderRequestRow)}</div>
                )}
              </div>
              <div>
                <h3 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 600, color: '#1E293B' }}>
                  ⚠️ In Progress{' '}
                  <span style={{ fontWeight: 400, color: '#64748B', fontSize: 13 }}>({sectionedRequests.inProgress.length})</span>
                </h3>
                {sectionedRequests.inProgress.length === 0 ? (
                  <p style={{ margin: 0, fontSize: 13, color: '#94A3B8' }}>None</p>
                ) : (
                  <div style={{ display: 'grid', gap: 12 }}>{sectionedRequests.inProgress.map(renderRequestRow)}</div>
                )}
              </div>
              <div>
                <h3 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 600, color: '#1E293B' }}>
                  📦 Completed{' '}
                  <span style={{ fontWeight: 400, color: '#64748B', fontSize: 13 }}>({sectionedRequests.completed.length})</span>
                </h3>
                {sectionedRequests.completed.length === 0 ? (
                  <p style={{ margin: 0, fontSize: 13, color: '#94A3B8' }}>None</p>
                ) : (
                  <div style={{ display: 'grid', gap: 12 }}>{sectionedRequests.completed.map(renderRequestRow)}</div>
                )}
              </div>
            </div>
          ) : null}
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
