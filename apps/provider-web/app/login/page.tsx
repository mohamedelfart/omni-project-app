'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { getAccessToken, persistSession } from '../../lib/vendor-session';

function extractTokens(body: unknown): { accessToken: string; refreshToken?: string } | null {
  if (!body || typeof body !== 'object') return null;
  const root = body as Record<string, unknown>;
  const data = root.data;
  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>;
    const access = d.accessToken;
    if (typeof access === 'string' && access.length > 0) {
      const refresh = d.refreshToken;
      return {
        accessToken: access,
        refreshToken: typeof refresh === 'string' ? refresh : undefined,
      };
    }
  }
  const access = root.accessToken;
  if (typeof access === 'string' && access.length > 0) {
    const refresh = root.refreshToken;
    return {
      accessToken: access,
      refreshToken: typeof refresh === 'string' ? refresh : undefined,
    };
  }
  return null;
}

function extractErrorMessage(body: unknown): string {
  if (!body || typeof body !== 'object') return 'Login failed';
  const root = body as Record<string, unknown>;
  const msg = root.message;
  if (typeof msg === 'string') return msg;
  if (msg && typeof msg === 'object' && 'message' in msg) {
    const inner = (msg as { message?: unknown }).message;
    if (typeof inner === 'string') return inner;
  }
  return 'Login failed';
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (getAccessToken()) {
      router.replace('/select-provider');
    }
  }, [router]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(extractErrorMessage(payload));
      }
      const tokens = extractTokens(payload);
      if (!tokens) {
        throw new Error('Login response missing tokens');
      }
      persistSession(tokens);
      router.replace('/select-provider');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '0 auto' }}>
      <h1 style={{ margin: '0 0 8px', fontSize: 22 }}>Vendor sign in</h1>
      <p style={{ margin: '0 0 20px', color: '#64748B', fontSize: 14 }}>
        Use your provider account. Next:{' '}
        <Link href="/jobs" style={{ color: '#1D4ED8' }}>
          My jobs
        </Link>
      </p>

      {error ? (
        <div
          style={{
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: 8,
            padding: 12,
            color: '#991B1B',
            marginBottom: 16,
            fontSize: 14,
          }}
        >
          {error}
        </div>
      ) : null}

      <form onSubmit={(e) => void onSubmit(e)} style={{ display: 'grid', gap: 14 }}>
        <label style={{ display: 'grid', gap: 6, fontSize: 14, fontWeight: 600 }}>
          Email
          <input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            required
            style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 15 }}
          />
        </label>
        <label style={{ display: 'grid', gap: 6, fontSize: 14, fontWeight: 600 }}>
          Password
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(ev) => setPassword(ev.target.value)}
            required
            minLength={8}
            style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 15 }}
          />
        </label>
        <button
          type="submit"
          disabled={submitting}
          style={{
            marginTop: 8,
            padding: '12px 16px',
            borderRadius: 8,
            border: 'none',
            background: submitting ? '#94A3B8' : '#1E3A5F',
            color: '#fff',
            fontWeight: 700,
            fontSize: 15,
            cursor: submitting ? 'not-allowed' : 'pointer',
          }}
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
