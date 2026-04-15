// UnifiedOperationalItem: Safe transitional view model for Command Center
// Represents either a ServiceTicket (preferred) or a ServiceRequest (fallback)

import '../../../core/models/models.dart';

class UnifiedOperationalItem {
  final ServiceTicket? ticket;
  final ServiceRequest request;

  UnifiedOperationalItem({
    this.ticket,
    required this.request,
  });

  // Prefer ticket fields if available, else fallback to request
  String get id => ticket?.ticketId ?? request.id;
  String get status => ticket?.status ?? request.status;
  String get assignedTo => ticket?.assignedTo ?? '';
  String get assignedTeam => ticket?.assignedTeam ?? '';
  DateTime get createdAt => ticket?.createdAt ?? request.createdAt;
  DateTime get updatedAt => ticket?.updatedAt ?? request.createdAt;
  String get serviceType => request.serviceType;
  // Add more unified fields as needed

  bool get isTicketed => ticket != null;
}
