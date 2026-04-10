import 'dart:async';
import 'package:flutter/material.dart';
import '../models/models.dart';
import '../../features/properties/data/doha_areas.dart';

class InventoryVisibilityPolicy {
  static bool isTenantVisible(Property property) {
    return property.status == PropertyStatus.published;
  }

  static List<Property> tenantVisible(List<Property> inventory) {
    return inventory.where(isTenantVisible).toList();
  }
}

/// ============================================================================
/// UNIFIED SERVICE MANAGER
/// Central orchestration point for all service requests
/// ============================================================================

/// Unified Service Manager
/// Handles all service requests across the platform
class ServiceManager {
  static final ServiceManager _instance = ServiceManager._internal();

  // Services Map
  final StreamController<ServiceRequest> _requestStreamController =
      StreamController<ServiceRequest>.broadcast();
  final List<Property> _inventory = <Property>[];

  factory ServiceManager() {
    return _instance;
  }

  ServiceManager._internal() {
    _inventory.addAll(_generateMockProperties());
  }

  /// Create a new service request
  Future<ServiceRequest> createServiceRequest({
    required String userId,
    required String serviceType,
    required GeoLocation location,
    String? description,
    Map<String, dynamic>? serviceDetails,
  }) async {
    try {
      await Future.delayed(const Duration(milliseconds: 500));
      final request = ServiceRequest(
        id: _generateRequestId(),
        userId: userId,
        serviceType: serviceType,
        status: 'PENDING',
        location: location,
        requestTime: DateTime.now(),
        estimatedPrice: 0,
        currency: 'AED',
        paymentMethod: 'CARD',
        serviceDetails: serviceDetails ?? {},
        createdAt: DateTime.now(),
      );
      _requestStreamController.add(request);
      return request;
    } catch (e) {
      throw Exception('Failed to create request: $e');
    }
  }

  /// Update request status
  Future<ServiceRequest> updateRequestStatus(
    String requestId,
    String newStatus,
  ) async {
    try {
      await Future.delayed(const Duration(milliseconds: 500));
      return ServiceRequest(
        id: requestId,
        userId: 'user123',
        serviceType: 'PROPERTIES',
        status: newStatus,
        location: GeoLocation(
          latitude: 25.2854,
          longitude: 55.3571,
          city: 'Dubai',
          country: 'AE',
        ),
        requestTime: DateTime.now(),
        estimatedPrice: 150000,
        currency: 'AED',
        paymentMethod: 'CARD',
        serviceDetails: {},
        createdAt: DateTime.now(),
      );
    } catch (e) {
      throw Exception('Failed to update request: $e');
    }
  }

  /// Get request history for user
  Future<List<ServiceRequest>> getUserRequestHistory(
    String userId, {
    int limit = 20,
    int offset = 0,
  }) async {
    try {
      await Future.delayed(const Duration(milliseconds: 800));
      return _generateMockRequestHistory(userId, limit, offset);
    } catch (e) {
      throw Exception('Failed to load history: $e');
    }
  }

  /// Search properties
  Future<List<Property>> searchProperties({
    required GeoLocation location,
    String? propertyType,
    double? minPrice,
    double? maxPrice,
    int? minBedrooms,
    int? maxBedrooms,
  }) async {
    try {
      await Future.delayed(const Duration(milliseconds: 1000));
      List<Property> results = InventoryVisibilityPolicy.tenantVisible(_inventory);

      if (propertyType != null && propertyType.trim().isNotEmpty) {
        final String normalized = propertyType.toLowerCase();
        results = results
            .where((Property p) => p.propertyType.toLowerCase() == normalized)
            .toList();
      }

      if (minPrice != null) {
        results = results.where((Property p) => p.price >= minPrice).toList();
      }
      if (maxPrice != null) {
        results = results.where((Property p) => p.price <= maxPrice).toList();
      }
      if (minBedrooms != null) {
        results = results.where((Property p) => p.bedrooms >= minBedrooms).toList();
      }
      if (maxBedrooms != null) {
        results = results.where((Property p) => p.bedrooms <= maxBedrooms).toList();
      }

      return results;
    } catch (e) {
      throw Exception('Failed to search properties: $e');
    }
  }

  /// Get property details
  Future<Property> getPropertyDetails(
    String propertyId, {
    bool includeUnpublished = false,
  }) async {
    try {
      await Future.delayed(const Duration(milliseconds: 500));
      final List<Property> source = includeUnpublished
          ? _inventory
          : InventoryVisibilityPolicy.tenantVisible(_inventory);
      return source.firstWhere(
        (Property p) => p.id == propertyId,
        orElse: () => throw Exception('Property not found'),
      );
    } catch (e) {
      throw Exception('Failed to load property: $e');
    }
  }

  Future<List<Property>> dashboardListProperties({
    required String actorRole,
  }) async {
    _assertDashboardRole(actorRole);
    await Future.delayed(const Duration(milliseconds: 250));
    return List<Property>.from(_inventory);
  }

