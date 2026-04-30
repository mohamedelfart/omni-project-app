'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  fetchProviderMemberships,
  postSwitchProviderContext,
  type ProviderMembership,
} from '../../lib/provider-context-client';
import { clearSession, getAccessToken } from '../../lib/vendor-session';

type Phase =
  | { kind: 'loading' }
  | { kind: 'empty' }
  | { kind: 'choose'; memberships: ProviderMembership[] }
  | { kind: 'auto_switch' }
  | { kind: 'load_error'; message: string };

export default function SelectProviderPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' });
  const [switchError, setSwitchError] = useState<string | null>(null);
  const [rowBusyId, setRowBusyId] = useState<string | null>(null);
  const autoRunRef = useRef(false);

  const redirectToLogin = useCallback(() => {
    clearSession();
    router.replace('/login');
  }, [router]);

  const goJobs = useCallback(() => {
    router.replace('/jobs');
  }, [router]);

  const runSwitch = useCallback(
    async (providerId: string): Promise<boolean> => {
      setSwitchError(null);
      const outcome = await postSwitchProviderContext(providerId);
      if (outcome.ok) {
        return true;
      }
      if (outcome.authRejected) {
        redirectToLogin();
        return false;
      }
      setSwitchError(outcome.message);
      return false;
    },
    [redirectToLogin],
  );

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace('/login');
      return;
    }

    let cancelled = false;

    const load = async () => {
      const outcome = await fetchProviderMemberships();
      if (cancelled) return;
      if (!outcome.ok) {
        if (outcome.authRejected) {
          redirectToLogin();
          return;
        }
        setPhase({ kind: 'load_error', message: outcome.message });
        return;
      }
      const { memberships } = outcome;
      if (memberships.length === 0) {
        setPhase({ kind: 'empty' });
        return;
      }
      if (memberships.length === 1) {
        setPhase({ kind: 'auto_switch' });
        return;
      }
      setPhase({ kind: 'choose', memberships });
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [redirectToLogin, router]);

  useEffect(() => {
    if (phase.kind !== 'auto_switch' || autoRunRef.current) return;
    autoRunRef.current = true;

    const run = async () => {
      const outcome = await fetchProviderMemberships();
      if (!outcome.ok) {
        if (outcome.authRejected) {
          redirectToLogin();
          return;
        }
        setPhase({ kind: 'load_error', message: outcome.message });
        autoRunRef.current = false;
        return;
      }
      const { memberships } = outcome;
      const only = memberships.length === 1 ? memberships[0] : undefined;
      if (!only) {
        if (memberships.length === 0) {
          setPhase({ kind: 'empty' });
        } else {
          setPhase({ kind: 'choose', memberships });
        }
        autoRunRef.current = false;
        return;
      }
      const ok = await runSwitch(only.providerId);
      if (ok) {
        goJobs();
      } else {
        setPhase({ kind: 'choose', memberships });
        autoRunRef.current = false;
      }
    };

    void run();
  }, [goJobs, phase.kind, redirectToLogin, runSwitch]);

  const onPick = async (m: ProviderMembership) => {
    setRowBusyId(m.providerId);
    setSwitchError(null);
    const ok = await runSwitch(m.providerId);
    setRowBusyId(null);
    if (ok) {
      goJobs();
    }
  };

  const signOut = () => {
    clearSession();
    router.replace('/login');
  };

  if (phase.kind === 'loading' || phase.kind === 'auto_switch') {
    return (
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <h1 style={{ margin: '0 0 8px', fontSize: 22 }}>Provider access</h1>
        <p style={{ margin: 0, color: '#64748B', fontSize: 14 }}>
          {phase.kind === 'auto_switch' ? 'Connecting your workspace…' : 'Loading…'}
        </p>
      </div>
    );
  }

  if (phase.kind === 'load_error') {
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', display: 'grid', gap: 16 }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>Provider access</h1>
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: 12, color: '#991B1B' }}>
          {phase.message}
        </div>
        <button
          type="button"
          onClick={() => {
            setPhase({ kind: 'loading' });
            window.location.reload();
          }}
          style={{
            padding: '10px 16px',
            borderRadius: 8,
            border: 'none',
            background: '#1E3A5F',
            color: '#fff',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (phase.kind === 'empty') {
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', display: 'grid', gap: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>No provider access</h1>
        <p style={{ margin: 0, color: '#64748B', fontSize: 14, lineHeight: 1.5 }}>
          Your account is signed in, but you are not linked to any provider organization. Contact support if you believe
          this is a mistake.
        </p>
        <button
          type="button"
          onClick={signOut}
          style={{
            justifySelf: 'start',
            padding: '10px 16px',
            borderRadius: 8,
            border: '1px solid #CBD5E1',
            background: '#fff',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Sign out
        </button>
      </div>
    );
  }

  const { memberships } = phase;

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', display: 'grid', gap: 20 }}>
      <div>
        <h1 style={{ margin: '0 0 8px', fontSize: 22 }}>Choose provider</h1>
        <p style={{ margin: 0, color: '#64748B', fontSize: 14 }}>Select which organization you are working as.</p>
      </div>

      {switchError ? (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: 12, color: '#991B1B' }}>
          {switchError}
        </div>
      ) : null}

      <div style={{ display: 'grid', gap: 12 }}>
        {memberships.map((m) => {
          const busy = rowBusyId === m.providerId;
          return (
            <button
              key={m.providerId}
              type="button"
              disabled={busy || rowBusyId !== null}
              onClick={() => void onPick(m)}
              style={{
                textAlign: 'left',
                padding: 16,
                borderRadius: 10,
                border: '1px solid #E2E8F0',
                background: '#FFFFFF',
                cursor: busy || rowBusyId !== null ? 'wait' : 'pointer',
                display: 'grid',
                gap: 6,
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 16, color: '#0F172A' }}>{m.providerName}</div>
              <div style={{ fontSize: 13, color: '#64748B' }}>
                {m.profileTitle}
                {m.city ? ` · ${m.city}` : ''}
              </div>
              <div style={{ fontSize: 12, color: '#94A3B8' }}>
                {m.providerType}
                {m.isPrimaryContact ? ' · Primary contact' : ''}
              </div>
              <div style={{ fontSize: 13, color: '#1D4ED8', fontWeight: 600 }}>{busy ? 'Switching…' : 'Continue →'}</div>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={signOut}
        style={{
          justifySelf: 'start',
          padding: '8px 14px',
          borderRadius: 8,
          border: '1px solid #CBD5E1',
          background: '#fff',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Sign out
      </button>
    </div>
  );
}
