// OmniRent Distribution Engine (Phase 2 MVP)
// Centralized, ticket-driven assignment/distribution logic

import '../models/service_ticket.dart';

class DistributionResult {
  final String? assignedTo;
  final String? assignedTeam;
  final String? assignedVendor;
  final String? adapterRoute;
  final bool escalated;
  final bool fallback;
  final DateTime distributedAt;
  final String? auditNote;

  DistributionResult({
    this.assignedTo,
    this.assignedTeam,
    this.assignedVendor,
    this.adapterRoute,
    this.escalated = false,
    this.fallback = false,
    DateTime? distributedAt,
    this.auditNote,
  }) : distributedAt = distributedAt ?? DateTime.now();
}

class DistributionEngine {
  // Main distribution method
  static DistributionResult distribute(ServiceTicket ticket) {
    // MVP: Minimal assignment logic (can be replaced with advanced logic later)
    // Example: Assign to default team based on service type
    String? assignedTeam;
    String? assignedTo;
    String? assignedVendor;
    String? adapterRoute;
    bool escalated = false;
    bool fallback = false;
    String? auditNote;

    // Example logic: assign to team based on service type
    switch (ticket.request.serviceType) {
      case 'PROPERTIES':
        assignedTeam = 'PropertyOps';
        assignedTo = 'property_manager_1';
        assignedVendor = 'default_property_vendor';
        adapterRoute = 'property_adapter';
        auditNote = 'Assigned by DistributionEngine MVP';
        break;
      case 'RIDES':
        assignedTeam = 'RideOps';
        assignedTo = 'ride_manager_1';
        assignedVendor = 'default_ride_vendor';
        adapterRoute = 'ride_adapter';
        auditNote = 'Assigned by DistributionEngine MVP';
        break;
      default:
        // Fallback logic
        fallback = true;
        auditNote = 'No assignment possible; fallback triggered.';
        break;
    }

    // Escalation hook (MVP: escalate if fallback)
    if (fallback) {
      escalated = true;
    }

    return DistributionResult(
      assignedTo: assignedTo,
      assignedTeam: assignedTeam,
      assignedVendor: assignedVendor,
      adapterRoute: adapterRoute,
      escalated: escalated,
      fallback: fallback,
      auditNote: auditNote,
    );
  }
}