  Future<Property> dashboardCreateProperty({
    required String actorRole,
    required Property property,
  }) async {
    _assertDashboardRole(actorRole);
    await Future.delayed(const Duration(milliseconds: 300));

    final Property normalized = Property(
      id: property.id,
      title: property.title,
      description: property.description,
      propertyType: property.propertyType,
      areaName: property.areaName,
      city: property.city,
      zoneNumber: property.zoneNumber,
      streetNumber: property.streetNumber,
      buildingNumber: property.buildingNumber,
      location: property.location,
      price: property.price,
      currency: property.currency,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      sizeSqm: property.sizeSqm,
      parkingCount: property.parkingCount,
      furnished: property.furnished,
      amenities: property.amenities,
      images: property.images,
      status: property.status,
      createdBy: property.createdBy,
      createdAt: property.createdAt,
      updatedAt: DateTime.now(),
      vendorId: property.vendorId,
      rating: property.rating,
      reviews: property.reviews,
      isAvailable: property.isAvailable,
      nationalAddress: property.nationalAddress,
    );

    _upsertInventory(normalized);
    return normalized;
  }

  Future<Property> dashboardUpdateProperty({
    required String actorRole,
    required Property property,
  }) async {
    _assertDashboardRole(actorRole);
    await Future.delayed(const Duration(milliseconds: 300));

    final int index = _inventory.indexWhere((Property p) => p.id == property.id);
    if (index < 0) {
      throw Exception('Property not found for update');
    }

    final Property updated = Property(
      id: property.id,
      title: property.title,
      description: property.description,
      propertyType: property.propertyType,
      areaName: property.areaName,
      city: property.city,
      zoneNumber: property.zoneNumber,
      streetNumber: property.streetNumber,
      buildingNumber: property.buildingNumber,
      location: property.location,
      price: property.price,
      currency: property.currency,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      sizeSqm: property.sizeSqm,
      parkingCount: property.parkingCount,
      furnished: property.furnished,
      amenities: property.amenities,
      images: property.images,
      status: property.status,
      createdBy: property.createdBy,
      createdAt: _inventory[index].createdAt,
      updatedAt: DateTime.now(),
      vendorId: property.vendorId,
      rating: property.rating,
      reviews: property.reviews,
      isAvailable: property.isAvailable,
      nationalAddress: property.nationalAddress,
    );

    _inventory[index] = updated;
    return updated;
  }

  Future<Property> dashboardSaveDraft({
    required String actorRole,
    required String propertyId,
  }) async {
    return _dashboardSetStatus(
      actorRole: actorRole,
      propertyId: propertyId,
      status: PropertyStatus.draft,
    );
  }

  Future<Property> dashboardPublishProperty({
    required String actorRole,
    required String propertyId,
  }) async {
    return _dashboardSetStatus(
      actorRole: actorRole,
      propertyId: propertyId,
      status: PropertyStatus.published,
    );
  }

  Future<Property> dashboardHideProperty({
    required String actorRole,
    required String propertyId,
  }) async {
    return _dashboardSetStatus(
      actorRole: actorRole,
      propertyId: propertyId,
      status: PropertyStatus.hidden,
    );
  }

  /// Stream for real-time updates
  Stream<ServiceRequest> get requestStream => _requestStreamController.stream;

  /// Cleanup
  void dispose() {
    _requestStreamController.close();
  }

  // ========== Helper Methods ==========

  String _generateRequestId() {
    return 'REQ-${DateTime.now().millisecondsSinceEpoch}-${(DateTime.now().millisecond % 1000).toString().padLeft(3, '0')}';
  }

  void _assertDashboardRole(String actorRole) {
    final String normalized = actorRole.trim().toLowerCase();
    if (normalized != 'admin' && normalized != 'command_center') {
      throw Exception('Only dashboard/command center can manage inventory');
    }
  }

  void _upsertInventory(Property property) {
    final int index = _inventory.indexWhere((Property p) => p.id == property.id);
    if (index >= 0) {
      _inventory[index] = property;
      return;
    }
    _inventory.add(property);
  }

  Future<Property> _dashboardSetStatus({
    required String actorRole,
    required String propertyId,
    required PropertyStatus status,
  }) async {
    _assertDashboardRole(actorRole);
    await Future.delayed(const Duration(milliseconds: 250));
    final int index = _inventory.indexWhere((Property p) => p.id == propertyId);
    if (index < 0) {
      throw Exception('Property not found for status update');
    }

    final Property current = _inventory[index];
    final Property updated = Property(
      id: current.id,
      title: current.title,
      description: current.description,
      propertyType: current.propertyType,
      areaName: current.areaName,
      city: current.city,
      zoneNumber: current.zoneNumber,
      streetNumber: current.streetNumber,
      buildingNumber: current.buildingNumber,
      location: current.location,
      price: current.price,
      currency: current.currency,
      bedrooms: current.bedrooms,
      bathrooms: current.bathrooms,
      sizeSqm: current.sizeSqm,
      parkingCount: current.parkingCount,
      furnished: current.furnished,
      amenities: current.amenities,
      images: current.images,
      status: status,
      createdBy: current.createdBy,
      createdAt: current.createdAt,
      updatedAt: DateTime.now(),
      vendorId: current.vendorId,
      rating: current.rating,
      reviews: current.reviews,
      isAvailable: current.isAvailable,
      nationalAddress: current.nationalAddress,
    );

    _inventory[index] = updated;
    return updated;
  }

