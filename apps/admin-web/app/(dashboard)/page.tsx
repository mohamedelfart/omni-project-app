'use client';

import { useEffect, useState } from 'react';

type CommandCenterViewingRequest = {
  id: string;
  serviceType: string;
  status: string;
  city: string;
  country: string;
  createdAt: string;
  user?: {
    fullName?: string | null;
    phoneNumber?: string | null;
  };
  metadata?: {
    ticketCode?: string;
  };
  viewingRequest?: {
    items: Array<{
      property: {
        id: string;
        title: string;
        city: string;
        district?: string | null;
      };
    }>;
  } | null;
};

const statusColors: Record<string, string> = {
  ASSIGNED: '#1D4ED8',
  EN_ROUTE: '#7C3AED',
  IN_PROGRESS: '#D97706',
  COMPLETED: '#059669',
  SUBMITTED: '#0F766E',
};

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

export default function AdminOverviewPage() {
  const [requests, setRequests] = useState<CommandCenterViewingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async (initial = false) => {
      if (initial) {
        setLoading(true);
      }

      try {
        const response = await fetch('/api/requests?serviceType=viewing-transport', { cache: 'no-store' });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload?.error ?? 'Failed to load viewing requests');
        }

        if (!cancelled) {
          setRequests(Array.isArray(payload) ? payload : []);
          setError(null);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load viewing requests');
        }
      } finally {
        if (initial && !cancelled) {
          setLoading(false);
        }
      }
    };

    void load(true);
    const interval = setInterval(() => {
      void load();
    }, 8000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const activeRequests = requests.filter((request) => request.status !== 'COMPLETED').length;

  return (
    <section style={{ display: 'grid', gap: 18 }}>
      <header style={{ display: 'grid', gap: 8 }}>
        <h1 style={{ marginTop: 0, fontSize: 38, color: '#1E3A5F', marginBottom: 0 }}>Viewing Flow Command Center</h1>
        <p style={{ color: '#6B7280', marginTop: 0, marginBottom: 0, maxWidth: 760 }}>
          Live queue for Core-routed viewing tickets. Every ticket on this board originated from the tenant app and is mirrored through QuickRent Core.
        </p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14 }}>
        {[
          { title: 'Viewing Tickets', value: String(requests.length) },
          { title: 'Active', value: String(activeRequests) },
          { title: 'Completed', value: String(requests.filter((request) => request.status === 'COMPLETED').length) },
          { title: 'Last Refresh', value: loading ? 'Loading' : 'Live' },
        ].map((metric) => (
          <article
            key={metric.title}
            style={{
              background: 'rgba(255,255,255,0.82)',
              border: '1px solid #D9E2EC',
              borderRadius: 20,
              padding: 20,
              backdropFilter: 'blur(18px)',
            }}
          >
            <div style={{ color: '#6B7280', fontSize: 14 }}>{metric.title}</div>
            <div style={{ fontSize: 30, fontWeight: 700, color: '#1E3A5F', marginTop: 8 }}>{metric.value}</div>
          </article>
        ))}
      </div>

      {error ? (
        <article style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 18, padding: 18, color: '#991B1B' }}>
          {error}
        </article>
      ) : null}

      <article style={{ background: 'rgba(255,255,255,0.86)', border: '1px solid #D9E2EC', borderRadius: 20, padding: 20 }}>
        <h2 style={{ marginTop: 0, color: '#1E3A5F' }}>Live Viewing Queue</h2>
        <div style={{ display: 'grid', gap: 12 }}>
          {!loading && requests.length === 0 ? (
            <div style={{ border: '1px dashed #CBD5E1', borderRadius: 16, padding: 20, color: '#64748B' }}>
              No viewing tickets available from Core.
            </div>
          ) : null}
          {requests.map((request) => (
            <div key={request.id} style={{ border: '1px solid #E5EDF5', borderRadius: 16, padding: 16, background: '#FFFFFF', display: 'grid', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                <strong style={{ color: '#1E3A5F' }}>{request.metadata?.ticketCode ?? request.id}</strong>
                <span style={{ color: statusColors[request.status] ?? '#475569', fontWeight: 800 }}>{request.status}</span>
              </div>
              <div style={{ color: '#334155', fontWeight: 700 }}>{request.user?.fullName ?? 'Tenant'} • {request.user?.phoneNumber ?? 'No phone'}</div>
              <div style={{ color: '#64748B' }}>
                {(request.viewingRequest?.items ?? []).map((item) => item.property.title).join(' • ') || 'No properties attached'}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, color: '#64748B', fontSize: 14, flexWrap: 'wrap' }}>
                <span>{request.country} / {request.city}</span>
                <span>{formatDate(request.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
