const payments = [
  { id: 'PAY-10241', tenant: 'Mohamed Al-Rashdi', type: 'Rent', amount: '8,500 QAR', currency: 'QAR', status: 'SETTLED', method: 'Card', bookingId: 'BK-20481', date: '2026-04-01', risk: 'Low' },
  { id: 'PAY-10242', tenant: 'Nora Hassan', type: 'Service', amount: '200 AED', currency: 'AED', status: 'SETTLED', method: 'Wallet', bookingId: 'BK-20482', date: '2026-04-02', risk: 'Low' },
  { id: 'PAY-10243', tenant: 'Khalid Ibrahim', type: 'Deposit', amount: '24,000 SAR', currency: 'SAR', status: 'AT_RISK', method: 'Bank Transfer', bookingId: 'BK-20483', date: '2026-04-01', risk: 'High' },
  { id: 'PAY-10244', tenant: 'Omar Youssef', type: 'Rent', amount: '6,800 AED', currency: 'AED', status: 'PENDING', method: 'Card', bookingId: 'BK-20485', date: '2026-04-03', risk: 'Medium' },
  { id: 'PAY-10245', tenant: 'Ahmed Farouk', type: 'Service', amount: '150 QAR', currency: 'QAR', status: 'REFUNDED', method: 'Wallet', bookingId: 'BK-20481', date: '2026-03-28', risk: 'Low' },
  { id: 'PAY-10246', tenant: 'Layla Khamis', type: 'Deposit', amount: '15,600 QAR', currency: 'QAR', status: 'PENDING', method: 'Bank Transfer', bookingId: 'BK-20486', date: '2026-04-04', risk: 'Medium' },
  { id: 'PAY-10247', tenant: 'Fatima Al-Zahra', type: 'Rent', amount: '35,000 SAR', currency: 'SAR', status: 'SETTLED', method: 'Card', bookingId: 'BK-20484', date: '2026-04-01', risk: 'Low' },
];

const statusConfig: Record<string, { bg: string; color: string }> = {
  SETTLED: { bg: '#D1FAE5', color: '#065F46' },
  PENDING: { bg: '#FEF3C7', color: '#92400E' },
  AT_RISK: { bg: '#FEE2E2', color: '#991B1B' },
  REFUNDED: { bg: '#EDE9FE', color: '#5B21B6' },
  FAILED: { bg: '#FEE2E2', color: '#7F1D1D' },
};

const riskColors: Record<string, string> = {
  Low: '#10B981',
  Medium: '#F59E0B',
  High: '#EF4444',
};

const stats = [
  { label: 'Total Revenue', value: '₊4.82M', sub: 'This quarter', accent: '#059669' },
  { label: 'Settled', value: '3,891', sub: '91.2% success rate' },
  { label: 'Pending', value: '204', sub: 'Awaiting clearance', accent: '#F59E0B' },
  { label: 'At Risk', value: '27', sub: 'Requires intervention', accent: '#EF4444' },
];

export default function PaymentsPage() {
  return (
    <section style={{ display: 'grid', gap: 24 }}>
      <header>
        <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800, color: '#1E3A5F' }}>Payments</h1>
        <p style={{ color: '#6B7280', marginTop: 6, marginBottom: 0 }}>
          Every transaction is a Financial Record. Full payment lifecycle with risk tracking across all markets.
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

      {/* Revenue chart placeholder */}
      <article style={{ background: '#FFFFFF', border: '1px solid #E5EDF5', borderRadius: 16, padding: 20 }}>
        <h3 style={{ margin: '0 0 16px', color: '#1E3A5F', fontSize: 16 }}>Revenue by Market — April 2026</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            { market: 'Qatar (QA)', amount: '1.84M QAR', percent: 38, color: '#8B5CF6' },
            { market: 'UAE (AE)', amount: '1.92M AED', percent: 40, color: '#3B82F6' },
            { market: 'Saudi (SA)', amount: '1.06M SAR', percent: 22, color: '#F97316' },
          ].map((m) => (
            <div key={m.market} style={{ background: '#F8FAFC', borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{m.market}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#1E3A5F', margin: '8px 0 8px' }}>{m.amount}</div>
              <div style={{ background: '#E5E7EB', borderRadius: 4, height: 6 }}>
                <div style={{ background: m.color, borderRadius: 4, height: 6, width: `${m.percent}%` }} />
              </div>
              <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>{m.percent}% of total</div>
            </div>
          ))}
        </div>
      </article>

      {/* Table */}
      <article style={{ background: '#FFFFFF', border: '1px solid #E5EDF5', borderRadius: 16, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E5EDF5' }}>
              {['Payment ID', 'Tenant', 'Type', 'Amount', 'Method', 'Booking', 'Date', 'Risk', 'Status', 'Actions'].map((col) => (
                <th key={col} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {payments.map((p, i) => (
              <tr key={p.id} style={{ borderBottom: i < payments.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
                <td style={{ padding: '13px 14px', fontSize: 12, color: '#9CA3AF', fontFamily: 'monospace' }}>{p.id}</td>
                <td style={{ padding: '13px 14px', fontSize: 14, fontWeight: 600, color: '#111827', whiteSpace: 'nowrap' }}>{p.tenant}</td>
                <td style={{ padding: '13px 14px' }}>
                  <span style={{ padding: '2px 8px', borderRadius: 8, background: '#F3F4F6', fontSize: 12, fontWeight: 600, color: '#374151' }}>{p.type}</span>
                </td>
                <td style={{ padding: '13px 14px', fontSize: 14, fontWeight: 800, color: '#059669', whiteSpace: 'nowrap' }}>{p.amount}</td>
                <td style={{ padding: '13px 14px', fontSize: 13, color: '#4B5563' }}>{p.method}</td>
                <td style={{ padding: '13px 14px', fontSize: 12, color: '#9CA3AF', fontFamily: 'monospace' }}>{p.bookingId}</td>
                <td style={{ padding: '13px 14px', fontSize: 12, color: '#6B7280' }}>{p.date}</td>
                <td style={{ padding: '13px 14px' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: riskColors[p.risk] }}>{p.risk}</span>
                </td>
                <td style={{ padding: '13px 14px' }}>
                  <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: (statusConfig[p.status] ?? { bg: '#F3F4F6' }).bg, color: (statusConfig[p.status] ?? { color: '#374151' }).color }}>{p.status}</span>
                </td>
                <td style={{ padding: '13px 14px' }}>
                  <button style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid #D1D5DB', background: '#FFFFFF', color: '#1E3A5F', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Details</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>
    </section>
  );
}