  List<ServiceRequest> _generateMockRequestHistory(
    String userId,
    int limit,
    int offset,
  ) {
    return List.generate(
      limit,
      (index) => ServiceRequest(
        id: _generateRequestId(),
        userId: userId,
        serviceType: 'PROPERTIES',
        status: [
          'PENDING',
          'CONFIRMED',
          'IN_PROGRESS',
          'COMPLETED',
          'FAILED',
        ][index % 5],
        location: GeoLocation(latitude: 25.2854, longitude: 55.3571),
        requestTime: DateTime.now().subtract(Duration(days: index)),
        estimatedPrice: 100 + (index * 50),
        currency: 'AED',
        paymentMethod: 'CARD',
        serviceDetails: {},
        createdAt: DateTime.now().subtract(Duration(days: index)),
      ),
    );
  }

  List<Property> _generateMockProperties() {
    return [
      Property(
        id: 'PROP-001',
        title: 'Luxury Villa - The Pearl',
        description: 'Modern luxury villa in one of Doha\'s premium districts',
        propertyType: 'VILLA',
        areaName: 'The Pearl',
        city: 'Doha',
        zoneNumber: 66,
        streetNumber: 210,
        buildingNumber: 14,
        location: GeoLocation(
          latitude: 25.1882,
          longitude: 55.2719,
          address: 'The Pearl Island',
          city: 'The Pearl',
          country: 'Qatar',
        ),
        price: 5000000,
        currency: 'QAR',
        bedrooms: 5,
        bathrooms: 6,
        sizeSqm: 850,
        parkingCount: 3,
        furnished: true,
        images: [
          'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=1200&q=85',
          'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&q=85',
          'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=85',
        ],
        amenities: ['Pool', 'Gym', 'Smart Home', 'Parking', 'Garden'],
        rating: 4.8,
        reviews: [],
        status: PropertyStatus.published,
        createdBy: 'command-center',
        vendorId: 'VENDOR-001',
        isAvailable: true,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      ),
      Property(
        id: 'PROP-002',
        title: 'Modern Apartment - West Bay',
        description: 'Stylish 2-bedroom apartment with skyline access',
        propertyType: 'APARTMENT',
        areaName: 'West Bay',
        city: 'Doha',
        zoneNumber: 63,
        streetNumber: 801,
        buildingNumber: 7,
        location: GeoLocation(
          latitude: 25.3212,
          longitude: 51.5310,
          address: 'West Bay Towers',
          city: 'West Bay',
          country: 'Qatar',
        ),
        price: 1200000,
        currency: 'QAR',
        bedrooms: 2,
        bathrooms: 2,
        sizeSqm: 120,
        parkingCount: 1,
        furnished: true,
        images: [
          'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&q=85',
          'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&q=85',
        ],
        amenities: ['Parking', 'Gym', 'Security'],
        rating: 4.5,
        reviews: [],
        status: PropertyStatus.published,
        createdBy: 'command-center',
        vendorId: 'VENDOR-002',
        isAvailable: true,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      ),
      Property(
        id: 'PROP-003',
        title: 'Studio - Lusail Marina District',
        description: 'Cozy studio with modern waterfront surroundings',
        propertyType: 'STUDIO',
        areaName: 'Lusail',
        city: 'Doha',
        zoneNumber: 69,
        streetNumber: 502,
        buildingNumber: 19,
        location: GeoLocation(
          latitude: 25.4231,
          longitude: 51.5250,
          address: 'Lusail Marina District',
          city: 'Lusail',
          country: 'Qatar',
        ),
        price: 600000,
        currency: 'QAR',
        bedrooms: 1,
        bathrooms: 1,
        sizeSqm: 50,
        parkingCount: 1,
        furnished: false,
        images: [],
        amenities: ['Parking', 'Pool'],
        rating: 4.3,
        reviews: [],
        status: PropertyStatus.draft,
        createdBy: 'command-center',
        vendorId: 'VENDOR-003',
        isAvailable: true,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      ),
      Property(
        id: 'PROP-004',
        title: 'Family Apartment - Al Sadd',
        description: 'Well-connected apartment in a central Doha neighborhood',
        propertyType: 'APARTMENT',
        areaName: 'Al Sadd',
        city: 'Doha',
        zoneNumber: 38,
        streetNumber: 930,
        buildingNumber: 5,
        location: GeoLocation(
          latitude: 25.2854,
          longitude: 51.5030,
          address: 'Al Sadd Center',
          city: 'Al Sadd',
          country: 'Qatar',
        ),
        price: 780000,
        currency: 'QAR',
        bedrooms: 3,
        bathrooms: 2,
        sizeSqm: 155,
        parkingCount: 1,
        furnished: true,
        images: [],
        amenities: ['Parking', 'Gym', 'Security'],
        rating: 4.4,
        reviews: [],
        status: PropertyStatus.published,
        createdBy: 'command-center',
        vendorId: 'VENDOR-004',
        isAvailable: true,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      ),
      Property(
        id: 'PROP-005',
        title: 'Coastal Home - Al Wakra',
        description: 'Spacious unit near Al Wakra family promenade',
        propertyType: 'VILLA',
        areaName: 'Al Wakra',
        city: 'Doha',
        zoneNumber: 90,
        streetNumber: 40,
        buildingNumber: 12,
        location: GeoLocation(
          latitude: 25.1715,
          longitude: 51.6034,
          address: 'Al Wakra Coastal District',
          city: 'Al Wakra',
          country: 'Qatar',
        ),
        price: 1320000,
        currency: 'QAR',
        bedrooms: 4,
        bathrooms: 3,
        sizeSqm: 240,
        parkingCount: 2,
        furnished: false,
        images: [],
        amenities: ['Parking', 'Garden', 'Security'],
        rating: 4.5,
        reviews: [],
        status: PropertyStatus.hidden,
        createdBy: 'command-center',
        vendorId: 'VENDOR-005',
        isAvailable: true,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      ),
      Property(
        id: 'PROP-006',
        title: 'Urban Loft - Msheireb',
        description: 'Smart loft in the heart of Doha\'s innovation district',
        propertyType: 'STUDIO',
        areaName: 'Msheireb',
        city: 'Doha',
        zoneNumber: 3,
        streetNumber: 115,
        buildingNumber: 22,
        location: GeoLocation(
          latitude: 25.2868,
          longitude: 51.5318,
          address: 'Msheireb Downtown',
          city: 'Msheireb',
          country: 'Qatar',
        ),
        price: 650000,
        currency: 'QAR',
        bedrooms: 1,
        bathrooms: 1,
        sizeSqm: 78,
        parkingCount: 1,
        furnished: true,
        images: [],
        amenities: ['Gym', 'Smart Access', 'Security'],
        rating: 4.3,
        reviews: [],
        status: PropertyStatus.published,
        createdBy: 'command-center',
        vendorId: 'VENDOR-006',
        isAvailable: true,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      ),
      Property(
        id: 'PROP-007',
        title: 'Executive Residence - Al Dafna',
        description: 'Executive apartment close to Doha business core',
        propertyType: 'APARTMENT',
        areaName: 'Al Dafna',
        city: 'Doha',
        zoneNumber: 61,
        streetNumber: 850,
        buildingNumber: 11,
        location: GeoLocation(
          latitude: 25.3234,
          longitude: 51.5326,
          address: 'Al Dafna Business District',
          city: 'Al Dafna',
          country: 'Qatar',
        ),
        price: 960000,
        currency: 'QAR',
        bedrooms: 2,
        bathrooms: 2,
        sizeSqm: 132,
        parkingCount: 2,
        furnished: true,
        images: [dohaAreas[6].imageUrl],
        amenities: ['Parking', 'Gym', 'Concierge'],
        rating: 4.6,
        reviews: [],
        status: PropertyStatus.published,
        createdBy: 'command-center',
        vendorId: 'VENDOR-007',
        isAvailable: true,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      ),
      Property(
        id: 'PROP-008',
        title: 'Family Compound - Al Rayyan',
        description: 'Spacious family compound near schools and malls.',
        propertyType: 'VILLA',
        areaName: 'Al Rayyan',
        city: 'Doha',
        zoneNumber: 52,
        streetNumber: 120,
        buildingNumber: 3,
        location: GeoLocation(
          latitude: 25.2916,
          longitude: 51.4244,
          address: 'Al Rayyan Residential',
          city: 'Al Rayyan',
          country: 'Qatar',
        ),
        price: 1480000,
        currency: 'QAR',
        bedrooms: 4,
        bathrooms: 4,
        sizeSqm: 280,
        parkingCount: 2,
        furnished: false,
        images: [],
        amenities: ['Parking', 'Garden', 'Security'],
        rating: 4.4,
        reviews: [],
        status: PropertyStatus.published,
        createdBy: 'command-center',
        vendorId: 'VENDOR-008',
        isAvailable: true,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      ),
      Property(
        id: 'PROP-009',
        title: 'Metro-Ready Apartment - Bin Mahmoud',
        description: 'Modern apartment close to business district and metro.',
        propertyType: 'APARTMENT',
        areaName: 'Bin Mahmoud',
        city: 'Doha',
        zoneNumber: 22,
        streetNumber: 910,
        buildingNumber: 18,
        location: GeoLocation(
          latitude: 25.2859,
          longitude: 51.5165,
          address: 'Bin Mahmoud Metro Area',
          city: 'Bin Mahmoud',
          country: 'Qatar',
        ),
        price: 820000,
        currency: 'QAR',
        bedrooms: 2,
        bathrooms: 2,
        sizeSqm: 118,
        parkingCount: 1,
        furnished: true,
        images: [
          'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1200&q=85',
        ],
        amenities: ['Parking', 'Gym', 'Security'],
        rating: 4.5,
        reviews: [],
        status: PropertyStatus.published,
        createdBy: 'command-center',
        vendorId: 'VENDOR-009',
        isAvailable: true,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      ),
      Property(
        id: 'PROP-010',
        title: 'Waterfront Residence - Al Khor',
        description: 'Calm waterfront residence with family amenities.',
        propertyType: 'APARTMENT',
        areaName: 'Al Khor',
        city: 'Al Khor',
        zoneNumber: 74,
        streetNumber: 77,
        buildingNumber: 9,
        location: GeoLocation(
          latitude: 25.6839,
          longitude: 51.5058,
          address: 'Al Khor Waterfront',
          city: 'Al Khor',
          country: 'Qatar',
        ),
        price: 730000,
        currency: 'QAR',
        bedrooms: 2,
        bathrooms: 2,
        sizeSqm: 124,
        parkingCount: 1,
        furnished: false,
        images: [],
        amenities: ['Parking', 'Play Area', 'Security'],
        rating: 4.2,
        reviews: [],
        status: PropertyStatus.published,
        createdBy: 'command-center',
        vendorId: 'VENDOR-010',
        isAvailable: true,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      ),
      Property(
        id: 'PROP-011',
        title: 'Community Villa - Umm Salal',
        description: 'Quiet villa in a growing community neighborhood.',
        propertyType: 'VILLA',
        areaName: 'Umm Salal',
        city: 'Umm Salal',
        zoneNumber: 71,
        streetNumber: 40,
        buildingNumber: 15,
        location: GeoLocation(
          latitude: 25.4147,
          longitude: 51.4065,
          address: 'Umm Salal Community',
          city: 'Umm Salal',
          country: 'Qatar',
        ),
        price: 1180000,
        currency: 'QAR',
        bedrooms: 4,
        bathrooms: 3,
        sizeSqm: 246,
        parkingCount: 2,
        furnished: false,
        images: [],
        amenities: ['Garden', 'Parking', 'Security'],
        rating: 4.1,
        reviews: [],
        status: PropertyStatus.published,
        createdBy: 'command-center',
        vendorId: 'VENDOR-011',
        isAvailable: true,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      ),
      Property(
        id: 'PROP-012',
        title: 'Executive Apartment - Al Daayen',
        description: 'Executive apartment with modern building services.',
        propertyType: 'APARTMENT',
        areaName: 'Al Daayen',
        city: 'Al Daayen',
        zoneNumber: 67,
        streetNumber: 601,
        buildingNumber: 6,
        location: GeoLocation(
          latitude: 25.4022,
          longitude: 51.5100,
          address: 'Al Daayen District',
          city: 'Al Daayen',
          country: 'Qatar',
        ),
        price: 910000,
        currency: 'QAR',
        bedrooms: 3,
        bathrooms: 2,
        sizeSqm: 146,
        parkingCount: 2,
        furnished: true,
        images: [
          'https://images.unsplash.com/photo-1600607688969-a5bfcd646154?w=1200&q=85',
        ],
        amenities: ['Parking', 'Gym', 'Concierge'],
        rating: 4.4,
        reviews: [],
        status: PropertyStatus.published,
        createdBy: 'command-center',
        vendorId: 'VENDOR-012',
        isAvailable: true,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      ),
      Property(
        id: 'PROP-013',
        title: 'Premium Home - Madinat Al Shamal',
        description: 'Large home in the north with private outdoor space.',
        propertyType: 'VILLA',
        areaName: 'Madinat Al Shamal',
        city: 'Madinat Al Shamal',
        zoneNumber: 101,
        streetNumber: 21,
        buildingNumber: 2,
        location: GeoLocation(
          latitude: 26.1291,
          longitude: 51.2004,
          address: 'Al Shamal North District',
          city: 'Madinat Al Shamal',
          country: 'Qatar',
        ),
        price: 1040000,
        currency: 'QAR',
        bedrooms: 4,
        bathrooms: 3,
        sizeSqm: 260,
        parkingCount: 3,
        furnished: false,
        images: [],
        amenities: ['Parking', 'Garden', 'Storage'],
        rating: 4.0,
        reviews: [],
        status: PropertyStatus.published,
        createdBy: 'command-center',
        vendorId: 'VENDOR-013',
        isAvailable: true,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      ),
      Property(
        id: 'PROP-014',
        title: 'Seaside Apartment - Mesaieed',
        description: 'Affordable apartment with easy industrial access.',
        propertyType: 'APARTMENT',
        areaName: 'Mesaieed',
        city: 'Mesaieed',
        zoneNumber: 92,
        streetNumber: 10,
        buildingNumber: 4,
        location: GeoLocation(
          latitude: 24.9927,
          longitude: 51.5506,
          address: 'Mesaieed Coastal Area',
          city: 'Mesaieed',
          country: 'Qatar',
        ),
        price: 620000,
        currency: 'QAR',
        bedrooms: 2,
        bathrooms: 2,
        sizeSqm: 112,
        parkingCount: 1,
        furnished: false,
        images: [],
        amenities: ['Parking', 'Security'],
        rating: 4.0,
        reviews: [],
        status: PropertyStatus.published,
        createdBy: 'command-center',
        vendorId: 'VENDOR-014',
        isAvailable: true,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      ),
      Property(
        id: 'PROP-015',
        title: 'City Studio - Najma',
        description: 'Compact city studio ideal for professionals.',
        propertyType: 'STUDIO',
        areaName: 'Najma',
        city: 'Doha',
        zoneNumber: 17,
        streetNumber: 305,
        buildingNumber: 11,
        location: GeoLocation(
          latitude: 25.2744,
          longitude: 51.5435,
          address: 'Najma District',
          city: 'Najma',
          country: 'Qatar',
        ),
        price: 520000,
        currency: 'QAR',
        bedrooms: 1,
        bathrooms: 1,
        sizeSqm: 64,
        parkingCount: 1,
        furnished: true,
        images: [
          'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=1200&q=85',
        ],
        amenities: ['Parking', 'Security'],
        rating: 4.1,
        reviews: [],
        status: PropertyStatus.published,
        createdBy: 'command-center',
        vendorId: 'VENDOR-015',
        isAvailable: true,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      ),
      Property(
        id: 'PROP-016',
        title: 'Skyline Tower - West Bay Lagoon',
        description: 'Premium tower unit with lagoon and skyline views.',
        propertyType: 'APARTMENT',
        areaName: 'West Bay Lagoon',
        city: 'Doha',
        zoneNumber: 66,
        streetNumber: 880,
        buildingNumber: 2,
        location: GeoLocation(
          latitude: 25.3699,
          longitude: 51.5409,
          address: 'West Bay Lagoon',
          city: 'West Bay Lagoon',
          country: 'Qatar',
        ),
        price: 1720000,
        currency: 'QAR',
        bedrooms: 3,
        bathrooms: 3,
        sizeSqm: 198,
        parkingCount: 2,
        furnished: true,
        images: [],
        amenities: ['Parking', 'Gym', 'Pool', 'Concierge'],
        rating: 4.7,
        reviews: [],
        status: PropertyStatus.published,
        createdBy: 'command-center',
        vendorId: 'VENDOR-016',
        isAvailable: true,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      ),
    ];
  }

