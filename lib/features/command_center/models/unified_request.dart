class UnifiedRequest {
  final String id;
  final String tenant;
  final String property;
  final String type; // viewing / maintenance / cleaning / moving / booking / payment
  final String status;
  final String assignedVendor;
  final List<RequestTimelineEvent> timeline;
  final double cost;
  final String feedback;

  const UnifiedRequest({
    required this.id,
    required this.tenant,
    required this.property,
    required this.type,
    required this.status,
    required this.assignedVendor,
    required this.timeline,
    required this.cost,
    required this.feedback,
  });
}

class RequestTimelineEvent {
  final String label;
  final DateTime timestamp;
  const RequestTimelineEvent({required this.label, required this.timestamp});
}
