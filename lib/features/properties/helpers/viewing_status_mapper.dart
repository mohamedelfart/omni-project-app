import 'package:flutter/material.dart';

import '../../../core/models/models.dart';

enum TenantFacingStatus {
  requestSubmitted,
  assignmentInProgress,
  coordinatorOnTheWay,
  viewingConfirmed,
  viewingCompleted,
  decisionPending,
  unitReserved,
  unitReleased,
}

TenantFacingStatus mapInternalToTenantStatus(ViewingRequestStatus internal) {
  switch (internal) {
    case ViewingRequestStatus.requestSubmitted:
      return TenantFacingStatus.requestSubmitted;
    case ViewingRequestStatus.coordinatorAssigned:
    case ViewingRequestStatus.vendorRejected:
      return TenantFacingStatus.assignmentInProgress;
    case ViewingRequestStatus.vendorConfirmed:
      return TenantFacingStatus.coordinatorOnTheWay;
    case ViewingRequestStatus.viewingScheduled:
      return TenantFacingStatus.viewingConfirmed;
    case ViewingRequestStatus.viewingCompleted:
      return TenantFacingStatus.viewingCompleted;
    case ViewingRequestStatus.tenantDecisionPending:
      return TenantFacingStatus.decisionPending;
    case ViewingRequestStatus.unitReserved:
      return TenantFacingStatus.unitReserved;
    case ViewingRequestStatus.unitReleased:
      return TenantFacingStatus.unitReleased;
  }
}

TenantFacingStatus? mapPropertyViewingStateToTenantStatus(
  PropertyViewingState state,
) {
  switch (state) {
    case PropertyViewingState.available:
      return null;
    case PropertyViewingState.underViewing:
      return TenantFacingStatus.assignmentInProgress;
    case PropertyViewingState.reserved:
      return TenantFacingStatus.unitReserved;
  }
}

String tenantFacingStatusLabel(TenantFacingStatus status, {required bool ar}) {
  switch (status) {
    case TenantFacingStatus.requestSubmitted:
      return ar ? 'تم تقديم الطلب' : 'Request Submitted';
    case TenantFacingStatus.assignmentInProgress:
      return ar ? 'جاري تعيين المنسق' : 'Assignment in Progress';
    case TenantFacingStatus.coordinatorOnTheWay:
      return ar ? 'المنسق في الطريق' : 'Coordinator on the Way';
    case TenantFacingStatus.viewingConfirmed:
      return ar ? 'تم تأكيد المعاينة' : 'Viewing Confirmed';
    case TenantFacingStatus.viewingCompleted:
      return ar ? 'اكتملت المعاينة' : 'Viewing Completed';
    case TenantFacingStatus.decisionPending:
      return ar ? 'بانتظار القرار' : 'Decision Pending';
    case TenantFacingStatus.unitReserved:
      return ar ? 'تم حجز الوحدة' : 'Unit Reserved';
    case TenantFacingStatus.unitReleased:
      return ar ? 'تم إلغاء الحجز' : 'Unit Released';
  }
}

Color tenantFacingStatusColor(TenantFacingStatus status) {
  switch (status) {
    case TenantFacingStatus.requestSubmitted:
      return const Color(0xFF475569);
    case TenantFacingStatus.assignmentInProgress:
      return const Color(0xFFD97706);
    case TenantFacingStatus.coordinatorOnTheWay:
      return const Color(0xFF0EA5E9);
    case TenantFacingStatus.viewingConfirmed:
      return const Color(0xFF2563EB);
    case TenantFacingStatus.viewingCompleted:
      return const Color(0xFF16A34A);
    case TenantFacingStatus.decisionPending:
      return const Color(0xFF7C3AED);
    case TenantFacingStatus.unitReserved:
      return const Color(0xFF1D4ED8);
    case TenantFacingStatus.unitReleased:
      return const Color(0xFFEF4444);
  }
}

IconData tenantFacingStatusIcon(TenantFacingStatus status) {
  switch (status) {
    case TenantFacingStatus.requestSubmitted:
      return Icons.note_add_outlined;
    case TenantFacingStatus.assignmentInProgress:
      return Icons.sync_rounded;
    case TenantFacingStatus.coordinatorOnTheWay:
      return Icons.directions_walk_outlined;
    case TenantFacingStatus.viewingConfirmed:
      return Icons.event_available_outlined;
    case TenantFacingStatus.viewingCompleted:
      return Icons.task_alt_rounded;
    case TenantFacingStatus.decisionPending:
      return Icons.hourglass_top_rounded;
    case TenantFacingStatus.unitReserved:
      return Icons.lock_rounded;
    case TenantFacingStatus.unitReleased:
      return Icons.lock_open_rounded;
  }
}