  /// ========== DELIVERY SERVICES ==========

  /// Search delivery orders
  Future<List<DeliveryOrder>> searchDeliveryOrders({
    String? userId,
    String? status,
    String? type,
  }) async {
    try {
      await Future.delayed(const Duration(milliseconds: 800));
      final allOrders = _generateMockDeliveryOrders();
      return allOrders.where((order) {
        if (userId != null && order.id != userId) return false;
        if (status != null && order.status != status) return false;
        if (type != null && order.type != type) return false;
        return true;
      }).toList();
    } catch (e) {
      throw Exception('Failed to search delivery orders: $e');
    }
  }

  /// Create new delivery order
  Future<DeliveryOrder> createDeliveryOrder({
    required String userId,
    required String type,
    required GeoLocation pickupLocation,
    required GeoLocation deliveryLocation,
    required List<String> items,
    required double totalAmount,
    required String currency,
    required double deliveryFee,
  }) async {
    try {
      await Future.delayed(const Duration(milliseconds: 1000));
      final order = DeliveryOrder(
        id: 'DEL-${DateTime.now().millisecondsSinceEpoch}',
        type: type,
        status: 'PENDING',
        pickupLocation: pickupLocation,
        deliveryLocation: deliveryLocation,
        items: items,
        totalAmount: totalAmount,
        currency: currency,
        deliveryFee: deliveryFee,
        estimatedDelivery: DateTime.now().add(const Duration(minutes: 30)),
        trackingNumber: 'OMNI-DEL-${DateTime.now().millisecondsSinceEpoch}',
        createdAt: DateTime.now(),
      );
      return order;
    } catch (e) {
      throw Exception('Failed to create delivery order: $e');
    }
  }

