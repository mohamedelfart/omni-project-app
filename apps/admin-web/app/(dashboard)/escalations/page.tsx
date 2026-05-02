'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../lib/auth';

type CommandCenterLastEscalation = {
  level: number;
  reason: string;
  actor: string;
  createdAt: string;
  source: string;
};

type CommandCenterRequest = {
  id: string;
  serviceType: string;
  country: string;
  city: string;
  vendorId: string | null;
  createdAt: string;
  user?: { fullName?: string | null };
  sla?: {
    slaBreached?: boolean;
    escalationLevel?: number;
    firstBreachedAt?: string | null;
  };
  lastEscalation?: CommandCenterLastEscalation | null;
  escalationHistoryCount?: number;
};

function formatLastEscalationIntel(le: CommandCenterLastEscalation): string {
  const at = le.createdAt ? new Date(le.createdAt).toLocaleString() : '—';
  return `${le.reason || '—'} · ${le.source} · ${at}`;
}

type ProviderOption = { id: string; name: string };

const severityConfig: Record<string, { bg: string; color: string; border: string }> = {
  CRITICAL: { bg: '#FEF2F2', color: '#991B1B', border: '#FCA5A5' },
  HIGH: { bg: '#FFF7ED', color: '#C2410C', border: '#FDBA74' },
  MEDIUM: { bg: '#FFFBEB', color: '#92400E', border: '#FCD34D' },
  LOW: { bg: '#F0FDF4', color: '#065F46', border: '#86EFAC' },
};

const statusConfig: Record<string, { bg: string; color: string }> = {
  OPEN: { bg: '#FEE2E2', color: '#991B1B' },
  IN_REVIEW: { bg: '#FEF3C7', color: '#92400E' },
  RESOLVED: { bg: '#D1FAE5', color: '#065F46' },
  CLOSED: { bg: '#F3F4F6', color: '#6B7280' },
};

function getEscalationSeverity(level: number): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' {
  if (level >= 3) return 'CRITICAL';
  if (level >= 2) return 'HIGH';
  if (level >= 1) return 'MEDIUM';
  return 'LOW';
}

