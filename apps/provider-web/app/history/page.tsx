const history = [
  { id: 'REQ-20480', service: 'Move-In', tenant: 'Layla Khamis', city: 'Doha', completedAt: '2026-04-03 14:30', earning: '500 QAR', rating: 5, isFree: true },
  { id: 'REQ-20478', service: 'Airport Transfer', tenant: 'Ahmed Farouk', city: 'Doha', completedAt: '2026-04-03 09:15', earning: '80 QAR', rating: 4, isFree: false },
  { id: 'REQ-20471', service: 'Cleaning', tenant: 'Mohamed Al-Rashdi', city: 'Lusail', completedAt: '2026-04-02 12:00', earning: '150 QAR', rating: 5, isFree: false },
  { id: 'REQ-20465', service: 'Maintenance', tenant: 'Nora Hassan', city: 'Dubai', completedAt: '2026-04-01 16:45', earning: '200 AED', rating: 4, isFree: false },
  { id: 'REQ-20451', service: 'Move-In', tenant: 'Sara Ibrahim', city: 'Riyadh', completedAt: '2026-03-31 11:00', earning: '750 SAR', rating: 5, isFree: true },
];

export default function VendorHistoryPage() {
  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <header>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#1E3A5F' }}>Job History</h1>
        <p style={{ color: '#6B7280', marginTop: 6, marginBottom: 0 }}>All completed tickets — fully auditable.</p>
      </header>

      <div style={{ display: 'grid', gap: 12 }}>
        {history.map((job) => (
          <article key={job.id} style={{ background: '#FFFFFF', border: '1px solid #E5EDF5', borderRadius: 16, padding: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#9CA3AF' }}>{job.id}</span>
                {job.isFree && <span style={{ padding: '2px 8px', borderRadius: 8, background: '#D1FAE5', color: '#065F46', fontSize: 11, fontWeight: 700 }}>FREE</span>}
              </div>
              <div style={{ fontWeight: 700, color: '#111827', fontSize: 15 }}>{job.service} — {job.tenant}</div>
              <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>{job.city} · {job.completedAt}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#9CA3AF' }}>Rating</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#F59E0B' }}>{'★'.repeat(job.rating)}{'☆'.repeat(5 - job.rating)}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#9CA3AF' }}>Earned</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#059669' }}>{job.isFree ? '— (Platform)' : job.earning}</div>
              </div>
              <span style={{ padding: '4px 12px', borderRadius: 20, background: '#D1FAE5', color: '#065F46', fontSize: 12, fontWeight: 700 }}>COMPLETED</span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
