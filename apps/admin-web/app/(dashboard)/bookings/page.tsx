'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../lib/auth';

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1';

type CommandBookingRow = {
  id: string;
  bookingStatus: string;
  moveInDate: string;
  termMonths: number;
  confirmedAt: string | null;
  unifiedRequestId: string | null;
  createdAt: string;
  updatedAt: string;
  totalAmountMinor: number;
  securityDepositMinor: number;
  currency: string;
  tenant: { id: string; fullName: string };
  property: { id: string; title: string; city: string; countryCode: string; status: string };
  paymentReadiness: { settled: boolean; summary: string };
  contractReadiness: { ready: boolean };
  occupancyState: { code: string; label: string };
  nextAction: string;
  blockingReason: string | null;
};

function getLoadErrorMessage(payload: unknown): string {
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    if (typeof record.error === 'string') return record.error;
    if (typeof record.message === 'string') return record.message;
    if (record.message && typeof record.message === 'object' && record.message !== null && 'message' in record.message) {
      const nested = (record.message as { message?: unknown }).message;
      if (typeof nested === 'string') return nested;
    }
  }
  return 'Request failed';
}

function unwrapBookings(payload: unknown): CommandBookingRow[] {
  if (Array.isArray(payload)) {
    return payload.filter(
      (r): r is CommandBookingRow =>
        !!r && typeof r === 'object' && typeof (r as CommandBookingRow).id === 'string',
    );
  }
  if (payload && typeof payload === 'object' && 'data' in payload) {
    const inner = (payload as { data: unknown }).data;
    if (Array.isArray(inner)) return unwrapBookings(inner);
  }
  return [];
}

