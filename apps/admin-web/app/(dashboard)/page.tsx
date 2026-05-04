'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import {
  ensureAdminRequestsRealtimeSocket,
  setAdminRequestsRealtimeGetAccessToken,
  setAdminRequestsRealtimeHandlers,
} from '../lib/admin-requests-socket';
import { apiFetch, getAuthSession, getSocketAccessToken } from '../lib/auth';
import { extractSocketRequestId } from '../lib/extract-socket-request-id';
import {
  normalizeDashboardRequestStatus,
  type DashboardRequestStatus,
} from '../lib/request-status-ui';
import type {
  CommandCenterBrainAutoAssignReadiness,
  CommandCenterBrainProviderSuitability,
  CommandCenterBrainProviderSuitabilityCandidate,
  CommandCenterBrainReadModel,
} from '@quickrent/shared-types';
import { isCommandCenterBrainNextBestAction } from '@quickrent/shared-types';

type AttentionSeverityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

/** Last manual `ESCALATE` snapshot from Command Center list read-model (Step 7C). */
type DashboardLastEscalation = {
  level: number;
  reason: string;
  actor: string;
  createdAt: string;
  source: string;
};

/** API may omit `autoAssignReadiness` on older payloads — UI treats absence as “no preview”. */
type DashboardProviderSuitability = Omit<CommandCenterBrainProviderSuitability, 'autoAssignReadiness'> & {
  autoAssignReadiness?: CommandCenterBrainAutoAssignReadiness;
};

/** Command Center Brain — aligned with API read-model; dashboard allows optional readiness for back-compat. */
type DashboardBrain = Omit<CommandCenterBrainReadModel, 'providerSuitability'> & {
  providerSuitability?: DashboardProviderSuitability;
};
type DashboardBrainPriority = CommandCenterBrainReadModel['priority'];

type DashboardRequest = {
  id: string;
  tenantId: string;
  vendorId?: string;
  type: 'cleaning' | 'moving' | 'maintenance';
  /** Raw backend `UnifiedRequest.status` as received from API. */
  rawStatus?: string;
  status: DashboardRequestStatus;
  createdAt: string;
  updatedAt: string;
  propertyIds?: string[];
  primaryPropertyId?: string;
  /** Present when upstream list payload includes `priority` (Prisma `RequestPriority`). */
  priority?: string;
  /** Command Center vendor-attention read model (`GET .../command-center/requests`). */
  needsAttention?: boolean;
  attentionSeverity?: AttentionSeverityLevel;
  attentionLabel?: string;
  attentionCodes?: string[];
  /** From `GET .../command-center/requests` (Step 7C). */
  lastEscalation?: DashboardLastEscalation | null;
  escalationHistoryCount?: number;
  sla?: {
    escalationLevel?: number;
    slaBreached?: boolean;
    firstBreachedAt?: string | null;
  };
  /** Backend-derived Brain read-model (`GET .../command-center/requests`, Step 9). */
  brain?: DashboardBrain;
};

const DASHBOARD_STATUSES: Exclude<DashboardRequestStatus, 'unknown'>[] = ['pending', 'assigned', 'in_progress', 'completed'];
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

/** Normalized Brain recommendation text for assign quick action (trim + lowercase; API is "Assign provider now"). */
const BRAIN_ASSIGN_PROVIDER_RECO_NORMALIZED = 'assign provider now';

type ProviderOption = {
  id: string;
  name: string;
};

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

function isOpenForSla(status: DashboardRequestStatus): boolean {
  return status === 'pending' || status === 'assigned' || status === 'in_progress';
}

type AgingTier = 'none' | 'aging' | 'overdue';

function getAgingTier(createdAt: string, status: DashboardRequestStatus): AgingTier {
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

function attentionSeverityBadgeStyle(severity: AttentionSeverityLevel | undefined): {
  background: string;
  color: string;
  border: string;
} {
  switch (severity) {
    case 'CRITICAL':
      return { background: '#FEE2E2', color: '#991B1B', border: '1px solid #FCA5A5' };
    case 'HIGH':
      return { background: '#FFEDD5', color: '#C2410C', border: '1px solid #FDBA74' };
    case 'MEDIUM':
      return { background: '#FEF9C3', color: '#854D0E', border: '1px solid #FACC15' };
    case 'LOW':
    default:
      return { background: '#F1F5F9', color: '#475569', border: '1px solid #CBD5E1' };
  }
}

function vendorAttentionTitle(request: DashboardRequest): string | undefined {
  const label = typeof request.attentionLabel === 'string' && request.attentionLabel.trim() ? request.attentionLabel.trim() : '';
  const codes = Array.isArray(request.attentionCodes) ? request.attentionCodes.filter((c) => typeof c === 'string' && c.trim()) : [];
  if (label && codes.length) return `${label} (${codes.join(', ')})`;
  if (label) return label;
  if (codes.length) return codes.join(', ');
  return undefined;
}

function parseLastEscalationFromRecord(rec: Record<string, unknown>): DashboardLastEscalation | undefined {
  const raw = rec.lastEscalation;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return undefined;
  }
  const o = raw as Record<string, unknown>;
  const levelRaw = o.level;
  const level =
    typeof levelRaw === 'number' && Number.isFinite(levelRaw)
      ? Math.floor(levelRaw)
      : typeof levelRaw === 'string' && Number.isFinite(Number(levelRaw.trim()))
        ? Math.floor(Number(levelRaw.trim()))
        : undefined;
  if (level === undefined || level < 0) {
    return undefined;
  }
  const createdAt = typeof o.createdAt === 'string' ? o.createdAt : '';
  return {
    level,
    reason: typeof o.reason === 'string' ? o.reason : '',
    actor: typeof o.actor === 'string' ? o.actor : '',
    createdAt,
    source: typeof o.source === 'string' ? o.source : '',
  };
}

function formatDashboardLastEscalationLine(le: DashboardLastEscalation): string {
  const at = le.createdAt ? formatDate(le.createdAt) : '—';
  return `آخر تصعيد: ${le.reason || '—'} / ${le.source} / ${at}`;
}

function formatDashboardLastEscalationTitle(le: DashboardLastEscalation): string {
  return `${formatDashboardLastEscalationLine(le)} · ${le.actor || '—'}`;
}

