import type { VendorJob } from './vendor-types';
import { buildAuthHeaders, getAccessToken } from './vendor-session';

export const PROVIDER_OPERATIONAL_SIGNALS = [
  'ARRIVED_ON_SITE',
  'RUNNING_LATE',
  'TENANT_UNREACHABLE',
  'BLOCKED_ACCESS',
  'REQUEST_SUPPORT',
  'VIEWING_STARTED',
  'VIEWING_COMPLETED',
] as const;

export type ProviderOperationalSignal = (typeof PROVIDER_OPERATIONAL_SIGNALS)[number];

export async function fetchVendorJobsList(): Promise<VendorJob[]> {
  const token = getAccessToken();
  const response = await fetch('/api/tickets', {
    cache: 'no-store',
    headers: buildAuthHeaders(token),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      typeof payload?.error === 'string'
        ? payload.error
        : typeof payload?.message === 'string'
          ? payload.message
          : 'Failed to load jobs';
    throw new Error(message);
  }
  return Array.isArray(payload) ? (payload as VendorJob[]) : [];
}

export async function postVendorJobStatus(jobId: string, status: 'in_progress' | 'completed'): Promise<void> {
  const token = getAccessToken();
  const response = await fetch(`/api/tickets/${encodeURIComponent(jobId)}/status`, {
    method: 'POST',
    headers: buildAuthHeaders(token),
    body: JSON.stringify({ status }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      typeof payload?.error === 'string'
        ? payload.error
        : typeof payload?.message === 'string'
          ? payload.message
          : 'Failed to update status';
    throw new Error(message);
  }
}

export async function postVendorOperationalSignal(
  jobId: string,
  intent: ProviderOperationalSignal,
  note?: string,
): Promise<void> {
  const token = getAccessToken();
  const response = await fetch(`/api/tickets/${encodeURIComponent(jobId)}/operational-intents`, {
    method: 'POST',
    headers: buildAuthHeaders(token),
    body: JSON.stringify({
      intent,
      ...(note ? { note } : {}),
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      typeof payload?.error === 'string'
        ? payload.error
        : typeof payload?.message === 'string'
          ? payload.message
          : 'Failed to send operational signal';
    throw new Error(message);
  }
}