function formatMoneyMinor(minor: number, currency: string): string {
  const major = minor / 100;
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'USD', maximumFractionDigits: 2 }).format(major);
  } catch {
    return `${currency} ${major.toFixed(2)}`;
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

const BOOKING_BADGE: Record<string, { bg: string; color: string }> = {
  DRAFT: { bg: '#F3F4F6', color: '#374151' },
  RESERVED: { bg: '#FEF3C7', color: '#92400E' },
  CONFIRMED: { bg: '#DBEAFE', color: '#1E40AF' },
  CONTRACT_PENDING: { bg: '#EDE9FE', color: '#5B21B6' },
  ACTIVE: { bg: '#D1FAE5', color: '#065F46' },
  COMPLETED: { bg: '#E5E7EB', color: '#374151' },
  CANCELLED: { bg: '#FEE2E2', color: '#991B1B' },
};

const PROPERTY_BADGE: Record<string, { bg: string; color: string }> = {
  DRAFT: { bg: '#F3F4F6', color: '#374151' },
  PUBLISHED: { bg: '#D1FAE5', color: '#065F46' },
  RESERVED: { bg: '#FEF3C7', color: '#92400E' },
  BOOKED: { bg: '#DBEAFE', color: '#1E40AF' },
  OCCUPIED: { bg: '#BFDBFE', color: '#1E3A8A' },
  INACTIVE: { bg: '#E5E7EB', color: '#4B5563' },
};

type BookingCommandPath = 'confirm' | 'cancel' | 'contract-pending' | 'activate' | 'complete';

/** UI affordance only; backend enforces real validity. */
function bookingCommandsForStatus(status: string): Array<{ path: BookingCommandPath; label: string }> {
  switch (status) {
    case 'RESERVED':
      return [
        { path: 'confirm', label: 'Confirm' },
        { path: 'cancel', label: 'Cancel' },
      ];
    case 'CONFIRMED':
      return [{ path: 'contract-pending', label: 'Contract pending' }];
    case 'CONTRACT_PENDING':
      return [{ path: 'activate', label: 'Activate lease' }];
    case 'ACTIVE':
      return [{ path: 'complete', label: 'Complete lease' }];
    default:
      return [];
  }
}

export default function BookingsPage() {
  const [rows, setRows] = useState<CommandBookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [countryCode, setCountryCode] = useState('');
  const [actionBusy, setActionBusy] = useState<{ bookingId: string; path: BookingCommandPath } | null>(null);

  const load = useCallback(async () => {
    const base = apiBase.replace(/\/$/, '');
    const url = new URL(`${base}/command-center/bookings`);
    if (countryCode.trim()) {
      url.searchParams.set('countryCode', countryCode.trim());
    }
    const response = await apiFetch(url.toString(), { cache: 'no-store' });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(getLoadErrorMessage(payload));
    }
    setRows(unwrapBookings(payload));
    setError(null);
  }, [countryCode]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        await load();
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Load failed');
          setRows([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  const summary = useMemo(() => {
    const byStatus = rows.reduce<Record<string, number>>((acc, r) => {
      acc[r.bookingStatus] = (acc[r.bookingStatus] ?? 0) + 1;
      return acc;
    }, {});
    return { total: rows.length, byStatus };
  }, [rows]);

  const runBookingCommand = useCallback(
    async (bookingId: string, path: BookingCommandPath) => {
      setActionBusy({ bookingId, path });
      setError(null);
      try {
        const base = apiBase.replace(/\/$/, '');
        const url = `${base}/command-center/bookings/${encodeURIComponent(bookingId)}/${path}`;
        const response = await apiFetch(url, { method: 'POST', cache: 'no-store' });
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(getLoadErrorMessage(payload));
        }
        await load();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Command failed');
      } finally {
        setActionBusy(null);
      }
    },
    [load],
  );

  return (
    <section style={{ display: 'grid', gap: 24 }}>
      <header>
        <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800, color: '#1E3A5F' }}>Bookings</h1>
        <p style={{ color: '#6B7280', marginTop: 6, marginBottom: 0 }}>
          Operational read model from the API; row actions call existing command-center booking endpoints only (no local lifecycle edits).
        </p>
      </header>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', background: '#FFFFFF', border: '1px solid #E5EDF5', borderRadius: 16, padding: '14px 20px' }}>
        <label style={{ fontSize: 13, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 8 }}>
          Country
          <input
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value)}
            placeholder="e.g. QA (optional)"
            style={{ border: '1px solid #D1D5DB', borderRadius: 10, padding: '8px 12px', fontSize: 14, minWidth: 120 }}
          />
        </label>
        <button
          type="button"
          onClick={() => void load().catch((e) => setError(e instanceof Error ? e.message : 'Refresh failed'))}
          disabled={loading || actionBusy !== null}
          style={{
            padding: '8px 16px',
            borderRadius: 10,
            border: '1px solid #1E3A5F',
            background: '#1E3A5F',
            color: '#FFFFFF',
            fontWeight: 600,
            fontSize: 13,
            cursor: loading || actionBusy !== null ? 'wait' : 'pointer',
          }}
        >
          {loading ? 'Loading…' : 'Refresh'}
        </button>
        <span style={{ fontSize: 13, color: '#6B7280', marginLeft: 'auto' }}>
          {summary.total} booking{summary.total === 1 ? '' : 's'}
          {summary.total > 0 ? ` · ${Object.entries(summary.byStatus).map(([k, v]) => `${k}: ${v}`).join(' · ')}` : ''}
        </span>
      </div>

      {error && (
        <div style={{ padding: 14, borderRadius: 12, background: '#FEF2F2', color: '#991B1B', fontSize: 14 }} role="alert">
          {error}
        </div>
      )}

      <article style={{ background: '#FFFFFF', border: '1px solid #E5EDF5', borderRadius: 16, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E5EDF5' }}>
              {[
                'Booking',
                'Tenant',
                'Property',
                'Market',
                'Move-in',
                'Total',
                'Booking status',
                'Property status',
                'Payment',
                'Contract',
                'Occupancy',
                'Next action',
                'Blocker',
                'Actions',
              ].map((col) => (
                <th
                  key={col}
                  style={{
                    padding: '12px 14px',
                    textAlign: 'left',
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#6B7280',
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!loading && rows.length === 0 && !error && (
              <tr>
                <td colSpan={14} style={{ padding: 24, color: '#6B7280', fontSize: 14 }}>
                  No bookings returned for this filter.
                </td>
              </tr>
            )}
            {rows.map((b, i) => {
              const bs = BOOKING_BADGE[b.bookingStatus] ?? { bg: '#F3F4F6', color: '#374151' };
              const ps = PROPERTY_BADGE[b.property.status] ?? { bg: '#F3F4F6', color: '#374151' };
              const commands = bookingCommandsForStatus(b.bookingStatus);
              const rowBusy = actionBusy?.bookingId === b.id;
              return (
                <tr key={b.id} style={{ borderBottom: i < rows.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
                  <td style={{ padding: '14px', fontSize: 12, color: '#6B7280', fontFamily: 'monospace', verticalAlign: 'top' }}>{b.id}</td>
                  <td style={{ padding: '14px', fontSize: 14, fontWeight: 600, color: '#111827', verticalAlign: 'top' }}>{b.tenant.fullName}</td>
                  <td style={{ padding: '14px', fontSize: 13, color: '#4B5563', maxWidth: 200, verticalAlign: 'top' }}>{b.property.title}</td>
                  <td style={{ padding: '14px', fontSize: 12, color: '#6B7280', whiteSpace: 'nowrap', verticalAlign: 'top' }}>
                    {b.property.countryCode} / {b.property.city}
                  </td>
                  <td style={{ padding: '14px', fontSize: 12, color: '#6B7280', whiteSpace: 'nowrap', verticalAlign: 'top' }}>{formatDate(b.moveInDate)}</td>
                  <td style={{ padding: '14px', fontSize: 13, fontWeight: 700, color: '#1E3A5F', whiteSpace: 'nowrap', verticalAlign: 'top' }}>
                    {formatMoneyMinor(b.totalAmountMinor, b.currency)}
                  </td>
                  <td style={{ padding: '14px', verticalAlign: 'top' }}>
                    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: bs.bg, color: bs.color }}>{b.bookingStatus}</span>
                  </td>
                  <td style={{ padding: '14px', verticalAlign: 'top' }}>
                    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: ps.bg, color: ps.color }}>{b.property.status}</span>
                  </td>
                  <td style={{ padding: '14px', fontSize: 12, verticalAlign: 'top', color: b.paymentReadiness.settled ? '#065F46' : '#92400E', fontWeight: 600 }}>
                    {b.paymentReadiness.summary}
                  </td>
                  <td style={{ padding: '14px', fontSize: 12, verticalAlign: 'top', color: b.contractReadiness.ready ? '#065F46' : '#92400E', fontWeight: 600 }}>
                    {b.contractReadiness.ready ? 'READY' : 'NOT_READY'}
                  </td>
                  <td style={{ padding: '14px', fontSize: 12, color: '#4B5563', maxWidth: 200, verticalAlign: 'top' }} title={b.occupancyState.code}>
                    {b.occupancyState.label}
                  </td>
                  <td style={{ padding: '14px', fontSize: 12, color: '#374151', maxWidth: 280, verticalAlign: 'top' }}>{b.nextAction}</td>
                  <td style={{ padding: '14px', fontSize: 12, color: b.blockingReason ? '#991B1B' : '#9CA3AF', maxWidth: 260, verticalAlign: 'top' }}>
                    {b.blockingReason ?? '—'}
                  </td>
                  <td style={{ padding: '14px', verticalAlign: 'top' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {commands.map((cmd) => (
                        <button
                          key={cmd.path}
                          type="button"
                          disabled={rowBusy || loading}
                          onClick={() => void runBookingCommand(b.id, cmd.path)}
                          style={{
                            padding: '5px 10px',
                            borderRadius: 8,
                            border: '1px solid #D1D5DB',
                            background: '#FFFFFF',
                            color: '#1E3A5F',
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: rowBusy || loading ? 'wait' : 'pointer',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {rowBusy && actionBusy?.path === cmd.path ? '…' : cmd.label}
                        </button>
                      ))}
                      {commands.length === 0 ? <span style={{ fontSize: 12, color: '#9CA3AF' }}>—</span> : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </article>
    </section>
  );
}
