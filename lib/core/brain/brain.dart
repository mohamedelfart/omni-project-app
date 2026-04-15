// OmniRent Brain System - Level 1
// Centralized decision layer for Command Center
// DO NOT mutate state or perform orchestrator actions here

// enum BrainPriority duplicate removed
import '../models/models.dart';
import 'routing/routing_engine.dart';
import 'sla/sla_engine.dart';

enum BrainPriority { low, medium, high, critical }

class BrainAlert {
  final String code;
  final String message;
  const BrainAlert(this.code, this.message);
}

class BrainRecommendation {
  final String text;
  const BrainRecommendation(this.text);
}

class BrainOutput {
  final BrainPriority priority;
  final List<BrainAlert> alerts;
  final List<BrainRecommendation> recommendations;
  final RoutingResult? routing;
  final SLAEvaluationResult? sla;

  const BrainOutput({
    required this.priority,
    required this.alerts,
    required this.recommendations,
    this.routing,
    this.sla,
  });
}

extension ServiceRequestBrainHelpers on ServiceRequest {
  bool get isSoon {
    if (scheduledTime == null) return false;
    final now = DateTime.now();
    return scheduledTime!.isAfter(now) && scheduledTime!.isBefore(now.add(const Duration(hours: 2)));
  }

  bool get isStuck {
    // Example: stuck if pending for more than 24h
    return status.toLowerCase() == 'pending' && DateTime.now().difference(requestTime).inHours > 24;
  }

  bool get hasAssignment {
    // Example: vendorId or coordinatorId present
    return vendorId != null && vendorId!.isNotEmpty;
  }

  bool get isHighDemand {
    // Example: if serviceDetails contains 'highDemand': true
    return serviceDetails['highDemand'] == true;
  }
}

class Brain {
  // Entry point: evaluate a ServiceRequest and return BrainOutput
  static BrainOutput evaluateRequest(ServiceRequest request) {
    final List<BrainAlert> alerts = [];
    final List<BrainRecommendation> recs = [];
    BrainPriority priority = BrainPriority.low;

    // Priority rules
    if (request.serviceType.toLowerCase() == 'maintenance' && (request.serviceDetails['urgency'] == 'urgent')) {
      priority = BrainPriority.critical;
      alerts.add(const BrainAlert('urgent_maintenance', 'Urgent maintenance request'));
    } else if (request.serviceType.toLowerCase() == 'vendor' && request.status.toLowerCase() == 'delayed') {
      priority = BrainPriority.high;
      alerts.add(const BrainAlert('vendor_delay', 'Vendor is delayed'));
    } else if (request.serviceType.toLowerCase() == 'viewing' && request.status.toLowerCase() == 'confirmed' && request.isSoon) {
      priority = BrainPriority.high;
      alerts.add(const BrainAlert('viewing_soon', 'Confirmed viewing is soon'));
    } else if (request.serviceType.toLowerCase() == 'viewing' && request.status.toLowerCase() == 'new') {
      priority = BrainPriority.medium;
    }

    // Alert rules
    if (request.serviceType.toLowerCase() == 'vendor' && request.status.toLowerCase() == 'delayed') {
      alerts.add(const BrainAlert('vendor_delay', 'Vendor is delayed'));
    }
    if (request.isStuck) {
      alerts.add(const BrainAlert('request_stuck', 'Request is stuck'));
    }
    if (request.serviceType.toLowerCase() == 'viewing' && !request.hasAssignment) {
      alerts.add(const BrainAlert('no_assignment', 'Viewing has no assignment'));
    }
    if (request.isHighDemand) {
      alerts.add(const BrainAlert('high_demand', 'High demand detected'));
    }

    // Recommendations (simple placeholder)
    if (priority == BrainPriority.critical) {
      recs.add(const BrainRecommendation('Escalate to Command Center'));
    } else if (priority == BrainPriority.high) {
      recs.add(const BrainRecommendation('Monitor closely'));
    }

    // Routing evaluation (Level 2)
    final RoutingResult routing = RoutingEngine.evaluate(request);
    // SLA evaluation (Level 3)
    final SLAEvaluationResult sla = SLAEngine.evaluate(request);

    return BrainOutput(
      priority: priority,
      alerts: alerts,
      recommendations: recs,
      routing: routing,
      sla: sla,
    );
  }

  // Expose SLA evaluation directly if needed
  static SLAEvaluationResult evaluateSLA(ServiceRequest request) {
    return SLAEngine.evaluate(request);
  }

  // Expose routing evaluation directly if needed
  static RoutingResult evaluateRouting(ServiceRequest request) {
    return RoutingEngine.evaluate(request);
  }
}
