/** Match existing provider-web token resolution order. */
export function getAccessToken(): string {
  if (typeof window === 'undefined') return '';
  return (
    window.localStorage.getItem('quickrent_access_token') ??
    window.localStorage.getItem('accessToken') ??
    window.localStorage.getItem('token') ??
    ''
  );
}

export function buildAuthHeaders(token: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function getApiBase(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1';
}

export function getSocketOrigin(): string {
  return getApiBase().replace(/\/api\/v1\/?$/, '');
}

export function persistSession(tokens: { accessToken: string; refreshToken?: string }): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('quickrent_access_token', tokens.accessToken);
  window.localStorage.setItem('accessToken', tokens.accessToken);
  window.localStorage.setItem('token', tokens.accessToken);
  if (tokens.refreshToken) {
    window.localStorage.setItem('quickrent_refresh_token', tokens.refreshToken);
  }
}

export function clearSession(): void {
  if (typeof window === 'undefined') return;
  const keys = [
    'quickrent_access_token',
    'accessToken',
    'token',
    'quickrent_refresh_token',
    'refreshToken',
  ];
  for (const key of keys) {
    window.localStorage.removeItem(key);
  }
}
