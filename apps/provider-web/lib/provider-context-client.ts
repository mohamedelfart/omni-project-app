import { buildAuthHeaders, getAccessToken } from './vendor-session';

export type ProviderMembership = {
  providerId: string;
  providerName: string;
  providerType: string;
  city: string | null;
  serviceTypes: string[];
  profileTitle: string;
  isPrimaryContact: boolean;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function parseMembershipList(payload: unknown): ProviderMembership[] {
  if (!isRecord(payload)) return [];
  const data = payload.data;
  const raw: unknown[] = Array.isArray(data) ? data : Array.isArray(payload) ? (payload as unknown[]) : [];
  const out: ProviderMembership[] = [];
  for (const row of raw) {
    if (!isRecord(row)) continue;
    const providerId = row.providerId;
    const providerName = row.providerName;
    const providerType = row.providerType;
    if (typeof providerId !== 'string' || !providerId) continue;
    if (typeof providerName !== 'string') continue;
    if (typeof providerType !== 'string') continue;
    const city = row.city === null || typeof row.city === 'string' ? row.city : null;
    const serviceTypes = Array.isArray(row.serviceTypes)
      ? row.serviceTypes.filter((s): s is string => typeof s === 'string')
      : [];
    const profileTitle = typeof row.profileTitle === 'string' ? row.profileTitle : '';
    const isPrimaryContact = Boolean(row.isPrimaryContact);
    out.push({
      providerId,
      providerName,
      providerType,
      city,
      serviceTypes,
      profileTitle,
      isPrimaryContact,
    });
  }
  return out;
}

function extractErrorMessage(payload: unknown): string {
  if (!isRecord(payload)) return 'Request failed';
  const msg = payload.message;
  if (typeof msg === 'string') return msg;
  if (isRecord(msg) && typeof msg.message === 'string') return msg.message;
  const err = payload.error;
  if (typeof err === 'string') return err;
  return 'Request failed';
}

export type FetchMembershipsOutcome =
  | { ok: true; memberships: ProviderMembership[] }
  | { ok: false; authRejected: true }
  | { ok: false; authRejected: false; message: string };

export async function fetchProviderMemberships(): Promise<FetchMembershipsOutcome> {
  const token = getAccessToken();
  if (!token) {
    return { ok: false, authRejected: true };
  }
  const response = await fetch('/api/provider-profiles/me', {
    cache: 'no-store',
    headers: buildAuthHeaders(token),
  });
  const payload = await response.json().catch(() => ({}));
  if (response.status === 401 || response.status === 403) {
    return { ok: false, authRejected: true };
  }
  if (!response.ok) {
    return { ok: false, authRejected: false, message: extractErrorMessage(payload) };
  }
  return { ok: true, memberships: parseMembershipList(payload) };
}

export type SwitchProviderOutcome =
  | { ok: true }
  | { ok: false; authRejected: true }
  | { ok: false; authRejected: false; message: string };

export async function postSwitchProviderContext(providerId: string): Promise<SwitchProviderOutcome> {
  const token = getAccessToken();
  if (!token) {
    return { ok: false, authRejected: true };
  }
  const response = await fetch('/api/auth/switch-provider-context', {
    method: 'POST',
    cache: 'no-store',
    headers: buildAuthHeaders(token),
    body: JSON.stringify({ providerId }),
  });
  const payload = await response.json().catch(() => ({}));
  if (response.status === 401 || response.status === 403) {
    return { ok: false, authRejected: true };
  }
  if (!response.ok) {
    return { ok: false, authRejected: false, message: extractErrorMessage(payload) };
  }
  return { ok: true };
}
