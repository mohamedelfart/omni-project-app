import { Injectable } from '@nestjs/common';
import { BookingStatus, PaymentStatus, Prisma, PropertyStatus, UnifiedRequestStatus } from '@prisma/client';
import type {
  CommandCenterBrainAutoAssignReadiness,
  CommandCenterBrainProviderIntelligence,
  CommandCenterBrainProviderSuitability,
  CommandCenterBrainProviderSuitabilityCandidate,
  CommandCenterBrainReadModel,
} from '@quickrent/shared-types';
import type { CommandCenterRequestSlaSnapshot } from './dto/command-center-request-sla.dto';
import { AuditTrailService } from '../audit-trail/audit-trail.service';
import { LocationService } from '../location/location.service';
import { OperatorPolicyService } from '../operator-policy/operator-policy.service';
import { PrismaService } from '../prisma/prisma.service';
import { OrchestratorService } from '../orchestrator/orchestrator.service';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { TicketActionsService } from '../ticket-actions/ticket-actions.service';
import { UnifiedRequestsService } from '../unified-requests/unified-requests.service';
import { resolveUnifiedRequestExecutionSite } from '../unified-requests/execution-site.resolver';
import { DecisionSupportService } from './decision-support.service';

type DashboardFilters = {
  countryCode?: string;
  startDate?: string;
  endDate?: string;
  assetId?: string;
  serviceType?: string;
  status?: string;
  vendorId?: string;
};

/** Last `TicketAction` ESCALATE snapshot for Command Center list / operations read-model (Step 7C). */
export type CommandCenterLastEscalation = {
  level: number;
  reason: string;
  actor: string;
  createdAt: string;
  source: string;
};

export type {
  CommandCenterBrainProviderIntelligence,
  CommandCenterBrainProviderSuitability,
  CommandCenterBrainReadModel,
} from '@quickrent/shared-types';

function toDbUnifiedRequestStatus(status?: string): string | undefined {
  if (!status) {
    return undefined;
  }
  const normalized = status.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }
  if (normalized === 'pending') {
    return 'SUBMITTED';
  }
  if (normalized === 'assigned') {
    return 'ASSIGNED';
  }
  if (normalized === 'in_progress') {
    return 'IN_PROGRESS';
  }
  if (normalized === 'completed') {
    return 'COMPLETED';
  }
  return status;
}

function normalizeCountryCandidates(countryCode?: string): string[] | undefined {
  if (!countryCode) {
    return undefined;
  }
  const raw = countryCode.trim();
  if (!raw) {
    return undefined;
  }
  const upper = raw.toUpperCase();
  const candidates = new Set<string>([raw, upper]);
  if (upper === 'QA') {
    candidates.add('Qatar');
  }
  return Array.from(candidates);
}

/** Default: unassigned open requests older than this surface as attention (read-model only). */
const UNASSIGNED_TOO_LONG_MS = 2 * 60 * 60 * 1000;

/** When `responseDueAt` is null but a vendor is expected, age beyond this implies response risk. */
const VENDOR_RESPONSE_HEURISTIC_MS = 45 * 60 * 1000;

/** Brain v3.1: min age before assigned/in-progress can count as stuck execution (read-model only). */
const EXECUTION_STUCK_DELAY_MS = 2 * 60 * 1000;

/** Brain v5: rolling window for provider aggregates (read-only queries). */
const PROVIDER_SUITABILITY_WINDOW_MS = 72 * 60 * 60 * 1000;
const PROVIDER_SUITABILITY_POOL_MAX = 20;
const PROVIDER_SUITABILITY_RECENT_ROWS_CAP = 3000;

const UNIFIED_OPEN_STATUS_FILTER = {
  notIn: [
    UnifiedRequestStatus.COMPLETED,
    UnifiedRequestStatus.CANCELLED,
    UnifiedRequestStatus.REJECTED,
    UnifiedRequestStatus.FAILED,
  ],
};

const TERMINAL_ATTENTION_STATUSES = new Set(['COMPLETED', 'CANCELLED', 'REJECTED', 'FAILED']);

type AttentionSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

type VendorAttentionReadModel = {
  needsAttention: boolean;
  attentionCodes: string[];
  attentionLabel: string;
  attentionSeverity: AttentionSeverity;
};

const ATTENTION_CODE_SEVERITY: Record<string, AttentionSeverity> = {
  UNASSIGNED_TOO_LONG: 'MEDIUM',
  ESCALATED: 'MEDIUM',
  VENDOR_NOT_STARTED: 'HIGH',
  RESPONSE_OVERDUE: 'HIGH',
  COMPLETION_OVERDUE: 'CRITICAL',
};

const ATTENTION_CODE_LABEL: Record<string, string> = {
  UNASSIGNED_TOO_LONG: 'Unassigned beyond threshold',
  ESCALATED: 'Escalation active (command center)',
  VENDOR_NOT_STARTED: 'Vendor has not started execution',
  RESPONSE_OVERDUE: 'Response window overdue',
  COMPLETION_OVERDUE: 'Completion window overdue',
};

function maxAttentionSeverity(a: AttentionSeverity, b: AttentionSeverity): AttentionSeverity {
  const order: AttentionSeverity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  return order[Math.max(order.indexOf(a), order.indexOf(b))] ?? 'HIGH';
}

/** Matches `CommandCenterService.isActiveStatus` — tickets still in operational lifecycle. */
const IS_ACTIVE_UNIFIED_STATUS = new Set([
  'SUBMITTED',
  'UNDER_REVIEW',
  'QUEUED',
  'ASSIGNED',
  'EN_ROUTE',
  'IN_PROGRESS',
  'AWAITING_PAYMENT',
  'ESCALATED',
]);

/**
 * Derived read-model only: no DB writes, no status changes.
 * Signal rules: Step 1A vendor / SLA attention + Step 7B (`escalationLevel` > 0, non-terminal → ESCALATED).
 */
function computeVendorAttentionReadModel(request: {
  createdAt: Date;
  status: string;
  vendorId: string | null;
  firstResponseAt: Date | null;
  completedAt: Date | null;
  responseDueAt: Date | null;
  completionDueAt: Date | null;
  escalationLevel?: number | null;
}): VendorAttentionReadModel {
  const now = Date.now();
  const codeSet = new Set<string>();
  const { status } = request;
  const isTerminal = TERMINAL_ATTENTION_STATUSES.has(status);

  if (!request.vendorId && !isTerminal) {
    if (now - request.createdAt.getTime() > UNASSIGNED_TOO_LONG_MS) {
      codeSet.add('UNASSIGNED_TOO_LONG');
    }
  }

  const responseDuePassed =
    request.responseDueAt != null && request.responseDueAt.getTime() < now;
  const completionDuePassed =
    request.completionDueAt != null && request.completionDueAt.getTime() < now;

  if (!isTerminal && responseDuePassed && request.firstResponseAt == null) {
    codeSet.add('RESPONSE_OVERDUE');
  }

  if (!isTerminal && completionDuePassed && request.completedAt == null) {
    codeSet.add('COMPLETION_OVERDUE');
  }

  if (
    request.vendorId
    && request.firstResponseAt == null
    && status !== 'IN_PROGRESS'
    && !isTerminal
    && IS_ACTIVE_UNIFIED_STATUS.has(status)
  ) {
    const heuristicResponseOverdue =
      request.responseDueAt == null && now - request.createdAt.getTime() > VENDOR_RESPONSE_HEURISTIC_MS;
    if (responseDuePassed || heuristicResponseOverdue) {
      codeSet.add('VENDOR_NOT_STARTED');
    }
  }

  const escalationLevel = request.escalationLevel ?? 0;
  if (!isTerminal && escalationLevel > 0) {
    codeSet.add('ESCALATED');
  }

  const attentionCodes = Array.from(codeSet);
  if (!attentionCodes.length) {
    return {
      needsAttention: false,
      attentionCodes: [],
      attentionLabel: '',
      attentionSeverity: 'LOW',
    };
  }

  let attentionSeverity: AttentionSeverity = 'LOW';
  for (const code of attentionCodes) {
    const sev = ATTENTION_CODE_SEVERITY[code] ?? 'MEDIUM';
    attentionSeverity = maxAttentionSeverity(attentionSeverity, sev);
  }

  const attentionLabel = attentionCodes.map((c) => ATTENTION_CODE_LABEL[c] ?? c).join(' · ');

  return {
    needsAttention: true,
    attentionCodes,
    attentionLabel,
    attentionSeverity,
  };
}

/** V3.1 stuck execution (shared with suitability current-provider context). */
function computeCommandCenterStuckExecution(input: {
  status: string;
  vendorId: string | null | undefined;
  attentionCodes: string[];
  createdAt?: Date | string | null;
  firstResponseAt?: Date | string | null;
}): boolean {
  const isTerminal = TERMINAL_ATTENTION_STATUSES.has(input.status);
  const vendorId = (input.vendorId ?? '').trim();
  const attentionCodes = input.attentionCodes ?? [];
  const now = Date.now();
  const createdTs = input.createdAt ? new Date(input.createdAt).getTime() : null;
  const firstResponseTs = input.firstResponseAt ? new Date(input.firstResponseAt).getTime() : null;
  const executionStartTs = firstResponseTs ?? createdTs;
  const hasExceededExecutionDelay =
    executionStartTs != null && now - executionStartTs > EXECUTION_STUCK_DELAY_MS;
  const isAssignedOrInProgress = input.status === 'ASSIGNED' || input.status === 'IN_PROGRESS';
  return (
    !isTerminal
    && isAssignedOrInProgress
    && !!vendorId
    && hasExceededExecutionDelay
    && (attentionCodes.includes('VENDOR_NOT_STARTED') || input.firstResponseAt == null)
  );
}

/** Brain v4 — qualitative provider read-model only (no scores, ranks, or auto-selection). */
function buildCommandCenterProviderIntelligence(params: {
  isTerminal: boolean;
  vendorId: string;
  stuckExecution: boolean;
  slaBreached: boolean;
  escDb: number;
  status: string;
}): CommandCenterBrainProviderIntelligence {
  const { isTerminal, vendorId, stuckExecution, slaBreached, escDb, status } = params;
  const signals: string[] = [];
  const pushSignal = (s: string) => {
    if (!signals.includes(s)) signals.push(s);
  };
  const recommendations: string[] = [];
  const pushReco = (s: string) => {
    if (!recommendations.includes(s)) recommendations.push(s);
  };
  const reasons: string[] = [];
  const pushReason = (s: string) => {
    if (!reasons.includes(s)) reasons.push(s);
  };

  if (isTerminal) {
    return { signals: [], recommendations: [], reasons: [] };
  }

  if (!vendorId) pushSignal('UNASSIGNED');
  if (stuckExecution) pushSignal('PROVIDER_NOT_RESPONDING');
  if (slaBreached) pushSignal('SLA_RISK');
  if (escDb >= 1) pushSignal('ESCALATED');
  if (escDb >= 2) pushSignal('HIGH_ESCALATION');

  const hasPriorSignalBlock =
    !vendorId || stuckExecution || slaBreached || escDb >= 1;
  if (!hasPriorSignalBlock && vendorId) {
    pushSignal('PROVIDER_ACTIVE_MONITORING');
  }

  if (!vendorId) {
    pushReco('Assign an available provider');
    pushReco('Use provider assignment before SLA pressure builds');
  }
  if (stuckExecution) {
    pushReco('Contact provider before reassignment');
    pushReco('Reassign if provider cannot start immediately');
    pushReco('Prefer a provider with lower active load when available');
  }
  if (slaBreached) {
    pushReco('Review SLA breach reason');
    pushReco('Prioritize provider follow-up');
  }
  if (escDb === 1) {
    pushReco('Review escalation reason');
    pushReco('Confirm provider commitment');
  }
  if (escDb >= 2) {
    pushReco('Escalate to supervisor');
    pushReco('Reassign to a trusted provider if execution is blocked');
    pushReco('Contact tenant with status update');
  }

  const isAssignedOrInProgress = status === 'ASSIGNED' || status === 'IN_PROGRESS';
  if (vendorId && isAssignedOrInProgress && !stuckExecution && !slaBreached && escDb < 1) {
    pushReco('Continue monitoring provider execution');
  }

  if (!vendorId) {
    pushReason('No provider is assigned to this request.');
  }
  if (stuckExecution) {
    pushReason('Provider has not started after the execution delay window.');
  }
  if (slaBreached) {
    pushReason('SLA breach is active for this request.');
  }
  if (escDb >= 1) {
    pushReason('Escalation level indicates command center intervention is needed.');
  }
  if (escDb >= 2) {
    pushReason('Escalation is at level 2 or higher — command center should treat this as urgent.');
  }
  if (vendorId && isAssignedOrInProgress && !stuckExecution && !slaBreached && escDb < 1) {
    pushReason('Request is assigned and execution monitoring is active.');
  }

  return { signals, recommendations, reasons };
}

