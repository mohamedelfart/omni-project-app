import { Platform } from 'react-native';

function resolveApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (typeof fromEnv === 'string' && fromEnv.trim().length > 0) {
    return fromEnv.trim().replace(/\/$/, '');
  }
  // Android emulator: host machine loopback (localhost inside the emulator is the device itself).
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:4000/api/v1';
  }
  return 'http://localhost:4000/api/v1';
}

const apiBaseUrl = resolveApiBaseUrl();

export function getSocketBaseUrl(): string {
  return apiBaseUrl.replace(/\/api\/v1\/?$/, '');
}

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