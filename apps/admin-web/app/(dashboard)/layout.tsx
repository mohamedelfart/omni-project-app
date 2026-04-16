import { ReactNode } from 'react';
import Link from 'next/link';

const navGroups = [
  {
    label: 'Command Center',
    items: [
      { title: 'Overview', href: '/', icon: '⬡' },
      { title: 'Escalations', href: '/escalations', icon: '🚨' },
      { title: 'Audit Log', href: '/audit', icon: '📋' },
    ],
  },
  {
    label: 'Platform',
    items: [
      { title: 'Users', href: '/users', icon: '👥' },
      { title: 'Properties', href: '/properties', icon: '🏠' },
      { title: 'Bookings', href: '/bookings', icon: '📅' },
    ],
  },
  {
    label: 'Finance & Ops',
    items: [
      { title: 'Payments', href: '/payments', icon: '💳' },
      { title: 'Providers', href: '/providers', icon: '🔧' },
    ],
  },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', minHeight: '100vh', background: '#F0F4F8' }}>
      <aside
        style={{
          background: 'linear-gradient(180deg, #17314f 0%, #0D1F35 100%)',
          color: '#ffffff',
          padding: '24px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflowY: 'auto',
        }}
      >
        {/* Logo */}
        <div style={{ padding: '8px 12px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: 8 }}>
          <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.5px' }}>
            <span style={{ color: '#F97316' }}>Omni</span>Rent
          </div>
          <div style={{ fontSize: 11, opacity: 0.5, marginTop: 4, textTransform: 'uppercase', letterSpacing: 1 }}>
            Admin Console
          </div>
        </div>

        {/* Nav Groups */}
        {navGroups.map((group) => (
          <div key={group.label} style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, opacity: 0.4, padding: '4px 12px 8px' }}>
              {group.label}
            </div>
            {group.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  borderRadius: 10,
                  color: 'rgba(255,255,255,0.82)',
                  textDecoration: 'none',
                  fontSize: 14,
                  fontWeight: 500,
                  marginBottom: 2,
                }}
              >
                <span style={{ fontSize: 16 }}>{item.icon}</span>
                {item.title}
              </Link>
            ))}
          </div>
        ))}

        {/* Footer */}
        <div style={{ marginTop: 'auto', padding: '16px 12px 0', borderTop: '1px solid rgba(255,255,255,0.08)', fontSize: 12, opacity: 0.45 }}>
          Logged in as Super Admin
        </div>
      </aside>

      <main style={{ padding: 32, overflowY: 'auto' }}>{children}</main>
    </div>
  );
}
