import { io, type Socket } from 'socket.io-client';

import { extractSocketRequestId } from './extract-socket-request-id';

export type AdminRequestsRealtimeHandlers = {
  /** Return `false` if the event was skipped (e.g. unmounted); dedupe will not record it as handled. */
  onRequestCreated: (payload: unknown) => void | boolean;
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

function pruneRequestCreatedDedupe(now: number) {
  if (recentRequestCreatedAt.size <= 500) return;
  const cutoff = now - REQUEST_CREATED_DEDUP_MS;
  for (const [key, at] of recentRequestCreatedAt) {
    if (at < cutoff) recentRequestCreatedAt.delete(key);
  }
}

/** True only when this id was already handled recently (not merely seen pre-handler). */
function shouldSuppressDuplicateRequestCreated(id: string | null): boolean {
  if (!id) return false;
  const now = Date.now();
  const last = recentRequestCreatedAt.get(id);
  return last !== undefined && now - last < REQUEST_CREATED_DEDUP_MS;
}

function markRequestCreatedHandled(id: string | null) {
  if (!id) return;
  const now = Date.now();
  recentRequestCreatedAt.set(id, now);
  pruneRequestCreatedDedupe(now);
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
    socket.onAny((event, ...args) => {
      console.log('[socket] onAny event:', event, args);
    });
    socket.on('request.created', (payload: unknown) => {
      console.log('[socket] request.created received', payload);
      const id = extractSocketRequestId(payload);
      const suppress = shouldSuppressDuplicateRequestCreated(id);
      console.log('[admin-debug] socket request.created', { id, suppress });
      if (suppress) return;
      console.log('[socket] invoking handler', payload);
      const run = handlersRef.current.onRequestCreated;
      console.log('[admin-debug] socket invoking onRequestCreated', { typeof: typeof run });
      const handled = run(payload) !== false;
      if (handled) {
        markRequestCreatedHandled(id);
      }
    });
    socket.on('request.assigned', () => {
      handlersRef.current.onRequestAssigned();
    });
    socket.on('request.updated', (payload: unknown) => {
      handlersRef.current.onRequestUpdated(payload);
    });

    const onConnectOrReconnect = () => {
      console.log('[socket] connected', socket.id, socket.nsp);
      applyLatestAuth();
    };
    socket.on('connect', onConnectOrReconnect);
    socket.on('reconnect', onConnectOrReconnect);
    socket.io.on('reconnect_attempt', () => {
      applyLatestAuth();
    });
  }
}

export function reconnectAdminRequestsRealtimeSocketWithToken(token: string): void {
  if (!socket || !token) return;
  socket.auth = { token };
  socket.disconnect();
  socket.connect();
}

export function disconnectAdminRequestsRealtimeSocket(): void {
  if (!socket) return;
  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
  listenersWired = false;
}
