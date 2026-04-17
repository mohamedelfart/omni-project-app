const ACCESS_TOKEN_STORAGE_KEY = 'quickrent_access_token';
/** HS256 JWT for local dev only; signed with apps/api JWT_ACCESS_SECRET (`change-me-access`). */
export const DEV_ACCESS_TOKEN_FALLBACK =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJzZWVkLWFkbWluIiwicm9sZSI6ImFkbWluIiwicm9sZXMiOlsiYWRtaW4iLCJjb21tYW5kLWNlbnRlciJdLCJpYXQiOjE3NzY0NDI5NTQsImV4cCI6MjA5MTgwMjk1NH0.BC5Rp6cL8hCYXPgwFSX6yJr9aTbAFbRGk2eXXIwC4xk';

const DEFAULT_DEV_ACCESS_TOKEN = DEV_ACCESS_TOKEN_FALLBACK;

function isLikelyJwt(token: string): boolean {
  const parts = token.split('.');
  return parts.length === 3 && parts.every((part) => part.length > 0);
}

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;

  const storedToken = localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
  if (storedToken && process.env.NODE_ENV === 'development' && !isLikelyJwt(storedToken)) {
    localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, DEFAULT_DEV_ACCESS_TOKEN);
    console.warn(
      `[auth] Replaced non-JWT value in ${ACCESS_TOKEN_STORAGE_KEY} with development fallback JWT.`,
    );
    return DEFAULT_DEV_ACCESS_TOKEN;
  }
  if (storedToken) return storedToken;

  if (process.env.NODE_ENV === 'development') {
    localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, DEFAULT_DEV_ACCESS_TOKEN);
    console.warn(
      `[auth] Missing ${ACCESS_TOKEN_STORAGE_KEY}; using temporary development token.`,
    );
    return DEFAULT_DEV_ACCESS_TOKEN;
  }

  return null;
}
