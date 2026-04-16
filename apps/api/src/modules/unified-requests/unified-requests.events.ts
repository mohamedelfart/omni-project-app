export const REQUEST_SOCKET_EVENTS = {
  created: 'request.created',
  assigned: 'request.assigned',
  updated: 'request.updated',
} as const;

export type RequestSocketEventName =
  (typeof REQUEST_SOCKET_EVENTS)[keyof typeof REQUEST_SOCKET_EVENTS];
