// OmniRent Brain System - SLA Engine (Level 3)
// Centralized, read-only SLA evaluation for ServiceRequest
// DO NOT mutate canonical state here

import '../../models/models.dart';

/// SLA Status
enum SLAStatus { onTrack, atRisk, breached }

/// Breach Risk Level
enum BreachRiskLevel { none, low, medium, high, critical }

/// SLA Evaluation Result
class SLAEvaluationResult {
  final SLAStatus status;
  final BreachRiskLevel riskLevel;
  final Duration? slaTarget;
  final Duration elapsed;
  final Duration? timeRemaining;
  final bool breached;
  final bool escalationRecommended;
  final bool urgencyUpgradeSuggested;
  final String? reason;

  const SLAEvaluationResult({
    required this.status,
    required this.riskLevel,
    this.slaTarget,
    required this.elapsed,
    this.timeRemaining,
    required this.breached,
    required this.escalationRecommended,
    required this.urgencyUpgradeSuggested,
    this.reason,
  });
}

/// Centralized SLA Engine
class SLAEngine {
  static SLAEvaluationResult evaluate(ServiceRequest request) {
    final now = DateTime.now();
    final elapsed = now.difference(request.requestTime);
    Duration? slaTarget;
    BreachRiskLevel riskLevel = BreachRiskLevel.none;
    bool breached = false;
    bool escalationRecommended = false;
    bool urgencyUpgradeSuggested = false;
    String? reason;

    // Example config-driven SLA thresholds (could be loaded from config in future)
    if (request.serviceType.toLowerCase() == 'viewing') {
      slaTarget = const Duration(hours: 4); // e.g. must review within 4h
      if (elapsed > slaTarget) {
        breached = true;
        riskLevel = BreachRiskLevel.critical;
        escalationRecommended = true;
        reason = 'Viewing request not reviewed within SLA threshold';
      } else if (slaTarget - elapsed < const Duration(minutes: 30)) {
        riskLevel = BreachRiskLevel.high;
        reason = 'Viewing request close to SLA breach';
      } else {
        riskLevel = BreachRiskLevel.low;
      }
    } else if (request.serviceType.toLowerCase() == 'maintenance' && request.serviceDetails['urgency'] == 'urgent') {
      slaTarget = const Duration(hours: 1); // urgent maintenance tighter SLA
      if (elapsed > slaTarget) {
        breached = true;
        riskLevel = BreachRiskLevel.critical;
        escalationRecommended = true;
        urgencyUpgradeSuggested = true;
        reason = 'Urgent maintenance breached SLA';
      } else if (slaTarget - elapsed < const Duration(minutes: 10)) {
        riskLevel = BreachRiskLevel.high;
        reason = 'Urgent maintenance close to SLA breach';
      } else {
        riskLevel = BreachRiskLevel.medium;
      }
    } else if (request.serviceType.toLowerCase() == 'vendor' && request.status.toLowerCase() == 'delayed') {
      slaTarget = const Duration(hours: 2);
      if (elapsed > slaTarget) {
        breached = true;
        riskLevel = BreachRiskLevel.high;
        escalationRecommended = true;
        reason = 'Vendor-delayed request breached SLA';
      } else {
        riskLevel = BreachRiskLevel.medium;
      }
    } else {
      slaTarget = const Duration(hours: 8); // default SLA
      if (elapsed > slaTarget) {
        breached = true;
        riskLevel = BreachRiskLevel.medium;
        reason = 'Request breached default SLA';
      } else {
        riskLevel = BreachRiskLevel.low;
      }
    }

    final timeRemaining = (slaTarget - elapsed);
    final status = breached
        ? SLAStatus.breached
        : (riskLevel.index >= BreachRiskLevel.high.index ? SLAStatus.atRisk : SLAStatus.onTrack);

    return SLAEvaluationResult(
      status: status,
      riskLevel: riskLevel,
      slaTarget: slaTarget,
      elapsed: elapsed,
      timeRemaining: timeRemaining,
      breached: breached,
      escalationRecommended: escalationRecommended,
      urgencyUpgradeSuggested: urgencyUpgradeSuggested,
      reason: reason,
    );
  }
}
