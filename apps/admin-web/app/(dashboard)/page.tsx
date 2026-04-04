const metrics = [
  { title: 'Live Tickets', value: '1,284' },
  { title: 'Active Providers', value: '312' },
  { title: 'Open Escalations', value: '19' },
  { title: 'Payments at Risk', value: '27' },
];

const liveRequests = [
  { id: 'REQ-20481', service: 'Viewing Transport', tenant: 'Nora T.', status: 'Assigned', market: 'QA / Doha' },
  { id: 'REQ-20482', service: 'Move-In', tenant: 'Omar R.', status: 'Monitoring', market: 'QA / Lusail' },
  { id: 'REQ-20483', service: 'Airport Transfer', tenant: 'Maya H.', status: 'Escalated', market: 'AE / Dubai' },
];

const interventions = [
  'Reassign airport transfer to fallback provider after SLA breach.',
  'Issue loyalty discount to high-value tenant for delayed move-in support.',
  'Route maintenance request to command center supervisor for manual review.',
];

export default function AdminOverviewPage() {
  return (
    <section style={{ display: 'grid', gap: 18 }}>
      <header style={{ display: 'grid', gap: 8 }}>
        <h1 style={{ marginTop: 0, fontSize: 38, color: '#1E3A5F', marginBottom: 0 }}>Global Operations Control</h1>
        <p style={{ color: '#6B7280', marginTop: 0, marginBottom: 0, maxWidth: 760 }}>
          Unified command center for routing, intervention, provider control, offers, escalations, payment visibility, and operational analytics across every market.
        </p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14 }}>
        {metrics.map((metric) => (
          <article
            key={metric.title}
            style={{
              background: 'rgba(255,255,255,0.82)',
              border: '1px solid #D9E2EC',
              borderRadius: 20,
              padding: 20,
              backdropFilter: 'blur(18px)',
            }}
          >
            <div style={{ color: '#6B7280', fontSize: 14 }}>{metric.title}</div>
            <div style={{ fontSize: 30, fontWeight: 700, color: '#1E3A5F', marginTop: 8 }}>
              {metric.value}
            </div>
          </article>
        ))}
      </div>

      <section style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 18 }}>
        <article style={{ background: 'rgba(255,255,255,0.86)', border: '1px solid #D9E2EC', borderRadius: 20, padding: 20 }}>
          <h2 style={{ marginTop: 0, color: '#1E3A5F' }}>Live Request Board</h2>
          <div style={{ display: 'grid', gap: 12 }}>
            {liveRequests.map((request) => (
              <div key={request.id} style={{ border: '1px solid #E5EDF5', borderRadius: 16, padding: 16, background: '#FFFFFF' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <strong style={{ color: '#1E3A5F' }}>{request.id} • {request.service}</strong>
                  <span style={{ color: '#F97316', fontWeight: 700 }}>{request.status}</span>
                </div>
                <div style={{ color: '#6B7280', marginTop: 8 }}>{request.tenant} • {request.market}</div>
              </div>
            ))}
          </div>
        </article>

        <article style={{ background: 'rgba(255,255,255,0.86)', border: '1px solid #D9E2EC', borderRadius: 20, padding: 20 }}>
          <h2 style={{ marginTop: 0, color: '#1E3A5F' }}>Command Controls</h2>
          <div style={{ display: 'grid', gap: 10 }}>
            {['Approve Request', 'Reassign Provider', 'Create Offer', 'Trigger Escalation', 'Override Routing'].map((action) => (
              <button key={action} style={{ height: 48, borderRadius: 14, border: '1px solid #D9E2EC', background: '#FFFFFF', color: '#1E3A5F', fontWeight: 700 }}>
                {action}
              </button>
            ))}
          </div>
        </article>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        <article style={{ background: 'rgba(255,255,255,0.86)', border: '1px solid #D9E2EC', borderRadius: 20, padding: 20 }}>
          <h2 style={{ marginTop: 0, color: '#1E3A5F' }}>Active Interventions</h2>
          <ul style={{ margin: 0, paddingLeft: 18, color: '#6B7280', display: 'grid', gap: 10 }}>
            {interventions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>

        <article style={{ background: 'rgba(255,255,255,0.86)', border: '1px solid #D9E2EC', borderRadius: 20, padding: 20 }}>
          <h2 style={{ marginTop: 0, color: '#1E3A5F' }}>Analytics Snapshot</h2>
          <div style={{ display: 'grid', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Viewing conversion</span><strong>42%</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Average dispatch SLA</span><strong>11 min</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Fallback activation rate</span><strong>3.8%</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Offer redemption</span><strong>27%</strong></div>
          </div>
        </article>
      </section>
    </section>
  );
}
