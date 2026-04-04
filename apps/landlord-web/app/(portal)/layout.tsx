import { ReactNode } from 'react';

export default function LandlordLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: '#F8FBFF' }}>
      <header
        style={{
          background: 'rgba(255,255,255,0.92)',
          borderBottom: '1px solid #D9E2EC',
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <strong style={{ color: '#1E3A5F' }}>QuickRent Operator Platform</strong>
        <span style={{ color: '#6B7280', fontSize: 14 }}>Owner portal retired</span>
      </header>
      <div style={{ padding: 24 }}>{children}</div>
    </div>
  );
}
