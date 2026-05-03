'use client';

import { FormEvent, useMemo, useState } from 'react';

const ACCESS_TOKEN_STORAGE_KEY = 'quickrent_access_token';
const REFRESH_TOKEN_STORAGE_KEY = 'quickrent_refresh_token';
const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1';
const AUTH_LOGIN_URL = `${apiBaseUrl.replace(/\/$/, '')}/auth/login`;

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = useMemo(() => email.trim().length > 0 && password.trim().length > 0 && !submitting, [email, password, submitting]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch(AUTH_LOGIN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        const errorMessage =
          (payload && typeof payload === 'object' && 'message' in payload && typeof payload.message === 'string'
            ? payload.message
            : null) ?? 'Login failed';
        throw new Error(errorMessage);
      }

      const data = payload && typeof payload === 'object' && 'data' in payload ? payload.data : payload;
      const accessToken =
        data && typeof data === 'object' && 'accessToken' in data && typeof data.accessToken === 'string'
          ? data.accessToken
          : '';
      const refreshToken =
        data && typeof data === 'object' && 'refreshToken' in data && typeof data.refreshToken === 'string'
          ? data.refreshToken
          : '';

      if (!accessToken) {
        throw new Error('Login response missing access token');
      }

      localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, accessToken);
      localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken ?? '');
      window.location.href = '/';
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#F8FAFC', padding: 20 }}>
      <form
        onSubmit={onSubmit}
        style={{ width: 'min(560px, 100%)', background: '#FFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: 20, display: 'grid', gap: 12 }}
      >
        <h1 style={{ margin: 0, fontSize: 24 }}>Admin Login Recovery</h1>
        <p style={{ margin: 0, color: '#64748B', fontSize: 14 }}>
          Sign in with admin credentials to restore dashboard and socket authentication.
        </p>
        <label style={{ display: 'grid', gap: 6 }}>
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            style={{ padding: 10, border: '1px solid #CBD5E1', borderRadius: 8 }}
          />
        </label>
        <label style={{ display: 'grid', gap: 6 }}>
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            style={{ padding: 10, border: '1px solid #CBD5E1', borderRadius: 8 }}
          />
        </label>
        {error ? <div style={{ color: '#B91C1C', fontSize: 13 }}>{error}</div> : null}
        <button
          type="submit"
          disabled={!canSubmit}
          style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #1D4ED8', background: '#2563EB', color: '#FFF', cursor: canSubmit ? 'pointer' : 'not-allowed', opacity: canSubmit ? 1 : 0.6 }}
        >
          {submitting ? 'Logging in…' : 'Login'}
        </button>
      </form>
    </main>
  );
}
