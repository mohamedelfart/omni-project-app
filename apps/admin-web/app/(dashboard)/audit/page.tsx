const auditLogs = [
  { id: 'LOG-00841', action: 'UNIFIED_REQUEST_ROUTED', entity: 'UnifiedRequest', entityId: 'REQ-20483', actor: 'system', severity: 'INFO', country: 'AE', timestamp: '2026-04-04 10:22:41', meta: 'Routed to Gulf Maintenance Lab via orchestrator' },
  { id: 'LOG-00840', action: 'COMMAND_INSTRUCTION_DISPATCHED', entity: 'UnifiedRequest', entityId: 'REQ-20441', actor: 'admin@quickrent.io', severity: 'WARNING', country: 'QA', timestamp: '2026-04-04 09:48:12', meta: 'Override: status → UNDER_REVIEW' },
  { id: 'LOG-00839', action: 'TENANT_PERK_TRIGGERED', entity: 'Notification', entityId: 'perk-move-in-gift', actor: 'system', severity: 'INFO', country: 'QA', timestamp: '2026-04-04 09:15:00', meta: 'Hotel perk triggered on MOVE_IN_COMPLETE for USR-005' },
  { id: 'LOG-00838', action: 'FREE_SERVICE_COST_SPLIT_RECORDED', entity: 'UnifiedRequest', entityId: 'REQ-20390', actor: 'system', severity: 'INFO', country: 'SA', timestamp: '2026-04-04 08:44:30', meta: 'Free cap: 75,000. Covered: 60,000. Tenant owes: 15,000' },
  { id: 'LOG-00837', action: 'USER_LOGIN', entity: 'User', entityId: 'USR-001', actor: 'Mohamed Al-Rashdi', severity: 'INFO', country: 'QA', timestamp: '2026-04-04 08:30:17', meta: 'Login from IP 10.0.2.8 — mobile app' },
  { id: 'LOG-00836', action: 'COUNTRY_CONFIG_UPDATED', entity: 'CountryConfig', entityId: 'SA', actor: 'admin@quickrent.io', severity: 'WARNING', country: 'SA', timestamp: '2026-04-03 18:00:00', meta: 'freeMoveInCapMinor updated: 50000 → 75000' },
  { id: 'LOG-00835', action: 'PAYMENT_SETTLED', entity: 'Payment', entityId: 'PAY-10241', actor: 'system', severity: 'INFO', country: 'QA', timestamp: '2026-04-03 16:22:00', meta: 'Rent payment 8,500 QAR confirmed via card gateway' },
  { id: 'LOG-00834', action: 'VENDOR_STATUS_CHANGED', entity: 'Provider', entityId: 'VND-004', actor: 'system', severity: 'WARNING', country: 'QA', timestamp: '2026-04-03 15:00:00', meta: 'Doha Transfers Inc. went OFFLINE during active ticket' },
  { id: 'LOG-00833', action: 'ADMIN_MANUAL_PERK_SENT', entity: 'User', entityId: 'USR-007', actor: 'cmd@quickrent.io', severity: 'INFO', country: 'EG', timestamp: '2026-04-03 13:45:00', meta: 'Manual perk: "1-Year Appreciation" — 1000 pts' },
  { id: 'LOG-00832', action: 'UNIFIED_REQUEST_INTEGRATION_ROUTED', entity: 'UnifiedRequest', entityId: 'REQ-20360', actor: 'system', severity: 'INFO', country: 'AE', timestamp: '2026-04-03 12:30:00', meta: 'Adapter selected: UAE-Transport-Adapter v2' },
];

const severityConfig: Record<string, { bg: string; color: string }> = {
  INFO: { bg: '#EFF6FF', color: '#1D4ED8' },
  WARNING: { bg: '#FEF3C7', color: '#92400E' },
  ERROR: { bg: '#FEE2E2', color: '#991B1B' },
  CRITICAL: { bg: '#FEF2F2', color: '#7F1D1D' },
};

const actionColors: Record<string, string> = {
  UNIFIED_REQUEST_ROUTED: '#7C3AED',
  COMMAND_INSTRUCTION_DISPATCHED: '#EF4444',
  TENANT_PERK_TRIGGERED: '#10B981',
  FREE_SERVICE_COST_SPLIT_RECORDED: '#F97316',
  USER_LOGIN: '#3B82F6',
  COUNTRY_CONFIG_UPDATED: '#F59E0B',
  PAYMENT_SETTLED: '#059669',
  VENDOR_STATUS_CHANGED: '#DC2626',
  ADMIN_MANUAL_PERK_SENT: '#8B5CF6',
  UNIFIED_REQUEST_INTEGRATION_ROUTED: '#0EA5E9',
};

