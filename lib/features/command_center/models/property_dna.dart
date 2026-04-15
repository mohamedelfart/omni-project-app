import 'unified_request.dart';

class PropertyDNA {
  final String propertyName;
  final List<UnifiedRequest> requests;
  final List<String> maintenanceRecords;
  final List<double> pricingHistory;
  final List<String> bookings;
  final List<String> feedbacks;

  const PropertyDNA({
    required this.propertyName,
    required this.requests,
    required this.maintenanceRecords,
    required this.pricingHistory,
    required this.bookings,
    required this.feedbacks,
  });
}
