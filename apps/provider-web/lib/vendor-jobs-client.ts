import type { VendorJob } from './vendor-types';
import { buildAuthHeaders, getAccessToken } from './vendor-session';

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
