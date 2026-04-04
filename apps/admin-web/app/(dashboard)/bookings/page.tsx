const bookings = [
  { id: 'BK-20481', tenant: 'Mohamed Al-Rashdi', property: 'Lusail Marina Tower 2BR', country: 'QA', city: 'Lusail', status: 'ACTIVE', startDate: '2026-01-15', endDate: '2026-07-15', monthlyRent: '8,500 QAR', totalValue: '51,000 QAR', services: 3 },
  { id: 'BK-20482', tenant: 'Nora Hassan', property: 'Downtown Dubai Studio', country: 'AE', city: 'Dubai', status: 'ACTIVE', startDate: '2026-02-01', endDate: '2027-01-31', monthlyRent: '7,200 AED', totalValue: '86,400 AED', services: 1 },
  { id: 'BK-20483', tenant: 'Khalid Ibrahim', property: 'Riyadh Financial District 3BR', country: 'SA', city: 'Riyadh', status: 'PENDING', startDate: '2026-04-10', endDate: '2027-04-09', monthlyRent: '12,000 SAR', totalValue: '144,000 SAR', services: 0 },
  { id: 'BK-20484', tenant: 'Sara Al-Mansouri', property: 'Pearl Qatar Villa 4BR', country: 'QA', city: 'Al Khor', status: 'COMPLETED', startDate: '2025-03-01', endDate: '2025-12-31', monthlyRent: '22,000 QAR', totalValue: '220,000 QAR', services: 8 },
  { id: 'BK-20485', tenant: 'Ahmed Farouk', property: 'Abu Dhabi Corniche 1BR', country: 'AE', city: 'Abu Dhabi', status: 'ACTIVE', startDate: '2026-03-01', endDate: '2026-08-31', monthlyRent: '6,800 AED', totalValue: '40,800 AED', services: 2 },
  { id: 'BK-20486', tenant: 'Layla Khamis', property: 'Doha West Bay 2BR', country: 'QA', city: 'Doha', status: 'UNDER_REVIEW', startDate: '2026-05-01', endDate: '2027-04-30', monthlyRent: '7,800 QAR', totalValue: '93,600 QAR', services: 0 },
];

const statusConfig: Record<string, { bg: string; color: string; label: string }> = {
  ACTIVE: { bg: '#D1FAE5', color: '#065F46', label: 'Active' },
  PENDING: { bg: '#FEF3C7', color: '#92400E', label: 'Pending' },
  COMPLETED: { bg: '#F3F4F6', color: '#374151', label: 'Completed' },
  UNDER_REVIEW: { bg: '#EDE9FE', color: '#5B21B6', label: 'Under Review' },
  CANCELLED: { bg: '#FEE2E2', color: '#991B1B', label: 'Cancelled' },
};

const stats = [
  { label: 'Total Bookings', value: '4,281' },
  { label: 'Active', value: '2,914', accent: '#10B981' },
  { label: 'Pending Review', value: '187', accent: '#F59E0B' },
  { label: 'Avg. Duration', value: '8.4 mo', accent: '#3B82F6' },
];

export default function BookingsPage() {
  return (
    <section style={{ display: 'grid', gap: 24 }}>
      <header>
        <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800, color: '#1E3A5F' }}>Bookings</h1>
        <p style={{ color: '#6B7280', marginTop: 6, marginBottom: 0 }}>
          Every booking is an Order in the inventory system. Full lifecycle visibility for the command center.
        </p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {stats.map((s) => (
          <article key={s.label} style={{ background: '#FFFFFF', border: '1px solid #E5EDF5', borderRadius: 16, padding: '18px 20px' }}>
            <div style={{ color: '#6B7280', fontSize: 13 }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#1E3A5F', margin: '6px 0 0' }}>{s.value}</div>
          </article>
        ))}
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', background: '#FFFFFF', border: '1px solid #E5EDF5', borderRadius: 16, padding: '14px 20px', flexWrap: 'wrap' }}>
        <input readOnly placeholder="Search booking ID or tenant…" style={{ flex: 1, minWidth: 180, border: '1px solid #D1D5DB', borderRadius: 10, padding: '10px 14px', fontSize: 14, background: '#F9FAFB' }} />
        {['All', 'ACTIVE', 'PENDING', 'UNDER_REVIEW', 'COMPLETED'].map((s) => (
          <button key={s} style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid #D1D5DB', background: s === 'All' ? '#1E3A5F' : '#FFFFFF', color: s === 'All' ? '#FFFFFF' : '#374151', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>{s}</button>
        ))}
      </div>

      {/* Table */}
      <article style={{ background: '#FFFFFF', border: '1px solid #E5EDF5', borderRadius: 16, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E5EDF5' }}>
              {['Booking ID', 'Tenant', 'Property', 'Market', 'Period', 'Monthly', 'Total Value', 'Services', 'Status', 'Actions'].map((col) => (
                <th key={col} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bookings.map((b, i) => (
              <tr key={b.id} style={{ borderBottom: i < bookings.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
                <td style={{ padding: '14px', fontSize: 12, color: '#9CA3AF', fontFamily: 'monospace' }}>{b.id}</td>
                <td style={{ padding: '14px', fontSize: 14, fontWeight: 600, color: '#111827', whiteSpace: 'nowrap' }}>{b.tenant}</td>
                <td style={{ padding: '14px', fontSize: 13, color: '#4B5563', maxWidth: 200 }}>{b.property}</td>
                <td style={{ padding: '14px', fontSize: 12, color: '#6B7280', whiteSpace: 'nowrap' }}>{b.country} / {b.city}</td>
                <td style={{ padding: '14px', fontSize: 12, color: '#6B7280', whiteSpace: 'nowrap' }}>{b.startDate}<br/><span style={{ color: '#D1D5DB' }}>→</span> {b.endDate}</td>
                <td style={{ padding: '14px', fontSize: 13, fontWeight: 700, color: '#1E3A5F', whiteSpace: 'nowrap' }}>{b.monthlyRent}</td>
                <td style={{ padding: '14px', fontSize: 13, fontWeight: 700, color: '#059669', whiteSpace: 'nowrap' }}>{b.totalValue}</td>
                <td style={{ padding: '14px', textAlign: 'center', fontSize: 14, fontWeight: 700, color: b.services > 0 ? '#7C3AED' : '#D1D5DB' }}>{b.services}</td>
                <td style={{ padding: '14px' }}>
                  <span style={{
                    padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                    background: (statusConfig[b.status] ?? { bg: '#F3F4F6' }).bg,
                    color: (statusConfig[b.status] ?? { color: '#374151' }).color,
                  }}>{(statusConfig[b.status] ?? { label: b.status }).label}</span>
                </td>
                <td style={{ padding: '14px' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid #D1D5DB', background: '#FFFFFF', color: '#1E3A5F', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>View</button>
                    {b.status === 'UNDER_REVIEW' && (
                      <button style={{ padding: '5px 10px', borderRadius: 8, border: 'none', background: '#D1FAE5', color: '#065F46', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Approve</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>
    </section>
  );
}