function parseBrainFromRecord(rec: Record<string, unknown>): DashboardBrain | undefined {
  const b = rec.brain;
  if (!b || typeof b !== 'object' || Array.isArray(b)) {
    return undefined;
  }
  const o = b as Record<string, unknown>;
  const p = o.priority;
  if (p !== 'LOW' && p !== 'MEDIUM' && p !== 'HIGH' && p !== 'CRITICAL') {
    return undefined;
  }
  const alerts = Array.isArray(o.alerts) ? o.alerts.filter((x): x is string => typeof x === 'string') : [];
  const recommendations = Array.isArray(o.recommendations)
    ? o.recommendations.filter((x): x is string => typeof x === 'string')
    : [];
  const reasons = Array.isArray(o.reasons) ? o.reasons.filter((x): x is string => typeof x === 'string') : [];
  const nextBestAction = isCommandCenterBrainNextBestAction(o.nextBestAction) ? o.nextBestAction : 'MONITOR_SLA';
  const rawRisk = o.riskScore;
  const riskScore =
    typeof rawRisk === 'number' && Number.isFinite(rawRisk) ? Math.max(0, Math.min(100, Math.round(rawRisk))) : 0;
  const riskReasons = Array.isArray(o.riskReasons)
    ? o.riskReasons.filter((x): x is string => typeof x === 'string')
    : [];
  const piRaw = o.providerIntelligence;
  let providerIntelligence: DashboardBrain['providerIntelligence'] = {
    signals: [],
    recommendations: [],
    reasons: [],
  };
  if (piRaw && typeof piRaw === 'object' && !Array.isArray(piRaw)) {
    const pi = piRaw as Record<string, unknown>;
    providerIntelligence = {
      signals: Array.isArray(pi.signals) ? pi.signals.filter((x): x is string => typeof x === 'string') : [],
      recommendations: Array.isArray(pi.recommendations)
        ? pi.recommendations.filter((x): x is string => typeof x === 'string')
        : [],
      reasons: Array.isArray(pi.reasons) ? pi.reasons.filter((x): x is string => typeof x === 'string') : [],
    };
  }

  const psRaw = o.providerSuitability;
  let providerSuitability: DashboardBrain['providerSuitability'] | undefined;
  if (psRaw && typeof psRaw === 'object' && !Array.isArray(psRaw)) {
    const ps = psRaw as Record<string, unknown>;
    const parseCand = (x: unknown): CommandCenterBrainProviderSuitabilityCandidate | null => {
      if (!x || typeof x !== 'object' || Array.isArray(x)) return null;
      const c = x as Record<string, unknown>;
      const providerId = typeof c.providerId === 'string' ? c.providerId.trim() : '';
      const score =
        typeof c.score === 'number' && Number.isFinite(c.score) ? Math.max(0, Math.min(100, Math.round(c.score))) : 0;
      const reasons = Array.isArray(c.reasons) ? c.reasons.filter((r): r is string => typeof r === 'string') : [];
      if (!providerId) return null;
      const cand: CommandCenterBrainProviderSuitabilityCandidate = { providerId, score, reasons };
      const fs = c.finalScore;
      if (typeof fs === 'number' && Number.isFinite(fs)) cand.finalScore = Math.round(fs);
      const dk = c.distanceKm;
      if (typeof dk === 'number' && Number.isFinite(dk)) cand.distanceKm = dk;
      const dscore = c.distanceScore;
      if (typeof dscore === 'number' && Number.isFinite(dscore)) cand.distanceScore = dscore;
      return cand;
    };
    const candidates = (Array.isArray(ps.candidates) ? ps.candidates : [])
      .map(parseCand)
      .filter((x): x is CommandCenterBrainProviderSuitabilityCandidate => x != null);
    let currentProvider: CommandCenterBrainProviderSuitability['currentProvider'] = null;
    const cur = ps.currentProvider;
    if (cur && typeof cur === 'object' && !Array.isArray(cur)) {
      const c = cur as Record<string, unknown>;
      const providerId = typeof c.providerId === 'string' ? c.providerId.trim() : '';
      if (providerId) {
        const score =
          typeof c.score === 'number' && Number.isFinite(c.score) ? Math.max(0, Math.min(100, Math.round(c.score))) : 0;
        const reasons = Array.isArray(c.reasons) ? c.reasons.filter((r): r is string => typeof r === 'string') : [];
        currentProvider = { providerId, score, reasons };
      }
    }
    const rec = ps.recommendedProviderId;
    const recommendedProviderId =
      rec === null || rec === undefined
        ? null
        : typeof rec === 'string' && rec.trim()
          ? rec.trim()
          : null;
    const aarRaw = ps.autoAssignReadiness;
    const basePs: Omit<DashboardProviderSuitability, 'autoAssignReadiness'> = {
      currentProvider,
      candidates,
      recommendedProviderId,
    };
    if (aarRaw && typeof aarRaw === 'object' && !Array.isArray(aarRaw)) {
      const ar = aarRaw as Record<string, unknown>;
      providerSuitability = {
        ...basePs,
        autoAssignReadiness: {
          ready: Boolean(ar.ready),
          reason: typeof ar.reason === 'string' ? ar.reason : '',
        },
      };
    } else {
      providerSuitability = { ...basePs };
    }
  }

  const base: DashboardBrain = {
    priority: p,
    alerts,
    recommendations,
    reasons,
    nextBestAction,
    riskScore,
    riskReasons,
    providerIntelligence,
  };
  return providerSuitability !== undefined ? { ...base, providerSuitability } : base;
}

function formatProviderSuitabilityReasonSummary(reasons: string[]): string {
  const parts = reasons.filter(Boolean).slice(0, 2);
  return parts.join(', ') || '—';
}

const BRAIN_V51_REASSIGN_TOOLTIP_BASE = 'Recommended based on provider suitability';

const BRAIN_V51_REASSIGN_ID_MAX_DISPLAY = 28;

/**
 * Brain V5.1 — actionable reassignment label (read-model only). No provider auto-selection.
 * Uses `recommendedProviderId` + `candidates[0]?.score` per list contract; reasons from
 * matching candidate when available, else first candidate.
 */
function getBrainActionableReassignDisplay(
  brain: DashboardBrain | undefined,
  fallbackLabel: string,
): { tooltip: string | undefined; children: ReactNode } {
  const ps = brain?.providerSuitability;
  if (!ps) {
    return { tooltip: undefined, children: fallbackLabel };
  }
  const recRaw = ps.recommendedProviderId;
  const recId = typeof recRaw === 'string' && recRaw.trim() ? recRaw.trim() : '';
  if (!recId) {
    return { tooltip: undefined, children: fallbackLabel };
  }
  const cand0 = ps.candidates?.[0];
  const hasScore =
    cand0 !== undefined && typeof cand0.score === 'number' && Number.isFinite(cand0.score);
  const scoreVal = hasScore ? Math.round(cand0.score) : null;
  const truncated =
    recId.length > BRAIN_V51_REASSIGN_ID_MAX_DISPLAY
      ? `${recId.slice(0, BRAIN_V51_REASSIGN_ID_MAX_DISPLAY - 1)}…`
      : recId;
  const matched = ps.candidates?.find((c) => c.providerId === recId);
  const reasonPool =
    matched?.reasons?.filter((r) => typeof r === 'string' && r.trim()).length
      ? matched.reasons
      : cand0?.reasons?.filter((r) => typeof r === 'string' && r.trim()) ?? [];
  const reasonLines = reasonPool.filter(Boolean).slice(0, 2);
  const tooltip =
    reasonLines.length > 0
      ? `${BRAIN_V51_REASSIGN_TOOLTIP_BASE}\n${reasonLines.join('\n')}`
      : BRAIN_V51_REASSIGN_TOOLTIP_BASE;
  return {
    tooltip,
    children: (
      <>
        Reassign →{' '}
        <span style={{ fontWeight: 800 }} title={recId}>
          {truncated}
        </span>
        {scoreVal !== null ? (
          <>
            {' '}
            (<span style={{ fontWeight: 800 }}>{scoreVal}</span>)
          </>
        ) : null}
      </>
    ),
  };
}

