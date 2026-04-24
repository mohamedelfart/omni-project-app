'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { fetchVendorJobsList, postVendorJobStatus } from '../../../lib/vendor-jobs-client';
import { getAccessToken } from '../../../lib/vendor-session';
import { useVendorRealtimeRefetch } from '../../../lib/useVendorRealtimeRefetch';
import type { VendorJob } from '../../../lib/vendor-types';

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = params.id;
  const jobId = typeof rawId === 'string' ? rawId : Array.isArray(rawId) ? rawId[0] : '';

  const [job, setJob] = useState<VendorJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  const resolveFromList = useCallback(async () => {
    if (!getAccessToken()) {
      router.replace('/login');
      return;
    }
    if (!jobId) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    try {
      const list = await fetchVendorJobsList();
      const found = list.find((j) => j.id === jobId) ?? null;
      setJob(found);
      setNotFound(!found);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load job');
      setJob(null);
    } finally {
      setLoading(false);
    }
  }, [jobId, router]);

  useEffect(() => {
    setLoading(true);
    void resolveFromList();
  }, [resolveFromList]);

  useVendorRealtimeRefetch(resolveFromList);

  const runStatus = async (next: 'in_progress' | 'completed') => {
    if (!jobId) return;
    setActionBusy(true);
    setError(null);
    try {
      await postVendorJobStatus(jobId, next);
      await resolveFromList();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setActionBusy(false);
    }
  };

  const statusLabel = job ? job.status.replace('_', ' ') : '';

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div>
        <Link href="/jobs" style={{ color: '#1D4ED8', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
          ← Back to jobs
        </Link>
      </div>

      {loading ? (
        <div style={{ color: '#64748B' }}>Loading job…</div>
      ) : notFound && !error ? (
        <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: 16, color: '#92400E' }}>
          This job is not in your assigned list (or it was removed).{' '}
          <Link href="/jobs" style={{ color: '#1D4ED8', fontWeight: 600 }}>
            Return to jobs
          </Link>
        </div>
      ) : (
        <>
          <div>
            <h1 style={{ margin: '0 0 6px', fontSize: 22 }}>Job detail</h1>
            <p style={{ margin: 0, color: '#64748B', fontSize: 14 }}>ID: {jobId}</p>
          </div>

          {error ? (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: 12, color: '#991B1B' }}>
              {error}
            </div>
          ) : null}

          {job ? (
            <div
              style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: 10,
                padding: 16,
                display: 'grid',
                gap: 10,
              }}
            >
              <div>
                <strong>Type</strong>: {job.type}
              </div>
              <div>
                <strong>Status</strong>: <span style={{ textTransform: 'capitalize' }}>{statusLabel}</span>
              </div>
              <div>
                <strong>Tenant</strong>: {job.tenantId}
              </div>
              {job.vendorId ? (
                <div>
                  <strong>Vendor</strong>: {job.vendorId}
                </div>
              ) : null}
              <div style={{ fontSize: 13, color: '#64748B' }}>
                Updated: {job.updatedAt ? new Date(job.updatedAt).toLocaleString() : '—'}
              </div>

              <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {job.status === 'assigned' ? (
                  <button
                    type="button"
                    disabled={actionBusy}
                    onClick={() => void runStatus('in_progress')}
                    style={{
                      padding: '10px 16px',
                      borderRadius: 8,
                      border: 'none',
                      background: actionBusy ? '#94A3B8' : '#1E3A5F',
                      color: '#fff',
                      fontWeight: 700,
                      cursor: actionBusy ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Start job
                  </button>
                ) : null}
                {job.status === 'in_progress' ? (
                  <button
                    type="button"
                    disabled={actionBusy}
                    onClick={() => void runStatus('completed')}
                    style={{
                      padding: '10px 16px',
                      borderRadius: 8,
                      border: 'none',
                      background: actionBusy ? '#94A3B8' : '#047857',
                      color: '#fff',
                      fontWeight: 700,
                      cursor: actionBusy ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Complete job
                  </button>
                ) : null}
                {job.status === 'pending' ? (
                  <p style={{ margin: 0, color: '#64748B', fontSize: 14 }}>Next: wait until this job is assigned for execution.</p>
                ) : null}
                {job.status === 'completed' ? (
                  <p style={{ margin: 0, color: '#047857', fontSize: 14, fontWeight: 600 }}>Job completed.</p>
                ) : null}
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
