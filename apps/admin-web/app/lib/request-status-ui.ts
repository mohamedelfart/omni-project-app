/** Admin read-model: unified request lifecycle as shown on dashboard / tenant preview. */
export type DashboardRequestStatus = 'pending' | 'assigned' | 'in_progress' | 'completed' | 'unknown';

/**
 * Maps upstream `UnifiedRequest.status` (Prisma enum strings, etc.) to dashboard UI tokens.
 * Safe for uppercase enums from JSON (e.g. `COMPLETED`).
 */
export function normalizeDashboardRequestStatus(value: unknown): DashboardRequestStatus {
  if (typeof value !== 'string') {
    if (process.env.NODE_ENV === 'development' && value !== undefined && value !== null) {
      console.warn('[admin-dashboard] normalizeDashboardRequestStatus: expected string status', { value });
    }
    return 'unknown';
  }

  const trimmed = value.trim();
  if (!trimmed) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[admin-dashboard] normalizeDashboardRequestStatus: empty status');
    }
    return 'unknown';
  }

  const key = trimmed.toLowerCase();

  if (key === 'pending' || key === 'assigned' || key === 'in_progress' || key === 'completed') {
    return key;
  }

  // UnifiedRequestStatus aliases / lifecycle expansions mapped to dashboard operational buckets.
  if (key === 'draft' || key === 'submitted' || key === 'under_review' || key === 'queued') return 'pending';
  if (key === 'en_route' || key === 'awaiting_payment' || key === 'escalated') return 'in_progress';
  if (key === 'cancelled' || key === 'rejected' || key === 'failed') return 'completed';

  if (process.env.NODE_ENV === 'development') {
    console.warn('[admin-dashboard] normalizeDashboardRequestStatus: unrecognized status', { raw: trimmed });
  }
  return 'unknown';
}
