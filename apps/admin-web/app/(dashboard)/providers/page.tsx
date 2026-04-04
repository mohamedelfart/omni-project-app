const vendors = [
  { id: 'VND-001', name: 'Al-Rashid Moving Co.', type: 'Moving', country: 'QA', city: 'Doha', status: 'ONLINE', rating: 4.8, completedJobs: 241, activeTickets: 3, isFallback: false, joinedAt: '2025-09-15' },
  { id: 'VND-002', name: 'CleanPro Qatar', type: 'Cleaning', country: 'QA', city: 'Lusail', status: 'ONLINE', rating: 4.6, completedJobs: 512, activeTickets: 8, isFallback: false, joinedAt: '2025-10-02' },
  { id: 'VND-003', name: 'Gulf Maintenance Lab', type: 'Maintenance', country: 'AE', city: 'Dubai', status: 'BUSY', rating: 4.9, completedJobs: 188, activeTickets: 5, isFallback: false, joinedAt: '2025-11-20' },
  { id: 'VND-004', name: 'Doha Transfers Inc.', type: 'Transport', country: 'QA', city: 'Doha', status: 'OFFLINE', rating: 4.2, completedJobs: 94, activeTickets: 0, isFallback: true, joinedAt: '2026-01-08' },
  { id: 'VND-005', name: 'AbuDhabi Quick Move', type: 'Moving', country: 'AE', city: 'Abu Dhabi', status: 'ONLINE', rating: 4.7, completedJobs: 163, activeTickets: 2, isFallback: false, joinedAt: '2026-02-14' },
  { id: 'VND-006', name: 'Riyadh Safe Hands', type: 'Maintenance', country: 'SA', city: 'Riyadh', status: 'ONLINE', rating: 4.5, completedJobs: 78, activeTickets: 1, isFallback: true, joinedAt: '2026-03-01' },
];

const statusConfig: Record<string, { bg: string; color: string; dot: string }> = {
  ONLINE: { bg: '#D1FAE5', color: '#065F46', dot: '#10B981' },
  BUSY: { bg: '#FEF3C7', color: '#92400E', dot: '#F59E0B' },
  OFFLINE: { bg: '#F3F4F6', color: '#6B7280', dot: '#D1D5DB' },
  SUSPENDED: { bg: '#FEE2E2', color: '#991B1B', dot: '#EF4444' },
};

const typeColors: Record<string, string> = {
  Moving: '#8B5CF6',
  Cleaning: '#3B82F6',
  Maintenance: '#F97316',
  Transport: '#10B981',
};

const stats = [
  { label: 'Total Vendors', value: '312', sub: 'Active network' },
  { label: 'Online Now', value: '148', sub: 'Ready for assignment', accent: '#10B981' },
  { label: 'Avg. Rating', value: '4.7★', sub: 'Platform average', accent: '#F59E0B' },
  { label: 'Active Tickets', value: '89', sub: 'In progress', accent: '#7C3AED' },
];

export default function ProvidersPage() {
  return (
    <section style={{ display: 'grid', gap: 24 }}>
      <header>
        <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800, color: '#1E3A5F' }}>Vendor Execution Network</h1>
        <p style={{ color: '#6B7280', marginTop: 6, marginBottom: 0 }}>
          Every vendor receives tickets routed by Core. Assignment is automatic — nearest first, fallback second.
        </p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {stats.map((s) => (
          <article key={s.label} style={{ background: '#FFFFFF', border: '1px solid #E5EDF5', borderRadius: 16, padding: '18px 20px' }}>
            <div style={{ color: '#6B7280', fontSize: 13 }}>{s.label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: s.accent ?? '#1E3A5F', margin: '6px 0 2px' }}>{s.value}</div>
            <div style={{ fontSize: 12, color: '#9CA3AF' }}>{s.sub}</div>
          </article>
        ))}
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', background: '#FFFFFF', border: '1px solid #E5EDF5', borderRadius: 16, padding: '14px 20px', flexWrap: 'wrap' }}>
        <input readOnly placeholder="Search vendor ID, name, city…" style={{ flex: 1, minWidth: 180, border: '1px solid #D1D5DB', borderRadius: 10, padding: '10px 14px', fontSize: 14, background: '#F9FAFB' }} />
        {['All', 'Moving', 'Cleaning', 'Maintenance', 'Transport'].map((t) => (
          <button key={t} style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid #D1D5DB', background: t === 'All' ? '#1E3A5F' : '#FFFFFF', color: t === 'All' ? '#FFFFFF' : '#374151', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>{t}</button>
        ))}
        <button style={{ padding: '9px 18px', borderRadius: 10, border: 'none', background: '#F97316', color: '#FFFFFF', fontWeight: 700, fontSize: 13, cursor: 'pointer', marginLeft: 'auto' }}>+ Add Vendor</button>
      </div>

      {/* Vendor grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
        {vendors.map((v) => (
          <article key={v.id} style={{ background: '#FFFFFF', border: '1px solid #E5EDF5', borderRadius: 20, padding: 20 }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 11, color: '#9CA3AF', fontFamily: 'monospace', marginBottom: 4 }}>{v.id}</div>
                <div style={{ fontWeight: 700, color: '#111827', fontSize: 15 }}>{v.name}</div>
                <div style={{ fontSize: 12, color: typeColors[v.type] ?? '#374151', fontWeight: 600, marginTop: 2 }}>{v.type}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                <span style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px',
                  borderRadius: 20, fontSize: 11, fontWeight: 700,
                  background: (statusConfig[v.status] ?? { bg: '#F3F4F6' }).bg,
                  color: (statusConfig[v.status] ?? { color: '#374151' }).color,
                }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: (statusConfig[v.status] ?? { dot: '#D1D5DB' }).dot, display: 'inline-block' }} />
                  {v.status}
                </span>
                {v.isFallback && (
                  <span style={{ padding: '2px 8px', borderRadius: 8, background: '#FEF3C7', color: '#92400E', fontSize: 11, fontWeight: 700 }}>FALLBACK</span>
                )}
              </div>
            </div>

            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
              {[
                { label: 'Rating', value: `${v.rating}★` },
                { label: 'Completed', value: v.completedJobs },
                { label: 'Active', value: v.activeTickets },
              ].map((d) => (
                <div key={d.label} style={{ background: '#F8FAFC', borderRadius: 10, padding: '8px 10px', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#9CA3AF' }}>{d.label}</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#1E3A5F', marginTop: 2 }}>{d.value}</div>
                </div>
              ))}
            </div>

            <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 12 }}>{v.country} / {v.city} · Since {v.joinedAt}</div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{ flex: 1, padding: '8px', borderRadius: 10, border: '1px solid #D1D5DB', background: '#FFFFFF', color: '#1E3A5F', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>View Tickets</button>
              <button style={{ flex: 1, padding: '8px', borderRadius: 10, border: 'none', background: '#1E3A5F', color: '#FFFFFF', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Manage</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
