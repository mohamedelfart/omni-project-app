import 'dart:async';
import 'package:flutter/material.dart';
import '../models/models.dart';

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

  factory ServiceManager() {
    return _instance;
  }

  ServiceManager._internal();

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
      return _generateMockProperties();
    } catch (e) {
      throw Exception('Failed to search properties: $e');
    }
  }

  /// Get property details
  Future<Property> getPropertyDetails(String propertyId) async {
    try {
      await Future.delayed(const Duration(milliseconds: 500));
      final properties = _generateMockProperties();
      return properties.firstWhere(
        (p) => p.id == propertyId,
        orElse: () => properties.first,
      );
    } catch (e) {
      throw Exception('Failed to load property: $e');
    }
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
        description: 'Modern luxury villa in the heart of Dubai',
        type: 'VILLA',
        location: GeoLocation(
          latitude: 25.1882,
          longitude: 55.2719,
          address: 'The Pearl Island',
          city: 'Dubai',
          country: 'AE',
        ),
        nationalAddress: '303/45A-2023',
        price: 5000000,
        currency: 'AED',
        bedrooms: 5,
        bathrooms: 6,
        area: 850,
        images: [
          'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=500',
          'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=500',
        ],
        amenities: ['Pool', 'Gym', 'Smart Home', 'Parking', 'Garden'],
        rating: 4.8,
        reviews: [],
        vendorId: 'VENDOR-001',
        isAvailable: true,
        createdAt: DateTime.now(),
      ),
      Property(
        id: 'PROP-002',
        title: 'Modern Apartment - Downtown',
        description: 'Stylish 2-bedroom apartment in downtown area',
        type: 'APARTMENT',
        location: GeoLocation(
          latitude: 25.1972,
          longitude: 55.2744,
          address: 'Downtown Dubai',
          city: 'Dubai',
          country: 'AE',
        ),
        nationalAddress: '302/24B-2022',
        price: 1200000,
        currency: 'AED',
        bedrooms: 2,
        bathrooms: 2,
        area: 120,
        images: [
          'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=500',
        ],
        amenities: ['Parking', 'Gym', 'Security'],
        rating: 4.5,
        reviews: [],
        vendorId: 'VENDOR-002',
        isAvailable: true,
        createdAt: DateTime.now(),
      ),
      Property(
        id: 'PROP-003',
        title: 'Studio - Marina District',
        description: 'Cozy studio with marina views',
        type: 'STUDIO',
        location: GeoLocation(
          latitude: 25.0867,
          longitude: 55.1408,
          address: 'Marina District',
          city: 'Dubai',
          country: 'AE',
        ),
        nationalAddress: '301/12C-2021',
        price: 600000,
        currency: 'AED',
        bedrooms: 1,
        bathrooms: 1,
        area: 50,
        images: [
          'https://images.unsplash.com/photo-1493857671505-72967e2e2760?w=500',
        ],
        amenities: ['Parking', 'Pool'],
        rating: 4.3,
        reviews: [],
        vendorId: 'VENDOR-003',
        isAvailable: true,
        createdAt: DateTime.now(),
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
