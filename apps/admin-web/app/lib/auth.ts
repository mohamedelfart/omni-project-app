import { disconnectAdminRequestsRealtimeSocket, reconnectAdminRequestsRealtimeSocketWithToken } from './admin-requests-socket';

const ACCESS_TOKEN_STORAGE_KEY = 'quickrent_access_token';
const REFRESH_TOKEN_STORAGE_KEY = 'quickrent_refresh_token';
const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1';

type AuthSession = {
  accessToken: string;
  refreshToken: string;
};

type ApiFetchOptions = {
  retryOn401?: boolean;
};

function isLikelyJwt(token: string): boolean {
  const parts = token.split('.');
  return parts.length === 3 && parts.every((part) => part.length > 0);
}

function normalizeJwt(token: string | null): string | null {
  if (!token) return null;
  const normalized = token.trim();
  return isLikelyJwt(normalized) ? normalized : null;
}

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function withBearerAuthorization(headers: Headers, accessToken: string): Headers {
  headers.set('Authorization', `Bearer ${accessToken}`);
  return headers;
}

function buildApiUrl(pathname: string): string {
  return `${apiBaseUrl.replace(/\/$/, '')}/${pathname.replace(/^\//, '')}`;
}

function isRefreshRequest(input: string | URL | Request): boolean {
  const urlValue = typeof input === 'string' || input instanceof URL ? input.toString() : input.url;
  return /\/auth\/refresh\/?$/.test(urlValue);
}

let inFlightRefreshPromise: Promise<AuthSession | null> | null = null;

export function getAccessToken(): string | null {
  if (!isBrowser()) return null;
  return normalizeJwt(localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY));
}

export function getRefreshToken(): string | null {
  if (!isBrowser()) return null;
  return normalizeJwt(localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY));
}

export function getAuthSession(): AuthSession | null {
  const accessToken = getAccessToken();
  const refreshToken = getRefreshToken();
  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
}

export function setAuthSession(session: AuthSession): void {
  if (!isBrowser()) return;
  const accessToken = normalizeJwt(session.accessToken);
  const refreshToken = normalizeJwt(session.refreshToken);
  if (!accessToken || !refreshToken) return;
  localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
}

export function clearAuthSession(): void {
  if (!isBrowser()) return;
  localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
}

async function refreshSession(): Promise<AuthSession | null> {
  const existing = getAuthSession();
  if (!existing) return null;
  if (!inFlightRefreshPromise) {
    inFlightRefreshPromise = (async () => {
      const response = await fetch(buildApiUrl('/auth/refresh'), {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: existing.refreshToken }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload || typeof payload !== 'object') return null;
      const accessToken = normalizeJwt((payload as { accessToken?: string }).accessToken ?? null);
      const refreshToken = normalizeJwt((payload as { refreshToken?: string }).refreshToken ?? null);
      if (!accessToken || !refreshToken) return null;
      const nextSession: AuthSession = { accessToken, refreshToken };
      setAuthSession(nextSession);
      reconnectAdminRequestsRealtimeSocketWithToken(accessToken);
      return nextSession;
    })().finally(() => {
      inFlightRefreshPromise = null;
    });
  }
  return inFlightRefreshPromise;
}

export async function logout(): Promise<void> {
  if (!isBrowser()) return;
  localStorage.clear();
  disconnectAdminRequestsRealtimeSocket();
  window.location.assign('/login');
}

export async function apiFetch(
  input: string | URL | Request,
  init: RequestInit = {},
  options: ApiFetchOptions = {},
): Promise<Response> {
  const retryOn401 = options.retryOn401 ?? true;
  const accessToken = getAccessToken();
  const headers = new Headers(init.headers ?? {});
  if (!headers.has('Content-Type') && init.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }
  if (accessToken) {
    withBearerAuthorization(headers, accessToken);
  }

  const response = await fetch(input, { ...init, headers });
  if (!retryOn401 || response.status !== 401 || isRefreshRequest(input)) {
    return response;
  }

  const refreshed = await refreshSession();
  if (!refreshed) {
    await logout();
    return response;
  }

  const retryHeaders = new Headers(init.headers ?? headers);
  withBearerAuthorization(retryHeaders, refreshed.accessToken);
  return fetch(input, { ...init, headers: retryHeaders });
}
