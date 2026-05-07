import { UnifiedRequestStatus } from '@prisma/client';
import type { RequestStatus } from './dto/unified-request.dto';

/**
 * MVP operational read model: collapse Prisma `UnifiedRequestStatus` to the four
 * values used by dashboard/realtime and tenant UI. Storage remains full enum.
 */
export function toOperationalReadModelStatus(status: UnifiedRequestStatus): RequestStatus {
  switch (status) {
    case UnifiedRequestStatus.ASSIGNED:
      return 'assigned';
    case UnifiedRequestStatus.EN_ROUTE:
    case UnifiedRequestStatus.IN_PROGRESS:
      return 'in_progress';
    case UnifiedRequestStatus.COMPLETED:
      return 'completed';
    default:
      return 'pending';
  }
}

/** Full unified-request row (or subset) with JSON-safe operational `status`. */
export function withOperationalStatusReadModel<T extends { status: UnifiedRequestStatus }>(
  row: T,
): Omit<T, 'status'> & { status: RequestStatus } {
  return { ...row, status: toOperationalReadModelStatus(row.status) };
}