  /// Get delivery order details
  Future<DeliveryOrder> getDeliveryOrderDetails(String orderId) async {
    try {
      await Future.delayed(const Duration(milliseconds: 500));
      final orders = _generateMockDeliveryOrders();
      return orders.firstWhere(
        (o) => o.id == orderId,
        orElse: () => orders.first,
      );
    } catch (e) {
      throw Exception('Failed to load delivery order: $e');
    }
  }

  List<DeliveryOrder> _generateMockDeliveryOrders() {
    return [
      DeliveryOrder(
        id: 'DEL-001',
        type: 'FOOD',
        status: 'IN_TRANSIT',
        pickupLocation: GeoLocation(
          latitude: 25.1972,
          longitude: 55.2744,
          address: 'Al Khalidi Restaurant, Dubai Marina',
          city: 'Dubai',
          country: 'AE',
        ),
        deliveryLocation: GeoLocation(
          latitude: 25.1854,
          longitude: 55.2671,
          address: 'Villa 123, Jumeirah Beach Residence',
          city: 'Dubai',
          country: 'AE',
        ),
        items: ['Chicken Shawarma', 'Falafel Wrap', 'Soft Drinks'],
        totalAmount: 85.0,
        currency: 'AED',
        deliveryFee: 5.0,
        estimatedDelivery: DateTime.now().add(const Duration(minutes: 25)),
        driverName: 'Ahmed Hassan',
        driverPhone: '+971501234567',
        trackingNumber: 'OMNI-DEL-2026-001',
        createdAt: DateTime.now().subtract(const Duration(minutes: 15)),
      ),
      DeliveryOrder(
        id: 'DEL-002',
        type: 'GROCERY',
        status: 'DELIVERED',
        pickupLocation: GeoLocation(
          latitude: 25.0867,
          longitude: 55.1408,
          address: 'Carrefour Market, Mall of Emirates',
          city: 'Dubai',
          country: 'AE',
        ),
        deliveryLocation: GeoLocation(
          latitude: 25.1854,
          longitude: 55.2671,
          address: 'Villa 123, Jumeirah Beach Residence',
          city: 'Dubai',
          country: 'AE',
        ),
        items: ['Milk', 'Bread', 'Fruits', 'Vegetables', 'Cleaning Supplies'],
        totalAmount: 145.0,
        currency: 'AED',
        deliveryFee: 10.0,
        estimatedDelivery: DateTime.now().add(const Duration(minutes: 45)),
        driverName: 'Fatima Al-Zahra',
        driverPhone: '+971507654321',
        trackingNumber: 'OMNI-DEL-2026-002',
        createdAt: DateTime.now().subtract(const Duration(hours: 2)),
      ),
      DeliveryOrder(
        id: 'DEL-003',
        type: 'MEDICINE',
        status: 'PICKED_UP',
        pickupLocation: GeoLocation(
          latitude: 25.1972,
          longitude: 55.2744,
          address: 'Life Pharmacy, Business Bay',
          city: 'Dubai',
          country: 'AE',
        ),
        deliveryLocation: GeoLocation(
          latitude: 25.1854,
          longitude: 55.2671,
          address: 'Villa 123, Jumeirah Beach Residence',
          city: 'Dubai',
          country: 'AE',
        ),
        items: ['Painkillers', 'Antibiotics', 'Vitamins', 'Bandages'],
        totalAmount: 67.0,
        currency: 'AED',
        deliveryFee: 8.0,
        estimatedDelivery: DateTime.now().add(const Duration(minutes: 20)),
        driverName: 'Omar Khalid',
        driverPhone: '+971509876543',
        trackingNumber: 'OMNI-DEL-2026-003',
        createdAt: DateTime.now().subtract(const Duration(minutes: 35)),
      ),
    ];
  }

