'use client';

import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

type DashboardRequest = {
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

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

export default function AdminOverviewPage() {
  const [requests, setRequests] = useState<DashboardRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vendorId, setVendorId] = useState('');

  useEffect(() => {
    let cancelled = false;
    const accessToken = getAccessToken();

    const load = async () => {
      try {
        const response = await fetch('/api/requests', {
          cache: 'no-store',
          headers: buildAuthHeaders(accessToken),
        });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload?.error ?? 'Failed to load requests');
        }

        if (!cancelled) {
          setRequests(Array.isArray(payload) ? payload : []);
          setError(null);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load requests');
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
    socket.on('request.created', () => void load());
    socket.on('request.assigned', () => void load());
    socket.on('request.updated', () => void load());

    return () => {
      cancelled = true;
      socket.disconnect();
    };
  }, []);

  const assignVendor = async (requestId: string) => {
    const accessToken = getAccessToken();
    if (!vendorId.trim()) {
      setError('Provide vendor id to assign');
      return;
    }
    const response = await fetch('/api/requests', {
      method: 'POST',
      headers: buildAuthHeaders(accessToken),
      body: JSON.stringify({ requestId, vendorId: vendorId.trim() }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload?.error ?? 'Failed to assign vendor');
      return;
    }
    setRequests((current) => current.map((request) => (request.id === requestId ? payload : request)));
    setError(null);
  };

  return (
    <section style={{ display: 'grid', gap: 18 }}>
      <h1 style={{ margin: 0 }}>Dashboard Requests</h1>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={vendorId}
          onChange={(event) => setVendorId(event.target.value)}
          placeholder="Vendor ID"
          style={{ padding: 8, border: '1px solid #ddd', borderRadius: 6 }}
        />
        <span style={{ fontSize: 12, color: '#666', alignSelf: 'center' }}>Used for Assign action</span>
      </div>

      {error ? (
        <article style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: 12, color: '#991B1B' }}>
          {error}
        </article>
      ) : null}

      <article style={{ background: '#FFF', border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
        <h2 style={{ marginTop: 0 }}>All Requests</h2>
        <div style={{ display: 'grid', gap: 12 }}>
          {!loading && requests.length === 0 ? (
            <div style={{ border: '1px dashed #CBD5E1', borderRadius: 8, padding: 12, color: '#64748B' }}>
              No requests
            </div>
          ) : null}
          {requests.map((request) => (
            <div key={request.id} style={{ border: '1px solid #E5EDF5', borderRadius: 8, padding: 12, display: 'grid', gap: 8 }}>
              <div>
                <strong>{request.id}</strong> - {request.type} - {request.status}
              </div>
              <div style={{ color: '#64748B', fontSize: 14 }}>
                tenant: {request.tenantId} | vendor: {request.vendorId ?? 'unassigned'}
              </div>
              <div style={{ color: '#64748B', fontSize: 14 }}>
                <span>{formatDate(request.createdAt)}</span>
              </div>
              {request.status === 'pending' ? (
                <button onClick={() => void assignVendor(request.id)} style={{ width: 140, padding: 8 }}>
                  Assign Vendor
                </button>
              ) : null}
            </div>
          ))}
        </div>
      </article>
    </section>
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
