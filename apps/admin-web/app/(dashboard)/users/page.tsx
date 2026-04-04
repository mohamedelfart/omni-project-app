const users = [
  { id: 'USR-001', name: 'Mohamed Al-Rashdi', email: 'mohamed@example.com', type: 'Tenant', status: 'Active', market: 'AE / Dubai', joined: '2025-11-14', bookings: 4 },
  { id: 'USR-002', name: 'Sara Al-Mansouri', email: 'sara@example.com', type: 'Landlord', status: 'Active', market: 'QA / Doha', joined: '2025-10-02', bookings: 0 },
  { id: 'USR-003', name: 'Khalid Ibrahim', email: 'khalid@example.com', type: 'Tenant', status: 'Suspended', market: 'SA / Riyadh', joined: '2025-12-01', bookings: 1 },
  { id: 'USR-004', name: 'Nora Hassan', email: 'nora@example.com', type: 'Provider', status: 'Active', market: 'QA / Lusail', joined: '2026-01-15', bookings: 0 },
  { id: 'USR-005', name: 'Omar Youssef', email: 'omar@example.com', type: 'Tenant', status: 'Active', market: 'AE / Dubai', joined: '2026-02-08', bookings: 2 },
  { id: 'USR-006', name: 'Layla Khamis', email: 'layla@example.com', type: 'Landlord', status: 'Pending KYC', market: 'AE / Abu Dhabi', joined: '2026-03-20', bookings: 0 },
  { id: 'USR-007', name: 'Ahmed Farouk', email: 'ahmed.f@example.com', type: 'Tenant', status: 'Active', market: 'EG / Cairo', joined: '2026-03-25', bookings: 3 },
  { id: 'USR-008', name: 'Fatima Al-Zahra', email: 'fatima@example.com', type: 'Provider', status: 'Active', market: 'SA / Jeddah', joined: '2026-01-30', bookings: 0 },
];

const typeColors: Record<string, string> = {
  Tenant: '#3B82F6',
  Landlord: '#8B5CF6',
  Provider: '#10B981',
  Admin: '#F97316',
};

const statusColors: Record<string, { bg: string; color: string }> = {
  Active: { bg: '#D1FAE5', color: '#065F46' },
  Suspended: { bg: '#FEE2E2', color: '#991B1B' },
  'Pending KYC': { bg: '#FEF3C7', color: '#92400E' },
};

const stats = [
  { label: 'Total Users', value: '14,821', sub: '+238 this week' },
  { label: 'Tenants', value: '10,402', sub: '70.2%' },
  { label: 'Landlords', value: '3,115', sub: '21.0%' },
  { label: 'Providers', value: '1,304', sub: '8.8%' },
];

export default function UsersPage() {
  return (
    <section style={{ display: 'grid', gap: 24 }}>
      <header>
        <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800, color: '#1E3A5F' }}>User Management</h1>
        <p style={{ color: '#6B7280', marginTop: 6, marginBottom: 0 }}>
          View, search, and manage all platform users across every market.
        </p>
      </header>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {stats.map((s) => (
          <article
            key={s.label}
            style={{
              background: '#FFFFFF',
              border: '1px solid #E5EDF5',
              borderRadius: 16,
              padding: '18px 20px',
            }}
          >
            <div style={{ color: '#6B7280', fontSize: 13 }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#1E3A5F', margin: '6px 0 2px' }}>{s.value}</div>
            <div style={{ fontSize: 12, color: '#10B981', fontWeight: 600 }}>{s.sub}</div>
          </article>
        ))}
      </div>

      {/* Filter row */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          background: '#FFFFFF',
          border: '1px solid #E5EDF5',
          borderRadius: 16,
          padding: '14px 20px',
        }}
      >
        <input
          readOnly
          placeholder="Search by name, email, or ID…"
          style={{
            flex: 1,
            border: '1px solid #D1D5DB',
            borderRadius: 10,
            padding: '10px 14px',
            fontSize: 14,
            outline: 'none',
            background: '#F9FAFB',
          }}
        />
        {['All Types', 'Tenant', 'Landlord', 'Provider'].map((f) => (
          <button
            key={f}
            style={{
              padding: '9px 16px',
              borderRadius: 10,
              border: '1px solid #D1D5DB',
              background: f === 'All Types' ? '#1E3A5F' : '#FFFFFF',
              color: f === 'All Types' ? '#FFFFFF' : '#374151',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            {f}
          </button>
        ))}
        <button
          style={{
            padding: '9px 18px',
            borderRadius: 10,
            border: 'none',
            background: '#F97316',
            color: '#FFFFFF',
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
            marginLeft: 'auto',
          }}
        >
          + Invite User
        </button>
      </div>

      {/* Table */}
      <article style={{ background: '#FFFFFF', border: '1px solid #E5EDF5', borderRadius: 16, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E5EDF5' }}>
              {['ID', 'Name', 'Email', 'Type', 'Status', 'Market', 'Joined', 'Bookings', 'Actions'].map((col) => (
                <th
                  key={col}
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#6B7280',
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((user, i) => (
              <tr
                key={user.id}
                style={{ borderBottom: i < users.length - 1 ? '1px solid #F3F4F6' : 'none' }}
              >
                <td style={{ padding: '14px 16px', fontSize: 13, color: '#9CA3AF', fontFamily: 'monospace' }}>{user.id}</td>
                <td style={{ padding: '14px 16px', fontSize: 14, fontWeight: 600, color: '#111827' }}>{user.name}</td>
                <td style={{ padding: '14px 16px', fontSize: 13, color: '#4B5563' }}>{user.email}</td>
                <td style={{ padding: '14px 16px' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '3px 10px',
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: 700,
                      background: `${typeColors[user.type]}18`,
                      color: typeColors[user.type],
                    }}
                  >
                    {user.type}
                  </span>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '3px 10px',
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: 700,
                      background: (statusColors[user.status] ?? { bg: '#F3F4F6' }).bg,
                      color: (statusColors[user.status] ?? { color: '#374151' }).color,
                    }}
                  >
                    {user.status}
                  </span>
                </td>
                <td style={{ padding: '14px 16px', fontSize: 13, color: '#4B5563' }}>{user.market}</td>
                <td style={{ padding: '14px 16px', fontSize: 13, color: '#9CA3AF' }}>{user.joined}</td>
                <td style={{ padding: '14px 16px', fontSize: 14, fontWeight: 700, color: '#1E3A5F', textAlign: 'center' }}>
                  {user.bookings}
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      style={{
                        padding: '5px 12px',
                        borderRadius: 8,
                        border: '1px solid #D1D5DB',
                        background: '#FFFFFF',
                        color: '#1E3A5F',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      View
                    </button>
                    <button
                      style={{
                        padding: '5px 12px',
                        borderRadius: 8,
                        border: 'none',
                        background: '#FEE2E2',
                        color: '#991B1B',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Suspend
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '14px 20px',
            borderTop: '1px solid #F3F4F6',
          }}
        >
          <span style={{ fontSize: 13, color: '#6B7280' }}>Showing 8 of 14,821 users</span>
          <div style={{ display: 'flex', gap: 8 }}>
            {['← Prev', '1', '2', '3', '...', '1,853', 'Next →'].map((p) => (
              <button
                key={p}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: '1px solid #E5E7EB',
                  background: p === '1' ? '#1E3A5F' : '#FFFFFF',
                  color: p === '1' ? '#FFFFFF' : '#374151',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </article>
    </section>
  );
}
