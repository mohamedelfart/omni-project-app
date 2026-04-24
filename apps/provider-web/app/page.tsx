'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { getAccessToken } from '../lib/vendor-session';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    if (getAccessToken()) {
      router.replace('/jobs');
    } else {
      router.replace('/login');
    }
  }, [router]);

  return (
    <div style={{ padding: 24, textAlign: 'center', color: '#64748B', fontSize: 14 }}>
      Redirecting…
    </div>
  );
}
