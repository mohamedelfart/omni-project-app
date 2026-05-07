import type { TicketAction } from '@quickrent/shared-types';
import {
  isProviderOperationalIntentCode,
  PROVIDER_OPERATIONAL_INTENT_TENANT_LABELS,
} from '../orchestrator/provider-operational-intents';

export type TenantOperationalJourneyStep = {
  at: string;
  label: string;
  kind: 'coordination' | 'provider' | 'signal' | 'status';
  advisory?: boolean;
};

type TrackingEv = { createdAt: Date; actorType: string; title: string };

function dedupeAdjacentSteps(steps: TenantOperationalJourneyStep[]): TenantOperationalJourneyStep[] {
  const out: TenantOperationalJourneyStep[] = [];
  for (const s of steps) {
    const last = out[out.length - 1];
    if (
      last
      && last.label === s.label
      && Math.abs(new Date(s.at).getTime() - new Date(last.at).getTime()) < 2000
    ) {
      continue;
    }
    out.push(s);
  }
  return out;
}

function actionTimestamp(a: TicketAction): string {
  return typeof a.createdAt === 'string' ? a.createdAt : a.createdAt.toISOString();
}

/**
 * Tenant-visible operational journey derived from append-only TicketAction + key tracking milestones.
 */
export function buildTenantOperationalJourney(
  actions: TicketAction[],
  tracking: TrackingEv[],
): TenantOperationalJourneyStep[] {
  const steps: TenantOperationalJourneyStep[] = [];

  const trackingSorted = [...tracking].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  for (const ev of trackingSorted) {
    const titleLower = ev.title.toLowerCase();
    if (ev.actorType === 'tenant' && titleLower.includes('submitted')) {
      steps.push({
        at: ev.createdAt.toISOString(),
        label: 'Request received',
        kind: 'coordination',
      });
    } else if (ev.actorType === 'command-center' && titleLower.includes('provider assigned')) {
      steps.push({
        at: ev.createdAt.toISOString(),
        label: 'Provider assigned',
        kind: 'provider',
      });
    }
  }

  for (const a of actions) {
    const at = actionTimestamp(a);
    if (a.type === 'PROVIDER_OPERATIONAL_INTENT') {
      const intentRaw = a.payload?.intent;
      const intent = typeof intentRaw === 'string' ? intentRaw : '';
      const label = isProviderOperationalIntentCode(intent)
        ? PROVIDER_OPERATIONAL_INTENT_TENANT_LABELS[intent]
        : 'Update from your provider';
      steps.push({ at, label, kind: 'signal', advisory: true });
      continue;
    }
    if (a.type === 'ASSIGN') {
      steps.push({ at, label: 'Provider assigned', kind: 'provider' });
      continue;
    }
    if (a.type === 'STATUS_UPDATE' && a.createdBy.type === 'provider') {
      const to = a.payload?.to;
      if (to === 'in_progress') {
        steps.push({ at, label: 'Visit in progress', kind: 'status' });
      } else if (to === 'completed') {
        steps.push({ at, label: 'Visit completed', kind: 'status' });
      }
      continue;
    }
    if (
      a.type === 'STATUS_UPDATE'
      && (a.createdBy.type === 'admin' || a.createdBy.type === 'command-center')
    ) {
      const to = a.payload?.to;
      if (to === 'in_progress') {
        steps.push({ at, label: 'Visit in progress', kind: 'coordination' });
      } else if (to === 'completed') {
        steps.push({ at, label: 'Visit completed', kind: 'coordination' });
      }
    }
  }

  steps.sort((x, y) => new Date(x.at).getTime() - new Date(y.at).getTime());
  return dedupeAdjacentSteps(steps);
}