export default function EscalationsPage() {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1';
  const [requests, setRequests] = useState<CommandCenterRequest[]>([]);
  const [providers, setProviders] = useState<ProviderOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionRequestId, setActionRequestId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Session-local only: last manual intervene reason per request (not from API). */
  const [localInterventionByRequestId, setLocalInterventionByRequestId] = useState<Record<string, string>>({});

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [requestsRes, providersRes] = await Promise.all([
        apiFetch('/api/requests', { cache: 'no-store' }),
        apiFetch(`${apiBase.replace(/\/$/, '')}/command-center/providers`, { cache: 'no-store' }),
      ]);
      const reqPayload = await requestsRes.json().catch(() => []);
      const providersPayload = await providersRes.json().catch(() => []);
      const reqRows: CommandCenterRequest[] = Array.isArray(reqPayload)
        ? reqPayload
        : Array.isArray(reqPayload?.data)
          ? reqPayload.data
          : [];
      const providerRowsRaw = Array.isArray(providersPayload)
        ? providersPayload
        : Array.isArray(providersPayload?.data)
          ? providersPayload.data
          : [];
      setRequests(reqRows);
      setProviders(
        providerRowsRaw
          .filter((p: unknown): p is Record<string, unknown> => !!p && typeof p === 'object')
          .map((p: Record<string, unknown>) => ({
            id: typeof p.id === 'string' ? p.id : '',
            name: typeof p.name === 'string' ? p.name : '',
          }))
          .filter((p: ProviderOption) => p.id.length > 0),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load escalations');
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const escalations = useMemo(
    () =>
      requests
        .filter((r) => Boolean(r.sla?.slaBreached) || (r.sla?.escalationLevel ?? 0) > 0)
        .map((r) => {
          const escalationLevel = r.sla?.escalationLevel ?? 0;
          const severity = getEscalationSeverity(escalationLevel);
          const status = escalationLevel > 0 ? 'OPEN' : 'RESOLVED';
          const lastEscalation =
            r.lastEscalation && typeof r.lastEscalation === 'object' && !Array.isArray(r.lastEscalation)
              ? (r.lastEscalation as CommandCenterLastEscalation)
              : null;
          const escalationHistoryCount =
            typeof r.escalationHistoryCount === 'number' && Number.isFinite(r.escalationHistoryCount) && r.escalationHistoryCount >= 0
              ? Math.floor(r.escalationHistoryCount)
              : undefined;
          return {
            id: `ESC-${r.id.slice(-6).toUpperCase()}`,
            requestId: r.id,
            tenant: r.user?.fullName || r.id,
            service: r.serviceType,
            severity,
            market: `${r.country} / ${r.city}`,
            assignedTo: r.vendorId,
            reason: escalationLevel > 0
              ? `SLA breach active at escalation level ${escalationLevel}.`
              : 'Escalation operationally resolved.',
            status,
            opened: new Date(r.sla?.firstBreachedAt ?? r.createdAt).toLocaleString(),
            slaMinutes: escalationLevel > 0 ? 30 : 0,
            escalationLevel,
            lastEscalation,
            escalationHistoryCount,
          };
        }),
    [requests],
  );

  const stats = useMemo(() => {
    const open = escalations.filter((e) => e.status !== 'RESOLVED').length;
    const criticalHigh = escalations.filter((e) => e.severity === 'CRITICAL' || e.severity === 'HIGH').length;
    const resolved = escalations.filter((e) => e.status === 'RESOLVED').length;
    return [
      { label: 'Open Escalations', value: String(open), accent: '#EF4444' },
      { label: 'Critical / High', value: String(criticalHigh), accent: '#DC2626' },
      { label: 'Avg. Resolution', value: '-', accent: '#F59E0B' },
      { label: 'Resolved', value: String(resolved), accent: '#10B981' },
    ];
  }, [escalations]);

  const postAction = useCallback(
    async (url: string, body: Record<string, unknown>) => {
      // Temporary wiring diagnostics (remove after escalation QA sign-off)
      console.log('[admin-cc-action] POST', url, { payload: body });
      const response = await apiFetch(url, {
        method: 'POST',
        cache: 'no-store',
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => null);
      console.log('[admin-cc-action] response', response.status, payload);
      if (!response.ok) {
        const msg =
          (payload && typeof payload === 'object' && typeof (payload as { error?: unknown }).error === 'string' && (payload as { error: string }).error)
          || (payload && typeof payload === 'object' && typeof (payload as { message?: unknown }).message === 'string' && (payload as { message: string }).message)
          || 'Action failed';
        throw new Error(msg);
      }
    },
    [],
  );

  const onIntervene = useCallback(
    async (requestId: string) => {
      const reasonRaw = window.prompt('Intervention reason', 'Manual command-center intervention');
      const interventionReason = reasonRaw?.trim() || 'Manual command-center intervention';
      setActionRequestId(requestId);
      setError(null);
      try {
        console.log('[intervene-call]', requestId);
        await postAction(
          `${apiBase.replace(/\/$/, '')}/command-center/requests/${encodeURIComponent(requestId)}/intervene`,
          { reason: interventionReason },
        );
        console.log('[intervene-success]', requestId);
        setLocalInterventionByRequestId((prev) => ({ ...prev, [requestId]: interventionReason }));
        await loadData();
      } catch (e) {
        console.log('[intervene-error]', e);
        setError(e instanceof Error ? e.message : 'Intervention failed');
      } finally {
        setActionRequestId(null);
      }
    },
    [apiBase, loadData, postAction],
  );

  const onResolve = useCallback(
    async (requestId: string) => {
      const reason = window.prompt('Resolution note', 'Escalation resolved by command-center');
      setActionRequestId(requestId);
      setError(null);
      try {
        await postAction(`${apiBase.replace(/\/$/, '')}/command-center/requests/${encodeURIComponent(requestId)}/resolve-escalation`, {
          reason: reason?.trim() || 'Escalation resolved by command-center',
        });
        await loadData();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Resolve failed');
      } finally {
        setActionRequestId(null);
      }
    },
    [apiBase, loadData, postAction],
  );

  const onReassign = useCallback(
    async (requestId: string, currentVendorId: string | null) => {
      const providerSuggestion = providers.find((p) => p.id !== currentVendorId)?.id ?? '';
      const providerId = window.prompt('Provider ID to reassign', providerSuggestion) ?? '';
      if (!providerId.trim()) return;
      const reason = window.prompt('Reassignment reason (optional)', 'Escalation reassignment') ?? '';
      setActionRequestId(requestId);
      setError(null);
      try {
        await postAction(
          `${apiBase.replace(/\/$/, '')}/command-center/requests/${encodeURIComponent(requestId)}/reassign-provider`,
          { providerId: providerId.trim(), reason: reason.trim() || undefined },
        );
        await loadData();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Reassign failed');
      } finally {
        setActionRequestId(null);
      }
    },
    [apiBase, loadData, postAction, providers],
  );

  return (
    <section style={{ display: 'grid', gap: 24 }}>
      <header>
        <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800, color: '#1E3A5F' }}>Escalations</h1>
        <p style={{ color: '#6B7280', marginTop: 6, marginBottom: 0 }}>
          Command Center intervention queue. Every escalation is trackable, assignable, and auditable.
        </p>
      </header>
      {error ? (
        <div style={{ border: '1px solid #FECACA', background: '#FEF2F2', color: '#991B1B', borderRadius: 12, padding: 12 }}>
          {error}
        </div>
      ) : null}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {stats.map((s) => (
          <article key={s.label} style={{ background: '#FFFFFF', border: '1px solid #E5EDF5', borderRadius: 16, padding: '18px 20px' }}>
            <div style={{ color: '#6B7280', fontSize: 13 }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.accent ?? '#1E3A5F', margin: '6px 0 0' }}>{s.value}</div>
          </article>
        ))}
      </div>

      {/* Escalation cards */}
      <div style={{ display: 'grid', gap: 14 }}>
        {loading ? (
          <article style={{ background: '#FFFFFF', border: '1px solid #E5EDF5', borderRadius: 16, padding: 20 }}>
            Loading escalations...
          </article>
        ) : null}
        {!loading && escalations.length === 0 ? (
          <article style={{ background: '#FFFFFF', border: '1px solid #E5EDF5', borderRadius: 16, padding: 20 }}>
            No escalations found.
          </article>
        ) : null}
        {escalations.map((e) => {
          const sev = severityConfig[e.severity] ?? { bg: '#F9FAFB', color: '#374151', border: '#E5E7EB' };
          const sta = statusConfig[e.status] ?? { bg: '#F3F4F6', color: '#374151' };
          const interventionNote = localInterventionByRequestId[e.requestId];
          const interventionNoteShort =
            interventionNote && interventionNote.length > 80 ? `${interventionNote.slice(0, 80)}…` : interventionNote;
          return (
            <article
              key={e.id}
              style={{
                background: sev.bg,
                border: `1px solid ${sev.border}`,
                borderRadius: 16,
                padding: 20,
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                gap: 16,
                alignItems: 'start',
              }}
            >
              <div>
                {/* Top row */}
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 12, color: sev.color, fontWeight: 700 }}>{e.id}</span>
                  <span style={{ padding: '2px 10px', borderRadius: 20, background: sev.color, color: '#FFFFFF', fontSize: 11, fontWeight: 800 }}>{e.severity}</span>
                  <span style={{ padding: '2px 10px', borderRadius: 20, background: sta.bg, color: sta.color, fontSize: 11, fontWeight: 700, border: `1px solid ${sta.color}20` }}>{e.status}</span>
                  {interventionNote ? (
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 20,
                        background: '#312E81',
                        color: '#EEF2FF',
                        fontSize: 10,
                        fontWeight: 800,
                        letterSpacing: 0.2,
                      }}
                    >
                      Intervened
                    </span>
                  ) : null}
                  <span style={{ fontSize: 12, color: '#6B7280', marginLeft: 'auto' }}>📍 {e.market}</span>
                </div>
                {interventionNoteShort ? (
                  <div style={{ fontSize: 11, color: '#4F46E5', marginBottom: 8, lineHeight: 1.35 }} title={interventionNote}>
                    Last intervention: {interventionNoteShort}
                  </div>
                ) : null}
                {e.lastEscalation ? (
                  <div
                    style={{ fontSize: 11, color: '#374151', marginBottom: 8, lineHeight: 1.4 }}
                    title={`${formatLastEscalationIntel(e.lastEscalation)} · ${e.lastEscalation.actor || '—'}`}
                  >
                    آخر تصعيد: {formatLastEscalationIntel(e.lastEscalation)}
                  </div>
                ) : null}
                {typeof e.escalationHistoryCount === 'number' && e.escalationHistoryCount > 0 ? (
                  <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 8 }} title="عدد سجلات TicketAction من نوع ESCALATE">
                    عدد التصعيدات: {e.escalationHistoryCount}
                  </div>
                ) : null}

                {/* Main */}
                <div style={{ fontWeight: 700, color: '#111827', fontSize: 15, marginBottom: 4 }}>
                  {e.service} — <span style={{ color: '#1E3A5F' }}>{e.tenant}</span>
                  <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#9CA3AF', marginLeft: 8 }}>{e.requestId}</span>
                </div>
                <p style={{ margin: '0 0 10px', fontSize: 13, color: '#4B5563', lineHeight: 1.5 }}>{e.reason}</p>

                {/* Meta */}
                <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#6B7280', flexWrap: 'wrap' }}>
                  <span>⏱ Opened: {e.opened}</span>
                  <span>⏳ SLA: {e.slaMinutes} min</span>
                  <span>👤 {e.assignedTo ? `Assigned: ${e.assignedTo}` : '⚠️ Unassigned'}</span>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 140 }}>
                {e.status !== 'RESOLVED' && (
                  <>
                    <button
                      disabled={actionRequestId === e.requestId}
                      onClick={() => {
                        console.log('[ui-click-intervene]', e.requestId);
                        void onIntervene(e.requestId);
                      }}
                      style={{ padding: '8px 16px', borderRadius: 10, border: 'none', background: '#1E3A5F', color: '#FFFFFF', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                    >
                      Intervene
                    </button>
                    <button
                      disabled={actionRequestId === e.requestId}
                      onClick={() => void onReassign(e.requestId, e.assignedTo)}
                      style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid #D1D5DB', background: '#FFFFFF', color: '#374151', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                    >
                      Reassign
                    </button>
                    <button
                      disabled={actionRequestId === e.requestId}
                      onClick={() => void onResolve(e.requestId)}
                      style={{ padding: '8px 16px', borderRadius: 10, border: 'none', background: '#10B981', color: '#FFFFFF', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                    >
                      Resolve
                    </button>
                  </>
                )}
                {e.status === 'RESOLVED' && (
                  <span style={{ padding: '8px 16px', borderRadius: 10, background: '#D1FAE5', color: '#065F46', fontSize: 12, fontWeight: 700, textAlign: 'center' }}>✓ Resolved</span>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
