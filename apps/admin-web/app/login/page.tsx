'use client';

import { FormEvent, useMemo, useState } from 'react';

const ACCESS_TOKEN_STORAGE_KEY = 'quickrent_access_token';
const REFRESH_TOKEN_STORAGE_KEY = 'quickrent_refresh_token';

function isLikelyJwt(token: string): boolean {
  const parts = token.split('.');
  return parts.length === 3 && parts.every((part) => part.length > 0);
}

export default function AdminLoginPage() {
  const [accessToken, setAccessToken] = useState('');
  const [refreshToken, setRefreshToken] = useState('');
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => isLikelyJwt(accessToken.trim()), [accessToken]);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const access = accessToken.trim();
    const refresh = refreshToken.trim();
    if (!isLikelyJwt(access)) {
      setError('Access token must be a valid JWT.');
      return;
    }

    localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, access);
    if (isLikelyJwt(refresh)) {
      localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refresh);
    } else {
      localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
    }
    window.location.assign('/');
  };

  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#F8FAFC', padding: 20 }}>
      <form
        onSubmit={onSubmit}
        style={{ width: 'min(560px, 100%)', background: '#FFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: 20, display: 'grid', gap: 12 }}
      >
        <h1 style={{ margin: 0, fontSize: 24 }}>Admin Login Recovery</h1>
        <p style={{ margin: 0, color: '#64748B', fontSize: 14 }}>
          Paste a valid access token to restore dashboard and socket authentication. Refresh token is optional but recommended.
        </p>
        <label style={{ display: 'grid', gap: 6 }}>
          <span>Access Token</span>
          <textarea
            value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)}
            rows={5}
            placeholder="eyJ..."
            style={{ resize: 'vertical', padding: 10, border: '1px solid #CBD5E1', borderRadius: 8 }}
          />
        </label>
        <label style={{ display: 'grid', gap: 6 }}>
          <span>Refresh Token (optional)</span>
          <textarea
            value={refreshToken}
            onChange={(e) => setRefreshToken(e.target.value)}
            rows={4}
            placeholder="eyJ..."
            style={{ resize: 'vertical', padding: 10, border: '1px solid #CBD5E1', borderRadius: 8 }}
          />
        </label>
        {error ? <div style={{ color: '#B91C1C', fontSize: 13 }}>{error}</div> : null}
        <button
          type="submit"
          disabled={!canSubmit}
          style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #1D4ED8', background: '#2563EB', color: '#FFF', cursor: canSubmit ? 'pointer' : 'not-allowed', opacity: canSubmit ? 1 : 0.6 }}
        >
          Save Session
        </button>
      </form>
    </main>
  );
}
