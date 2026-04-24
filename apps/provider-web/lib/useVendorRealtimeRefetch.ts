'use client';

import { useEffect } from 'react';
import { io } from 'socket.io-client';

import { getAccessToken, getSocketOrigin } from './vendor-session';

/**
 * Subscribes to unified-request socket signals only; caller must refetch from REST.
 */
export function useVendorRealtimeRefetch(onRefetch: () => void | Promise<void>): void {
  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      return;
    }

    const socket = io(`${getSocketOrigin()}/requests`, {
      transports: ['websocket'],
      auth: { token },
    });

    const run = () => {
      void Promise.resolve(onRefetch());
    };

    socket.on('request.assigned', run);
    socket.on('request.updated', run);
    socket.on('request.created', run);

    return () => {
      socket.disconnect();
    };
  }, [onRefetch]);
}
