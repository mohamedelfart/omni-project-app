import 'models/unified_request.dart';
import 'models/property_dna.dart';

final List<UnifiedRequest> mockUnifiedRequests = [
  UnifiedRequest(
    id: 'REQ-001',
    tenant: 'Ali Hassan',
    property: 'Pearl Tower 2',
    type: 'viewing',
    status: 'Pending',
    assignedVendor: '',
    timeline: [
      RequestTimelineEvent(label: 'Created', timestamp: DateTime(2026, 4, 10, 9, 0)),
    ],
    cost: 0,
    feedback: '',
  ),
  UnifiedRequest(
    id: 'REQ-002',
    tenant: 'Sara Al-Mansoori',
    property: 'West Bay Residence',
    type: 'maintenance',
    status: 'Scheduled',
    assignedVendor: 'Vendor A',
    timeline: [
      RequestTimelineEvent(label: 'Created', timestamp: DateTime(2026, 4, 9, 14, 0)),
      RequestTimelineEvent(label: 'Assigned', timestamp: DateTime(2026, 4, 9, 15, 0)),
    ],
    cost: 350,
    feedback: '',
  ),
  UnifiedRequest(
    id: 'REQ-003',
    tenant: 'Mohamed Fathy',
    property: 'Lusail Heights',
    type: 'cleaning',
    status: 'Completed',
    assignedVendor: 'Vendor B',
    timeline: [
      RequestTimelineEvent(label: 'Created', timestamp: DateTime(2026, 4, 8, 10, 0)),
      RequestTimelineEvent(label: 'Completed', timestamp: DateTime(2026, 4, 8, 16, 0)),
    ],
    cost: 200,
    feedback: 'Great service',
  ),
];

final List<PropertyDNA> mockPropertyDNA = [
  PropertyDNA(
    propertyName: 'Pearl Tower 2',
    requests: [mockUnifiedRequests[0]],
    maintenanceRecords: ['AC Repair - 2026-03-10'],
    pricingHistory: [12000, 12500, 11900],
    bookings: ['Booking #B-1001'],
    feedbacks: ['Excellent location'],
  ),
  PropertyDNA(
    propertyName: 'West Bay Residence',
    requests: [mockUnifiedRequests[1]],
    maintenanceRecords: ['Plumbing - 2026-02-18'],
    pricingHistory: [10500, 11000],
    bookings: ['Booking #B-1002'],
    feedbacks: ['Needs renovation'],
  ),
  PropertyDNA(
    propertyName: 'Lusail Heights',
    requests: [mockUnifiedRequests[2]],
    maintenanceRecords: ['Cleaning - 2026-01-12'],
    pricingHistory: [8900, 9000],
    bookings: ['Booking #B-1003'],
    feedbacks: ['Good value'],
  ),
];