  /// ========== HOTEL SERVICES ==========

  /// Get hotel services for tenant
  Future<List<HotelService>> getHotelServices({
    required String userId,
    required String country,
  }) async {
    try {
      await Future.delayed(const Duration(milliseconds: 800));
      return _generateMockHotelServices();
    } catch (e) {
      throw Exception('Failed to load hotel services: $e');
    }
  }

  /// Request hotel service
  Future<bool> requestHotelService({
    required String userId,
    required String serviceId,
    required String serviceType,
    Map<String, dynamic>? additionalData,
  }) async {
    try {
      await Future.delayed(const Duration(milliseconds: 1000));
      // Simulate service request
      return true;
    } catch (e) {
      throw Exception('Failed to request hotel service: $e');
    }
  }

  /// Get insurance packages
  Future<List<InsurancePackage>> getInsurancePackages(String country) async {
    try {
      await Future.delayed(const Duration(milliseconds: 500));
      return [
        InsurancePackage(name: '3 أشهر', price: 500, coverage: 3),
        InsurancePackage(name: '6 أشهر', price: 900, coverage: 6),
        InsurancePackage(name: '12 شهر', price: 1500, coverage: 12),
      ];
    } catch (e) {
      throw Exception('Failed to load insurance packages: $e');
    }
  }

