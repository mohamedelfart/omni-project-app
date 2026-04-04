const tickets = [
  {
    id: 'REQ-20483',
    service: 'Airport Transfer',
    status: 'ASSIGNED',
    priority: 'URGENT',
    tenant: { name: 'Maya Hassan', phone: '+974 5512 8844' },
    location: { label: 'Hamad International Airport — Terminal 1', city: 'Doha', country: 'QA' },
    assetId: 'PROP-007',
    notes: 'Tenant has 2 large suitcases. Flight number QR714.',
    scheduledAt: '2026-04-04 10:45 AM',
    estimatedFare: '80 QAR',
    isFree: false,
  },
  {
    id: 'REQ-20441',
    service: 'Move-In',
    status: 'IN_PROGRESS',
    priority: 'NORMAL',
    tenant: { name: 'Omar Al-Said', phone: '+974 5599 3312' },
    location: { label: 'Lusail Marina Tower B, Floor 14', city: 'Lusail', country: 'QA' },
    assetId: 'PROP-001',
    notes: 'Heavy furniture — 3-bedroom unit. Elevator booked 11am–2pm.',
    scheduledAt: '2026-04-04 11:00 AM',
    estimatedFare: '500 QAR',
    isFree: true,
  },
  {
    id: 'REQ-20412',
    service: 'Cleaning',
    status: 'PENDING',
    priority: 'NORMAL',
    tenant: { name: 'Sara Ibrahim', phone: '+966 5511 9988' },
    location: { label: 'Al Olaya District, Building C', city: 'Riyadh', country: 'SA' },
    assetId: 'PROP-004',
    notes: 'Post-move-in deep clean. 3BR apartment.',
    scheduledAt: '2026-04-05 09:00 AM',
    estimatedFare: '250 SAR',
    isFree: false,
  },
];

const statusConfig: Record<string, { bg: string; color: string; border: string }> = {
  ASSIGNED: { bg: '#DBEAFE', color: '#1D4ED8', border: '#93C5FD' },
  IN_PROGRESS: { bg: '#FEF3C7', color: '#92400E', border: '#FCD34D' },
  PENDING: { bg: '#F3F4F6', color: '#374151', border: '#D1D5DB' },
  COMPLETED: { bg: '#D1FAE5', color: '#065F46', border: '#6EE7B7' },
};

const priorityColors: Record<string, string> = {
  URGENT: '#EF4444',
  HIGH: '#F97316',
  NORMAL: '#6B7280',
};

const serviceIcons: Record<string, string> = {
  'Airport Transfer': '✈️',
  'Move-In': '📦',
  'Cleaning': '🧹',
  'Maintenance': '🔧',
  'Viewing Transport': '🚗',
};

