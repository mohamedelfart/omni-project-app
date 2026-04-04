const certifications = [
  'Electrical Safety Certified',
  'HVAC Maintenance License',
  'Background Check Verified',
  'Emergency Response Trained',
];

const serviceCoverage = [
  { city: 'Doha', country: 'QA', zones: 'West Bay, The Pearl, Lusail' },
  { city: 'Al Wakrah', country: 'QA', zones: 'Central, Seafront' },
  { city: 'Al Rayyan', country: 'QA', zones: 'Education City, Muaither' },
];

const performance = [
  { label: 'Completion Rate', value: '98.4%' },
  { label: 'Average Rating', value: '4.9 / 5.0' },
  { label: 'On-Time Arrival', value: '96.8%' },
  { label: 'Customer Complaints', value: '0.4%' },
];

export default function ProviderProfilePage() {
  return (
    <main style={{ display: 'grid', gap: 18 }}>
      <section
        style={{
          background: 'rgba(255,255,255,0.88)',
          border: '1px solid #D9E2EC',
          borderRadius: 20,
          padding: 20,
          display: 'grid',
          gridTemplateColumns: '110px 1fr auto',
          gap: 16,
          alignItems: 'center',
        }}
      >
        <div
          style={{
            width: 110,
            height: 110,
            borderRadius: 20,
            background: 'linear-gradient(135deg, #1E3A5F 0%, #2B5A8A 100%)',
            color: '#FFFFFF',
            fontSize: 38,
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          AK
        </div>
        <div>
          <h1 style={{ margin: 0, color: '#1E3A5F', fontSize: 30 }}>Ahmed Kareem</h1>
          <p style={{ margin: '8px 0 0', color: '#6B7280' }}>Senior Field Technician | Active in Qatar</p>
          <p style={{ margin: '8px 0 0', color: '#6B7280' }}>Provider ID: PROV-QA-1029</p>
        </div>
        <button
          type="button"
          style={{
            height: 42,
            padding: '0 18px',
            borderRadius: 12,
            border: 'none',
            background: '#1E3A5F',
            color: '#FFFFFF',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Edit Profile
        </button>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}>
        {performance.map((item) => (
          <article
            key={item.label}
            style={{
              background: 'rgba(255,255,255,0.88)',
              border: '1px solid #D9E2EC',
              borderRadius: 16,
              padding: 14,
            }}
          >
            <div style={{ color: '#6B7280', fontSize: 13 }}>{item.label}</div>
            <div style={{ color: '#1E3A5F', fontSize: 22, fontWeight: 800, marginTop: 6 }}>{item.value}</div>
          </article>
        ))}
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <article style={{ background: 'rgba(255,255,255,0.88)', border: '1px solid #D9E2EC', borderRadius: 18, padding: 18 }}>
          <h2 style={{ marginTop: 0, color: '#1E3A5F' }}>Certifications</h2>
          <div style={{ display: 'grid', gap: 10 }}>
            {certifications.map((item) => (
              <div key={item} style={{ background: '#FFFFFF', border: '1px solid #E5EDF5', borderRadius: 12, padding: 12, color: '#334155', fontWeight: 600 }}>
                {item}
              </div>
            ))}
          </div>
        </article>

        <article style={{ background: 'rgba(255,255,255,0.88)', border: '1px solid #D9E2EC', borderRadius: 18, padding: 18 }}>
          <h2 style={{ marginTop: 0, color: '#1E3A5F' }}>Service Coverage</h2>
          <div style={{ display: 'grid', gap: 10 }}>
            {serviceCoverage.map((area) => (
              <div key={`${area.city}-${area.country}`} style={{ background: '#FFFFFF', border: '1px solid #E5EDF5', borderRadius: 12, padding: 12 }}>
                <div style={{ color: '#1E3A5F', fontWeight: 700 }}>{area.city}, {area.country}</div>
                <div style={{ marginTop: 4, color: '#6B7280', fontSize: 13 }}>{area.zones}</div>
              </div>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
