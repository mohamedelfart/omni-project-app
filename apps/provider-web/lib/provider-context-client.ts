'use client';

import { useRouter } from 'next/navigation';
import { createElement, useEffect, useState, type ReactElement } from 'react';

import { buildAuthHeaders, clearSession, getAccessToken } from './vendor-session';

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

type NavProviderContext = {
  label: string;
  canSwitch: boolean;
};

export function ProviderNavContextControls(): ReactElement | null {
  const router = useRouter();
  const [ctx, setCtx] = useState<NavProviderContext | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setCtx(null);
      return;
    }

    let cancelled = false;
    const load = async () => {
      const outcome = await fetchProviderMemberships();
      if (cancelled || !outcome.ok) {
        setCtx(null);
        return;
      }
      const onlyMembership = outcome.memberships.length === 1 ? outcome.memberships[0] : undefined;
      if (onlyMembership) {
        setCtx({ label: onlyMembership.providerName, canSwitch: true });
        return;
      }
      if (outcome.memberships.length > 1) {
        setCtx({ label: 'Provider', canSwitch: true });
        return;
      }
      setCtx(null);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ctx) return null;

  const controls: ReactElement[] = [
    createElement(
      'span',
      {
        key: 'provider-label',
        style: {
          padding: '6px 10px',
          borderRadius: 8,
          background: 'rgba(249,115,22,0.2)',
          color: '#FDBA74',
          fontSize: 12,
          fontWeight: 700,
          maxWidth: 180,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        },
        title: ctx.label,
      },
      ctx.label,
    ),
  ];

  if (ctx.canSwitch) {
    controls.push(
      createElement(
        'a',
        {
          key: 'switch-provider',
          href: '/select-provider',
          style: {
            padding: '8px 14px',
            borderRadius: 8,
            color: 'rgba(255,255,255,0.85)',
            textDecoration: 'none',
            fontSize: 14,
            fontWeight: 600,
          },
        },
        'Switch provider',
      ),
    );
  }

  controls.push(
    createElement(
      'button',
      {
        key: 'global-signout',
        type: 'button',
        onClick: () => {
          clearSession();
          router.replace('/login');
        },
        style: {
          padding: '8px 14px',
          borderRadius: 8,
          border: '1px solid rgba(255,255,255,0.35)',
          background: 'transparent',
          color: '#FFFFFF',
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
        },
      },
      'Sign out',
    ),
  );

  return createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } }, ...controls);
}