const BRAIN_V7_ASSIGN_TOOLTIP_BASE = 'Suggested provider based on suitability score';

/** Brain V7 — smart assign label / tooltip from suitability top candidate only (UI; same onClick as before). */
function getBrainSuggestedAssignVendorUi(brain: DashboardBrain | undefined): {
  assignVendorTooltip: string | undefined;
  assignVendorLabel: ReactNode;
} {
  const top = brain?.providerSuitability?.candidates?.[0];
  const providerId =
    top && typeof top.providerId === 'string' && top.providerId.trim() ? top.providerId.trim() : '';
  if (!top || !providerId) {
    return { assignVendorTooltip: undefined, assignVendorLabel: 'Assign provider now' };
  }
  const score = Number.isFinite(top.score) ? Math.round(top.score) : null;
  const reasonLines = Array.isArray(top.reasons)
    ? top.reasons
        .filter((r): r is string => typeof r === 'string')
        .map((r) => r.trim())
        .filter((r) => r.length > 0)
        .slice(0, 2)
    : [];
  const assignVendorTooltip =
    reasonLines.length > 0
      ? `${BRAIN_V7_ASSIGN_TOOLTIP_BASE}\n${reasonLines.join('\n')}`
      : BRAIN_V7_ASSIGN_TOOLTIP_BASE;
  return {
    assignVendorTooltip,
    assignVendorLabel: (
      <>
        Assign → <span style={{ fontWeight: 800 }}>{providerId}</span>
        {score != null ? ` (${score}%)` : ''}
      </>
    ),
  };
}

