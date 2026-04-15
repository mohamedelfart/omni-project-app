// OmniRent ServiceTicket Model (Ticket Architecture Phase 1)
// Additive wrapper for ServiceRequest, ready for ticket-driven orchestration

import 'models.dart';

class ServiceTicket {
  final String ticketId;
  final ServiceRequest request;
  String status; // open, in_progress, closed, escalated, etc.
  String? assignedTo;
  String? assignedTeam;
  DateTime? assignedAt;
  final DateTime createdAt;
  DateTime updatedAt;
  int escalationLevel;
  String? escalationReason;
  List<String> previousAssignees;
  List<TicketHandoff> handoffHistory;
  String createdBy;
  String? updatedBy;

  ServiceTicket({
    required this.ticketId,
    required this.request,
    this.status = 'open',
    this.assignedTo,
    this.assignedTeam,
    this.assignedAt,
    DateTime? createdAt,
    DateTime? updatedAt,
    this.escalationLevel = 0,
    this.escalationReason,
    List<String>? previousAssignees,
    List<TicketHandoff>? handoffHistory,
    required this.createdBy,
    this.updatedBy,
  })  : createdAt = createdAt ?? DateTime.now(),
        updatedAt = updatedAt ?? DateTime.now(),
        previousAssignees = previousAssignees ?? <String>[],
        handoffHistory = handoffHistory ?? <TicketHandoff>[];
}

class TicketHandoff {
  final String from;
  final String to;
  final DateTime at;
  final String? reason;
  const TicketHandoff({required this.from, required this.to, required this.at, this.reason});
}
