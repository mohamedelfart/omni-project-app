import { io, type Socket } from 'socket.io-client';

export type AdminRequestsRealtimeHandlers = {
  onRequestCreated: (payload: unknown) => void;
  onRequestAssigned: () => void;
  onRequestUpdated: (payload: unknown) => void;
};

const noopHandlers: AdminRequestsRealtimeHandlers = {
  onRequestCreated: () => {},
  onRequestAssigned: () => {},
  onRequestUpdated: () => {},
};

const handlersRef: { current: AdminRequestsRealtimeHandlers } = { current: noopHandlers };

const getAccessTokenRef: { current: () => string | null } = { current: () => null };

const REQUEST_CREATED_DEDUP_MS = 2000;
const recentRequestCreatedAt = new Map<string, number>();

function extractRequestIdFromCreatedPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const record = payload as Record<string, unknown>;
  const nested =
    record.data && typeof record.data === 'object' && record.data !== null && !Array.isArray(record.data)
      ? (record.data as Record<string, unknown>)
      : record;
  const request = nested.request;
  if (request && typeof request === 'object' && request !== null && 'id' in request) {
    const id = (request as { id: unknown }).id;
    if (typeof id === 'string' && id.length > 0) return id;
    if (typeof id === 'number' && Number.isFinite(id)) return String(id);
  }
  return null;
}

function shouldSuppressDuplicateRequestCreated(id: string | null): boolean {
  if (!id) return false;
  const now = Date.now();
  const last = recentRequestCreatedAt.get(id);
  if (last !== undefined && now - last < REQUEST_CREATED_DEDUP_MS) {
    return true;
  }
  recentRequestCreatedAt.set(id, now);
  if (recentRequestCreatedAt.size > 500) {
    const cutoff = now - REQUEST_CREATED_DEDUP_MS;
    for (const [key, at] of recentRequestCreatedAt) {
      if (at < cutoff) recentRequestCreatedAt.delete(key);
    }
  }
  return false;
}

let socket: Socket | null = null;
let listenersWired = false;
let lastSocketBase: string | null = null;

function applyLatestAuth() {
  const token = getAccessTokenRef.current();
  if (socket && token) {
    socket.auth = { token };
  }
}

export function setAdminRequestsRealtimeHandlers(handlers: AdminRequestsRealtimeHandlers) {
  handlersRef.current = handlers;
}

export function setAdminRequestsRealtimeGetAccessToken(getToken: () => string | null) {
  getAccessTokenRef.current = getToken;
}

/**
 * One Socket.IO client for `/requests`; `request.*` listeners are attached once per process.
 * On connect/reconnect, refresh auth from `getAccessToken` so the server re-applies room joins.
 */
export function ensureAdminRequestsRealtimeSocket(socketBase: string) {
  if (socket && lastSocketBase !== socketBase) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
    listenersWired = false;
  }

  lastSocketBase = socketBase;

  const token = getAccessTokenRef.current();
  if (!token) return;

  if (!socket) {
    socket = io(`${socketBase}/requests`, {
      transports: ['websocket'],
      auth: { token },
    });
  } else {
    socket.auth = { token };
    if (!socket.connected) {
      socket.connect();
    }
  }

  if (!listenersWired) {
    listenersWired = true;
    socket.on('request.created', (payload: unknown) => {
      const id = extractRequestIdFromCreatedPayload(payload);
      if (shouldSuppressDuplicateRequestCreated(id)) return;
      handlersRef.current.onRequestCreated(payload);
    });
    socket.on('request.assigned', () => {
      handlersRef.current.onRequestAssigned();
    });
    socket.on('request.updated', (payload: unknown) => {
      handlersRef.current.onRequestUpdated(payload);
    });

    const onConnectOrReconnect = () => {
      applyLatestAuth();
    };
    socket.on('connect', onConnectOrReconnect);
    socket.on('reconnect', onConnectOrReconnect);
    socket.io.on('reconnect_attempt', () => {
      applyLatestAuth();
    });
  }
}