type ProviderSuitabilityMetricsInternal = {
  activeOpenCount: number;
  avgFirstResponseMs: number | null;
  recentSlaBreachCount: number;
  recentEscalatedCount: number;
  recentCompletedCount: number;
};

/** Brain v5 — additive 0–100 score from UnifiedRequest aggregates only (read-model). */
function scoreProviderSuitabilityFromMetrics(m: ProviderSuitabilityMetricsInternal): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];
  const push = (r: string) => {
    if (!reasons.includes(r)) reasons.push(r);
  };

  if (m.activeOpenCount <= 2) {
    score += 25;
    push('Lower active load');
  } else if (m.activeOpenCount <= 5) {
    score += 15;
    push('Moderate active load');
  } else {
    score += 5;
    push('High active load');
  }

  if (m.avgFirstResponseMs != null && Number.isFinite(m.avgFirstResponseMs)) {
    if (m.avgFirstResponseMs <= 5 * 60 * 1000) {
      score += 20;
      push('Fast initial response');
    } else if (m.avgFirstResponseMs <= 15 * 60 * 1000) {
      score += 10;
      push('Moderate initial response');
    } else {
      push('Slow initial response');
    }
  } else {
    push('No recent first-response samples');
  }

  if (m.recentSlaBreachCount === 0) {
    score += 20;
    push('Strong SLA adherence');
  } else if (m.recentSlaBreachCount <= 2) {
    score += 10;
    push('Some SLA pressure');
  } else {
    push('Frequent SLA breaches');
  }

  if (m.recentEscalatedCount <= 1) {
    score += 15;
    push('Low escalation rate');
  } else if (m.recentEscalatedCount <= 3) {
    score += 8;
    push('Elevated escalation rate');
  } else {
    push('High escalation rate');
  }

  if (m.recentCompletedCount >= 5) {
    score += 20;
    push('Proven completion record');
  } else if (m.recentCompletedCount >= 2) {
    score += 10;
    push('Limited completion history');
  } else {
    score += 5;
    push('Limited completion history');
  }

  return { score: Math.max(0, Math.min(100, Math.round(score))), reasons };
}

const V81_CITY_FILTER_FALLBACK_REASON = 'No providers in same city — fallback applied';

const V82_DISTANCE_NA_REASON = 'Distance not available';

/** Earth mean radius (km) for haversine. */
const V82_EARTH_RADIUS_KM = 6371;

function haversineDistanceKm(lat1: unknown, lng1: unknown, lat2: unknown, lng2: unknown): number | null {
  if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) return null;
  if (typeof lat1 !== 'number' || typeof lng1 !== 'number' || typeof lat2 !== 'number' || typeof lng2 !== 'number') {
    return null;
  }
  if (!Number.isFinite(lat1) || !Number.isFinite(lng1) || !Number.isFinite(lat2) || !Number.isFinite(lng2)) {
    return null;
  }
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
  return V82_EARTH_RADIUS_KM * c;
}

/** Read-model only: structured “why recommended” (not in shared-types yet). */
type SuitabilityCandidateDecisionExplanation = {
  factors: string[];
  weights: { baseScore: number; distanceScore?: number };
};

function buildSuitabilityCandidateDecisionExplanation(input: {
  reasons: readonly string[];
  baseScore: number;
  distanceKm?: number;
  distanceScore?: number;
}): SuitabilityCandidateDecisionExplanation {
  const factors: string[] = [];
  if (input.reasons.includes('Lower active load')) {
    factors.push('Low load');
  }
  if (input.reasons.includes('Slow initial response')) {
    factors.push('Response latency risk');
  }
  if (typeof input.distanceKm === 'number' && Number.isFinite(input.distanceKm)) {
    if (input.distanceKm < 1) {
      factors.push('Very close to property');
    } else if (input.distanceKm < 5) {
      factors.push('Near property');
    } else {
      factors.push('Far from property');
    }
  }
  const weights: { baseScore: number; distanceScore?: number } = { baseScore: input.baseScore };
  if (typeof input.distanceScore === 'number' && Number.isFinite(input.distanceScore)) {
    weights.distanceScore = input.distanceScore;
  }
  return { factors, weights };
}

/** V9 Step 1 — read-model preview only; never triggers assignment. */
function computeProviderSuitabilityAutoAssignReadiness(input: {
  status: string;
  vendorId: string | null;
  escalationLevelDb: number;
  suitability: Pick<CommandCenterBrainProviderSuitability, 'candidates' | 'recommendedProviderId'>;
}): CommandCenterBrainAutoAssignReadiness {
  const { status, vendorId, escalationLevelDb, suitability } = input;
  if (TERMINAL_ATTENTION_STATUSES.has(status)) {
    return { ready: false, reason: 'Terminal request' };
  }
  const vid = typeof vendorId === 'string' ? vendorId.trim() : '';
  if (vid) {
    return { ready: false, reason: 'Request already assigned' };
  }
  if ((escalationLevelDb ?? 0) >= 2) {
    return { ready: false, reason: 'High escalation requires manual review' };
  }
  const recId = suitability.recommendedProviderId?.trim() ?? '';
  const top = suitability.candidates[0];
  if (!recId || !top || top.providerId !== recId) {
    return { ready: false, reason: 'No recommended provider' };
  }
  const confidenceOk =
    top.score >= 80 ||
    (typeof top.finalScore === 'number' && Number.isFinite(top.finalScore) && top.finalScore >= 80);
  if (!confidenceOk) {
    return { ready: false, reason: 'Confidence below auto-assign threshold' };
  }
  if (typeof top.distanceKm !== 'number' || !Number.isFinite(top.distanceKm) || top.distanceKm > 5) {
    return { ready: false, reason: 'Provider is too far' };
  }
  return { ready: true, reason: '' };
}

function buildProviderSuitabilityReadModel(
  metricsByProvider: Map<string, ProviderSuitabilityMetricsInternal>,
  poolIds: readonly string[],
  currentVendorId: string | null,
  stuckExecution: boolean,
  cityFilter?: {
    targetCity: string | null;
    providerCityById: ReadonlyMap<string, string | null>;
  },
  distanceContext?: {
    target: { lat: number; lng: number } | null;
    providerLocationById: ReadonlyMap<string, { lat: number; lng: number }>;
  },
  readinessRow?: {
    status: string;
    vendorId: string | null;
    escalationLevelDb: number;
  },
): CommandCenterBrainProviderSuitability | undefined {
  if (poolIds.length === 0 && !(currentVendorId?.trim())) {
    return undefined;
  }

  const scoreOne = (id: string) => {
    const m = metricsByProvider.get(id) ?? {
      activeOpenCount: 0,
      avgFirstResponseMs: null,
      recentSlaBreachCount: 0,
      recentEscalatedCount: 0,
      recentCompletedCount: 0,
    };
    return { id, ...scoreProviderSuitabilityFromMetrics(m) };
  };

  let poolForRanking = [...poolIds];
  let cityFallbackApplied = false;
  const tc = cityFilter?.targetCity?.trim() ?? '';
  if (tc && cityFilter?.providerCityById) {
    const filtered = poolIds.filter((id) => {
      const pc = cityFilter.providerCityById.get(id);
      return typeof pc === 'string' && pc.trim() !== '' && pc.trim() === tc;
    });
    if (filtered.length > 0) {
      poolForRanking = [...filtered];
    } else {
      cityFallbackApplied = true;
    }
  }

  const targetCoords = distanceContext?.target ?? null;
  const providerLocationById = distanceContext?.providerLocationById;

  const ranked = poolForRanking
    .map((id) => {
      const base = scoreOne(id);
      const reasons = [...base.reasons];
      let rankScore = base.score;
      let distanceKm: number | undefined;
      let distanceScore: number | undefined;
      let finalScore: number | undefined;

      if (!targetCoords) {
        reasons.push(V82_DISTANCE_NA_REASON);
      } else {
        const loc = providerLocationById?.get(id);
        if (!loc) {
          reasons.push(V82_DISTANCE_NA_REASON);
        } else {
          const dKm = haversineDistanceKm(targetCoords.lat, targetCoords.lng, loc.lat, loc.lng);
          if (dKm == null || !Number.isFinite(dKm)) {
            reasons.push(V82_DISTANCE_NA_REASON);
          } else {
            distanceKm = dKm;
            distanceScore = Math.max(0, 100 - dKm * 10);
            rankScore = Math.round(base.score * 0.5 + distanceScore * 0.5);
            finalScore = rankScore;
            reasons.push(`Near property (${dKm.toFixed(1)} km)`);
          }
        }
      }

      return { id: base.id, score: base.score, reasons, rankScore, distanceKm, distanceScore, finalScore };
    })
    .sort((a, b) => b.rankScore - a.rankScore || a.id.localeCompare(b.id));

  type CandidateWithExplanation = CommandCenterBrainProviderSuitabilityCandidate & {
    explanation: SuitabilityCandidateDecisionExplanation;
  };

  let candidates: CandidateWithExplanation[] = ranked.slice(0, 3).map((r) => {
    const explanation = buildSuitabilityCandidateDecisionExplanation({
      reasons: r.reasons,
      baseScore: r.score,
      distanceKm: r.distanceKm,
      distanceScore: r.distanceScore,
    });
    const c: CandidateWithExplanation = {
      providerId: r.id,
      score: r.score,
      reasons: r.reasons,
      explanation,
    };
    if (
      typeof r.distanceKm === 'number' &&
      Number.isFinite(r.distanceKm) &&
      r.distanceScore !== undefined &&
      r.finalScore !== undefined
    ) {
      c.distanceKm = r.distanceKm;
      c.distanceScore = r.distanceScore;
      c.finalScore = r.finalScore;
    }
    return c;
  });
  if (cityFallbackApplied) {
    candidates = candidates.map((c) => {
      const reasons = c.reasons.includes(V81_CITY_FILTER_FALLBACK_REASON)
        ? c.reasons
        : [...c.reasons, V81_CITY_FILTER_FALLBACK_REASON];
      return {
        ...c,
        reasons,
        explanation: buildSuitabilityCandidateDecisionExplanation({
          reasons,
          baseScore: c.score,
          distanceKm: c.distanceKm,
          distanceScore: c.distanceScore,
        }),
      };
    });
  }
  const recommendedProviderId = candidates[0]?.providerId ?? null;

  const vid = currentVendorId?.trim() ?? '';
  let currentProvider: CommandCenterBrainProviderSuitability['currentProvider'] = null;
  if (vid) {
    const base = scoreOne(vid);
    const cr = [...base.reasons];
    if (stuckExecution && !cr.includes('Provider not responding after delay window')) {
      cr.push('Provider not responding after delay window');
    }
    currentProvider = { providerId: vid, score: base.score, reasons: cr };
  }

  const core: Pick<CommandCenterBrainProviderSuitability, 'currentProvider' | 'candidates' | 'recommendedProviderId'> =
    {
      currentProvider,
      candidates: candidates as CommandCenterBrainProviderSuitability['candidates'],
      recommendedProviderId,
    };
  const autoAssignReadiness =
    readinessRow != null
      ? computeProviderSuitabilityAutoAssignReadiness({
          status: readinessRow.status,
          vendorId: readinessRow.vendorId,
          escalationLevelDb: readinessRow.escalationLevelDb,
          suitability: core,
        })
      : { ready: false, reason: 'No recommended provider' };

  return { ...core, autoAssignReadiness };
}

