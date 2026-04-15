// TicketAction model (MVP)
// Centralized, lean mutation log for ServiceTicket

class TicketAction {
  final String id;
  final String ticketId;
  final String actionType; // assignment, escalation, priority_change, etc.
  final String sourceType; // command_center, system
  final String reasonCode;
  final Map<String, dynamic> payload;
  final String decisionStatus; // approved / rejected
  final String executionStatus; // executed / failed
  final Map<String, dynamic>? stateBefore;
  final Map<String, dynamic>? stateAfter;
  final DateTime createdAt;

  TicketAction({
    required this.id,
    required this.ticketId,
    required this.actionType,
    required this.sourceType,
    required this.reasonCode,
    required this.payload,
    required this.decisionStatus,
    required this.executionStatus,
    this.stateBefore,
    this.stateAfter,
    DateTime? createdAt,
  }) : createdAt = createdAt ?? DateTime.now();
}

// Request DTO for ServiceManager
class TicketActionRequest {
  final String ticketId;
  final String actionType;
  final String sourceType;
  final String reasonCode;
  final Map<String, dynamic> payload;

  TicketActionRequest({
    required this.ticketId,
    required this.actionType,
    required this.sourceType,
    required this.reasonCode,
    required this.payload,
  });
}
