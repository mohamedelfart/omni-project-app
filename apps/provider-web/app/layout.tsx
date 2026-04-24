import './globals.css';
import type { Metadata } from 'next';
import { ReactNode } from 'react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'QuickRent Vendor App',
  description: 'Vendor execution interface for QuickRent service providers',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#F0F4F8', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        {/* Top nav bar */}
        <nav style={{
          position: 'sticky', top: 0, zIndex: 100,
          background: 'linear-gradient(135deg, #1E3A5F 0%, #0D1F35 100%)',
          color: '#FFFFFF', padding: '0 24px',
          display: 'flex', alignItems: 'center', gap: 24, height: 60,
          boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
        }}>
          <div style={{ fontWeight: 800, fontSize: 18, letterSpacing: '-0.5px' }}>
            <span style={{ color: '#F97316' }}>Quick</span>Rent
            <span style={{ fontSize: 11, background: 'rgba(249,115,22,0.2)', color: '#FB923C', padding: '2px 8px', borderRadius: 6, marginLeft: 8, fontWeight: 700 }}>VENDOR</span>
          </div>
          <div style={{ display: 'flex', gap: 4, marginLeft: 8 }}>
            {[
              { label: 'Home', href: '/' },
              { label: 'My jobs', href: '/jobs' },
              { label: 'Sign in', href: '/login' },
            ].map((item) => (
              <Link key={item.href} href={item.href} style={{ padding: '8px 14px', borderRadius: 8, color: 'rgba(255,255,255,0.75)', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>
                {item.label}
              </Link>
            ))}
          </div>
          {/* Status indicator */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#10B981', display: 'inline-block', boxShadow: '0 0 6px #10B981' }} />
            <span style={{ fontSize: 13, fontWeight: 600 }}>Online</span>
          </div>
        </nav>
        <main style={{ maxWidth: 900, margin: '0 auto', padding: '28px 24px' }}>{children}</main>
      </body>
    </html>
  );
}
