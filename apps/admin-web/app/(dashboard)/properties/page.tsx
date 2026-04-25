'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../../lib/auth';

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1';

type PropertyStatus = 'DRAFT' | 'PUBLISHED' | 'RESERVED' | 'BOOKED' | 'OCCUPIED' | 'INACTIVE';

type CommandPropertyRow = {
  id: string;
  title: string;
  city: string;
  district: string | null;
  countryCode: string;
  status: PropertyStatus;
  propertyType: string;
  slug: string;
  createdAt: string;
};

const STATUS_BADGE: Record<PropertyStatus, { bg: string; color: string }> = {
  DRAFT: { bg: '#F3F4F6', color: '#374151' },
  PUBLISHED: { bg: '#D1FAE5', color: '#065F46' },
  RESERVED: { bg: '#FEF3C7', color: '#92400E' },
  BOOKED: { bg: '#DBEAFE', color: '#1E40AF' },
  OCCUPIED: { bg: '#BFDBFE', color: '#1E3A8A' },
  INACTIVE: { bg: '#E5E7EB', color: '#4B5563' },
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

function unwrapList(payload: unknown): CommandPropertyRow[] {
  if (Array.isArray(payload)) {
    return payload.filter((r): r is CommandPropertyRow => !!r && typeof r === 'object' && typeof (r as CommandPropertyRow).id === 'string');
  }
  if (payload && typeof payload === 'object' && 'data' in payload) {
    const inner = (payload as { data: unknown }).data;
    if (Array.isArray(inner)) return unwrapList(inner);
  }
  return [];
}

function locationLine(row: CommandPropertyRow): string {
  const parts = [row.district?.trim(), row.city?.trim()].filter((p): p is string => !!p && p.length > 0);
  return parts.length > 0 ? parts.join(' · ') : row.city || '—';
}

function tenantCatalogLabel(status: string): string {
  return status === 'PUBLISHED' ? 'Listed in tenant catalog' : 'Hidden from tenant catalog';
}

export default function PropertiesPage() {
  const [rows, setRows] = useState<CommandPropertyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [countryCode, setCountryCode] = useState<string>('');
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const base = apiBase.replace(/\/$/, '');
    const url = new URL(`${base}/command-center/properties`);
    if (countryCode.trim()) {
      url.searchParams.set('countryCode', countryCode.trim());
    }
    const response = await apiFetch(url.toString(), { cache: 'no-store' });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(getLoadErrorMessage(payload));
    }
    setRows(unwrapList(payload));
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
          setError(e instanceof Error ? e.message : 'Failed to load properties');
          setRows([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  const runCommand = async (propertyId: string, path: 'reserve' | 'release') => {
    setActionBusyId(propertyId);
    setError(null);
    try {
      const base = apiBase.replace(/\/$/, '');
      const response = await apiFetch(`${base}/command-center/properties/${encodeURIComponent(propertyId)}/${path}`, {
        method: 'POST',
        cache: 'no-store',
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(getLoadErrorMessage(payload));
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Command failed');
    } finally {
      setActionBusyId(null);
    }
  };

  return (
    <section style={{ display: 'grid', gap: 20 }}>
      <header>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#1E3A5F' }}>Property command</h1>
        <p style={{ color: '#64748B', marginTop: 6, marginBottom: 0, fontSize: 14 }}>
          Live inventory from the API. Status values are Prisma <code style={{ fontSize: 13 }}>PropertyStatus</code>. Tenant discovery lists{' '}
          <strong>PUBLISHED</strong> only.
        </p>
      </header>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        <span style={{ fontSize: 13, color: '#64748B' }}>Country</span>
        {['', 'QA', 'AE', 'SA'].map((c) => (
          <button
            key={c || 'all'}
            type="button"
            onClick={() => setCountryCode(c)}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: '1px solid #E2E8F0',
              background: (c || '') === countryCode ? '#1E3A5F' : '#FFFFFF',
              color: (c || '') === countryCode ? '#FFFFFF' : '#334155',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            {c === '' ? 'All' : c}
          </button>
        ))}
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          style={{
            marginLeft: 'auto',
            padding: '8px 14px',
            borderRadius: 8,
            border: '1px solid #CBD5E1',
            background: '#F8FAFC',
            fontWeight: 600,
            fontSize: 13,
            cursor: loading ? 'wait' : 'pointer',
          }}
        >
          Refresh
        </button>
      </div>

      {error ? (
        <article style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: 12, color: '#991B1B', fontSize: 14 }}>
          {error}
        </article>
      ) : null}

      {loading ? <p style={{ color: '#64748B' }}>Loading…</p> : null}

      {!loading && rows.length === 0 && !error ? (
        <p style={{ color: '#64748B' }}>No properties returned for this filter.</p>
      ) : null}

      {!loading && rows.length > 0 ? (
        <div style={{ display: 'grid', gap: 12 }}>
          {rows.map((row) => {
            const badge = STATUS_BADGE[row.status] ?? STATUS_BADGE.INACTIVE;
            const busy = actionBusyId === row.id;
            const canReserve = row.status === 'PUBLISHED';
            const canRelease = row.status === 'RESERVED';
            return (
              <article
                key={row.id}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E5EDF5',
                  borderRadius: 12,
                  padding: 16,
                  display: 'grid',
                  gap: 10,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'ui-monospace, monospace', marginBottom: 4 }}>{row.id}</div>
                    <div style={{ fontWeight: 700, color: '#0F172A', fontSize: 16 }}>{row.title}</div>
                    <div style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>
                      {locationLine(row)} · {row.countryCode} · {row.propertyType}
                    </div>
                  </div>
                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 700,
                      background: badge.bg,
                      color: badge.color,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {row.status}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: '#64748B' }}>
                  <strong style={{ color: '#334155' }}>Tenant catalog:</strong> {tenantCatalogLabel(row.status)}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                  {canReserve ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void runCommand(row.id, 'reserve')}
                      style={{
                        padding: '8px 14px',
                        borderRadius: 8,
                        border: 'none',
                        background: '#B45309',
                        color: '#FFFFFF',
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: busy ? 'wait' : 'pointer',
                        opacity: busy ? 0.7 : 1,
                      }}
                    >
                      Reserve
                    </button>
                  ) : null}
                  {canRelease ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void runCommand(row.id, 'release')}
                      style={{
                        padding: '8px 14px',
                        borderRadius: 8,
                        border: '1px solid #15803D',
                        background: '#FFFFFF',
                        color: '#15803D',
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: busy ? 'wait' : 'pointer',
                        opacity: busy ? 0.7 : 1,
                      }}
                    >
                      Release
                    </button>
                  ) : null}
                  {busy ? <span style={{ fontSize: 12, color: '#64748B', fontStyle: 'italic' }}>Working…</span> : null}
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