const stats = [
  { label: 'Total Log Entries', value: '841,204', sub: 'Immutable audit trail' },
  { label: 'Today', value: '1,429', sub: 'Entries logged', accent: '#3B82F6' },
  { label: 'Warnings', value: '34', sub: 'This week', accent: '#F59E0B' },
  { label: 'Errors / Critical', value: '2', sub: 'This week', accent: '#EF4444' },
];

export default function AuditPage() {
  return (
    <section style={{ display: 'grid', gap: 24 }}>
      <header>
        <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800, color: '#1E3A5F' }}>Audit Trail</h1>
        <p style={{ color: '#6B7280', marginTop: 6, marginBottom: 0 }}>
          Immutable log of every action, change, login, transaction, and assignment across the entire platform.
        </p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {stats.map((s) => (
          <article key={s.label} style={{ background: '#FFFFFF', border: '1px solid #E5EDF5', borderRadius: 16, padding: '18px 20px' }}>
            <div style={{ color: '#6B7280', fontSize: 13 }}>{s.label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: s.accent ?? '#1E3A5F', margin: '6px 0 2px' }}>{s.value}</div>
            <div style={{ fontSize: 12, color: '#9CA3AF' }}>{s.sub}</div>
          </article>
        ))}
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', background: '#FFFFFF', border: '1px solid #E5EDF5', borderRadius: 16, padding: '14px 20px', flexWrap: 'wrap' }}>
        <input readOnly placeholder="Search action, entity, actor…" style={{ flex: 1, minWidth: 200, border: '1px solid #D1D5DB', borderRadius: 10, padding: '10px 14px', fontSize: 14, background: '#F9FAFB' }} />
        {['All', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'].map((sev) => (
          <button key={sev} style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid #D1D5DB', background: sev === 'All' ? '#1E3A5F' : '#FFFFFF', color: sev === 'All' ? '#FFFFFF' : '#374151', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>{sev}</button>
        ))}
        <button style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid #D1D5DB', background: '#FFFFFF', color: '#374151', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>Export CSV</button>
      </div>

      {/* Log table */}
      <article style={{ background: '#FFFFFF', border: '1px solid #E5EDF5', borderRadius: 16, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E5EDF5' }}>
              {['Log ID', 'Timestamp', 'Action', 'Entity', 'Actor', 'Country', 'Severity', 'Details'].map((col) => (
                <th key={col} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {auditLogs.map((log, i) => (
              <tr key={log.id} style={{ borderBottom: i < auditLogs.length - 1 ? '1px solid #F3F4F6' : 'none', background: i % 2 === 0 ? '#FFFFFF' : '#FAFAFA' }}>
                <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontSize: 11, color: '#9CA3AF' }}>{log.id}</td>
                <td style={{ padding: '12px 14px', fontSize: 12, color: '#6B7280', whiteSpace: 'nowrap' }}>{log.timestamp}</td>
                <td style={{ padding: '12px 14px' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: actionColors[log.action] ?? '#374151', background: `${actionColors[log.action] ?? '#374151'}15`, padding: '2px 8px', borderRadius: 6 }}>
                    {log.action}
                  </span>
                </td>
                <td style={{ padding: '12px 14px' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{log.entity}</div>
                  <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#9CA3AF' }}>{log.entityId}</div>
                </td>
                <td style={{ padding: '12px 14px', fontSize: 12, color: '#4B5563', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.actor}</td>
                <td style={{ padding: '12px 14px', fontSize: 12, fontWeight: 700, color: '#1E3A5F' }}>{log.country}</td>
                <td style={{ padding: '12px 14px' }}>
                  <span style={{
                    padding: '3px 8px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                    background: (severityConfig[log.severity] ?? { bg: '#F3F4F6' }).bg,
                    color: (severityConfig[log.severity] ?? { color: '#374151' }).color,
                  }}>{log.severity}</span>
                </td>
                <td style={{ padding: '12px 14px', fontSize: 12, color: '#6B7280', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.meta}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderTop: '1px solid #F3F4F6' }}>
          <span style={{ fontSize: 13, color: '#6B7280' }}>Showing 10 of 841,204 log entries</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {['← Prev', '1', '2', '3', '...', '84,121', 'Next →'].map((p) => (
              <button key={p} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #E5E7EB', background: p === '1' ? '#1E3A5F' : '#FFFFFF', color: p === '1' ? '#FFFFFF' : '#374151', fontSize: 12, cursor: 'pointer' }}>{p}</button>
            ))}
          </div>
        </div>
      </article>
    </section>
  );
}
