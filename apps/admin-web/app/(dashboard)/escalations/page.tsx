const escalations = [
  { id: 'ESC-0081', requestId: 'REQ-20483', tenant: 'Maya Hassan', service: 'Airport Transfer', severity: 'CRITICAL', market: 'AE / Dubai', assignedTo: 'Ops Lead A', reason: 'Provider SLA breached — 45 min overdue. Tenant at airport.', status: 'OPEN', opened: '2026-04-04 10:22', slaMinutes: 30 },
  { id: 'ESC-0082', requestId: 'REQ-20441', tenant: 'Omar Al-Said', service: 'Move-In', severity: 'HIGH', market: 'QA / Lusail', assignedTo: 'Ops Lead B', reason: 'Free cap exceeded by 200 QAR. Tenant disputes charge.', status: 'IN_REVIEW', opened: '2026-04-04 09:15', slaMinutes: 60 },
  { id: 'ESC-0083', requestId: 'REQ-20390', tenant: 'Sara Ibrahim', service: 'Maintenance', severity: 'MEDIUM', market: 'SA / Riyadh', assignedTo: null, reason: 'Vendor rejected ticket. No fallback available in city.', status: 'OPEN', opened: '2026-04-04 08:44', slaMinutes: 120 },
  { id: 'ESC-0079', requestId: 'REQ-20360', tenant: 'Khalid Mansouri', service: 'Cleaning', severity: 'LOW', market: 'AE / Abu Dhabi', assignedTo: 'Ops Lead A', reason: 'Tenant requested rescheduling 3 times. Vendor unhappy.', status: 'RESOLVED', opened: '2026-04-03 14:00', slaMinutes: 240 },
  { id: 'ESC-0080', requestId: 'PAY-10243', tenant: 'Khalid Ibrahim', service: 'Payment', severity: 'HIGH', market: 'SA / Riyadh', assignedTo: 'Finance Lead', reason: 'Bank transfer of 24,000 SAR pending for 72 hours. Deposit not received.', status: 'IN_REVIEW', opened: '2026-04-03 16:30', slaMinutes: 60 },
];

const severityConfig: Record<string, { bg: string; color: string; border: string }> = {
  CRITICAL: { bg: '#FEF2F2', color: '#991B1B', border: '#FCA5A5' },
  HIGH: { bg: '#FFF7ED', color: '#C2410C', border: '#FDBA74' },
  MEDIUM: { bg: '#FFFBEB', color: '#92400E', border: '#FCD34D' },
  LOW: { bg: '#F0FDF4', color: '#065F46', border: '#86EFAC' },
};

const statusConfig: Record<string, { bg: string; color: string }> = {
  OPEN: { bg: '#FEE2E2', color: '#991B1B' },
  IN_REVIEW: { bg: '#FEF3C7', color: '#92400E' },
  RESOLVED: { bg: '#D1FAE5', color: '#065F46' },
  CLOSED: { bg: '#F3F4F6', color: '#6B7280' },
};

const stats = [
  { label: 'Open Escalations', value: '19', accent: '#EF4444' },
  { label: 'Critical / High', value: '8', accent: '#DC2626' },
  { label: 'Avg. Resolution', value: '42 min', accent: '#F59E0B' },
  { label: 'Resolved Today', value: '14', accent: '#10B981' },
];

export default function EscalationsPage() {
  return (
    <section style={{ display: 'grid', gap: 24 }}>
      <header>
        <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800, color: '#1E3A5F' }}>Escalations</h1>
        <p style={{ color: '#6B7280', marginTop: 6, marginBottom: 0 }}>
          Command Center intervention queue. Every escalation is trackable, assignable, and auditable.
        </p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {stats.map((s) => (
          <article key={s.label} style={{ background: '#FFFFFF', border: '1px solid #E5EDF5', borderRadius: 16, padding: '18px 20px' }}>
            <div style={{ color: '#6B7280', fontSize: 13 }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.accent ?? '#1E3A5F', margin: '6px 0 0' }}>{s.value}</div>
          </article>
        ))}
      </div>

      {/* Escalation cards */}
      <div style={{ display: 'grid', gap: 14 }}>
        {escalations.map((e) => {
          const sev = severityConfig[e.severity] ?? { bg: '#F9FAFB', color: '#374151', border: '#E5E7EB' };
          const sta = statusConfig[e.status] ?? { bg: '#F3F4F6', color: '#374151' };
          return (
            <article
              key={e.id}
              style={{
                background: sev.bg,
                border: `1px solid ${sev.border}`,
                borderRadius: 16,
                padding: 20,
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                gap: 16,
                alignItems: 'start',
              }}
            >
              <div>
                {/* Top row */}
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 12, color: sev.color, fontWeight: 700 }}>{e.id}</span>
                  <span style={{ padding: '2px 10px', borderRadius: 20, background: sev.color, color: '#FFFFFF', fontSize: 11, fontWeight: 800 }}>{e.severity}</span>
                  <span style={{ padding: '2px 10px', borderRadius: 20, background: sta.bg, color: sta.color, fontSize: 11, fontWeight: 700, border: `1px solid ${sta.color}20` }}>{e.status}</span>
                  <span style={{ fontSize: 12, color: '#6B7280', marginLeft: 'auto' }}>📍 {e.market}</span>
                </div>

                {/* Main */}
                <div style={{ fontWeight: 700, color: '#111827', fontSize: 15, marginBottom: 4 }}>
                  {e.service} — <span style={{ color: '#1E3A5F' }}>{e.tenant}</span>
                  <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#9CA3AF', marginLeft: 8 }}>{e.requestId}</span>
                </div>
                <p style={{ margin: '0 0 10px', fontSize: 13, color: '#4B5563', lineHeight: 1.5 }}>{e.reason}</p>

                {/* Meta */}
                <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#6B7280', flexWrap: 'wrap' }}>
                  <span>⏱ Opened: {e.opened}</span>
                  <span>⏳ SLA: {e.slaMinutes} min</span>
                  <span>👤 {e.assignedTo ? `Assigned: ${e.assignedTo}` : '⚠️ Unassigned'}</span>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 140 }}>
                {e.status !== 'RESOLVED' && (
                  <>
                    <button style={{ padding: '8px 16px', borderRadius: 10, border: 'none', background: '#1E3A5F', color: '#FFFFFF', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Intervene</button>
                    <button style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid #D1D5DB', background: '#FFFFFF', color: '#374151', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Reassign</button>
                    <button style={{ padding: '8px 16px', borderRadius: 10, border: 'none', background: '#10B981', color: '#FFFFFF', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Resolve</button>
                  </>
                )}
                {e.status === 'RESOLVED' && (
                  <span style={{ padding: '8px 16px', borderRadius: 10, background: '#D1FAE5', color: '#065F46', fontSize: 12, fontWeight: 700, textAlign: 'center' }}>✓ Resolved</span>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