/**
 * Brain read-model for Command Center list (no DB writes): v3.2 escalation + v3.1 execution + v4 provider intelligence.
 */
function computeCommandCenterBrainReadModel(input: {
  status: string;
  slaBreached?: boolean;
  escalationLevel?: number;
  needsAttention: boolean;
  vendorId: string | null;
  escalationHistoryCount?: number;
  attentionCodes: string[];
  createdAt?: Date | string | null;
  firstResponseAt?: Date | string | null;
}): CommandCenterBrainReadModel {
  const { status, needsAttention } = input;
  const slaBreached = input.slaBreached ?? false;
  const isTerminal = TERMINAL_ATTENTION_STATUSES.has(status);
  const escDb = input.escalationLevel ?? 0;
  const histDb = input.escalationHistoryCount ?? 0;
  const isRepeatedEscalation = histDb > 1;
  /** Operational escalation counts (terminal → inactive for alerts that mirror live ops). */
  const escalationLevel = isTerminal ? 0 : escDb;
  const escalationHistoryCount = isTerminal ? 0 : histDb;
  const vendorId = input.vendorId?.trim() ?? '';
  const unassigned = !vendorId && !isTerminal;
  const attentionCodes = input.attentionCodes ?? [];

  const stuckExecution = computeCommandCenterStuckExecution({
    status,
    vendorId: input.vendorId,
    attentionCodes,
    createdAt: input.createdAt,
    firstResponseAt: input.firstResponseAt,
  });

  const shouldReassignProvider = stuckExecution;

  let nextBestAction: CommandCenterBrainReadModel['nextBestAction'] = 'MONITOR_SLA';
  if (isTerminal) {
    nextBestAction = 'MONITOR_SLA';
  } else if (!isTerminal && escDb >= 2) {
    nextBestAction = 'URGENT_INTERVENTION';
  } else if (!isTerminal && escDb === 1 && (slaBreached || needsAttention)) {
    nextBestAction = 'REVIEW_ESCALATION';
  } else if (escDb > 0 && !slaBreached && !needsAttention) {
    nextBestAction = 'CLEAR_ESCALATION';
  } else if (shouldReassignProvider) {
    nextBestAction = 'REASSIGN_PROVIDER';
  } else if (!vendorId) {
    nextBestAction = 'ASSIGN_PROVIDER';
  } else if (status === 'ASSIGNED' || status === 'IN_PROGRESS') {
    nextBestAction = 'MONITOR_EXECUTION';
  } else {
    nextBestAction = 'MONITOR_SLA';
  }

  let riskScore = 0;
  if (!isTerminal && slaBreached) {
    riskScore += 50;
  }
  if (!isTerminal && escDb >= 1) {
    riskScore += 30;
  }
  if (!isTerminal && escDb >= 2) {
    riskScore += 20;
  }
  if (!isTerminal && isRepeatedEscalation) {
    riskScore += 10;
  }
  if (!isTerminal && !vendorId) {
    riskScore += 20;
  }
  if (!isTerminal && status === 'SUBMITTED' && input.createdAt) {
    const ageMs = Date.now() - new Date(input.createdAt).getTime();
    if (Number.isFinite(ageMs) && ageMs > 5 * 60 * 1000) {
      riskScore += 10;
    }
  }
  if (!isTerminal && stuckExecution) {
    riskScore += 25;
  }
  riskScore = Math.max(0, Math.min(100, Math.round(riskScore)));

  let priority: CommandCenterBrainReadModel['priority'] = 'LOW';
  if (riskScore >= 81) {
    priority = 'CRITICAL';
  } else if (riskScore >= 51) {
    priority = 'HIGH';
  } else if (riskScore >= 21) {
    priority = 'MEDIUM';
  } else {
    priority = 'LOW';
  }

  const alerts: string[] = [];
  const pushAlert = (msg: string) => {
    if (!alerts.includes(msg)) alerts.push(msg);
  };
  if (!isTerminal) {
    if (unassigned) pushAlert('Unassigned request');
    if (slaBreached) pushAlert('SLA breached');
    if (escDb >= 1) pushAlert('Escalation active');
    if (escDb >= 2) pushAlert('High escalation level');
    if (histDb > 1) pushAlert('Repeated escalations');
    if (stuckExecution) pushAlert('Vendor has not started execution');
  }

  const recommendations: string[] = [];
  const pushReco = (msg: string) => {
    if (!recommendations.includes(msg)) recommendations.push(msg);
  };
  if (!isTerminal && unassigned) pushReco('Assign provider now');
  if (!isTerminal && histDb > 0) pushReco('Review escalation history');
  if (!isTerminal && escDb > 0) pushReco('Clear escalation after handling');
  if (!isTerminal && escDb === 1) {
    pushReco('Review escalation reason');
    pushReco('Contact provider');
  }
  if (!isTerminal && escDb >= 2) {
    pushReco('Escalate to supervisor');
    pushReco('Reassign immediately');
    pushReco('Contact tenant');
  }
  if (!isTerminal && slaBreached) pushReco('Monitor SLA');
  if (!isTerminal && shouldReassignProvider) {
    pushReco('Reassign to faster provider');
    pushReco('Contact provider before reassignment');
  }
  if (!isTerminal && stuckExecution) {
    pushReco('Investigate execution delay before reassignment');
  }

  const reasons: string[] = [];
  if (isTerminal) {
    reasons.push('Request is terminal — Brain v2 monitoring posture only');
  } else if (riskScore === 0) {
    reasons.push('No additive risk signals in Brain v2 read model');
  } else {
    reasons.push(`Brain v2 risk score ${riskScore} → priority ${priority}`);
    if (slaBreached) reasons.push('SLA breach flag is active');
    if (escDb >= 2) reasons.push('Escalation level 2 or higher');
    else if (escDb === 1) reasons.push('Escalation level 1');
    if (!vendorId) reasons.push('No provider assigned');
    if (status === 'SUBMITTED') reasons.push('Request is SUBMITTED');
  }

  const riskReasons = [...reasons];
  if (!isTerminal && slaBreached) {
    riskReasons.push('SLA breach flag');
  }
  if (!isTerminal && escDb > 0) {
    riskReasons.push(`Escalation level ${escDb}`);
  }
  if (!isTerminal && attentionCodes.length) {
    riskReasons.push(`Attention codes: ${attentionCodes.join(', ')}`);
  }

  const providerIntelligence = buildCommandCenterProviderIntelligence({
    isTerminal,
    vendorId,
    stuckExecution,
    slaBreached,
    escDb,
    status,
  });

  return {
    priority,
    alerts,
    recommendations,
    reasons,
    nextBestAction,
    riskScore,
    riskReasons,
    providerIntelligence,
  };
}