export default function VendorTicketsPage() {
  return (
    <div style={{ display: 'grid', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#1E3A5F' }}>My Tickets</h1>
          <p style={{ color: '#6B7280', marginTop: 4, marginBottom: 0, fontSize: 14 }}>
            3 active tickets — assigned by QuickRent Core
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={{ padding: '10px 18px', borderRadius: 12, border: '2px solid #D1FAE5', background: '#ECFDF5', color: '#065F46', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            🟢 Available
          </button>
          <button style={{ padding: '10px 18px', borderRadius: 12, border: '1px solid #D1D5DB', background: '#FFFFFF', color: '#374151', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
            Go Offline
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[
          { label: 'Active', value: '3', color: '#F97316' },
          { label: 'Completed Today', value: '7', color: '#10B981' },
          { label: 'Rating', value: '4.8★', color: '#F59E0B' },
          { label: "Today's Earnings", value: '480 QAR', color: '#7C3AED' },
        ].map((s) => (
          <div key={s.label} style={{ background: '#FFFFFF', border: '1px solid #E5EDF5', borderRadius: 14, padding: '14px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Ticket cards */}
      <div style={{ display: 'grid', gap: 16 }}>
        {tickets.map((ticket) => {
          const sta = statusConfig[ticket.status] ?? { bg: '#F9FAFB', color: '#374151', border: '#E5E7EB' };
          return (
            <article
              key={ticket.id}
              style={{
                background: '#FFFFFF',
                border: `1px solid ${sta.border}`,
                borderRadius: 20,
                padding: 22,
                borderLeft: `4px solid ${sta.border}`,
              }}
            >
              {/* Ticket header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#9CA3AF' }}>{ticket.id}</span>
                    <span style={{ padding: '2px 8px', borderRadius: 8, background: sta.bg, color: sta.color, fontSize: 12, fontWeight: 700 }}>{ticket.status}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: priorityColors[ticket.priority] ?? '#6B7280' }}>
                      {ticket.priority === 'URGENT' ? '⚡ URGENT' : ticket.priority}
                    </span>
                    {ticket.isFree && (
                      <span style={{ padding: '2px 8px', borderRadius: 8, background: '#D1FAE5', color: '#065F46', fontSize: 12, fontWeight: 700 }}>FREE SERVICE</span>
                    )}
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#1E3A5F' }}>
                    {serviceIcons[ticket.service] ?? '🔧'} {ticket.service}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: '#9CA3AF' }}>Estimated</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: ticket.isFree ? '#10B981' : '#1E3A5F' }}>
                    {ticket.isFree ? 'FREE' : ticket.estimatedFare}
                  </div>
                </div>
              </div>

              {/* Ticket info grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div style={{ background: '#F8FAFC', borderRadius: 12, padding: 14 }}>
                  <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase' as const }}>Tenant</div>
                  <div style={{ fontWeight: 700, color: '#111827', marginBottom: 4 }}>{ticket.tenant.name}</div>
                  <span style={{ fontSize: 13, color: '#3B82F6', fontWeight: 600 }}>📞 {ticket.tenant.phone}</span>
                </div>
                <div style={{ background: '#F8FAFC', borderRadius: 12, padding: 14 }}>
                  <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase' as const }}>Location</div>
                  <div style={{ fontWeight: 600, color: '#374151', fontSize: 13, lineHeight: 1.4 }}>{ticket.location.label}</div>
                  <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>{ticket.location.city}, {ticket.location.country}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div style={{ background: '#FFF9F0', borderRadius: 10, padding: '10px 14px' }}>
                  <div style={{ fontSize: 11, color: '#9CA3AF' }}>Scheduled</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#92400E' }}>📅 {ticket.scheduledAt}</div>
                </div>
                <div style={{ background: '#F8FAFC', borderRadius: 10, padding: '10px 14px' }}>
                  <div style={{ fontSize: 11, color: '#9CA3AF' }}>Asset ID</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1E3A5F', fontFamily: 'monospace' }}>{ticket.assetId}</div>
                </div>
              </div>

              {ticket.notes && (
                <div style={{ background: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#92400E' }}>
                  📝 {ticket.notes}
                </div>
              )}

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' as const }}>
                {ticket.status === 'ASSIGNED' && (
                  <>
                    <button style={{ flex: 1, padding: '12px', borderRadius: 12, border: 'none', background: '#10B981', color: '#FFFFFF', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>▶ Start Job</button>
                    <button style={{ padding: '12px 18px', borderRadius: 12, border: '1px solid #D1D5DB', background: '#FFFFFF', color: '#374151', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>🗺 Navigate</button>
                    <button style={{ padding: '12px 18px', borderRadius: 12, border: 'none', background: '#FEE2E2', color: '#991B1B', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Decline</button>
                  </>
                )}
                {ticket.status === 'IN_PROGRESS' && (
                  <>
                    <button style={{ flex: 1, padding: '12px', borderRadius: 12, border: 'none', background: '#1E3A5F', color: '#FFFFFF', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>✓ Mark Complete</button>
                    <button style={{ padding: '12px 18px', borderRadius: 12, border: '1px solid #D1D5DB', background: '#FFFFFF', color: '#374151', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Upload Photo</button>
                  </>
                )}
                {ticket.status === 'PENDING' && (
                  <button style={{ flex: 1, padding: '12px', borderRadius: 12, border: '2px solid #1E3A5F', background: '#FFFFFF', color: '#1E3A5F', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Accept Ticket</button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
              background: 'rgba(255,255,255,0.86)',
              border: '1px solid #D9E2EC',
              borderRadius: 16,
              padding: 16,
            }}
          >
            <div style={{ fontWeight: 700, color: '#1E3A5F' }}>{job.title}</div>
            <div style={{ marginTop: 8, color: '#F97316', fontWeight: 700 }}>{job.state}</div>
            <div style={{ marginTop: 8, color: '#6B7280' }}>{job.detail}</div>
            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <button style={{ height: 42, padding: '0 16px', borderRadius: 12, border: '1px solid #D9E2EC', background: '#FFFFFF', color: '#1E3A5F', fontWeight: 700 }}>Accept</button>
              <button style={{ height: 42, padding: '0 16px', borderRadius: 12, border: 'none', background: '#1E3A5F', color: '#FFFFFF', fontWeight: 700 }}>Update Status</button>
              <button style={{ height: 42, padding: '0 16px', borderRadius: 12, border: 'none', background: '#F97316', color: '#FFFFFF', fontWeight: 700 }}>Upload Proof</button>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
