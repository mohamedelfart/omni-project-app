const properties = [
  { id: 'PROP-001', title: 'Lusail Marina Tower — 2BR', type: 'Apartment', status: 'AVAILABLE', country: 'QA', city: 'Lusail', price: '8,500 QAR/mo', area: '120 m²', bedrooms: 2, operator: 'Platform', listed: '2025-10-14' },
  { id: 'PROP-002', title: 'Pearl Qatar Villa — 4BR', type: 'Villa', status: 'OCCUPIED', country: 'QA', city: 'Al Khor', price: '22,000 QAR/mo', area: '380 m²', bedrooms: 4, operator: 'Platform', listed: '2025-09-01' },
  { id: 'PROP-003', title: 'Downtown Dubai Studio', type: 'Studio', status: 'AVAILABLE', country: 'AE', city: 'Dubai', price: '7,200 AED/mo', area: '55 m²', bedrooms: 0, operator: 'Platform', listed: '2025-11-20' },
  { id: 'PROP-004', title: 'Riyadh Financial District 3BR', type: 'Apartment', status: 'MAINTENANCE', country: 'SA', city: 'Riyadh', price: '12,000 SAR/mo', area: '185 m²', bedrooms: 3, operator: 'Platform', listed: '2026-01-05' },
  { id: 'PROP-005', title: 'Abu Dhabi Corniche 1BR', type: 'Apartment', status: 'AVAILABLE', country: 'AE', city: 'Abu Dhabi', price: '6,800 AED/mo', area: '80 m²', bedrooms: 1, operator: 'Platform', listed: '2026-02-10' },
  { id: 'PROP-006', title: 'Jeddah Seafront Penthouse', type: 'Penthouse', status: 'OCCUPIED', country: 'SA', city: 'Jeddah', price: '35,000 SAR/mo', area: '520 m²', bedrooms: 5, operator: 'Platform', listed: '2025-12-15' },
  { id: 'PROP-007', title: 'Doha West Bay 2BR', type: 'Apartment', status: 'AVAILABLE', country: 'QA', city: 'Doha', price: '7,800 QAR/mo', area: '105 m²', bedrooms: 2, operator: 'Platform', listed: '2026-03-02' },
];

const statusConfig: Record<string, { bg: string; color: string }> = {
  AVAILABLE: { bg: '#D1FAE5', color: '#065F46' },
  OCCUPIED: { bg: '#DBEAFE', color: '#1E40AF' },
  MAINTENANCE: { bg: '#FEF3C7', color: '#92400E' },
  INACTIVE: { bg: '#F3F4F6', color: '#6B7280' },
};

const typeIcons: Record<string, string> = {
  Apartment: '🏢',
  Villa: '🏡',
  Studio: '🏠',
  Penthouse: '🌆',
};

const stats = [
  { label: 'Total Assets', value: '2,841', sub: 'All markets' },
  { label: 'Available', value: '1,204', sub: '42.4%', accent: '#10B981' },
  { label: 'Occupied', value: '1,487', sub: '52.3%', accent: '#3B82F6' },
  { label: 'Maintenance', value: '150', sub: '5.3%', accent: '#F59E0B' },
];

export default function PropertiesPage() {
  return (
    <section style={{ display: 'grid', gap: 24 }}>
      <header>
        <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800, color: '#1E3A5F' }}>Property Assets</h1>
        <p style={{ color: '#6B7280', marginTop: 6, marginBottom: 0 }}>
          All residential assets are platform-owned inventory. No landlord access. Every unit is an indexed asset.
        </p>
      </header>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {stats.map((s) => (
          <article key={s.label} style={{ background: '#FFFFFF', border: '1px solid #E5EDF5', borderRadius: 16, padding: '18px 20px' }}>
            <div style={{ color: '#6B7280', fontSize: 13 }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#1E3A5F', margin: '6px 0 2px' }}>{s.value}</div>
            <div style={{ fontSize: 12, color: s.accent ?? '#6B7280', fontWeight: 600 }}>{s.sub}</div>
          </article>
        ))}
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', background: '#FFFFFF', border: '1px solid #E5EDF5', borderRadius: 16, padding: '14px 20px' }}>
        <input readOnly placeholder="Search property ID, name, city…" style={{ flex: 1, border: '1px solid #D1D5DB', borderRadius: 10, padding: '10px 14px', fontSize: 14, background: '#F9FAFB' }} />
        {['All', 'QA', 'AE', 'SA'].map((c) => (
          <button key={c} style={{ padding: '9px 16px', borderRadius: 10, border: '1px solid #D1D5DB', background: c === 'All' ? '#1E3A5F' : '#FFFFFF', color: c === 'All' ? '#FFFFFF' : '#374151', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>{c}</button>
        ))}
        <button style={{ padding: '9px 18px', borderRadius: 10, border: 'none', background: '#F97316', color: '#FFFFFF', fontWeight: 700, fontSize: 13, cursor: 'pointer', marginLeft: 'auto' }}>+ Add Asset</button>
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
        {properties.map((prop) => (
          <article
            key={prop.id}
            style={{ background: '#FFFFFF', border: '1px solid #E5EDF5', borderRadius: 20, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 11, color: '#9CA3AF', fontFamily: 'monospace', marginBottom: 4 }}>{prop.id}</div>
                <div style={{ fontWeight: 700, color: '#111827', fontSize: 15, lineHeight: 1.3 }}>
                  {typeIcons[prop.type] ?? '🏠'} {prop.title}
                </div>
              </div>
              <span style={{
                padding: '4px 10px',
                borderRadius: 20,
                fontSize: 11,
                fontWeight: 700,
                background: (statusConfig[prop.status] ?? { bg: '#F3F4F6' }).bg,
                color: (statusConfig[prop.status] ?? { color: '#6B7280' }).color,
                whiteSpace: 'nowrap',
              }}>{prop.status}</span>
            </div>

            {/* Details */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { label: 'Country', value: prop.country },
                { label: 'City', value: prop.city },
                { label: 'Bedrooms', value: prop.bedrooms === 0 ? 'Studio' : `${prop.bedrooms} BR` },
                { label: 'Area', value: prop.area },
              ].map((d) => (
                <div key={d.label} style={{ background: '#F8FAFC', borderRadius: 10, padding: '8px 12px' }}>
                  <div style={{ fontSize: 11, color: '#9CA3AF' }}>{d.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginTop: 2 }}>{d.value}</div>
                </div>
              ))}
            </div>

            {/* Price & Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
              <div>
                <div style={{ fontSize: 11, color: '#9CA3AF' }}>Monthly Rent</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#1E3A5F' }}>{prop.price}</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={{ padding: '7px 14px', borderRadius: 10, border: '1px solid #D1D5DB', background: '#FFFFFF', color: '#1E3A5F', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>View</button>
                <button style={{ padding: '7px 14px', borderRadius: 10, border: 'none', background: '#1E3A5F', color: '#FFFFFF', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Edit</button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
