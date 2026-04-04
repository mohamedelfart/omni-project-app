export default function LandlordPortalDisabledPage() {
  return (
    <main
      style={{
        minHeight: '72vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <section
        style={{
          width: '100%',
          maxWidth: 760,
          background: 'rgba(255,255,255,0.96)',
          border: '1px solid #D9E2EC',
          borderRadius: 20,
          padding: 28,
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 42, lineHeight: 1, marginBottom: 14 }}>Portal Closed</div>
        <h1 style={{ margin: 0, color: '#1E3A5F', fontSize: 32 }}>Owner Access Disabled</h1>
        <p style={{ marginTop: 12, marginBottom: 0, color: '#6B7280', lineHeight: 1.7 }}>
          QuickRent is an operator-based residential platform. Property owners are not system users,
          and there is no landlord-facing portal.
        </p>
        <div
          style={{
            marginTop: 18,
            background: '#FEF3C7',
            border: '1px solid #FCD34D',
            borderRadius: 14,
            padding: '12px 14px',
            color: '#92400E',
            fontWeight: 600,
          }}
        >
          For partnership inquiries, contact partnerships@quickrent.io.
        </div>
      </section>
    </main>
  );
}