@Injectable()
export class CommandCenterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orchestratorService: OrchestratorService,
    private readonly unifiedRequestsService: UnifiedRequestsService,
    private readonly auditTrailService: AuditTrailService,
    private readonly ticketActionsService: TicketActionsService,
    private readonly operatorPolicyService: OperatorPolicyService,
    private readonly decisionSupportService: DecisionSupportService,
    private readonly locationService: LocationService,
  ) {}

  private toActorType(user: AuthenticatedUser): string {
    const roles = user.roles?.length ? user.roles : user.role ? [user.role] : [];
    if (roles.includes('admin')) return 'admin';
    if (roles.includes('command-center')) return 'command-center';
    return user.role || 'command-center';
  }

  private buildDateRange(filters?: DashboardFilters) {
    if (!filters?.startDate && !filters?.endDate) {
      return undefined;
    }

    return {
      gte: filters.startDate ? new Date(filters.startDate) : undefined,
      lte: filters.endDate ? new Date(filters.endDate) : undefined,
    };
  }

  private extractFinancials(metadata: unknown) {
    if (!metadata || typeof metadata !== 'object') {
      return { coveredAmountMinor: 0, tenantOwesMinor: 0 };
    }

    const freeServiceEvaluation = (metadata as Record<string, unknown>).freeServiceEvaluation;
    if (!freeServiceEvaluation || typeof freeServiceEvaluation !== 'object') {
      return { coveredAmountMinor: 0, tenantOwesMinor: 0 };
    }

    const raw = freeServiceEvaluation as Record<string, unknown>;
    return {
      coveredAmountMinor: Number(raw.coveredAmountMinor ?? 0),
      tenantOwesMinor: Number(raw.tenantOwesMinor ?? 0),
    };
  }

  private average(values: number[]) {
    if (!values.length) {
      return 0;
    }

    return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
  }

  private buildRequestWhere(filters?: DashboardFilters) {
    const countryCandidates = normalizeCountryCandidates(filters?.countryCode);
    const status = toDbUnifiedRequestStatus(filters?.status);
    return {
      country: countryCandidates ? { in: countryCandidates } : undefined,
      serviceType: filters?.serviceType,
      status: status as never,
      vendorId: filters?.vendorId,
      propertyIds: filters?.assetId ? { has: filters.assetId } : undefined,
      createdAt: this.buildDateRange(filters),
    };
  }

  private isActiveStatus(status: string) {
    return ['SUBMITTED', 'UNDER_REVIEW', 'QUEUED', 'ASSIGNED', 'EN_ROUTE', 'IN_PROGRESS', 'AWAITING_PAYMENT', 'ESCALATED'].includes(status);
  }

  private requestLifecycleDurations(request: {
    createdAt: Date;
    updatedAt: Date;
    status: string;
    trackingEvents: Array<{ actorType: string; createdAt: Date }>;
  }) {
    const firstVendorAction = request.trackingEvents
      .filter((event) => event.actorType === 'provider')
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];

    const responseMinutes = firstVendorAction
      ? Math.max(0, Math.round((firstVendorAction.createdAt.getTime() - request.createdAt.getTime()) / 60000))
      : null;

    const completionMinutes = request.status === 'COMPLETED'
      ? Math.max(0, Math.round((request.updatedAt.getTime() - request.createdAt.getTime()) / 60000))
      : null;

    return { responseMinutes, completionMinutes };
  }

  private dayKey(date: Date) {
    return date.toISOString().slice(0, 10);
  }

  private toRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  }

  private extractIntegrationVisibility(routeData: unknown) {
    const raw = this.toRecord(routeData);
    return {
      adapterKey: typeof raw.adapterKey === 'string' ? raw.adapterKey : null,
      adapterContractType: typeof raw.adapterContractType === 'string' ? raw.adapterContractType : null,
      simulationMode: Boolean(raw.simulationMode),
      simulatedProviderResponse: this.toRecord(raw.simulatedDispatch),
      routingDecisionContext: this.toRecord(raw.routingDecisionContext),
    };
  }

  /** DB-backed SLA slice for command-center payloads (no derived urgency labels). */
  private pickSlaSnapshot(request: {
    status: string;
    responseDueAt: Date | null;
    completionDueAt: Date | null;
    slaBreached: boolean;
    breachType: string | null;
    escalationLevel: number;
    firstBreachedAt: Date | null;
  }): CommandCenterRequestSlaSnapshot {
    const terminal = TERMINAL_ATTENTION_STATUSES.has(request.status);
    return {
      responseDueAt: request.responseDueAt,
      completionDueAt: request.completionDueAt,
      slaBreached: request.slaBreached,
      breachType: request.breachType,
      escalationLevel: terminal ? 0 : request.escalationLevel,
      firstBreachedAt: request.firstBreachedAt,
    };
  }

  private extractTicketLocationContext(request: {
    pickupLat?: number | null;
    pickupLng?: number | null;
    currentLat?: number | null;
    currentLng?: number | null;
    targetLat?: number | null;
    targetLng?: number | null;
    dropoffLat?: number | null;
    dropoffLng?: number | null;
    locationLabel?: string | null;
    city: string;
    country: string;
  }) {
    // Primary: pickup → current → target
    const primaryLat = request.pickupLat ?? request.currentLat ?? request.targetLat;
    const primaryLng = request.pickupLng ?? request.currentLng ?? request.targetLng;
    const sourceType = request.pickupLat != null ? 'pickup'
      : request.currentLat != null ? 'tenant-current'
      : 'service-site';

    return this.locationService.buildLocationDisplay({
      sourceType: sourceType as 'pickup' | 'tenant-current' | 'service-site',
      lat: primaryLat,
      lng: primaryLng,
      placeLabel: request.locationLabel ?? null,
      city: request.city,
      countryCode: request.country,
    });
  }

  private mapEscalateTicketActionToLastEscalation(
    action: {
      actorId: string | null;
      actorType: string;
      createdAt: Date;
      payload: Prisma.JsonValue | null;
    },
    fallbackLevel: number,
  ): CommandCenterLastEscalation {
    const p = this.toRecord(action.payload);
    const reason = typeof p.reason === 'string' ? p.reason : '';
    let level = fallbackLevel;
    const raw =
      p.newEscalationLevel ?? p.toEscalationLevel ?? p.level;
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      level = Math.floor(raw);
    } else if (typeof raw === 'string') {
      const n = Number(String(raw).trim());
      if (Number.isFinite(n) && n >= 1) level = Math.floor(n);
    }
    const actor = action.actorId?.trim() ? action.actorId : 'system';
    const isManualActor =
      actor !== 'system' && (action.actorType === 'admin' || action.actorType === 'command-center');
    return {
      level,
      reason,
      actor,
      createdAt: action.createdAt.toISOString(),
      source: isManualActor ? 'MANUAL' : 'SYSTEM',
    };
  }

  /**
   * TicketAction `ESCALATE` rows only — counts + last event for Command Center intelligence (read-model).
   */
  private async collectEscalationTicketInsights(
    requestIds: string[],
    escalationLevelByRequestId: Map<string, number>,
  ): Promise<Map<string, { lastEscalation: CommandCenterLastEscalation | null; escalationHistoryCount: number }>> {
    const out = new Map<string, { lastEscalation: CommandCenterLastEscalation | null; escalationHistoryCount: number }>();
    for (const id of requestIds) {
      out.set(id, { lastEscalation: null, escalationHistoryCount: 0 });
    }
    if (!requestIds.length) {
      return out;
    }
    const actions = await this.prisma.ticketAction.findMany({
      where: { ticketId: { in: requestIds }, actionType: 'ESCALATE' },
      select: { ticketId: true, actorId: true, actorType: true, createdAt: true, payload: true },
      orderBy: { createdAt: 'desc' },
    });
    const byTicket = new Map<string, typeof actions>();
    for (const a of actions) {
      const arr = byTicket.get(a.ticketId) ?? [];
      arr.push(a);
      byTicket.set(a.ticketId, arr);
    }
    for (const [ticketId, arr] of byTicket) {
      arr.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      const latest = arr[0];
      if (!latest) {
        continue;
      }
      const fallback = escalationLevelByRequestId.get(ticketId) ?? 0;
      const last = this.mapEscalateTicketActionToLastEscalation(latest, fallback);
      out.set(ticketId, { lastEscalation: last, escalationHistoryCount: arr.length });
    }
    return out;
  }

  private includeForOperations() {
    return {
      trackingEvents: { orderBy: { createdAt: 'asc' as const } },
      payment: {
        select: {
          id: true,
          amountMinor: true,
          currency: true,
          status: true,
          createdAt: true,
        },
      },
      viewingRequest: {
        select: {
          id: true,
        },
      },
      movingRequest: {
        select: {
          id: true,
        },
      },
      maintenanceRequest: {
        select: {
          id: true,
        },
      },
      cleaningRequest: {
        select: {
          id: true,
        },
      },
      airportTransfer: {
        select: {
          id: true,
        },
      },
    };
  }

  async getOperationsLayer(filters?: DashboardFilters) {
    const policyContext = await this.operatorPolicyService.getRuntimePolicyContext(filters?.countryCode);
    const requests = await this.prisma.unifiedRequest.findMany({
      where: this.buildRequestWhere(filters),
      include: this.includeForOperations(),
      orderBy: { createdAt: 'desc' },
    });

    const escalationLevelById = new Map(requests.map((r) => [r.id, r.escalationLevel ?? 0]));
    const escalationInsights = await this.collectEscalationTicketInsights(
      requests.map((r) => r.id),
      escalationLevelById,
    );

    return {
      filters: filters ?? {},
      policyContext,
      total: requests.length,
      tickets: requests.map((request) => {
        const financials = this.extractFinancials(request.metadata);
        const lifecycle = this.requestLifecycleDurations(request);
        const policyMetadata = request.metadata && typeof request.metadata === 'object'
          ? ((request.metadata as Record<string, unknown>).policyContext as Record<string, unknown> | undefined)
          : undefined;
        const hasServiceEntity = Boolean(
          request.viewingRequest ||
          request.movingRequest ||
          request.maintenanceRequest ||
          request.cleaningRequest ||
          request.airportTransfer,
        );

        const escRow = escalationInsights.get(request.id) ?? { lastEscalation: null, escalationHistoryCount: 0 };

        return {
          ticketId: request.id,
          serviceType: request.serviceType,
          tenantId: request.tenantId,
          status: request.status,
          assignedVendor: request.vendorId,
          createdAt: request.createdAt,
          updatedAt: request.updatedAt,
          country: request.country,
          city: request.city,
          sla: this.pickSlaSnapshot(request),
          cost: {
            coveredAmountMinor: financials.coveredAmountMinor,
            excessAmountMinor: financials.tenantOwesMinor,
            paymentStatus: request.paymentStatus,
            paymentAmountMinor: request.payment?.amountMinor ?? 0,
            paymentCurrency: request.payment?.currency ?? null,
          },
          auditVisibility: {
            trackingEventCount: request.trackingEvents.length,
            firstVendorActionAt: request.trackingEvents.find((event) => event.actorType === 'provider')?.createdAt ?? null,
            lastEventAt: request.trackingEvents[request.trackingEvents.length - 1]?.createdAt ?? null,
            responseMinutes: lifecycle.responseMinutes,
            completionMinutes: lifecycle.completionMinutes,
          },
          lifecycle: {
            requestEntityPresent: hasServiceEntity,
            indexedBy: {
              serviceType: request.serviceType,
              vendorId: request.vendorId,
              country: request.country,
              city: request.city,
            },
          },
          policyDrivenBy: {
            countryPack: request.country,
            serviceRule: policyMetadata?.serviceRule ?? null,
            routingPolicy: policyMetadata?.routingPolicy ?? policyContext.routingPolicy,
            perkPolicy: policyMetadata?.perkPolicy ?? policyContext.perkPolicy,
            financialPolicy: policyMetadata?.financialPolicy ?? policyContext.financialPolicy,
          },
          locationContext: this.extractTicketLocationContext(request),
          geoContext: {
            city: request.city,
            countryCode: request.country,
            hasLocation: request.pickupLat != null || request.currentLat != null || request.targetLat != null,
          },
          integrationVisibility: this.extractIntegrationVisibility(request.routeData),
          lastEscalation: escRow.lastEscalation,
          escalationHistoryCount: escRow.escalationHistoryCount,
          ...computeVendorAttentionReadModel({
            createdAt: request.createdAt,
            status: request.status,
            vendorId: request.vendorId,
            firstResponseAt: request.firstResponseAt,
            completedAt: request.completedAt,
            responseDueAt: request.responseDueAt,
            completionDueAt: request.completionDueAt,
            escalationLevel: request.escalationLevel,
          }),
        };
      }),
    };
  }

  async getAnalysisLayer(filters?: DashboardFilters) {
    const policyContext = await this.operatorPolicyService.getRuntimePolicyContext(filters?.countryCode);
    const requests = await this.prisma.unifiedRequest.findMany({
      where: this.buildRequestWhere(filters),
      include: {
        trackingEvents: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const byService: Record<string, number> = {};
    const byVendor: Record<string, number> = {};
    const adapterUsage: Record<string, number> = {};
    const simulatedByService: Record<string, number> = {};
    const supplyByService: Record<string, number> = {};
    const trendByDay: Record<string, Record<string, number>> = {};
    const byCountryService: Record<string, { count: number; awaitingPayment: number; failed: number; completed: number; completionMinutes: number[] }> = {};
    const byTenant: Record<string, { total: number; lastServiceType: string; awaitingPayment: number; failed: number; serviceCounts: Record<string, number> }> = {};
    const responseMinutes: number[] = [];
    const completionMinutes: number[] = [];
    let completed = 0;
    let failed = 0;

    // Geo aggregation state
    const byCity: Record<string, number> = {};
    const byCityService: Record<string, number> = {};
    const vendorsByCity: Record<string, Set<string>> = {};

    for (const request of requests) {
      byService[request.serviceType] = (byService[request.serviceType] ?? 0) + 1;
      if (request.vendorId) {
        byVendor[request.vendorId] = (byVendor[request.vendorId] ?? 0) + 1;
      }

      const routeData = this.toRecord(request.routeData);
      const adapterKey = typeof routeData.adapterKey === 'string' ? routeData.adapterKey : null;
      if (adapterKey) {
        adapterUsage[adapterKey] = (adapterUsage[adapterKey] ?? 0) + 1;
      }

      if (Boolean(routeData.simulationMode)) {
        simulatedByService[request.serviceType] = (simulatedByService[request.serviceType] ?? 0) + 1;
      }

      if (request.vendorId) {
        const supplyKey = `${request.serviceType}::${request.vendorId}`;
        supplyByService[supplyKey] = (supplyByService[supplyKey] ?? 0) + 1;
      }

      const day = this.dayKey(request.createdAt);
      trendByDay[day] = trendByDay[day] ?? {};
      trendByDay[day][request.serviceType] = (trendByDay[day][request.serviceType] ?? 0) + 1;

      const countryServiceKey = `${request.country}::${request.serviceType}`;
      byCountryService[countryServiceKey] = byCountryService[countryServiceKey] ?? {
        count: 0,
        awaitingPayment: 0,
        failed: 0,
        completed: 0,
        completionMinutes: [],
      };
      byCountryService[countryServiceKey].count += 1;
      if (request.status === 'AWAITING_PAYMENT') {
        byCountryService[countryServiceKey].awaitingPayment += 1;
      }
      if (request.status === 'FAILED') {
        byCountryService[countryServiceKey].failed += 1;
      }

      const tenantAggregate = byTenant[request.tenantId] ?? {
        total: 0,
        lastServiceType: request.serviceType,
        awaitingPayment: 0,
        failed: 0,
        serviceCounts: {},
      };
      byTenant[request.tenantId] = tenantAggregate;
      tenantAggregate.total += 1;
      tenantAggregate.lastServiceType = request.serviceType;
      tenantAggregate.serviceCounts[request.serviceType] = (tenantAggregate.serviceCounts[request.serviceType] ?? 0) + 1;
      if (request.status === 'AWAITING_PAYMENT') {
        tenantAggregate.awaitingPayment += 1;
      }
      if (request.status === 'FAILED') {
        tenantAggregate.failed += 1;
      }

      const lifecycle = this.requestLifecycleDurations(request);
      if (lifecycle.responseMinutes != null) {
        responseMinutes.push(lifecycle.responseMinutes);
      }
      if (lifecycle.completionMinutes != null) {
        completionMinutes.push(lifecycle.completionMinutes);
        byCountryService[countryServiceKey].completionMinutes.push(lifecycle.completionMinutes);
      }

      if (request.status === 'COMPLETED') {
        completed += 1;
        byCountryService[countryServiceKey].completed += 1;
      }
      if (request.status === 'FAILED') {
        failed += 1;
      }

      // Geo aggregation
      const reqCity = request.city ?? 'unknown';
      byCity[reqCity] = (byCity[reqCity] ?? 0) + 1;
      const citySvcKey = `${reqCity}::${request.serviceType}`;
      byCityService[citySvcKey] = (byCityService[citySvcKey] ?? 0) + 1;
      if (request.vendorId) {
        if (!vendorsByCity[reqCity]) vendorsByCity[reqCity] = new Set();
        vendorsByCity[reqCity].add(request.vendorId);
      }
    }

    // Geo post-processing
    const vendorCoverageByCity: Record<string, number> = {};
    for (const [geoCity, vendors] of Object.entries(vendorsByCity)) {
      vendorCoverageByCity[geoCity] = vendors.size;
    }

    const cityDemandValues = Object.values(byCity);
    const avgCityDemand = cityDemandValues.length > 0
      ? cityDemandValues.reduce((s, v) => s + v, 0) / cityDemandValues.length
      : 0;

    const serviceGapByCity = Object.entries(byCityService)
      .map(([key, demand]) => {
        const sepIdx = key.indexOf('::');
        const gapCity = key.slice(0, sepIdx);
        const gapService = key.slice(sepIdx + 2);
        const supply = vendorCoverageByCity[gapCity] ?? 0;
        return { city: gapCity, serviceType: gapService, demand, supply, gap: Math.max(0, demand - supply) };
      })
      .filter((entry) => entry.gap > 0)
      .sort((a, b) => b.gap - a.gap);

    const highDemandCities = Object.entries(byCity)
      .filter(([, count]) => count > avgCityDemand * 1.5)
      .map(([geoCity, requestCount]) => ({ city: geoCity, requestCount }))
      .sort((a, b) => b.requestCount - a.requestCount);

    const underServedCities = highDemandCities
      .filter(({ city: geoCity }) => (vendorCoverageByCity[geoCity] ?? 0) < 2)
      .map(({ city: geoCity, requestCount }) => ({
        city: geoCity,
        requestCount,
        vendorCount: vendorCoverageByCity[geoCity] ?? 0,
      }));

    const highFrictionZones = serviceGapByCity
      .filter((entry) => entry.demand >= 3)
      .slice(0, 10)
      .map((entry) => ({
        city: entry.city,
        serviceType: entry.serviceType,
        demand: entry.demand,
        vendorCoverage: vendorCoverageByCity[entry.city] ?? 0,
        frictionIndicator: entry.supply === 0 ? 'no-coverage' : 'under-served',
      }));

    return {
      filters: filters ?? {},
      policyContext,
      totals: {
        tickets: requests.length,
        active: requests.filter((request) => this.isActiveStatus(request.status)).length,
        completed,
        failed,
      },
      serviceMetrics: {
        ticketsByServiceType: byService,
      },
      timeMetrics: {
        averageResponseTimeMinutes: this.average(responseMinutes),
        averageCompletionTimeMinutes: this.average(completionMinutes),
      },
      vendorMetrics: {
        activityCounts: byVendor,
      },
      trends: {
        serviceVolumeByDay: Object.entries(trendByDay).map(([date, services]) => ({
          date,
          services,
        })),
      },
      recommendationSignals: {
        countryPainPoints: Object.entries(byCountryService).map(([key, signal]) => {
          const separatorIndex = key.indexOf('::');
          const countryCode = separatorIndex >= 0 ? key.slice(0, separatorIndex) : 'unknown';
          const serviceType = separatorIndex >= 0 ? key.slice(separatorIndex + 2) : 'unknown';
          return {
            countryCode,
            serviceType,
            requestVolume: signal.count,
            awaitingPaymentCount: signal.awaitingPayment,
            failedCount: signal.failed,
            completionRate: signal.count ? Number((signal.completed / signal.count).toFixed(4)) : 0,
            avgCompletionMinutes: this.average(signal.completionMinutes),
            frictionScore: (signal.awaitingPayment * 2) + (signal.failed * 3),
          };
        }).sort((a, b) => b.frictionScore - a.frictionScore),
        tenantNeedSignals: Object.entries(byTenant).map(([tenantId, signal]) => {
          const topService = Object.entries(signal.serviceCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? signal.lastServiceType;
          return {
            tenantId,
            totalRequests: signal.total,
            awaitingPaymentCount: signal.awaitingPayment,
            failedCount: signal.failed,
            lastServiceType: signal.lastServiceType,
            likelyNextServiceHint: topService,
          };
        }).sort((a, b) => b.totalRequests - a.totalRequests),
        vendorLoadSignals: Object.entries(byVendor)
          .map(([vendorId, ticketCount]) => ({ vendorId, ticketCount }))
          .sort((a, b) => b.ticketCount - a.ticketCount),
        providerGapSignals: Object.entries(byService)
          .map(([serviceType, demandCount]) => {
            const supplyCount = Object.entries(supplyByService)
              .filter(([key]) => key.startsWith(`${serviceType}::`))
              .reduce((sum, [, count]) => sum + count, 0);
            return {
              serviceType,
              demandCount,
              supplyCount,
              gap: Math.max(0, demandCount - supplyCount),
            };
          })
          .sort((a, b) => b.gap - a.gap),
        adapterUsageFrequency: Object.entries(adapterUsage)
          .map(([adapterKey, usageCount]) => ({ adapterKey, usageCount }))
          .sort((a, b) => b.usageCount - a.usageCount),
        simulatedDemandVsSupply: Object.entries(byService).map(([serviceType, demandCount]) => ({
          serviceType,
          simulatedDemandCount: simulatedByService[serviceType] ?? 0,
          supplyCount: Object.entries(supplyByService)
            .filter(([key]) => key.startsWith(`${serviceType}::`))
            .reduce((sum, [, count]) => sum + count, 0),
          demandCount,
        })),
        geoSignals: {
          demandByCity: byCity,
          demandByServiceAndCity: byCityService,
          vendorCoverageByCity,
          serviceGapByCity,
        },
      },
      geoInsights: {
        highDemandCities,
        underServedCities,
        highFrictionZones,
      },
    };
  }

  async getDecisionSupportLayer(filters?: DashboardFilters) {
    const analysis = await this.getAnalysisLayer(filters);
    const recommendations = this.decisionSupportService.generateRecommendations({
      totals: analysis.totals,
      recommendationSignals: analysis.recommendationSignals,
    });

    return {
      filters: filters ?? {},
      generatedAt: new Date().toISOString(),
      totalRecommendations: recommendations.length,
      bySeverity: {
        critical: recommendations.filter((r) => r.severity === 'critical').length,
        high: recommendations.filter((r) => r.severity === 'high').length,
        medium: recommendations.filter((r) => r.severity === 'medium').length,
        low: recommendations.filter((r) => r.severity === 'low').length,
      },
      byCategory: recommendations.reduce<Record<string, number>>((acc, r) => {
        acc[r.category] = (acc[r.category] ?? 0) + 1;
        return acc;
      }, {}),
      recommendations,
    };
  }

  async getReportingLayer(filters?: DashboardFilters) {
    const policyContext = await this.operatorPolicyService.getRuntimePolicyContext(filters?.countryCode);
    const analysis = await this.getAnalysisLayer(filters);
    const recommendations = this.decisionSupportService.generateRecommendations({
      totals: analysis.totals,
      recommendationSignals: analysis.recommendationSignals,
    });

    const dailyTotals = analysis.trends.serviceVolumeByDay.map((day) => ({
      date: day.date,
      total: Object.values(day.services).reduce((sum, value) => sum + value, 0),
      services: day.services,
    }));

    const topServicesByVolume = Object.entries(analysis.serviceMetrics.ticketsByServiceType)
      .map(([serviceType, count]) => ({ serviceType, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      filters: filters ?? {},
      policyContext,
      dailyCounts: dailyTotals,
      outcomes: {
        completed: analysis.totals.completed,
        failed: analysis.totals.failed,
      },
      topServicesByVolume,
      aiReadiness: {
        countryPainPoints: analysis.recommendationSignals.countryPainPoints.slice(0, 10),
        tenantNeedClusters: analysis.recommendationSignals.tenantNeedSignals.slice(0, 20),
        vendorLoadSignals: analysis.recommendationSignals.vendorLoadSignals.slice(0, 20),
        providerGapSignals: analysis.recommendationSignals.providerGapSignals.slice(0, 20),
        adapterUsageFrequency: analysis.recommendationSignals.adapterUsageFrequency.slice(0, 20),
        simulatedDemandVsSupply: analysis.recommendationSignals.simulatedDemandVsSupply.slice(0, 20),
      },
      decisionSupport: {
        totalRecommendations: recommendations.length,
        criticalCount: recommendations.filter((r) => r.severity === 'critical').length,
        highCount: recommendations.filter((r) => r.severity === 'high').length,
        topRecommendations: recommendations.slice(0, 10),
      },
    };
  }

  async getDashboard(filters?: DashboardFilters) {
    const requestWhere = this.buildRequestWhere(filters);
    const bookingWhere = {
      createdAt: this.buildDateRange(filters),
      propertyId: filters?.assetId,
      property: filters?.countryCode ? { countryCode: filters.countryCode } : undefined,
    };
    const propertyWhere = {
      countryCode: filters?.countryCode,
      id: filters?.assetId,
    };

    const [requests, providers, bookings, properties, users, alerts] = await Promise.all([
      this.prisma.unifiedRequest.findMany({ where: requestWhere, include: { trackingEvents: true }, orderBy: { createdAt: 'desc' } }),
      this.prisma.provider.findMany({ where: { countryCode: filters?.countryCode, isActive: true } }),
      this.prisma.booking.findMany({ where: bookingWhere, include: { property: true } }),
      this.prisma.property.findMany({ where: propertyWhere }),
      this.prisma.user.findMany({ where: { countryCode: filters?.countryCode } }),
      this.prisma.auditLog.count({ where: { severity: { in: ['HIGH', 'CRITICAL'] }, countryCode: filters?.countryCode } }),
    ]);

    const activeTickets = requests.filter((request) => this.isActiveStatus(request.status)).length;
    const completedRequests = requests.filter((request) => request.status === 'COMPLETED');
    const assignedEventsMinutes = requests
      .map((request) => {
        const assignedEvent = request.trackingEvents.find((event) => event.status === 'ASSIGNED');
        return assignedEvent ? (assignedEvent.createdAt.getTime() - request.createdAt.getTime()) / 60000 : null;
      })
      .filter((value): value is number => value != null && value >= 0);
    const resolutionMinutes = completedRequests.map((request) => (request.updatedAt.getTime() - request.createdAt.getTime()) / 60000);

    const totalRevenueMinor = bookings.reduce((sum, booking) => sum + booking.totalAmountMinor, 0);
    const platformMarginMinor = bookings.reduce((sum, booking) => sum + (booking.property.serviceFeeMinor * booking.termMonths), 0);
    const serviceCostMinor = requests.reduce((sum, request) => sum + this.extractFinancials(request.metadata).coveredAmountMinor, 0);
    const recoveredServiceRevenueMinor = requests.reduce((sum, request) => sum + this.extractFinancials(request.metadata).tenantOwesMinor, 0);

    const assetMetrics = properties.map((property) => {
      const propertyBookings = bookings.filter((booking) => booking.propertyId === property.id);
      const assetRevenueMinor = propertyBookings.reduce((sum, booking) => sum + booking.totalAmountMinor, 0);
      const assetMarginMinor = propertyBookings.reduce((sum, booking) => sum + (property.serviceFeeMinor * booking.termMonths), 0);
      const assetServiceCostMinor = requests
        .filter((request) => request.propertyIds.includes(property.id))
        .reduce((sum, request) => sum + this.extractFinancials(request.metadata).coveredAmountMinor, 0);
      const profitabilityScore = assetRevenueMinor === 0
        ? 0
        : Math.round(((assetMarginMinor - assetServiceCostMinor) / assetRevenueMinor) * 100);

      return {
        assetId: property.id,
        title: property.title,
        revenueMinor: assetRevenueMinor,
        netProfitMinor: assetMarginMinor - assetServiceCostMinor,
        profitabilityScore,
      };
    });

    const vendorPerformance = providers.map((provider) => {
      const vendorRequests = requests.filter((request) => request.vendorId === provider.id);
      const completed = vendorRequests.filter((request) => request.status === 'COMPLETED').length;
      return {
        providerId: provider.id,
        providerName: provider.name,
        activeTickets: vendorRequests.filter((request) => this.isActiveStatus(request.status)).length,
        completedTickets: completed,
        completionRate: vendorRequests.length ? Math.round((completed / vendorRequests.length) * 100) : 0,
        ratingAverage: provider.ratingAverage,
      };
    }).sort((a, b) => b.completionRate - a.completionRate || b.ratingAverage - a.ratingAverage);

    const tenantBookingsMap = new Map<string, number>();
    for (const booking of bookings) {
      tenantBookingsMap.set(booking.tenantId, (tenantBookingsMap.get(booking.tenantId) ?? 0) + 1);
    }

    const requestUsageMap = requests.reduce<Record<string, { count: number; costMinor: number }>>((acc, request) => {
      const current = acc[request.serviceType] ?? { count: 0, costMinor: 0 };
      const financials = this.extractFinancials(request.metadata);
      acc[request.serviceType] = {
        count: current.count + 1,
        costMinor: current.costMinor + financials.coveredAmountMinor,
      };
      return acc;
    }, {});

    const serviceBreakdown = Object.entries(requestUsageMap)
      .map(([serviceType, values]) => ({
        serviceType,
        requestVolume: values.count,
        totalCostMinor: values.costMinor,
        costPerServiceMinor: values.count ? Math.round(values.costMinor / values.count) : 0,
      }))
      .sort((a, b) => b.requestVolume - a.requestVolume);

    return {
      filters: filters ?? {},
      metrics: {
        liveRequests: requests.length,
        activeProviders: providers.length,
        confirmedBookings: bookings.filter((booking) => ['CONFIRMED', 'ACTIVE'].includes(booking.status)).length,
        paymentExceptions: requests.filter((request) => request.paymentStatus === 'FAILED').length,
        escalationAlerts: alerts,
        slaBreachedActiveTickets: requests.filter(
          (request) => this.isActiveStatus(request.status) && request.slaBreached,
        ).length,
      },
      operations: {
        activeTickets,
        avgResponseTimeMinutes: this.average(assignedEventsMinutes),
        avgResolutionTimeMinutes: this.average(resolutionMinutes),
        vendorPerformance: vendorPerformance.slice(0, 8),
      },
      financial: {
        totalRevenueMinor,
        platformMarginMinor,
        serviceCostMinor,
        recoveredServiceRevenueMinor,
        costVsRevenueRatio: totalRevenueMinor ? Number((serviceCostMinor / totalRevenueMinor).toFixed(4)) : 0,
        costVsMarginRatio: platformMarginMinor ? Number((serviceCostMinor / platformMarginMinor).toFixed(4)) : 0,
      },
      assetPerformance: {
        occupancyRate: properties.length ? Number((bookings.length / properties.length).toFixed(2)) : 0,
        revenuePerAssetMinor: properties.length ? Math.round(totalRevenueMinor / properties.length) : 0,
        topAssets: assetMetrics.sort((a, b) => b.netProfitMinor - a.netProfitMinor).slice(0, 10),
      },
      tenant: {
        activeTenants: new Set(bookings.map((booking) => booking.tenantId)).size,
        retentionRate: tenantBookingsMap.size
          ? Math.round((Array.from(tenantBookingsMap.values()).filter((count) => count > 1).length / tenantBookingsMap.size) * 100)
          : 0,
        avgServiceUsage: users.length ? Number((requests.length / users.length).toFixed(2)) : 0,
      },
      service: {
        requestVolume: requests.length,
        mostUsedServices: serviceBreakdown.slice(0, 5),
        serviceBreakdown,
      },
    };
  }

  /** Brain v5 — read-only aggregates for provider suitability (no writes). */
  private async buildProviderSuitabilityMetricsMap(
    providerIds: string[],
  ): Promise<Map<string, ProviderSuitabilityMetricsInternal>> {
    const out = new Map<string, ProviderSuitabilityMetricsInternal>();
    if (providerIds.length === 0) return out;
    const since = new Date(Date.now() - PROVIDER_SUITABILITY_WINDOW_MS);

    const [openGroups, recentRows] = await Promise.all([
      this.prisma.unifiedRequest.groupBy({
        by: ['vendorId'],
        where: {
          vendorId: { in: providerIds },
          status: UNIFIED_OPEN_STATUS_FILTER,
        },
        _count: { _all: true },
      }),
      this.prisma.unifiedRequest.findMany({
        where: {
          createdAt: { gte: since },
          vendorId: { in: providerIds },
        },
        select: {
          vendorId: true,
          createdAt: true,
          firstResponseAt: true,
          status: true,
          slaBreached: true,
          escalationLevel: true,
        },
        take: PROVIDER_SUITABILITY_RECENT_ROWS_CAP,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const openMap = new Map<string, number>();
    for (const g of openGroups) {
      if (g.vendorId) openMap.set(g.vendorId, g._count._all);
    }

    type Agg = { deltas: number[]; sla: number; esc: number; done: number };
    const aggs = new Map<string, Agg>();
    for (const id of providerIds) {
      aggs.set(id, { deltas: [], sla: 0, esc: 0, done: 0 });
    }
    for (const row of recentRows) {
      const vid = row.vendorId;
      if (!vid || !aggs.has(vid)) continue;
      const a = aggs.get(vid)!;
      if (row.firstResponseAt) {
        const ms = row.firstResponseAt.getTime() - row.createdAt.getTime();
        if (Number.isFinite(ms) && ms >= 0) a.deltas.push(ms);
      }
      if (row.slaBreached) a.sla += 1;
      if ((row.escalationLevel ?? 0) >= 1) a.esc += 1;
      if (row.status === UnifiedRequestStatus.COMPLETED) a.done += 1;
    }

    for (const id of providerIds) {
      const open = openMap.get(id) ?? 0;
      const a = aggs.get(id)!;
      const avg = a.deltas.length ? a.deltas.reduce((x, y) => x + y, 0) / a.deltas.length : null;
      out.set(id, {
        activeOpenCount: open,
        avgFirstResponseMs: avg,
        recentSlaBreachCount: a.sla,
        recentEscalatedCount: a.esc,
        recentCompletedCount: a.done,
      });
    }
    return out;
  }

  /** Brain v5 — capped candidate pool from list rows + recent UnifiedRequest vendorIds. */
  private async buildCommandCenterProviderSuitabilityPool(
    rows: Array<{ vendorId: string | null }>,
  ): Promise<string[]> {
    const ordered: string[] = [];
    const seen = new Set<string>();
    for (const r of rows) {
      const v = r.vendorId?.trim();
      if (!v || seen.has(v)) continue;
      seen.add(v);
      ordered.push(v);
    }
    const pool = new Set<string>(ordered.slice(0, PROVIDER_SUITABILITY_POOL_MAX));
    const since = new Date(Date.now() - PROVIDER_SUITABILITY_WINDOW_MS);
    const recentVendorRows = await this.prisma.unifiedRequest.findMany({
      where: {
        createdAt: { gte: since },
        vendorId: { not: null },
      },
      select: { vendorId: true },
      take: PROVIDER_SUITABILITY_RECENT_ROWS_CAP,
      orderBy: { createdAt: 'desc' },
    });
    for (const r of recentVendorRows) {
      if (r.vendorId && pool.size < PROVIDER_SUITABILITY_POOL_MAX) pool.add(r.vendorId);
    }
    return [...pool];
  }

  listRequests(filters?: DashboardFilters) {
    return this.prisma.unifiedRequest
      .findMany({
        where: this.buildRequestWhere(filters),
        include: {
          trackingEvents: true,
          user: { select: { fullName: true, phoneNumber: true } },
          payment: {
            select: {
              id: true,
              amountMinor: true,
              currency: true,
              status: true,
            },
          },
          viewingRequest: {
            include: {
              items: { include: { property: { select: { id: true, title: true, city: true, district: true } } } },
              assignment: { include: { provider: { select: { id: true, name: true, city: true } } } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      })
      .then(async (rows) => {
        const escalationLevelById = new Map(rows.map((r) => [r.id, r.escalationLevel ?? 0]));
        const escalationInsights = await this.collectEscalationTicketInsights(
          rows.map((r) => r.id),
          escalationLevelById,
        );
        const poolIds = await this.buildCommandCenterProviderSuitabilityPool(rows);
        const rowVendorIds = [...new Set(rows.map((r) => r.vendorId?.trim()).filter(Boolean))] as string[];
        const metricsIds = [...new Set([...poolIds, ...rowVendorIds])];
        const metricsMap = await this.buildProviderSuitabilityMetricsMap(metricsIds);

        const propertyIdsForCityFallback = rows
          .filter((r) => !(typeof r.city === 'string' && r.city.trim()) && r.propertyIds?.length)
          .map((r) => String(r.propertyIds![0]).trim())
          .filter((id) => id.length > 0);
        const propertyIdsForGeoFallback = rows
          .filter((r) => {
            const tl = r.targetLat;
            const tln = r.targetLng;
            const hasTarget =
              typeof tl === 'number' &&
              Number.isFinite(tl) &&
              typeof tln === 'number' &&
              Number.isFinite(tln);
            if (hasTarget) return false;
            const pid = r.propertyIds?.[0];
            return typeof pid === 'string' && pid.trim().length > 0;
          })
          .map((r) => String(r.propertyIds![0]).trim());
        const propertyBatchIds = [
          ...new Set([...propertyIdsForCityFallback, ...propertyIdsForGeoFallback]),
        ];
        const propertyRows =
          propertyBatchIds.length > 0
            ? await this.prisma.property.findMany({
                where: { id: { in: propertyBatchIds } },
                select: { id: true, city: true, lat: true, lng: true },
              })
            : [];
        const propertyCityById = new Map<string, string>();
        const propertyLatLngById = new Map<string, { lat: number; lng: number }>();
        for (const p of propertyRows) {
          const c = typeof p.city === 'string' ? p.city.trim() : '';
          if (c) propertyCityById.set(p.id, c);
          if (typeof p.lat === 'number' && Number.isFinite(p.lat) && typeof p.lng === 'number' && Number.isFinite(p.lng)) {
            propertyLatLngById.set(p.id, { lat: p.lat, lng: p.lng });
          }
        }

        const providerRows =
          metricsIds.length > 0
            ? await this.prisma.provider.findMany({
                where: { id: { in: metricsIds } },
                select: { id: true, city: true },
              })
            : [];
        const providerCityById = new Map<string, string | null>();
        for (const p of providerRows) {
          providerCityById.set(p.id, p.city);
        }

        const providerProfileRows =
          metricsIds.length > 0
            ? await this.prisma.providerProfile.findMany({
                where: { providerId: { in: metricsIds } },
                select: { providerId: true, currentLat: true, currentLng: true, isPrimaryContact: true },
                orderBy: [{ isPrimaryContact: 'desc' }, { id: 'asc' }],
              })
            : [];
        const providerLocationById = new Map<string, { lat: number; lng: number }>();
        for (const pf of providerProfileRows) {
          if (providerLocationById.has(pf.providerId)) continue;
          const la = pf.currentLat;
          const ln = pf.currentLng;
          if (la == null || ln == null || !Number.isFinite(la) || !Number.isFinite(ln)) continue;
          providerLocationById.set(pf.providerId, { lat: la, lng: ln });
        }

        return rows.map((row) => {
          const escRow = escalationInsights.get(row.id) ?? { lastEscalation: null, escalationHistoryCount: 0 };
          const attention = computeVendorAttentionReadModel({
            createdAt: row.createdAt,
            status: row.status,
            vendorId: row.vendorId,
            firstResponseAt: row.firstResponseAt,
            completedAt: row.completedAt,
            responseDueAt: row.responseDueAt,
            completionDueAt: row.completionDueAt,
            escalationLevel: row.escalationLevel,
          });
          const stuckExecution = computeCommandCenterStuckExecution({
            status: row.status,
            vendorId: row.vendorId,
            attentionCodes: attention.attentionCodes,
            createdAt: row.createdAt,
            firstResponseAt: row.firstResponseAt,
          });
          const brainBase = computeCommandCenterBrainReadModel({
            status: row.status,
            slaBreached: row.slaBreached,
            escalationLevel: row.escalationLevel ?? 0,
            needsAttention: attention.needsAttention,
            vendorId: row.vendorId,
            escalationHistoryCount: escRow.escalationHistoryCount,
            attentionCodes: attention.attentionCodes,
            createdAt: row.createdAt,
            firstResponseAt: row.firstResponseAt,
          });
          const executionSite = resolveUnifiedRequestExecutionSite({
            city: row.city,
            propertyIds: row.propertyIds ?? [],
            targetLat: row.targetLat ?? null,
            targetLng: row.targetLng ?? null,
            pickupLat: row.pickupLat ?? null,
            pickupLng: row.pickupLng ?? null,
            dropoffLat: row.dropoffLat ?? null,
            dropoffLng: row.dropoffLng ?? null,
            serviceType: row.serviceType,
            propertyCityById,
            propertyLatLngById,
          });
          const targetCity = executionSite.city;
          const targetCoords =
            executionSite.lat != null && executionSite.lng != null
              ? { lat: executionSite.lat, lng: executionSite.lng }
              : null;
          const providerSuitability = buildProviderSuitabilityReadModel(
            metricsMap,
            poolIds,
            row.vendorId,
            stuckExecution,
            { targetCity, providerCityById },
            { target: targetCoords, providerLocationById },
            {
              status: row.status,
              vendorId: row.vendorId,
              escalationLevelDb: row.escalationLevel ?? 0,
            },
          );
          const brain: CommandCenterBrainReadModel = providerSuitability
            ? { ...brainBase, providerSuitability }
            : brainBase;
          return {
            ...row,
            sla: this.pickSlaSnapshot(row),
            lastEscalation: escRow.lastEscalation,
            escalationHistoryCount: escRow.escalationHistoryCount,
            ...attention,
            brain,
          };
        });
      });
  }

  async assignProvider(user: AuthenticatedUser, requestId: string, providerId: string) {
    const { changed, request } = await this.orchestratorService.assignProviderToUnifiedRequest({
      requestId,
      providerId,
      actorUserId: user.id,
    });
    if (changed) {
      this.unifiedRequestsService.emitProviderAssignmentSockets(request, providerId);
    }
    return request;
  }

  async reassignProvider(user: AuthenticatedUser, requestId: string, providerId: string, reason?: string) {
    const before = await this.prisma.unifiedRequest.findUnique({
      where: { id: requestId },
      select: { vendorId: true, country: true, escalationLevel: true },
    });
    const { changed, request } = await this.orchestratorService.reassignProviderFromCommandCenter({
      requestId,
      providerId,
      actorUserId: user.id,
      reason,
    });
    if (changed) {
      this.unifiedRequestsService.emitProviderAssignmentSockets(request, providerId);
    }
    await this.ticketActionsService.createAction({
      ticketId: requestId,
      actionType: 'REASSIGN',
      actorType: this.toActorType(user),
      actorId: user.id,
      payload: {
        fromVendorId: before?.vendorId ?? null,
        toVendorId: providerId,
        reason: reason?.trim() || null,
        escalationContext: (before?.escalationLevel ?? 0) > 0,
      },
    });
    await this.auditTrailService.write({
      actorUserId: user.id,
      action: 'COMMAND_CENTER_REQUEST_REASSIGNED',
      entity: 'UnifiedRequest',
      entityId: requestId,
      countryCode: before?.country ?? request.country,
      metadata: {
        fromVendorId: before?.vendorId ?? null,
        toVendorId: providerId,
        reason: reason?.trim() || null,
      },
    });
    return request;
  }

  async interveneEscalation(user: AuthenticatedUser, requestId: string, reason?: string) {
    const request = await this.prisma.unifiedRequest.findUniqueOrThrow({
      where: { id: requestId },
      select: { id: true, country: true, escalationLevel: true, slaBreached: true },
    });
    await this.ticketActionsService.createAction({
      ticketId: requestId,
      actionType: 'INTERVENE',
      actorType: this.toActorType(user),
      actorId: user.id,
      payload: {
        reason: reason?.trim() || 'Manual command-center intervention',
        escalationLevel: request.escalationLevel,
        slaBreached: request.slaBreached,
      },
    });
    await this.auditTrailService.write({
      actorUserId: user.id,
      action: 'COMMAND_CENTER_ESCALATION_INTERVENED',
      entity: 'UnifiedRequest',
      entityId: requestId,
      countryCode: request.country,
      metadata: {
        reason: reason?.trim() || 'Manual command-center intervention',
        escalationLevel: request.escalationLevel,
      },
    });
    return this.prisma.unifiedRequest.findUniqueOrThrow({
      where: { id: requestId },
      include: { trackingEvents: true },
    });
  }

  async resolveEscalation(user: AuthenticatedUser, requestId: string, reason?: string) {
    const resolved = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.unifiedRequest.findUniqueOrThrow({
        where: { id: requestId },
        select: { id: true, country: true, escalationLevel: true, slaBreached: true },
      });
      const nextEscalationLevel = 0;
      const previousEscalationLevel = existing.escalationLevel ?? 0;
      const resolvedAt = new Date().toISOString();
      const actor = user.id?.trim() ? user.id : 'system';
      const resolvedReason = reason?.trim() || 'Escalation resolved by command-center';
      await tx.unifiedRequest.update({
        where: { id: requestId },
        data: { escalationLevel: nextEscalationLevel },
      });
      await this.ticketActionsService.createAction({
        ticketId: requestId,
        actionType: 'RESOLVE_ESCALATION',
        actorType: this.toActorType(user),
        actorId: user.id,
        payload: {
          reason: resolvedReason,
          previousEscalationLevel,
          fromEscalationLevel: previousEscalationLevel,
          toEscalationLevel: nextEscalationLevel,
          resolvedAt,
          actor,
          /** Snapshot only — `UnifiedRequest.slaBreached` is not modified here. */
          slaBreached: existing.slaBreached,
          resolutionSource: 'OPERATOR',
        },
      });
      await this.auditTrailService.write({
        actorUserId: user.id,
        action: 'COMMAND_CENTER_ESCALATION_RESOLVED',
        entity: 'UnifiedRequest',
        entityId: requestId,
        countryCode: existing.country,
        metadata: {
          reason: reason?.trim() || 'Escalation resolved by command-center',
          fromEscalationLevel: existing.escalationLevel ?? 0,
          toEscalationLevel: nextEscalationLevel,
        },
      });
      return tx.unifiedRequest.findUniqueOrThrow({
        where: { id: requestId },
        include: { trackingEvents: true },
      });
    });
    return resolved;
  }

  async createOffer(userId: string, payload: { title: string; type: string; discountMinor?: number }) {
    const offer = await this.prisma.offer.create({
      data: {
        createdByUserId: userId,
        title: payload.title,
        type: payload.type as never,
        discountMinor: payload.discountMinor,
        startsAt: new Date(),
        endsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
      },
    });

    await this.auditTrailService.write({
      actorUserId: userId,
      action: 'COMMAND_CENTER_OFFER_CREATED',
      entity: 'Offer',
      entityId: offer.id,
      metadata: payload as Record<string, unknown>,
    });

    return offer;
  }

  dispatchInstruction(actorUserId: string, requestId: string, instructionType: string, payload?: Record<string, unknown>) {
    return this.orchestratorService.dispatchInstruction(requestId, instructionType, payload, actorUserId);
  }

  listCountryConfigs() {
    return this.prisma.countryConfig.findMany({ orderBy: { code: 'asc' } });
  }

  listProviders() {
    return this.prisma.provider.findMany({ include: { adapterConfigs: true, providerProfiles: true } });
  }

  listAuditLogs(query?: { action?: string; entity?: string; countryCode?: string; severity?: 'INFO' | 'WARNING' | 'HIGH' | 'CRITICAL' }) {
    return this.auditTrailService.search({
      action: query?.action,
      entity: query?.entity,
      countryCode: query?.countryCode,
      severity: query?.severity,
      take: 300,
    });
  }

  /** Command-center inventory read: all lifecycle statuses + maintenance-hold operational context. */
  async listPropertiesForCommandCenter(query?: { countryCode?: string }) {
    const raw = query?.countryCode?.trim();
    const countryCode = raw ? raw.toUpperCase() : undefined;
    const properties = await this.prisma.property.findMany({
      where: countryCode ? { countryCode } : {},
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        id: true,
        title: true,
        city: true,
        district: true,
        countryCode: true,
        status: true,
        propertyType: true,
        slug: true,
        createdAt: true,
      },
    });

    const propertyIds = properties.map((p) => p.id);
    if (propertyIds.length === 0) return properties.map((p) => ({ ...p, maintenanceHold: null }));

    const activeHolds = await this.prisma.maintenanceRequest.findMany({
      where: {
        propertyId: { in: propertyIds },
        metadata: {
          path: ['maintenanceHold', 'active'],
          equals: true,
        },
      },
      include: {
        unifiedRequest: {
          select: {
            id: true,
            status: true,
            vendorId: true,
            paymentStatus: true,
            updatedAt: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const holdByProperty = new Map<string, (typeof activeHolds)[number]>();
    for (const hold of activeHolds) {
      if (!hold.propertyId) continue;
      if (!holdByProperty.has(hold.propertyId)) {
        holdByProperty.set(hold.propertyId, hold);
      }
    }

    return properties.map((property) => {
      const hold = holdByProperty.get(property.id);
      if (!hold) {
        return {
          ...property,
          maintenanceHold: null,
        };
      }

      const unifiedStatus = hold.unifiedRequest.status;
      const requestTerminal = ['COMPLETED', 'CANCELLED', 'REJECTED', 'FAILED'].includes(unifiedStatus);
      const releaseAllowed = !requestTerminal;
      const nextAction = releaseAllowed
        ? (hold.providerId || hold.unifiedRequest.vendorId ? 'Monitor execution and release hold when work is done' : 'Assign provider and start execution')
        : 'Review terminal maintenance workflow before hold release';

      return {
        ...property,
        maintenanceHold: {
          active: true,
          maintenanceRequestId: hold.id,
          maintenanceRequestStatus: hold.status,
          unifiedRequestId: hold.unifiedRequestId,
          unifiedRequestStatus: unifiedStatus,
          assignedProviderId: hold.providerId ?? hold.unifiedRequest.vendorId ?? null,
          category: hold.category,
          severity: hold.severity,
          releaseAllowed,
          nextAction,
        },
      };
    });
  }

  private bookingPaymentSettled(
    payments: Array<{ status: PaymentStatus }>,
    unifiedRequest: { paymentStatus: PaymentStatus } | null,
  ): boolean {
    const viaBooking = payments.some((p) => p.status === 'SUCCEEDED' || p.status === 'WAIVED');
    const viaRequest = unifiedRequest
      ? unifiedRequest.paymentStatus === 'SUCCEEDED' || unifiedRequest.paymentStatus === 'WAIVED'
      : false;
    return viaBooking || viaRequest;
  }

  private bookingContractReady(snapshot: {
    payments: Array<{ status: PaymentStatus }>;
    unifiedRequest: { paymentStatus: PaymentStatus } | null;
    confirmedAt: Date | null;
    termMonths: number;
  }): boolean {
    if (!this.bookingPaymentSettled(snapshot.payments, snapshot.unifiedRequest)) {
      return false;
    }
    if (!snapshot.confirmedAt) {
      return false;
    }
    return snapshot.termMonths > 0;
  }

  /**
   * Command-center booking read model: lifecycle + inventory projection + readiness + guidance.
   * Aligns with booking command validation (Phases 1–3A); does not execute commands.
   */
  private buildBookingCommandCenterOperationalRow(row: {
    id: string;
    status: BookingStatus;
    moveInDate: Date;
    termMonths: number;
    confirmedAt: Date | null;
    unifiedRequestId: string | null;
    createdAt: Date;
    updatedAt: Date;
    totalAmountMinor: number;
    securityDepositMinor: number;
    currency: string;
    tenant: { id: string; fullName: string };
    property: { id: string; title: string; city: string; countryCode: string; status: PropertyStatus };
    payments: Array<{ status: PaymentStatus }>;
    unifiedRequest: { paymentStatus: PaymentStatus } | null;
  }) {
    const paymentSettled = this.bookingPaymentSettled(row.payments, row.unifiedRequest);
    const contractReady = this.bookingContractReady({
      payments: row.payments,
      unifiedRequest: row.unifiedRequest,
      confirmedAt: row.confirmedAt,
      termMonths: row.termMonths,
    });

    let occupancyState: { code: string; label: string };
    if (row.status === 'CANCELLED') {
      occupancyState = { code: 'CANCELLED', label: 'Cancelled — no active lease' };
    } else if (row.status === 'COMPLETED') {
      occupancyState = { code: 'POST_LEASE', label: 'Lease completed (booking truth)' };
    } else if (row.status === 'ACTIVE') {
      occupancyState =
        row.property.status === 'OCCUPIED'
          ? { code: 'UNDER_ACTIVE_LEASE', label: 'Occupied under active lease' }
          : { code: 'ACTIVE_PROJECTION_MISMATCH', label: 'Active lease but property is not OCCUPIED' };
    } else {
      occupancyState = { code: 'PRE_ACTIVE_LEASE', label: 'Not yet in active occupancy phase' };
    }

    let nextAction = '';
    let blockingReason: string | null = null;

    switch (row.status) {
      case 'DRAFT':
        nextAction = 'Resolve draft booking via operational intake (no command-center booking commands yet).';
        blockingReason = 'Booking is DRAFT; command-center booking commands are not defined for this state.';
        break;
      case 'RESERVED':
        if (!paymentSettled) {
          blockingReason = 'Payment not settled (SUCCEEDED or WAIVED required before confirm).';
          nextAction = 'Collect or record successful payment, then confirm booking.';
        } else if (row.property.status === 'RESERVED') {
          blockingReason = 'Property is under operational reserve; release reserve before confirm.';
          nextAction = 'Release property reserve, then confirm booking.';
        } else if (row.property.status === 'INACTIVE') {
          blockingReason = 'Property is hidden/inactive; republish before confirm.';
          nextAction = 'Republish property, then confirm booking.';
        } else if (row.property.status === 'OCCUPIED') {
          blockingReason = 'Property is OCCUPIED; cannot confirm booking.';
          nextAction = 'Reconcile occupancy conflict before confirm.';
        } else {
          nextAction = 'Run confirm-booking command when operationally ready.';
        }
        break;
      case 'CONFIRMED':
        if (!contractReady) {
          if (!paymentSettled) {
            blockingReason = 'Contract readiness: payment not settled.';
          } else if (!row.confirmedAt) {
            blockingReason = 'Contract readiness: booking not confirmed (missing confirmedAt).';
          } else if (row.termMonths <= 0) {
            blockingReason = 'Contract readiness: invalid term (termMonths must be > 0).';
          }
          nextAction = 'Fix readiness blockers, then move to contract pending.';
        } else if (row.property.status === 'RESERVED') {
          blockingReason = 'Property is under operational reserve; release reserve before contract pending.';
          nextAction = 'Release reserve, then move to contract pending.';
        } else {
          nextAction = 'Run contract-pending command.';
        }
        break;
      case 'CONTRACT_PENDING':
        if (!contractReady) {
          blockingReason = 'Contract readiness failed; check payment, confirmation, and term.';
          nextAction = 'Resolve readiness, then activate lease.';
        } else if (row.moveInDate.getTime() > Date.now()) {
          blockingReason = 'Move-in date not reached; activation blocked until on or after move-in date.';
          nextAction = 'Wait until move-in date, then run activate-lease command.';
        } else if (row.property.status === 'RESERVED' || row.property.status === 'INACTIVE') {
          blockingReason = `Property status ${row.property.status} blocks lease activation.`;
          nextAction = 'Resolve property state (reserve/hide), then activate lease.';
        } else {
          nextAction = 'Run activate-lease command.';
        }
        break;
      case 'ACTIVE':
        if (row.property.status !== 'OCCUPIED') {
          blockingReason = 'Booking is ACTIVE but property is not OCCUPIED; inventory projection must be reconciled.';
          nextAction = 'Reconcile property projection, then manage end-of-lease completion.';
        } else {
          nextAction = 'At end of tenancy, run complete-lease command.';
        }
        break;
      case 'COMPLETED':
        if (row.property.status === 'OCCUPIED') {
          blockingReason = 'Booking is COMPLETED but property is still OCCUPIED; data inconsistency.';
          nextAction = 'Reconcile inventory projection (complete-lease should have released OCCUPIED).';
        } else {
          nextAction = 'No further booking commands; monitor post-lease / settlement workflows when enabled.';
        }
        break;
      case 'CANCELLED':
        nextAction = 'No active booking operations.';
        break;
      default:
        nextAction = 'Review booking status.';
        blockingReason = `Unhandled booking status: ${row.status}`;
    }

    return {
      id: row.id,
      bookingStatus: row.status,
      moveInDate: row.moveInDate,
      termMonths: row.termMonths,
      confirmedAt: row.confirmedAt,
      unifiedRequestId: row.unifiedRequestId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      totalAmountMinor: row.totalAmountMinor,
      securityDepositMinor: row.securityDepositMinor,
      currency: row.currency,
      tenant: row.tenant,
      property: row.property,
      paymentReadiness: {
        settled: paymentSettled,
        summary: paymentSettled ? 'SETTLED' : 'NOT_SETTLED',
      },
      contractReadiness: { ready: contractReady },
      occupancyState,
      nextAction,
      blockingReason,
    };
  }

  async listBookingsForCommandCenter(query?: { countryCode?: string }) {
    const raw = query?.countryCode?.trim();
    const countryCode = raw ? raw.toUpperCase() : undefined;
    const rows = await this.prisma.booking.findMany({
      where: countryCode ? { property: { countryCode } } : {},
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        id: true,
        status: true,
        moveInDate: true,
        termMonths: true,
        confirmedAt: true,
        unifiedRequestId: true,
        createdAt: true,
        updatedAt: true,
        totalAmountMinor: true,
        securityDepositMinor: true,
        currency: true,
        tenant: { select: { id: true, fullName: true } },
        property: { select: { id: true, title: true, city: true, countryCode: true, status: true } },
        payments: { select: { status: true } },
        unifiedRequest: { select: { paymentStatus: true } },
      },
    });

    return rows.map((r) => this.buildBookingCommandCenterOperationalRow(r));
  }
}