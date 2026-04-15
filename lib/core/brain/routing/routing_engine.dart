// OmniRent Brain System - Routing Engine (Level 2)
// Centralized, read-only routing logic for ServiceRequest
// DO NOT mutate canonical state here

import '../../models/models.dart';

/// Routing Target (team, vendor type, operator level, escalation, etc.)
class RoutingTarget {
  final String type; // e.g. 'team', 'vendor', 'operator', 'escalation'
  final String value; // e.g. 'leasing', 'maintenance', 'electrical', 'senior_operator'
  final String? label; // Human-readable label
  const RoutingTarget(this.type, this.value, {this.label});
}

/// Routing Reason (why this route was chosen)
class RoutingReason {
  final String code;
  final String description;
  const RoutingReason(this.code, this.description);
}

/// Routing Evaluation Result
class RoutingResult {
  final List<RoutingTarget> targets;
  final RoutingReason reason;
  final bool escalation;
  final RoutingTarget? escalationTarget;

  const RoutingResult({
    required this.targets,
    required this.reason,
    this.escalation = false,
    this.escalationTarget,
  });
}

/// Centralized Routing Engine
class RoutingEngine {
  static RoutingResult evaluate(ServiceRequest request) {
    // Example rules
    // 1. Viewing requests → leasing/viewing team
    if (request.serviceType.toLowerCase() == 'viewing') {
      return RoutingResult(
        targets: [RoutingTarget('team', 'leasing', label: 'Leasing/Viewing Team')],
        reason: RoutingReason('viewing_team', 'Viewing requests are routed to the leasing/viewing team'),
      );
    }
    // 2. Urgent maintenance → urgent maintenance path
    if (request.serviceType.toLowerCase() == 'maintenance' && request.serviceDetails['urgency'] == 'urgent') {
      return RoutingResult(
        targets: [RoutingTarget('team', 'urgent_maintenance', label: 'Urgent Maintenance Team')],
        reason: RoutingReason('urgent_maintenance', 'Urgent maintenance requests are routed to urgent maintenance team'),
        escalation: true,
        escalationTarget: RoutingTarget('operator', 'senior_operator', label: 'Senior Operator'),
      );
    }
    // 3. Electrical issue → electrical vendor type
    if (request.serviceType.toLowerCase() == 'maintenance' && request.serviceDetails['issueType'] == 'electrical') {
      return RoutingResult(
        targets: [RoutingTarget('vendor', 'electrical', label: 'Electrical Vendor')],
        reason: RoutingReason('electrical_issue', 'Electrical issues are routed to electrical vendors'),
      );
    }
    // 4. Vendor-delayed request → escalation/supervisor path
    if (request.serviceType.toLowerCase() == 'vendor' && request.status.toLowerCase() == 'delayed') {
      return RoutingResult(
        targets: [RoutingTarget('operator', 'supervisor', label: 'Supervisor')],
        reason: RoutingReason('vendor_delayed', 'Vendor-delayed requests are escalated to supervisor'),
        escalation: true,
        escalationTarget: RoutingTarget('operator', 'supervisor', label: 'Supervisor'),
      );
    }
    // 5. High-priority request → senior operator review
    if (request.serviceDetails['priority'] == 'high') {
      return RoutingResult(
        targets: [RoutingTarget('operator', 'senior_operator', label: 'Senior Operator')],
        reason: RoutingReason('high_priority', 'High-priority requests are routed to senior operator'),
      );
    }
    // 6. Location-sensitive request → route by service area
    if (request.location.city != null && request.location.city!.isNotEmpty) {
      return RoutingResult(
        targets: [RoutingTarget('team', request.location.city!.toLowerCase(), label: '${request.location.city} Team')],
        reason: RoutingReason('location_sensitive', 'Requests are routed by service area/city'),
      );
    }
    // Default: General operator
    return RoutingResult(
      targets: [RoutingTarget('operator', 'general', label: 'General Operator')],
      reason: RoutingReason('default', 'Default routing to general operator'),
    );
  }
}
