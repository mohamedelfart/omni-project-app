'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { fetchVendorJobsList } from '../../lib/vendor-jobs-client';
import { clearSession, getAccessToken } from '../../lib/vendor-session';
import { useVendorRealtimeRefetch } from '../../lib/useVendorRealtimeRefetch';
import type { VendorJob } from '../../lib/vendor-types';

export default function JobsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<VendorJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadJobs = useCallback(async () => {
    if (!getAccessToken()) {
      router.replace('/login');
      return;
    }
    try {
      const list = await fetchVendorJobsList();
      setJobs(list);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadJobs();
  }, [loadJobs]);

  useVendorRealtimeRefetch(loadJobs);

  const signOut = () => {
    clearSession();
    router.replace('/login');
  };

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22 }}>My jobs</h1>
          <p style={{ margin: '6px 0 0', color: '#64748B', fontSize: 14 }}>
            Assigned to you. Next action is on each job.
          </p>
        </div>
        <button
          type="button"
          onClick={signOut}
          style={{
            padding: '8px 14px',
            borderRadius: 8,
            border: '1px solid #CBD5E1',
            background: '#fff',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Sign out
        </button>
      </div>

      {error ? (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: 12, color: '#991B1B' }}>
          {error}
        </div>
      ) : null}

      {loading ? (
        <div style={{ color: '#64748B' }}>Loading jobs…</div>
      ) : !error && jobs.length === 0 ? (
        <div style={{ background: '#FFFFFF', border: '1px dashed #CBD5E1', borderRadius: 8, padding: 16, color: '#64748B' }}>
          No jobs assigned yet. When command-center assigns work to you, it will appear here.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 14 }}>
          {jobs.map((job) => (
            <Link
              key={job.id}
              href={`/jobs/${encodeURIComponent(job.id)}`}
              style={{
                textDecoration: 'none',
                color: 'inherit',
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: 10,
                padding: 14,
                display: 'grid',
                gap: 6,
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 15 }}>
                {job.type} · <span style={{ textTransform: 'capitalize' }}>{job.status.replace('_', ' ')}</span>
              </div>
              <div style={{ fontSize: 13, color: '#64748B' }}>Job ID: {job.id}</div>
              <div style={{ fontSize: 13, color: '#1D4ED8', fontWeight: 600 }}>Open job →</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
