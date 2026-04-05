'use client';

import { useEffect, useState } from 'react';

type VendorTicket = {
  ticketId: string;
  ticketCode?: string | null;
  userName: string;
  phone?: string | null;
  location: {
    label?: string | null;
  };
  serviceType: string;
  status: string;
  country: string;
  city: string;
  preferredTime?: string | null;
  createdAt: string;
  etaMinutes?: number | null;
  properties: Array<{
    id: string;
    title: string;
    city: string;
    district?: string | null;
    stopOrder: number;
  }>;
};

const statusConfig: Record<string, { bg: string; color: string; border: string }> = {
  ASSIGNED: { bg: '#DBEAFE', color: '#1D4ED8', border: '#93C5FD' },
  EN_ROUTE: { bg: '#EDE9FE', color: '#6D28D9', border: '#C4B5FD' },
  IN_PROGRESS: { bg: '#FEF3C7', color: '#92400E', border: '#FCD34D' },
  COMPLETED: { bg: '#D1FAE5', color: '#065F46', border: '#6EE7B7' },
};

function formatDate(value?: string | null) {
  if (!value) {
    return 'No schedule provided';
  }

  return new Date(value).toLocaleString();
}

export default function VendorTicketsPage() {
  const [tickets, setTickets] = useState<VendorTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingTicketId, setUpdatingTicketId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async (initial = false) => {
      if (initial) {
        setLoading(true);
      }

      try {
        const response = await fetch('/api/tickets', { cache: 'no-store' });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload?.error ?? 'Failed to load vendor tickets');
        }

        if (!cancelled) {
          const viewingTickets = (Array.isArray(payload) ? payload : []).filter((ticket: VendorTicket) => ticket.serviceType === 'viewing-transport');
          setTickets(viewingTickets);
          setError(null);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load vendor tickets');
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

  const sendStatus = async (ticketId: string, status: 'accepted' | 'on the way' | 'arrived' | 'completed') => {
    setUpdatingTicketId(ticketId);
    try {
      const response = await fetch(`/api/tickets/${ticketId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Failed to update ticket status');
      }

      setTickets((currentTickets) => currentTickets.map((ticket) => (
        ticket.ticketId === ticketId
          ? { ...ticket, status: payload.status ?? ticket.status }
          : ticket
      )));
      setError(null);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Failed to update ticket status');
    } finally {
      setUpdatingTicketId(null);
    }
  };

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#1E3A5F' }}>Viewing Tickets</h1>
          <p style={{ color: '#6B7280', marginTop: 4, marginBottom: 0, fontSize: 14 }}>
            Viewing assignments received only from QuickRent Core.
          </p>
        </div>
        <div style={{ padding: '10px 18px', borderRadius: 12, border: '2px solid #D1FAE5', background: '#ECFDF5', color: '#065F46', fontWeight: 700, fontSize: 14 }}>
          Live sync
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[
          { label: 'Viewing Tickets', value: String(tickets.length), color: '#1D4ED8' },
          { label: 'En Route', value: String(tickets.filter((ticket) => ticket.status === 'EN_ROUTE').length), color: '#7C3AED' },
          { label: 'In Progress', value: String(tickets.filter((ticket) => ticket.status === 'IN_PROGRESS').length), color: '#D97706' },
          { label: 'Completed', value: String(tickets.filter((ticket) => ticket.status === 'COMPLETED').length), color: '#059669' },
        ].map((stat) => (
          <div key={stat.label} style={{ background: '#FFFFFF', border: '1px solid #E5EDF5', borderRadius: 14, padding: '14px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 4 }}>{stat.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {error ? (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 16, padding: 16, color: '#991B1B' }}>
          {error}
        </div>
      ) : null}

      <div style={{ display: 'grid', gap: 16 }}>
        {!loading && tickets.length === 0 ? (
          <div style={{ background: '#FFFFFF', border: '1px dashed #CBD5E1', borderRadius: 20, padding: 22, color: '#64748B' }}>
            No viewing tickets assigned from Core.
          </div>
        ) : null}
        {tickets.map((ticket) => {
          const sta = statusConfig[ticket.status] ?? { bg: '#F9FAFB', color: '#374151', border: '#E5E7EB' };
          return (
            <article
              key={ticket.ticketId}
              style={{
                background: '#FFFFFF',
                border: `1px solid ${sta.border}`,
                borderRadius: 20,
                padding: 22,
                borderLeft: `4px solid ${sta.border}`,
                display: 'grid',
                gap: 14,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#9CA3AF' }}>{ticket.ticketCode ?? ticket.ticketId}</span>
                    <span style={{ padding: '2px 8px', borderRadius: 8, background: sta.bg, color: sta.color, fontSize: 12, fontWeight: 700 }}>{ticket.status}</span>
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#1E3A5F' }}>Viewing Transport</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: '#9CA3AF' }}>Scheduled</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#92400E' }}>{formatDate(ticket.preferredTime ?? ticket.createdAt)}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ background: '#F8FAFC', borderRadius: 12, padding: 14 }}>
                  <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase' }}>Tenant</div>
                  <div style={{ fontWeight: 700, color: '#111827', marginBottom: 4 }}>{ticket.userName}</div>
                  <span style={{ fontSize: 13, color: '#3B82F6', fontWeight: 600 }}>{ticket.phone ?? 'No phone provided'}</span>
                </div>
                <div style={{ background: '#F8FAFC', borderRadius: 12, padding: 14 }}>
                  <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase' }}>Pickup</div>
                  <div style={{ fontWeight: 600, color: '#374151', fontSize: 13, lineHeight: 1.4 }}>{ticket.location.label ?? 'Tenant live location'}</div>
                  <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>{ticket.city}, {ticket.country}</div>
                </div>
              </div>

              <div style={{ background: '#FFF9F0', borderRadius: 12, padding: 14, color: '#92400E' }}>
                <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase' }}>Properties</div>
                <div style={{ display: 'grid', gap: 6 }}>
                  {ticket.properties.map((property) => (
                    <div key={property.id} style={{ fontWeight: 700 }}>
                      Stop {property.stopOrder}: {property.title} • {property.district ?? property.city}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {ticket.status === 'ASSIGNED' ? (
                  <button
                    onClick={() => void sendStatus(ticket.ticketId, 'accepted')}
                    disabled={updatingTicketId === ticket.ticketId}
                    style={{ flex: 1, padding: '12px', borderRadius: 12, border: 'none', background: '#10B981', color: '#FFFFFF', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
                  >
                    {updatingTicketId === ticket.ticketId ? 'Updating' : 'Accept'}
                  </button>
                ) : null}
                {ticket.status === 'ASSIGNED' ? (
                  <button
                    onClick={() => void sendStatus(ticket.ticketId, 'on the way')}
                    disabled={updatingTicketId === ticket.ticketId}
                    style={{ flex: 1, padding: '12px', borderRadius: 12, border: 'none', background: '#1D4ED8', color: '#FFFFFF', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
                  >
                    On the Way
                  </button>
                ) : null}
                {ticket.status === 'EN_ROUTE' ? (
                  <button
                    onClick={() => void sendStatus(ticket.ticketId, 'arrived')}
                    disabled={updatingTicketId === ticket.ticketId}
                    style={{ flex: 1, padding: '12px', borderRadius: 12, border: 'none', background: '#7C3AED', color: '#FFFFFF', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
                  >
                    Arrived
                  </button>
                ) : null}
                {ticket.status === 'IN_PROGRESS' ? (
                  <button
                    onClick={() => void sendStatus(ticket.ticketId, 'completed')}
                    disabled={updatingTicketId === ticket.ticketId}
                    style={{ flex: 1, padding: '12px', borderRadius: 12, border: 'none', background: '#059669', color: '#FFFFFF', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
                  >
                    Completed
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
