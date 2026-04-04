const weekly = [
  { week: 'Mar 31 – Apr 4', jobs: 12, earned: '1,480 QAR', freeJobs: 2, rated: '4.8★' },
  { week: 'Mar 24 – Mar 30', jobs: 9, earned: '920 QAR', freeJobs: 1, rated: '4.9★' },
  { week: 'Mar 17 – Mar 23', jobs: 14, earned: '1,610 QAR', freeJobs: 3, rated: '4.7★' },
  { week: 'Mar 10 – Mar 16', jobs: 8, earned: '760 QAR', freeJobs: 0, rated: '4.6★' },
];

export default function VendorEarningsPage() {
  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <header>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#1E3A5F' }}>Earnings</h1>
        <p style={{ color: '#6B7280', marginTop: 6, marginBottom: 0 }}>
          Platform-managed earnings. Free service jobs are covered by QuickRent — you are always paid.
        </p>
      </header>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        {[
          { label: 'This Month', value: '4,770 QAR', sub: '43 jobs completed', color: '#059669' },
          { label: 'Pending Payout', value: '1,480 QAR', sub: 'Next transfer: Apr 7', color: '#F97316' },
          { label: 'Lifetime', value: '28,440 QAR', sub: '241 total jobs', color: '#7C3AED' },
        ].map((s) => (
          <article key={s.label} style={{ background: '#FFFFFF', border: '1px solid #E5EDF5', borderRadius: 16, padding: '20px 24px' }}>
            <div style={{ fontSize: 13, color: '#6B7280' }}>{s.label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: s.color, margin: '8px 0 4px' }}>{s.value}</div>
            <div style={{ fontSize: 12, color: '#9CA3AF' }}>{s.sub}</div>
          </article>
        ))}
      </div>

      {/* Weekly breakdown */}
      <article style={{ background: '#FFFFFF', border: '1px solid #E5EDF5', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #F3F4F6' }}>
          <h3 style={{ margin: 0, color: '#1E3A5F', fontSize: 16, fontWeight: 700 }}>Weekly Breakdown</h3>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E5EDF5' }}>
              {['Week', 'Jobs', 'Earned', 'Free Jobs (Platform Covered)', 'Avg Rating'].map((col) => (
                <th key={col} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' as const, letterSpacing: 0.5 }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weekly.map((w, i) => (
              <tr key={w.week} style={{ borderBottom: i < weekly.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
                <td style={{ padding: '14px 16px', fontWeight: 600, color: '#374151' }}>{w.week}</td>
                <td style={{ padding: '14px 16px', fontSize: 15, fontWeight: 800, color: '#1E3A5F' }}>{w.jobs}</td>
                <td style={{ padding: '14px 16px', fontSize: 15, fontWeight: 800, color: '#059669' }}>{w.earned}</td>
                <td style={{ padding: '14px 16px' }}>
                  {w.freeJobs > 0
                    ? <span style={{ padding: '3px 10px', borderRadius: 20, background: '#D1FAE5', color: '#065F46', fontSize: 12, fontWeight: 700 }}>{w.freeJobs} covered</span>
                    : <span style={{ color: '#D1D5DB', fontSize: 13 }}>—</span>
                  }
                </td>
                <td style={{ padding: '14px 16px', fontSize: 15, fontWeight: 700, color: '#F59E0B' }}>{w.rated}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>
    </div>
  );
}
