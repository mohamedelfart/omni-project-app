const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1';

let apiAuthToken: string | undefined;

export function setApiAuthToken(token?: string) {
  apiAuthToken = token;
}

export function getApiAuthToken() {
  return apiAuthToken;
}

export async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string> ?? {}),
  };

  if (apiAuthToken) {
    headers.Authorization = `Bearer ${apiAuthToken}`;
  }

  const response = await fetch(`${apiBaseUrl}/${path.replace(/^\//, '')}`, {
    headers,
    ...options,
  });

  if (!response.ok) {
    throw new Error(`API request failed for ${path}`);
  }

  const payload = await response.json() as { data?: T } | T;
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return payload.data as T;
  }

  return payload as T;
}