  List<HotelService> _generateMockHotelServices() {
    return [
      HotelService(
        id: 'HOTEL-001',
        title: 'نقل العفش المجاني',
        description: 'نقل عفشك مجاناً حتى 500 ريال - تغليف وترتيب شامل',
        type: 'FURNITURE_MOVING',
        isFree: true,
        maxFreeAmount: 500.0,
        currency: 'QAR',
        estimatedTime: '2-4 ساعات',
        available24_7: true,
        icon: '🚛',
        status: 'AVAILABLE',
      ),
      HotelService(
        id: 'HOTEL-002',
        title: 'صيانة شاملة مجانية',
        description: 'كهرباء، سباكة، مكيف، نجارة - فنيين محترفين',
        type: 'MAINTENANCE',
        isFree: true,
        currency: 'QAR',
        estimatedTime: '1-3 ساعات',
        available24_7: false,
        workingHours: '8 صباحاً - 6 مساءً',
        icon: '🔧',
        status: 'AVAILABLE',
      ),
      HotelService(
        id: 'HOTEL-003',
        title: 'تنظيف شهري مجاني',
        description: 'تنظيف شامل للشقة كل شهر مع مواد التنظيف',
        type: 'CLEANING',
        isFree: true,
        currency: 'QAR',
        estimatedTime: '2-3 ساعات',
        available24_7: false,
        frequency: 'شهري',
        icon: '🧹',
        status: 'AVAILABLE',
      ),
      HotelService(
        id: 'HOTEL-004',
        title: 'نقل المطار المجاني',
        description: 'نقل من وإلى المطار - سيارات مريحة وآمنة',
        type: 'AIRPORT_TRANSFER',
        isFree: true,
        currency: 'QAR',
        estimatedTime: '30-60 دقيقة',
        available24_7: true,
        icon: '✈️',
        status: 'AVAILABLE',
      ),
      HotelService(
        id: 'HOTEL-005',
        title: 'تأمين ضد التعثر',
        description: 'حماية من التعثر في دفع الإيجار - باقات متعددة',
        type: 'INSURANCE',
        isFree: false,
        estimatedTime: 'فوري',
        available24_7: true,
        packages: [
          InsurancePackage(name: '3 أشهر', price: 500, coverage: 3),
          InsurancePackage(name: '6 أشهر', price: 900, coverage: 6),
          InsurancePackage(name: '12 شهر', price: 1500, coverage: 12),
        ],
        currency: 'QAR',
        icon: '🛡️',
        status: 'AVAILABLE',
      ),
    ];
  }

