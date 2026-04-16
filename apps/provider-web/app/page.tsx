'use client';

import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

type VendorRequest = {
  id: string;
  tenantId: string;
  vendorId?: string;
  type: 'cleaning' | 'moving' | 'maintenance';
  status: 'pending' | 'assigned' | 'in_progress' | 'completed';
  createdAt: string;
  updatedAt: string;
  propertyIds?: string[];
  primaryPropertyId?: string;
};

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1';
const socketBase = apiBase.replace(/\/api\/v1\/?$/, '');

export default function VendorTicketsPage() {
  const [requests, setRequests] = useState<VendorRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingRequestId, setUpdatingRequestId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const accessToken = getAccessToken();

    const load = async () => {
      try {
        const response = await fetch('/api/tickets', {
          cache: 'no-store',
          headers: buildAuthHeaders(accessToken),
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload?.error ?? 'Failed to load vendor requests');
        }

        if (!cancelled) {
          setRequests(Array.isArray(payload) ? payload : []);
          setError(null);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load vendor requests');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    const socket = io(`${socketBase}/requests`, {
      transports: ['websocket'],
      auth: { token: accessToken },
    });
    socket.on('request.assigned', () => void load());
    socket.on('request.updated', () => void load());
    socket.on('request.created', () => void load());

    return () => {
      cancelled = true;
      socket.disconnect();
    };
  }, []);

  const sendStatus = async (requestId: string, status: 'assigned' | 'in_progress' | 'completed') => {
    setUpdatingRequestId(requestId);
    try {
      const response = await fetch(`/api/tickets/${requestId}/status`, {
        method: 'POST',
        headers: buildAuthHeaders(getAccessToken()),
        body: JSON.stringify({ status }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Failed to update request status');
      }

      setRequests((current) => current.map((request) => (request.id === requestId ? payload : request)));
      setError(null);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Failed to update request status');
    } finally {
      setUpdatingRequestId(null);
    }
  };

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <h1 style={{ margin: 0 }}>Vendor Requests</h1>

      {error ? (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: 12, color: '#991B1B' }}>
          {error}
        </div>
      ) : null}

      <div style={{ display: 'grid', gap: 16 }}>
        {!loading && requests.length === 0 ? (
          <div style={{ background: '#FFFFFF', border: '1px dashed #CBD5E1', borderRadius: 8, padding: 12, color: '#64748B' }}>
            No requests
          </div>
        ) : null}
        {requests.map((request) => {
          return (
            <article
              key={request.id}
              style={{ background: '#FFFFFF', border: '1px solid #ddd', borderRadius: 8, padding: 12, display: 'grid', gap: 8 }}
            >
              <div>
                <strong>{request.id}</strong> - {request.type} - {request.status}
              </div>
              <div style={{ color: '#64748B', fontSize: 14 }}>
                tenant: {request.tenantId} | vendor: {request.vendorId ?? 'unassigned'}
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {request.status === 'assigned' ? (
                  <button
                    onClick={() => void sendStatus(request.id, 'in_progress')}
                    disabled={updatingRequestId === request.id}
                    style={{ padding: '8px 12px' }}
                  >
                    Start
                  </button>
                ) : null}
                {request.status === 'in_progress' ? (
                  <button
                    onClick={() => void sendStatus(request.id, 'completed')}
                    disabled={updatingRequestId === request.id}
                    style={{ padding: '8px 12px' }}
                  >
                    Complete
                  </button>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function getAccessToken() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('quickrent_access_token')
    ?? localStorage.getItem('accessToken')
    ?? localStorage.getItem('token')
    ?? '';
}

function buildAuthHeaders(token: string) {
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}