/** Enterprise-style priority badge (Brain panel only). */
function brainPriorityChipStyle(p: DashboardBrainPriority): { background: string; color: string; border: string } {
  switch (p) {
    case 'CRITICAL':
      return { background: '#FEE2E2', color: '#991B1B', border: '1px solid #FCA5A5' };
    case 'HIGH':
      return { background: '#FFFBEB', color: '#92400E', border: '1px solid #FDE68A' };
    case 'MEDIUM':
      return { background: '#E5E7EB', color: '#374151', border: '1px solid #D1D5DB' };
    case 'LOW':
    default:
      return { background: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0' };
  }
}

type RequestSectionGroup = 'attention' | 'in_progress' | 'completed';

/** Uses `status`, `priority`, and SLA helpers on `createdAt` (same rules as row badges). */
function getRequestSectionGroup(request: DashboardRequest): RequestSectionGroup {
  if (request.status === 'completed') return 'completed';
  const aging = getAgingTier(request.createdAt, request.status);
  if (aging === 'overdue' || getPrioritySlaTier(request.priority) === 'critical') return 'attention';
  return 'in_progress';
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
      const normalizedStatus = normalizeDashboardRequestStatus(rec.status);
      const rawStatus = typeof rec.status === 'string' ? rec.status.trim().toUpperCase() : undefined;
      if (process.env.NODE_ENV === 'development') {
        console.log('[admin-requests-ingest]', {
          requestId: id,
          rawBackendStatus: rec.status,
          normalizedStatus,
        });
      }
      const sev = rec.attentionSeverity;
      const attentionSeverity: AttentionSeverityLevel | undefined =
        sev === 'LOW' || sev === 'MEDIUM' || sev === 'HIGH' || sev === 'CRITICAL' ? sev : undefined;
      const lastEscalation = parseLastEscalationFromRecord(rec);
      const ehRaw = rec.escalationHistoryCount;
      const escalationHistoryCount =
        typeof ehRaw === 'number' && Number.isFinite(ehRaw) && ehRaw >= 0 ? Math.floor(ehRaw) : undefined;
      const brain = parseBrainFromRecord(rec);
      return {
        ...(row as unknown as DashboardRequest),
        id,
        rawStatus,
        status: normalizedStatus,
        priority: typeof row.priority === 'string' ? row.priority : undefined,
        needsAttention: typeof rec.needsAttention === 'boolean' ? rec.needsAttention : undefined,
        attentionSeverity,
        attentionLabel: typeof rec.attentionLabel === 'string' ? rec.attentionLabel : undefined,
        attentionCodes: Array.isArray(rec.attentionCodes)
          ? rec.attentionCodes.filter((c): c is string => typeof c === 'string')
          : undefined,
        lastEscalation: lastEscalation ?? null,
        escalationHistoryCount,
        ...(brain ? { brain } : {}),
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
  const router = useRouter();
  const [requests, setRequests] = useState<DashboardRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assignForId, setAssignForId] = useState<string | null>(null);
  const [providerOptions, setProviderOptions] = useState<ProviderOption[]>([]);
  const [assignVendorSelection, setAssignVendorSelection] = useState<string>('');
  const [assignSubmittingRequestId, setAssignSubmittingRequestId] = useState<string | null>(null);
  const [reassignForId, setReassignForId] = useState<string | null>(null);
  const [reassignVendorSelection, setReassignVendorSelection] = useState<string>('');
  const [reassignReason, setReassignReason] = useState<string>('');
  const [reassignSubmittingRequestId, setReassignSubmittingRequestId] = useState<string | null>(null);
  const [resolveEscalationSubmittingRequestId, setResolveEscalationSubmittingRequestId] = useState<string | null>(null);
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
    if (statusFilter === STATUS_FILTER_NON_COMPLETED) {
      list = list.filter((r) => r.status === 'pending' || r.status === 'assigned' || r.status === 'in_progress');
    }
    else if (statusFilter) list = list.filter((r) => r.status === statusFilter);
    if (priorityFilter) list = list.filter((r) => r.priority === priorityFilter);
    const dir = sortCreatedAt === 'asc' ? 1 : -1;
    const t = (value: string) => {
      const ms = new Date(value).getTime();
      return Number.isFinite(ms) ? ms : 0;
    };
    return [...list].sort((a, b) => {
      const byCreated = (t(a.createdAt) - t(b.createdAt)) * dir;
      if (byCreated !== 0) return byCreated;
      return a.id.localeCompare(b.id);
    });
  }, [requests, statusFilter, priorityFilter, sortCreatedAt]);

  /** Row id for SLA “top” card styling — worst bucket, then newest within that bucket (unchanged SLA semantics vs former bucket-first list order). */
  const topSlaHighlightRequestId = useMemo(() => {
    const rows = displayedRequests;
    if (rows.length === 0) return null;
    const t = (value: string) => {
      const ms = new Date(value).getTime();
      return Number.isFinite(ms) ? ms : 0;
    };
    let best = rows[0]!;
    let bestBucket = getDashboardSlaSortBucket(best);
    let bestT = t(best.createdAt);
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i]!;
      const b = getDashboardSlaSortBucket(r);
      const rt = t(r.createdAt);
      if (b < bestBucket || (b === bestBucket && rt > bestT)) {
        best = r;
        bestBucket = b;
        bestT = rt;
      }
    }
    return best.id;
  }, [displayedRequests]);

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

    const loadProviders = async (): Promise<void> => {
      try {
        const response = await apiFetch(`${apiBase.replace(/\/$/, '')}/command-center/providers`, {
          cache: 'no-store',
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(getLoadErrorMessage(payload));
        }
        const listRaw = payload && typeof payload === 'object' && 'data' in payload ? (payload as { data: unknown }).data : payload;
        const list = Array.isArray(listRaw)
          ? listRaw
            .filter((row): row is Record<string, unknown> => !!row && typeof row === 'object')
            .map((row) => ({
              id: typeof row.id === 'string' ? row.id : '',
              name: typeof row.name === 'string' ? row.name : '',
            }))
            .filter((p) => p.id.length > 0)
          : [];
        if (!cancelled) {
          setProviderOptions(list);
          setAssignVendorSelection((prev) => {
            if (prev && list.some((p) => p.id === prev)) return prev;
            return list[0]?.id ?? '';
          });
        }
      } catch (providersError) {
        if (!cancelled) {
          setProviderOptions([]);
          setAssignVendorSelection('');
          setError(providersError instanceof Error ? providersError.message : 'Failed to load providers');
        }
      }
    };

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

    void Promise.all([load(), loadProviders()]);
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
    const escalateUrl = `${apiBase.replace(/\/$/, '')}/unified-requests/${encodeURIComponent(requestId)}/escalate`;
    try {
      // Temporary wiring diagnostics (remove after escalation QA sign-off)
      console.log('[admin-escalation] POST', escalateUrl, { payload: body });
      const response = await apiFetch(escalateUrl, {
        method: 'POST',
        cache: 'no-store',
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => null);
      console.log('[admin-escalation] response', response.status, payload);
      if (!response.ok) {
        throw new Error(getLoadErrorMessage(payload));
      }
      setEscalateForId(null);
      setEscalateReason('');
      setEscalateLevel('');
      setEscalateTarget('');
      await refreshRequestList();
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
    const quickUrl = `${apiBase.replace(/\/$/, '')}/unified-requests/${encodeURIComponent(requestId)}/escalate`;
    const quickBody = { reason: SLA_QUICK_ESCALATE_REASON };
    try {
      console.log('[admin-escalation] POST', quickUrl, { payload: quickBody });
      const response = await apiFetch(quickUrl, {
        method: 'POST',
        cache: 'no-store',
        body: JSON.stringify(quickBody),
      });
      const payload = await response.json().catch(() => null);
      console.log('[admin-escalation] response', response.status, payload);
      if (!response.ok) {
        throw new Error(getLoadErrorMessage(payload));
      }
      setEscalateForId(null);
      setEscalateReason('');
      setEscalateLevel('');
      setEscalateTarget('');
      await refreshRequestList();
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
          const bulkUrl = `${apiBase.replace(/\/$/, '')}/unified-requests/${encodeURIComponent(requestId)}/escalate`;
          const bulkBody = { reason: SLA_QUICK_ESCALATE_REASON };
          console.log('[admin-escalation] POST', bulkUrl, { payload: bulkBody });
          const response = await apiFetch(bulkUrl, {
            method: 'POST',
            cache: 'no-store',
            body: JSON.stringify(bulkBody),
          });
          const payload = await response.json().catch(() => null);
          console.log('[admin-escalation] response', response.status, payload);
          if (!response.ok) {
            throw new Error(getLoadErrorMessage(payload));
          }
        } catch {
          failures += 1;
        }
      }
      try {
        await refreshRequestList();
      } catch {
        /* list refresh failure is non-fatal for bulk feedback */
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
    setReassignForId(null);
    setReassignReason('');
    setAssignForId(requestId);
    setAssignVendorSelection((prev) => {
      if (prev && providerOptions.some((p) => p.id === prev)) return prev;
      return providerOptions[0]?.id ?? '';
    });
  };

  const openReassignVendor = (requestId: string, currentVendorId?: string) => {
    if (reassignForId === requestId) {
      setReassignForId(null);
      return;
    }
    setAssignForId(null);
    setReassignForId(requestId);
    setReassignReason('');
    setReassignVendorSelection((prev) => {
      if (prev && providerOptions.some((p) => p.id === prev) && prev !== currentVendorId) return prev;
      const firstEligible = providerOptions.find((p) => p.id !== currentVendorId)?.id ?? '';
      return firstEligible;
    });
  };

  const copyProviderContactRef = async (request: DashboardRequest) => {
    const line = `tenant:${request.tenantId} · request:${request.id}${request.vendorId ? ` · vendor:${request.vendorId}` : ''}`;
    try {
      await navigator.clipboard?.writeText(line);
    } catch {
      window.prompt('Copy reference', line);
    }
  };

  const assignVendor = async (requestId: string, selectedVendorId: string) => {
    if (!selectedVendorId.trim()) {
      setError('Select a vendor to assign');
      return;
    }
    setAssignSubmittingRequestId(requestId);
    try {
      const response = await apiFetch(`${apiBase.replace(/\/$/, '')}/command-center/requests/${encodeURIComponent(requestId)}/assign-provider`, {
        method: 'POST',
        cache: 'no-store',
        body: JSON.stringify({ providerId: selectedVendorId.trim() }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setError(getLoadErrorMessage(payload));
        return;
      }
      await refreshRequestList();
      setAssignForId(null);
      setError(null);
    } finally {
      setAssignSubmittingRequestId(null);
    }
  };

  const reassignVendor = async (requestId: string, selectedVendorId: string, reason?: string) => {
    if (!selectedVendorId.trim()) {
      setError('Select a provider to reassign');
      return;
    }
    setReassignSubmittingRequestId(requestId);
    try {
      const response = await apiFetch(
        `${apiBase.replace(/\/$/, '')}/command-center/requests/${encodeURIComponent(requestId)}/reassign-provider`,
        {
          method: 'POST',
          cache: 'no-store',
          body: JSON.stringify({
            providerId: selectedVendorId.trim(),
            reason: reason?.trim() ? reason.trim() : undefined,
          }),
        },
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setError(getLoadErrorMessage(payload));
        return;
      }
      await refreshRequestList();
      setReassignForId(null);
      setReassignReason('');
      setError(null);
    } finally {
      setReassignSubmittingRequestId(null);
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

  const quickResolveEscalation = async (requestId: string) => {
    const note = window.prompt('Resolution note', 'Escalation resolved by command-center');
    if (note === null) {
      return;
    }
    setResolveEscalationSubmittingRequestId(requestId);
    setEscalateError(null);
    setError(null);
    try {
      const url = `${apiBase.replace(/\/$/, '')}/command-center/requests/${encodeURIComponent(requestId)}/resolve-escalation`;
      const response = await apiFetch(url, {
        method: 'POST',
        cache: 'no-store',
        body: JSON.stringify({ reason: note.trim() || 'Escalation resolved by command-center' }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(getLoadErrorMessage(payload));
      }
      await refreshRequestList();
      if (timelineForId === requestId) {
        await loadTimeline(requestId);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to resolve escalation');
    } finally {
      setResolveEscalationSubmittingRequestId(null);
    }
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
    const brainRecs = request.brain?.recommendations;
    const brainHasAssignProviderReco =
      Array.isArray(brainRecs)
      && brainRecs.some(
        (r) => typeof r === 'string' && r.trim().toLowerCase() === BRAIN_ASSIGN_PROVIDER_RECO_NORMALIZED,
      );
    const brainOtherRecommendations =
      Array.isArray(brainRecs)
        ? brainRecs.filter(
          (r) => typeof r === 'string' && r.trim().toLowerCase() !== BRAIN_ASSIGN_PROVIDER_RECO_NORMALIZED,
        )
        : [];

    const nba = request.brain?.nextBestAction;
    const brainReassignGuidancePascal = getBrainActionableReassignDisplay(request.brain, 'Reassign Provider');
    const brainReassignGuidanceLower = getBrainActionableReassignDisplay(request.brain, 'Reassign provider');
    const brainSuggestedAssignVendor = getBrainSuggestedAssignVendorUi(request.brain);

    const rowStatus = request.status;
    const rawStatus = (request.rawStatus ?? '').toUpperCase();
    const escalationLevel = request.sla?.escalationLevel ?? 0;
    const urgentReassignMode = nba === 'URGENT_INTERVENTION' || escalationLevel >= 2;
    const reassignBlockedTerminal =
      rowStatus === 'completed'
      || rawStatus === 'COMPLETED'
      || rawStatus === 'CANCELLED'
      || rawStatus === 'REJECTED'
      || rawStatus === 'FAILED';
    const agingTier = getAgingTier(request.createdAt, request.status);
    const priorityTier = getPrioritySlaTier(request.priority);
    const hoursOpen = hoursSinceCreated(request.createdAt);
    const hoursOpenHint = `${Math.floor(hoursOpen)}h+ open`;
    const criticalPriorityLabel =
      request.priority === 'CRITICAL' || request.priority === 'URGENT' ? request.priority : 'URGENT';
    const accent = requestSlaAccentColor(agingTier, priorityTier);
    const slaBadges =
      agingTier === 'overdue' || agingTier === 'aging' || priorityTier === 'critical' || priorityTier === 'elevated';
    const isTopSlaRow = topSlaHighlightRequestId !== null && request.id === topSlaHighlightRequestId;
    const isRowSelected = selectedRequestIds.includes(request.id);
    const isArrivalFlash = arrivalFlashIds.has(String(request.id).trim());
    if (isArrivalFlash) {
      console.log('[admin-arrival] renderRequestRow arrival flash visible', {
        requestId: request.id,
        isArrivalFlash: true,
      });
    }
    const rowActionBusy =
      statusActionRequestId === request.id
      || escalateSubmitting
      || bulkEscalating
      || assignSubmittingRequestId === request.id
      || reassignSubmittingRequestId === request.id
      || resolveEscalationSubmittingRequestId === request.id;

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

    if (nba === 'URGENT_INTERVENTION' && !isTopSlaRow) {
      rowCardStyle.border = '1px solid #FDE68A';
      rowCardStyle.background = isRowSelected ? '#FFFBEB' : '#FFFCF0';
      const u = typeof rowCardStyle.boxShadow === 'string' ? rowCardStyle.boxShadow : '';
      rowCardStyle.boxShadow = u ? `${u}, 0 0 0 1px rgba(245, 158, 11, 0.12)` : '0 0 0 1px rgba(245, 158, 11, 0.12)';
    }

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
        {request.brain ? (
          <div
            role="region"
            aria-label="Command Center Brain"
            style={{
              marginTop: 10,
              border: nba === 'URGENT_INTERVENTION' ? '1px solid #FCD34D' : '1px solid #E2E8F0',
              borderRadius: 8,
              padding: '12px 12px',
              background: nba === 'URGENT_INTERVENTION' ? '#FFFBEB' : '#F8FAFC',
              boxShadow:
                nba === 'URGENT_INTERVENTION'
                  ? '0 1px 2px rgba(245, 158, 11, 0.08)'
                  : '0 1px 2px rgba(0,0,0,0.04)',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            <div style={{ marginBottom: 8 }}>
              <div
                title={request.brain.reasons.length ? request.brain.reasons.join(' · ') : 'Operational priority (server)'}
                style={{
                  display: 'inline-flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: 2,
                  width: 'fit-content',
                  boxSizing: 'border-box',
                  padding: request.brain.priority === 'HIGH' ? '8px 14px 8px 11px' : '8px 14px',
                  borderRadius: 6,
                  lineHeight: 1.2,
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  ...brainPriorityChipStyle(request.brain.priority),
                  ...(request.brain.priority === 'HIGH' ? { borderLeft: '3px solid #F59E0B' } : {}),
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    opacity: 0.7,
                    letterSpacing: '0.5px',
                  }}
                >
                  Priority
                </span>
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 900,
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                  }}
                >
                  {request.brain.priority}
                </span>
              </div>
            </div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: '#475569',
                lineHeight: 1.35,
              }}
              title={request.brain.riskReasons.length ? request.brain.riskReasons.join(' · ') : undefined}
            >
              Risk {request.brain.riskScore} · {request.brain.nextBestAction.replace(/_/g, ' ')}
            </div>

            {nba === 'URGENT_INTERVENTION' ? (
              <div style={{ fontSize: 12, fontWeight: 700, color: '#92400E', lineHeight: 1.45 }}>
                ⚠ تدخل فوري مطلوب
              </div>
            ) : null}

            {Array.isArray(request.brain.alerts) && request.brain.alerts.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#475569', letterSpacing: 0.01 }}>
                  ⚠ Alerts
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'flex-start',
                    rowGap: 8,
                    columnGap: 8,
                  }}
                >
                  {request.brain.alerts.map((a, i) => (
                    <span
                      key={`${a}-${i}`}
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        padding: '5px 8px',
                        borderRadius: 6,
                        background: '#FFFFFF',
                        color: '#334155',
                        border: '1px solid #E2E8F0',
                        lineHeight: 1.35,
                        maxWidth: 'min(100%, 220px)',
                        boxSizing: 'border-box',
                        wordBreak: 'break-word',
                        overflowWrap: 'anywhere',
                      }}
                    >
                      ⚠ {a}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {(() => {
              const pi = request.brain.providerIntelligence;
              const hasPi =
                pi
                && (pi.signals.length > 0 || pi.recommendations.length > 0 || pi.reasons.length > 0);
              if (!hasPi) return null;
              const listStyle: CSSProperties = {
                margin: 0,
                paddingLeft: 18,
                fontSize: 10,
                color: '#475569',
                lineHeight: 1.45,
                fontWeight: 500,
              };
              return (
                <div
                  style={{
                    borderTop: '1px solid #E2E8F0',
                    paddingTop: 10,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#334155', letterSpacing: 0.01 }}>
                    Provider Intelligence
                  </div>
                  {pi.signals.length > 0 ? (
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#64748B', marginBottom: 4 }}>Signals</div>
                      <ul style={listStyle}>
                        {pi.signals.map((s, i) => (
                          <li key={`${s}-${i}`}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {pi.recommendations.length > 0 ? (
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#64748B', marginBottom: 4 }}>Recommendations</div>
                      <ul style={listStyle}>
                        {pi.recommendations.map((s, i) => (
                          <li key={`${s}-${i}`}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {pi.reasons.length > 0 ? (
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#64748B', marginBottom: 4 }}>Reasons</div>
                      <ul style={listStyle}>
                        {pi.reasons.map((s, i) => (
                          <li key={`${s}-${i}`}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              );
            })()}

            {(() => {
              const ps = request.brain.providerSuitability;
              const hasPs =
                ps && (ps.candidates.length > 0 || ps.currentProvider != null);
              if (!hasPs) return null;
              const listStylePs: CSSProperties = {
                margin: 0,
                paddingLeft: 0,
                listStyle: 'none',
                fontSize: 10,
                color: '#475569',
                lineHeight: 1.5,
                fontWeight: 500,
              };
              const recId = ps.recommendedProviderId ?? '';
              return (
                <div
                  style={{
                    borderTop: '1px solid #E2E8F0',
                    paddingTop: 10,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#334155', letterSpacing: 0.01 }}>
                    Provider Suitability
                  </div>
                  {ps.currentProvider?.providerId ? (
                    <div style={{ fontSize: 10, color: '#334155' }}>
                      Current: {ps.currentProvider.providerId} — {ps.currentProvider.score}
                    </div>
                  ) : null}
                  {ps.candidates.length > 0 ? (
                    <ul style={listStylePs}>
                      {ps.candidates.map((c, rank) => {
                        const n = rank + 1;
                        const isRec = Boolean(recId && c.providerId === recId);
                        const summary = formatProviderSuitabilityReasonSummary(c.reasons);
                        return (
                          <li
                            key={`${c.providerId}-${n}`}
                            style={{
                              padding: '4px 0',
                              fontWeight: isRec ? 800 : 500,
                              color: isRec ? '#0F172A' : '#475569',
                              borderLeft: isRec ? '3px solid #22C55E' : undefined,
                              paddingLeft: isRec ? 8 : 0,
                            }}
                          >
                            {n}) {c.providerId} — {c.score} — {summary}
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </div>
              );
            })()}

            {(() => {
              const top = request.brain?.providerSuitability?.candidates?.[0];
              if (!top || !top.providerId) return null;
              const providerId =
                typeof top.providerId === 'string' && top.providerId.trim()
                  ? top.providerId.trim()
                  : '';
              if (!providerId) return null;
              const score = Number.isFinite(top.score) ? Math.round(top.score) : null;
              const reasons = Array.isArray(top.reasons) ? top.reasons.slice(0, 2) : [];
              const confidence =
                score == null ? null : score >= 80 ? 'High' : score >= 60 ? 'Medium' : 'Low';
              return (
                <div style={{ marginBottom: 6 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#0F172A', lineHeight: 1.45 }}>
                    ⭐ Suggested: <span style={{ fontWeight: 700 }}>{providerId}</span>
                    {score != null ? ` (${score}%)` : ''}
                    {confidence != null ? ` • ${confidence} confidence` : ''}
                  </div>
                  {reasons.length > 0 ? (
                    <ul
                      style={{
                        margin: '6px 0 0',
                        paddingLeft: 18,
                        fontSize: 11,
                        color: '#64748B',
                        fontWeight: 500,
                        lineHeight: 1.4,
                      }}
                    >
                      {reasons.map((r, i) => (
                        <li key={`${i}-${r}`}>{r}</li>
                      ))}
                    </ul>
                  ) : null}
                  {confidence === 'High' ? (
                    <div style={{ fontSize: 10, color: '#64748B', marginTop: 6, fontStyle: 'italic' }}>
                      Safe to reassign if issue persists
                    </div>
                  ) : null}
                  {(() => {
                    const aar = request.brain?.providerSuitability?.autoAssignReadiness;
                    if (aar === undefined) return null;
                    if (aar.ready) {
                      return (
                        <div style={{ marginTop: 6 }}>
                          <div
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              color: '#15803D',
                              lineHeight: 1.35,
                            }}
                          >
                            ⚡ Auto-assign ready
                          </div>
                          <button
                            type="button"
                            title="System readiness passed. Opens assign flow for operator confirmation."
                            onClick={() => openAssignVendor(request.id)}
                            style={{
                              marginTop: 6,
                              width: 'fit-content',
                              padding: '6px 10px',
                              borderRadius: 6,
                              fontSize: 11,
                              fontWeight: 700,
                              lineHeight: 1.35,
                              cursor: 'pointer',
                              border: '1px solid #86EFAC',
                              background: '#F0FDF4',
                              color: '#166534',
                            }}
                          >
                            Auto Assign (Recommended)
                          </button>
                        </div>
                      );
                    }
                    const notReadyMsg = aar.reason.trim() ? aar.reason : 'Readiness checks not passed';
                    return (
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          marginTop: 6,
                          color: '#92400E',
                          lineHeight: 1.35,
                        }}
                      >
                        Auto-assign not ready: {notReadyMsg}
                      </div>
                    );
                  })()}
                </div>
              );
            })()}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#475569', letterSpacing: 0.01 }}>
                💡 Actions
              </div>
              {nba === 'REVIEW_ESCALATION' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}>
                  <Link
                    href="/escalations"
                    style={{
                      padding: '7px 10px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 700,
                      lineHeight: 1.35,
                      textDecoration: 'none',
                      display: 'inline-block',
                      border: '1px solid #CBD5E1',
                      background: '#FFFFFF',
                      color: '#0F172A',
                    }}
                  >
                    Open Escalation Panel
                  </Link>
                  <button
                    type="button"
                    disabled={!request.vendorId}
                    title={
                      !request.vendorId
                        ? 'Assign a provider before reassign'
                        : brainReassignGuidancePascal.tooltip
                    }
                    onClick={() => request.vendorId && openReassignVendor(request.id, request.vendorId)}
                    style={{
                      width: 'fit-content',
                      minWidth: 180,
                      padding: '7px 10px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 700,
                      lineHeight: 1.35,
                      cursor: request.vendorId ? 'pointer' : 'not-allowed',
                      opacity: request.vendorId ? 1 : 0.55,
                      ...(request.vendorId ? DASHBOARD_PRIMARY_ACTION_BTN : { border: '1px solid #E2E8F0', background: '#F1F5F9', color: '#64748B' }),
                    }}
                  >
                    {brainReassignGuidancePascal.children}
                  </button>
                  <button
                    type="button"
                    onClick={() => void copyProviderContactRef(request)}
                    style={{
                      width: 'fit-content',
                      padding: '6px 10px',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: '1px solid #CBD5E1',
                      background: '#FFFFFF',
                      color: '#334155',
                    }}
                  >
                    Contact Provider
                  </button>
                </div>
              ) : null}
              {nba === 'URGENT_INTERVENTION' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}>
                  <button
                    type="button"
                    disabled={reassignBlockedTerminal}
                    title={
                      reassignBlockedTerminal
                        ? 'Request is closed — reassign unavailable'
                        : !request.vendorId
                          ? 'No vendor assigned — opens assign provider'
                          : brainReassignGuidancePascal.tooltip
                    }
                    onClick={() => {
                      if (reassignBlockedTerminal) return;
                      if (request.vendorId) {
                        openReassignVendor(request.id, request.vendorId);
                      } else {
                        openAssignVendor(request.id);
                      }
                    }}
                    style={{
                      width: 'fit-content',
                      minWidth: 180,
                      padding: '7px 10px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 700,
                      lineHeight: 1.35,
                      cursor: reassignBlockedTerminal ? 'not-allowed' : 'pointer',
                      opacity: reassignBlockedTerminal ? 0.55 : 1,
                      ...(reassignBlockedTerminal
                        ? { border: '1px solid #E2E8F0', background: '#F1F5F9', color: '#64748B' }
                        : urgentReassignMode
                          ? {
                              background: '#EA580C',
                              color: '#FFFFFF',
                              border: '1px solid #C2410C',
                            }
                          : DASHBOARD_PRIMARY_ACTION_BTN),
                    }}
                  >
                    {brainReassignGuidancePascal.children}
                  </button>
                  <button
                    type="button"
                    onClick={() => openEscalateForm(request.id)}
                    style={{
                      width: 'fit-content',
                      padding: '6px 10px',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: '1px solid #CBD5E1',
                      background: '#FFFFFF',
                      color: '#334155',
                    }}
                  >
                    Escalate further (manual)
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push(`/requests/${encodeURIComponent(request.id)}/timeline`)}
                    style={{
                      width: 'fit-content',
                      padding: '6px 10px',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: '1px solid #CBD5E1',
                      background: '#FFFFFF',
                      color: '#334155',
                    }}
                  >
                    Open timeline
                  </button>
                </div>
              ) : null}
              {nba === 'ASSIGN_PROVIDER' ? (
                <>
                  <button
                    type="button"
                    aria-label="Assign provider (same as row Assign Vendor)"
                    title={
                      brainSuggestedAssignVendor.assignVendorTooltip
                        ?? 'Opens the same assign vendor flow as the row Assign Vendor button'
                    }
                    onClick={() => openAssignVendor(request.id)}
                    style={{
                      width: 'fit-content',
                      minWidth: 180,
                      boxSizing: 'border-box',
                      marginTop: 4,
                      padding: '7px 10px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 700,
                      lineHeight: 1.35,
                      cursor: 'pointer',
                      ...DASHBOARD_PRIMARY_ACTION_BTN,
                    }}
                  >
                    {brainSuggestedAssignVendor.assignVendorLabel}
                  </button>
                  {brainOtherRecommendations.length > 0 ? (
                    <div
                      style={{ fontSize: 10, color: '#94A3B8', lineHeight: 1.45 }}
                      title={brainOtherRecommendations.join(' · ')}
                    >
                      {brainOtherRecommendations.join(' · ')}
                    </div>
                  ) : null}
                </>
              ) : null}
              {nba === 'REASSIGN_PROVIDER' ? (
                <button
                  type="button"
                  title={
                    request.vendorId
                      ? brainReassignGuidanceLower.tooltip
                      : brainSuggestedAssignVendor.assignVendorTooltip
                  }
                  onClick={() => (request.vendorId ? openReassignVendor(request.id, request.vendorId) : openAssignVendor(request.id))}
                  style={{
                    width: 'fit-content',
                    minWidth: 180,
                    padding: '7px 10px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 700,
                    lineHeight: 1.35,
                    cursor: 'pointer',
                    ...DASHBOARD_PRIMARY_ACTION_BTN,
                  }}
                >
                  {request.vendorId ? brainReassignGuidanceLower.children : brainSuggestedAssignVendor.assignVendorLabel}
                </button>
              ) : null}
              {nba === 'CLEAR_ESCALATION' ? (
                <button
                  type="button"
                  disabled={resolveEscalationSubmittingRequestId === request.id}
                  onClick={() => void quickResolveEscalation(request.id)}
                  style={{
                    width: 'fit-content',
                    padding: '7px 10px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 700,
                    lineHeight: 1.35,
                    cursor: 'pointer',
                    ...DASHBOARD_PRIMARY_ACTION_BTN,
                  }}
                >
                  Clear escalation
                </button>
              ) : null}
              {nba === 'MONITOR_SLA' ? (
                <>
                  <div style={{ fontSize: 11, color: '#64748B', lineHeight: 1.45, fontWeight: 500 }}>Monitor SLA</div>
                  {Array.isArray(request.brain.recommendations) && request.brain.recommendations.length > 0 ? (
                    <div
                      style={{ fontSize: 10, color: '#94A3B8', lineHeight: 1.45 }}
                      title={request.brain.recommendations.join(' · ')}
                    >
                      {request.brain.recommendations.join(' · ')}
                    </div>
                  ) : null}
                </>
              ) : null}
              {nba !== 'REVIEW_ESCALATION'
              && nba !== 'URGENT_INTERVENTION'
              && nba !== 'ASSIGN_PROVIDER'
              && nba !== 'REASSIGN_PROVIDER'
              && nba !== 'CLEAR_ESCALATION'
              && nba !== 'MONITOR_SLA'
              && Array.isArray(request.brain.recommendations)
              && request.brain.recommendations.length > 0 ? (
                brainHasAssignProviderReco ? (
                  <>
                    <button
                      type="button"
                      aria-label="Assign provider (same as row Assign Vendor)"
                      title={
                        brainSuggestedAssignVendor.assignVendorTooltip
                          ?? 'Opens the same assign vendor flow as the row Assign Vendor button'
                      }
                      onClick={() => openAssignVendor(request.id)}
                      style={{
                        width: 'fit-content',
                        minWidth: 180,
                        boxSizing: 'border-box',
                        marginTop: 4,
                        padding: '7px 10px',
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 700,
                        lineHeight: 1.35,
                        cursor: 'pointer',
                        ...DASHBOARD_PRIMARY_ACTION_BTN,
                      }}
                    >
                      {brainSuggestedAssignVendor.assignVendorLabel}
                    </button>
                    {brainOtherRecommendations.length > 0 ? (
                      <div
                        style={{ fontSize: 10, color: '#94A3B8', lineHeight: 1.45 }}
                        title={brainOtherRecommendations.join(' · ')}
                      >
                        {brainOtherRecommendations.join(' · ')}
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div
                    style={{ fontSize: 10, color: '#94A3B8', lineHeight: 1.45 }}
                    title={request.brain.recommendations.join(' · ')}
                  >
                    {request.brain.recommendations.join(' · ')}
                  </div>
                )
              ) : null}
            </div>
          </div>
        ) : null}
        {slaBadges || request.needsAttention ? (
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
            {request.needsAttention ? (
              <span
                title={vendorAttentionTitle(request) || 'يحتاج تدخل — راجع رموز ووصف الاهتمام'}
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: 4,
                  ...attentionSeverityBadgeStyle(request.attentionSeverity ?? 'MEDIUM'),
                }}
              >
                ⚠ يحتاج تدخل
              </span>
            ) : null}
          </div>
        ) : null}
        {request.needsAttention && vendorAttentionTitle(request) ? (
          <div
            style={{ fontSize: 10, color: '#64748B', lineHeight: 1.45, maxWidth: '100%', wordBreak: 'break-word' }}
            title={vendorAttentionTitle(request)}
          >
            {vendorAttentionTitle(request)}
          </div>
        ) : null}
        {request.lastEscalation ? (
          <div
            style={{ fontSize: 10, color: '#475569', lineHeight: 1.45, maxWidth: '100%', wordBreak: 'break-word' }}
            title={formatDashboardLastEscalationTitle(request.lastEscalation)}
          >
            {formatDashboardLastEscalationLine(request.lastEscalation)}
          </div>
        ) : null}
        {typeof request.escalationHistoryCount === 'number' && request.escalationHistoryCount > 0 ? (
          <div
            style={{ fontSize: 10, color: '#64748B' }}
            title={`عدد سجلات TicketAction من نوع ESCALATE لهذا الطلب: ${request.escalationHistoryCount}`}
          >
            عدد التصعيدات: {request.escalationHistoryCount}
          </div>
        ) : null}
        <div style={{ color: '#64748B', fontSize: 14 }}>
          tenant: {request.tenantId} | vendor: {request.vendorId ?? 'unassigned'}
        </div>
        <div style={{ color: '#64748B', fontSize: 14 }}>
          <span>{formatDate(request.createdAt)}</span>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => router.push(`/requests/${encodeURIComponent(request.id)}/timeline`)}
            style={{ padding: '6px 10px' }}
          >
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
          {(request.sla?.escalationLevel ?? 0) > 0 ? (
            <button
              type="button"
              disabled={resolveEscalationSubmittingRequestId === request.id}
              title="POST command-center/requests/:id/resolve-escalation — يصفّر escalationLevel دون تغيير حالة الطلب"
              onClick={() => void quickResolveEscalation(request.id)}
              style={{ padding: '4px 8px', fontSize: 11 }}
            >
              Clear escalation
            </button>
          ) : null}
          {rowStatus === 'pending'
          && !request.vendorId
          && nba !== 'REVIEW_ESCALATION'
          && nba !== 'URGENT_INTERVENTION' ? (
            <button
              type="button"
              disabled={assignSubmittingRequestId === request.id}
              onClick={() => openAssignVendor(request.id)}
              style={{ width: 140, padding: 8, ...DASHBOARD_PRIMARY_ACTION_BTN }}
            >
              {assignForId === request.id ? 'Cancel Assign' : 'Assign Vendor'}
            </button>
          ) : null}
          {rowStatus === 'assigned' ? (
            <span style={{ fontSize: 12, color: '#166534', fontWeight: 600 }}>Assigned</span>
          ) : null}
          {rowStatus === 'assigned' && rawStatus === 'ASSIGNED' ? (
            <button
              type="button"
              disabled={reassignSubmittingRequestId === request.id}
              title={reassignForId === request.id ? undefined : brainReassignGuidancePascal.tooltip}
              onClick={() => openReassignVendor(request.id, request.vendorId)}
              style={{ width: 160, padding: 8, ...DASHBOARD_PRIMARY_ACTION_BTN }}
            >
              {reassignForId === request.id ? 'Cancel Reassign' : brainReassignGuidancePascal.children}
            </button>
          ) : null}
          {rowStatus === 'assigned' && rawStatus === 'ASSIGNED' ? (
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
          {rowStatus === 'in_progress' && rawStatus === 'IN_PROGRESS' ? (
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
          {rowStatus === 'completed' ? (
            <span style={{ fontSize: 12, color: '#15803D', fontWeight: 600 }}>Completed</span>
          ) : null}
          {rowStatus === 'unknown' ? (
            <span style={{ fontSize: 12, color: '#B45309', fontWeight: 600 }} title="Upstream status could not be mapped">
              Unknown status
            </span>
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
              <span>Select provider</span>
              <select
                value={assignVendorSelection}
                onChange={(e) => setAssignVendorSelection(e.target.value)}
                style={{ padding: 6, border: '1px solid #ddd', borderRadius: 4, maxWidth: 280 }}
              >
                {providerOptions.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.name || provider.id} ({provider.id})
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              disabled={assignSubmittingRequestId === request.id || !assignVendorSelection}
              onClick={() => void assignVendor(request.id, assignVendorSelection)}
              style={{ padding: '6px 12px', width: 'fit-content' }}
            >
              {assignSubmittingRequestId === request.id ? 'Assigning…' : 'Confirm Assign'}
            </button>
          </div>
        ) : null}
        {reassignForId === request.id ? (
          <div style={{ display: 'grid', gap: 6, borderTop: '1px solid #E5EDF5', paddingTop: 8 }}>
            <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
              <span>Select replacement provider</span>
              <select
                value={reassignVendorSelection}
                onChange={(e) => setReassignVendorSelection(e.target.value)}
                style={{ padding: 6, border: '1px solid #ddd', borderRadius: 4, maxWidth: 320 }}
              >
                {providerOptions
                  .filter((provider) => provider.id !== request.vendorId)
                  .map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {provider.name || provider.id} ({provider.id})
                    </option>
                  ))}
              </select>
            </label>
            <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
              <span>Reason (optional)</span>
              <input
                value={reassignReason}
                onChange={(e) => setReassignReason(e.target.value)}
                placeholder="Operational reason for reassignment"
                style={{ padding: 6, border: '1px solid #ddd', borderRadius: 4, maxWidth: 420 }}
              />
            </label>
            <button
              type="button"
              disabled={reassignSubmittingRequestId === request.id || !reassignVendorSelection}
              onClick={() => void reassignVendor(request.id, reassignVendorSelection, reassignReason)}
              style={{ padding: '6px 12px', width: 'fit-content' }}
            >
              {reassignSubmittingRequestId === request.id ? 'Reassigning…' : 'Confirm Reassign'}
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
                  Requests (sorted by created time)
                  <span style={{ fontWeight: 400, color: '#64748B', fontSize: 13 }}>
                    {' '}
                    ({sortCreatedAt === 'desc' ? 'newest first' : 'oldest first'})
                  </span>
                </h3>
                <div style={{ display: 'grid', gap: 12 }}>{displayedRequests.map(renderRequestRow)}</div>
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