  /// ========== PAID SERVICES ==========

  /// Get available paid services
  Future<List<PaidService>> getPaidServices({
    String? category,
    String? country,
  }) async {
    try {
      await Future.delayed(const Duration(milliseconds: 800));
      final allServices = _generateMockPaidServices();
      return category != null && category != "ALL"
          ? allServices
                .where((service) => service.category == category)
                .toList()
          : allServices;
    } catch (e) {
      throw Exception("Failed to load paid services: $e");
    }
  }

  /// Open external service app
  Future<bool> openExternalService(String serviceId) async {
    try {
      await Future.delayed(const Duration(milliseconds: 500));
      // Simulate opening external app
      return true;
    } catch (e) {
      throw Exception("Failed to open external service: $e");
    }
  }

  List<PaidService> _generateMockPaidServices() {
    return [
      // Transport Services
      PaidService(
        id: "SERVICE-001",
        name: "أوبر",
        description: "خدمة نقل سريع ومريح للمدن",
        category: "TRANSPORT",
        icon: "🚕",
        color: Colors.black,
        isAvailable: true,
        estimatedTime: "5-15 دقيقة",
        rating: 4.5,
        totalUsers: 50000,
        features: ["GPS تتبع", "دفع آمن", "تقييم السائقين"],
      ),
      PaidService(
        id: "SERVICE-002",
        name: "كريم",
        description: "نقل سريع - سيارات مريحة",
        category: "TRANSPORT",
        icon: "🚗",
        color: Colors.pink,
        isAvailable: true,
        estimatedTime: "3-10 دقيقة",
        rating: 4.3,
        totalUsers: 30000,
        features: ["سيارات خاصة", "تقييم آمن", "دفع سهل"],
      ),

      // Food Services
      PaidService(
        id: "SERVICE-003",
        name: "طلبات",
        description: "طلب طعام من مطاعم متعددة",
        category: "FOOD",
        icon: "🍕",
        color: Colors.red,
        isAvailable: true,
        estimatedTime: "20-45 دقيقة",
        rating: 4.4,
        totalUsers: 80000,
        features: ["مطاعم متعددة", "تتبع الطلب", "تقييم عالي"],
      ),
      PaidService(
        id: "SERVICE-004",
        name: "دليفري",
        description: "طلب طعام سريع ومضمون",
        category: "FOOD",
        icon: "🍔",
        color: Colors.orange,
        isAvailable: true,
        estimatedTime: "15-35 دقيقة",
        rating: 4.2,
        totalUsers: 25000,
        features: ["طلب سريع", "جودة عالية", "24/7 متوفر"],
      ),

      // Delivery Services
      PaidService(
        id: "SERVICE-005",
        name: "جاهز",
        description: "طلب من المتاجر والصيدليات",
        category: "DELIVERY",
        icon: "🛒",
        color: Colors.blue,
        isAvailable: true,
        estimatedTime: "1-3 ساعات",
        rating: 4.6,
        totalUsers: 100000,
        features: ["توصيل سريع", "منتجات متعددة", "تتبع الطلب"],
      ),
      PaidService(
        id: "SERVICE-006",
        name: "نون",
        description: "طلب من المتاجر والصيدليات",
        category: "DELIVERY",
        icon: "🛍️",
        color: Colors.green,
        isAvailable: true,
        estimatedTime: "30-60 دقيقة",
        rating: 4.3,
        totalUsers: 45000,
        features: ["طلب سريع", "توصيل مجاني", "تقييم عالي"],
      ),

      // Other Services
      PaidService(
        id: "SERVICE-007",
        name: "مهام",
        description: "خدمات منزلية ومهام يومية",
        category: "SERVICES",
        icon: "🛠️",
        color: Colors.purple,
        isAvailable: true,
        estimatedTime: "1-2 ساعات",
        rating: 4.1,
        totalUsers: 15000,
        features: ["خدمات منزلية", "تتبع العمل", "ضمان الجودة"],
      ),
      PaidService(
        id: "SERVICE-008",
        name: "خدمات منزلية",
        description: "تنظيف وصيانة للمنازل",
        category: "SERVICES",
        icon: "🏠",
        color: Colors.teal,
        isAvailable: true,
        estimatedTime: "2-4 ساعات",
        rating: 4.4,
        totalUsers: 20000,
        features: ["تنظيف شامل", "صيانة دورية", "تتبع الخدمة"],
      ),
    ];
  }
}
