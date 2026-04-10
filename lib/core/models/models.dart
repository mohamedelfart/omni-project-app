import 'package:flutter/material.dart';

// ============================================================================
// OMNI-RESILIENT GLOBAL LIFESTYLE OS
// Data Models & Entities
// ============================================================================

/// Unified Request Model - Core of the system
/// Represents any service request (Ride, Property, Food, etc.)
class ServiceRequest {
  final String id;
  final String userId;
  final String serviceType; // PROPERTIES, RIDES, FOOD, TRAVEL, HEALTH
  final String status; // PENDING, CONFIRMED, IN_PROGRESS, COMPLETED
  final GeoLocation location;
  final DateTime requestTime;
  final DateTime? scheduledTime;
  final String? description;
  final double estimatedPrice;
  final String currency;
  final String paymentMethod;
  final Map<String, dynamic> serviceDetails;
  final String? vendorId;
  final double? rating;
  final String? review;
  final DateTime createdAt;
  final DateTime? completedAt;

  ServiceRequest({
    required this.id,
    required this.userId,
    required this.serviceType,
    required this.status,
    required this.location,
    required this.requestTime,
    this.scheduledTime,
    this.description,
    required this.estimatedPrice,
    required this.currency,
    required this.paymentMethod,
    required this.serviceDetails,
    this.vendorId,
    this.rating,
    this.review,
    required this.createdAt,
    this.completedAt,
  });

  // Convert to JSON for API
  Map<String, dynamic> toJson() => {
        'id': id,
        'userId': userId,
        'serviceType': serviceType,
        'status': status,
        'location': location.toJson(),
        'requestTime': requestTime.toIso8601String(),
        'scheduledTime': scheduledTime?.toIso8601String(),
        'description': description,
        'estimatedPrice': estimatedPrice,
        'currency': currency,
        'paymentMethod': paymentMethod,
        'serviceDetails': serviceDetails,
        'vendorId': vendorId,
        'rating': rating,
        'review': review,
        'createdAt': createdAt.toIso8601String(),
        'completedAt': completedAt?.toIso8601String(),
      };

  // Create from JSON
  factory ServiceRequest.fromJson(Map<String, dynamic> json) => ServiceRequest(
        id: json['id'] ?? '',
        userId: json['userId'] ?? '',
        serviceType: json['serviceType'] ?? '',
        status: json['status'] ?? 'PENDING',
        location: GeoLocation.fromJson(json['location'] ?? {}),
        requestTime: DateTime.tryParse(json['requestTime'] ?? '') ?? DateTime.now(),
        scheduledTime: json['scheduledTime'] != null 
            ? DateTime.tryParse(json['scheduledTime']) 
            : null,
        description: json['description'],
        estimatedPrice: (json['estimatedPrice'] ?? 0.0).toDouble(),
        currency: json['currency'] ?? 'USD',
        paymentMethod: json['paymentMethod'] ?? 'CARD',
        serviceDetails: json['serviceDetails'] ?? {},
        vendorId: json['vendorId'],
        rating: json['rating']?.toDouble(),
        review: json['review'],
        createdAt: DateTime.tryParse(json['createdAt'] ?? '') ?? DateTime.now(),
        completedAt: json['completedAt'] != null 
            ? DateTime.tryParse(json['completedAt']) 
            : null,
      );
}

/// Geographic Location
class GeoLocation {
  final double latitude;
  final double longitude;
  final String? address;
  final String? city;
  final String? country;

  GeoLocation({
    required this.latitude,
    required this.longitude,
    this.address,
    this.city,
    this.country,
  });

  Map<String, dynamic> toJson() => {
        'latitude': latitude,
        'longitude': longitude,
        'address': address,
        'city': city,
        'country': country,
      };

  factory GeoLocation.fromJson(Map<String, dynamic> json) => GeoLocation(
        latitude: (json['latitude'] ?? 0.0).toDouble(),
        longitude: (json['longitude'] ?? 0.0).toDouble(),
        address: json['address'],
        city: json['city'],
        country: json['country'],
      );
}

/// User Model
class User {
  final String id;
  final String name;
  final String email;
  final String phone;
  final String? profileImage;
  final String country;
  final String? preferredLanguage;
  final List<String> favoriteServices;
  final double walletBalance;
  final DateTime createdAt;

  User({
    required this.id,
    required this.name,
    required this.email,
    required this.phone,
    this.profileImage,
    required this.country,
    this.preferredLanguage,
    required this.favoriteServices,
    required this.walletBalance,
    required this.createdAt,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'email': email,
        'phone': phone,
        'profileImage': profileImage,
        'country': country,
        'preferredLanguage': preferredLanguage,
        'favoriteServices': favoriteServices,
        'walletBalance': walletBalance,
        'createdAt': createdAt.toIso8601String(),
      };

  factory User.fromJson(Map<String, dynamic> json) => User(
        id: json['id'] ?? '',
        name: json['name'] ?? 'Guest',
        email: json['email'] ?? '',
        phone: json['phone'] ?? '',
        profileImage: json['profileImage'],
        country: json['country'] ?? 'US',
        preferredLanguage: json['preferredLanguage'],
        favoriteServices: List<String>.from(json['favoriteServices'] ?? []),
        walletBalance: (json['walletBalance'] ?? 0.0).toDouble(),
        createdAt: DateTime.tryParse(json['createdAt'] ?? '') ?? DateTime.now(),
      );
}

/// Property Listing
enum PropertyStatus {
  draft,
  published,
  hidden;

  String get value {
    switch (this) {
      case PropertyStatus.draft:
        return 'draft';
      case PropertyStatus.published:
        return 'published';
      case PropertyStatus.hidden:
        return 'hidden';
    }
  }

  static PropertyStatus fromValue(String? raw) {
    switch ((raw ?? '').toLowerCase()) {
      case 'draft':
        return PropertyStatus.draft;
      case 'hidden':
      case 'unpublished':
        return PropertyStatus.hidden;
      case 'published':
      default:
        return PropertyStatus.published;
    }
  }
}

class Property {
  final String id;
  final String title;
  final String description;
  final String propertyType; // VILLA, APARTMENT, STUDIO, etc.
  final String areaName;
  final String city;
  final int? zoneNumber;
  final int? streetNumber;
  final int? buildingNumber;
  final GeoLocation location;
  final String? _legacyNationalAddress;
  final double price;
  final String currency;
  final int bedrooms;
  final int bathrooms;
  final double sizeSqm;
  final int parkingCount;
  final bool furnished;
  final List<String> images;
  final List<String> amenities;
  final PropertyStatus status;
  final String createdBy;
  final DateTime updatedAt;
  final double rating;
  final List<Map<String, dynamic>> reviews;
  final String vendorId;
  final bool isAvailable;
  final DateTime createdAt;

  Property({
    required this.id,
    required this.title,
    required this.description,
    String? propertyType,
    String? type,
    String? areaName,
    String? city,
    this.zoneNumber,
    this.streetNumber,
    this.buildingNumber,
    required this.location,
    String? nationalAddress,
    required this.price,
    String? currency,
    required this.bedrooms,
    required this.bathrooms,
    double? sizeSqm,
    double? area,
    this.parkingCount = 0,
    this.furnished = false,
    required this.images,
    required this.amenities,
    PropertyStatus? status,
    String? createdBy,
    DateTime? updatedAt,
    double? rating,
    List<Map<String, dynamic>>? reviews,
    String? vendorId,
    bool? isAvailable,
    DateTime? createdAt,
  })  : propertyType = (propertyType ?? type ?? 'APARTMENT').toUpperCase(),
        areaName = areaName ?? (location.city ?? ''),
        city = city ?? (location.city ?? ''),
        _legacyNationalAddress = nationalAddress,
        currency = currency ?? 'QAR',
        sizeSqm = sizeSqm ?? area ?? 0,
        status = status ?? PropertyStatus.published,
        createdBy = createdBy ?? vendorId ?? 'command-center',
        updatedAt = updatedAt ?? createdAt ?? DateTime.now(),
        rating = rating ?? 0,
        reviews = reviews ?? const <Map<String, dynamic>>[],
        vendorId = vendorId ?? createdBy ?? 'command-center',
        isAvailable = isAvailable ?? true,
        createdAt = createdAt ?? DateTime.now();

  String get type => propertyType;

  double get area => sizeSqm;

  bool get isPublished => status == PropertyStatus.published;

  String get nationalAddress {
    if (zoneNumber != null && streetNumber != null && buildingNumber != null) {
      return 'Zone $zoneNumber, Street $streetNumber, Building $buildingNumber';
    }
    return _legacyNationalAddress ?? location.address ?? '';
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'description': description,
        'propertyType': propertyType,
        'type': propertyType,
        'areaName': areaName,
        'city': city,
        'zoneNumber': zoneNumber,
        'streetNumber': streetNumber,
        'buildingNumber': buildingNumber,
        'location': location.toJson(),
        'nationalAddress': nationalAddress,
        'price': price,
        'currency': currency,
        'bedrooms': bedrooms,
        'bathrooms': bathrooms,
        'sizeSqm': sizeSqm,
        'area': sizeSqm,
        'parkingCount': parkingCount,
        'furnished': furnished,
        'images': images,
        'amenities': amenities,
        'status': status.value,
        'createdBy': createdBy,
        'updatedAt': updatedAt.toIso8601String(),
        'rating': rating,
        'reviews': reviews,
        'vendorId': vendorId,
        'isAvailable': isAvailable,
        'createdAt': createdAt.toIso8601String(),
      };

  factory Property.fromJson(Map<String, dynamic> json) => Property(
        id: json['id'] ?? '',
        title: json['title'] ?? '',
        description: json['description'] ?? '',
        propertyType: json['propertyType'] ?? json['type'] ?? 'APARTMENT',
        areaName: json['areaName'] ?? '',
        city: json['city'] ?? '',
        zoneNumber: json['zoneNumber'],
        streetNumber: json['streetNumber'],
        buildingNumber: json['buildingNumber'],
        location: GeoLocation.fromJson(json['location'] ?? {}),
        nationalAddress: json['nationalAddress'],
        price: (json['price'] ?? 0.0).toDouble(),
        currency: json['currency'] ?? 'QAR',
        bedrooms: json['bedrooms'] ?? 0,
        bathrooms: json['bathrooms'] ?? 0,
        sizeSqm: (json['sizeSqm'] ?? json['area'] ?? 0.0).toDouble(),
        parkingCount: json['parkingCount'] ?? 0,
        furnished: json['furnished'] ?? false,
        images: List<String>.from(json['images'] ?? []),
        amenities: List<String>.from(json['amenities'] ?? []),
        status: PropertyStatus.fromValue(json['status']),
        createdBy: json['createdBy'],
        updatedAt: json['updatedAt'] != null
          ? DateTime.tryParse(json['updatedAt'])
          : null,
        rating: (json['rating'] ?? 0.0).toDouble(),
        reviews: List<Map<String, dynamic>>.from(json['reviews'] ?? []),
        vendorId: json['vendorId'] ?? '',
        isAvailable: json['isAvailable'] ?? true,
        createdAt: DateTime.tryParse(json['createdAt'] ?? '') ?? DateTime.now(),
      );
}

/// Service Provider/Vendor
class ServiceProvider {
  final String id;
  final String name;
  final String serviceType;
  final String country;
  final String? logo;
  final double rating;
  final int totalRequests;
  final String? contactNumber;
  final List<String> operatingServices;
  final bool isActive;

  ServiceProvider({
    required this.id,
    required this.name,
    required this.serviceType,
    required this.country,
    this.logo,
    required this.rating,
    required this.totalRequests,
    this.contactNumber,
    required this.operatingServices,
    required this.isActive,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'serviceType': serviceType,
        'country': country,
        'logo': logo,
        'rating': rating,
        'totalRequests': totalRequests,
        'contactNumber': contactNumber,
        'operatingServices': operatingServices,
        'isActive': isActive,
      };

  factory ServiceProvider.fromJson(Map<String, dynamic> json) => ServiceProvider(
        id: json['id'] ?? '',
        name: json['name'] ?? '',
        serviceType: json['serviceType'] ?? '',
        country: json['country'] ?? '',
        logo: json['logo'],
        rating: (json['rating'] ?? 0.0).toDouble(),
        totalRequests: json['totalRequests'] ?? 0,
        contactNumber: json['contactNumber'],
        operatingServices: List<String>.from(json['operatingServices'] ?? []),
        isActive: json['isActive'] ?? true,
      );
}

/// Health Service Model
class HealthService {
  final String id;
  final String name;
  final String category; // DOCTOR, CLINIC, HOSPITAL, PHARMACY, LAB
  final String specialty;
  final double rating;
  final int experience; // years of experience
  final double consultationFee;
  final String currency;
  final GeoLocation location;
  final List<DateTime> availableSlots;
  final String image;
  final bool isAvailable;
  final String description;
  final List<String> qualifications;
  final List<String> languages;

  HealthService({
    required this.id,
    required this.name,
    required this.category,
    required this.specialty,
    required this.rating,
    required this.experience,
    required this.consultationFee,
    required this.currency,
    required this.location,
    required this.availableSlots,
    required this.image,
    required this.isAvailable,
    required this.description,
    required this.qualifications,
    required this.languages,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'category': category,
        'specialty': specialty,
        'rating': rating,
        'experience': experience,
        'consultationFee': consultationFee,
        'currency': currency,
        'location': location.toJson(),
        'availableSlots': availableSlots.map((slot) => slot.toIso8601String()).toList(),
        'image': image,
        'isAvailable': isAvailable,
        'description': description,
        'qualifications': qualifications,
        'languages': languages,
      };

  factory HealthService.fromJson(Map<String, dynamic> json) => HealthService(
        id: json['id'] ?? '',
        name: json['name'] ?? '',
        category: json['category'] ?? '',
        specialty: json['specialty'] ?? '',
        rating: (json['rating'] ?? 0.0).toDouble(),
        experience: json['experience'] ?? 0,
        consultationFee: (json['consultationFee'] ?? 0.0).toDouble(),
        currency: json['currency'] ?? 'USD',
        location: GeoLocation.fromJson(json['location'] ?? {}),
        availableSlots: (json['availableSlots'] as List<dynamic>?)
                ?.map((slot) => DateTime.tryParse(slot) ?? DateTime.now())
                .toList() ??
            [],
        image: json['image'] ?? '',
        isAvailable: json['isAvailable'] ?? false,
        description: json['description'] ?? '',
        qualifications: List<String>.from(json['qualifications'] ?? []),
        languages: List<String>.from(json['languages'] ?? []),
      );
}

/// Travel Package Model
class TravelPackage {
  final String id;
  final String title;
  final String description;
  final String type; // FLIGHT, HOTEL, TOUR, CRUISE
  final String destination;
  final String duration;
  final double price;
  final String currency;
  final double rating;
  final List<String> images;
  final List<String> includes;
  final DateTime departureDate;
  final DateTime returnDate;
  final int availableSeats;
  final int totalSeats;
  final String provider;
  final bool isAvailable;

  TravelPackage({
    required this.id,
    required this.title,
    required this.description,
    required this.type,
    required this.destination,
    required this.duration,
    required this.price,
    required this.currency,
    required this.rating,
    required this.images,
    required this.includes,
    required this.departureDate,
    required this.returnDate,
    required this.availableSeats,
    required this.totalSeats,
    required this.provider,
    required this.isAvailable,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'description': description,
        'type': type,
        'destination': destination,
        'duration': duration,
        'price': price,
        'currency': currency,
        'rating': rating,
        'images': images,
        'includes': includes,
        'departureDate': departureDate.toIso8601String(),
        'returnDate': returnDate.toIso8601String(),
        'availableSeats': availableSeats,
        'totalSeats': totalSeats,
        'provider': provider,
        'isAvailable': isAvailable,
      };

  factory TravelPackage.fromJson(Map<String, dynamic> json) => TravelPackage(
        id: json['id'] ?? '',
        title: json['title'] ?? '',
        description: json['description'] ?? '',
        type: json['type'] ?? '',
        destination: json['destination'] ?? '',
        duration: json['duration'] ?? '',
        price: (json['price'] ?? 0.0).toDouble(),
        currency: json['currency'] ?? 'USD',
        rating: (json['rating'] ?? 0.0).toDouble(),
        images: List<String>.from(json['images'] ?? []),
        includes: List<String>.from(json['includes'] ?? []),
        departureDate: DateTime.tryParse(json['departureDate'] ?? '') ?? DateTime.now(),
        returnDate: DateTime.tryParse(json['returnDate'] ?? '') ?? DateTime.now(),
        availableSeats: json['availableSeats'] ?? 0,
        totalSeats: json['totalSeats'] ?? 0,
        provider: json['provider'] ?? '',
        isAvailable: json['isAvailable'] ?? false,
      );
}

/// Restaurant Model for Food Delivery
class Restaurant {
  final String id;
  final String name;
  final String category; // FAST_FOOD, ARABIC, ITALIAN, ASIAN, etc.
  final String cuisine;
  final double rating;
  final int deliveryTime; // in minutes
  final double deliveryFee;
  final double minimumOrder;
  final String image;
  final GeoLocation location;
  final bool isOpen;
  final List<MenuItem> menuItems;

  Restaurant({
    required this.id,
    required this.name,
    required this.category,
    required this.cuisine,
    required this.rating,
    required this.deliveryTime,
    required this.deliveryFee,
    required this.minimumOrder,
    required this.image,
    required this.location,
    required this.isOpen,
    required this.menuItems,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'category': category,
        'cuisine': cuisine,
        'rating': rating,
        'deliveryTime': deliveryTime,
        'deliveryFee': deliveryFee,
        'minimumOrder': minimumOrder,
        'image': image,
        'location': location.toJson(),
        'isOpen': isOpen,
        'menuItems': menuItems.map((item) => item.toJson()).toList(),
      };

  factory Restaurant.fromJson(Map<String, dynamic> json) => Restaurant(
        id: json['id'] ?? '',
        name: json['name'] ?? '',
        category: json['category'] ?? '',
        cuisine: json['cuisine'] ?? '',
        rating: (json['rating'] ?? 0.0).toDouble(),
        deliveryTime: json['deliveryTime'] ?? 0,
        deliveryFee: (json['deliveryFee'] ?? 0.0).toDouble(),
        minimumOrder: (json['minimumOrder'] ?? 0.0).toDouble(),
        image: json['image'] ?? '',
        location: GeoLocation.fromJson(json['location'] ?? {}),
        isOpen: json['isOpen'] ?? false,
        menuItems: (json['menuItems'] as List<dynamic>?)
                ?.map((item) => MenuItem.fromJson(item))
                .toList() ??
            [],
      );
}

/// Menu Item Model
class MenuItem {
  final String id;
  final String name;
  final String description;
  final double price;
  final String image;
  final String category;
  final bool isAvailable;

  MenuItem({
    required this.id,
    required this.name,
    required this.description,
    required this.price,
    required this.image,
    required this.category,
    required this.isAvailable,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'description': description,
        'price': price,
        'image': image,
        'category': category,
        'isAvailable': isAvailable,
      };

  factory MenuItem.fromJson(Map<String, dynamic> json) => MenuItem(
        id: json['id'] ?? '',
        name: json['name'] ?? '',
        description: json['description'] ?? '',
        price: (json['price'] ?? 0.0).toDouble(),
        image: json['image'] ?? '',
        category: json['category'] ?? '',
        isAvailable: json['isAvailable'] ?? true,
      );
}

/// Ride Service Model
class Ride {
  final String id;
  final String driverName;
  final double driverRating;
  final String vehicleType; // ECONOMY, PREMIUM, LUXURY
  final String vehicleModel;
  final String licensePlate;
  final GeoLocation currentLocation;
  final DateTime estimatedArrival;
  final double pricePerKm;
  final double baseFare;
  final bool isAvailable;
  final String driverImage;

  Ride({
    required this.id,
    required this.driverName,
    required this.driverRating,
    required this.vehicleType,
    required this.vehicleModel,
    required this.licensePlate,
    required this.currentLocation,
    required this.estimatedArrival,
    required this.pricePerKm,
    required this.baseFare,
    required this.isAvailable,
    required this.driverImage,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'driverName': driverName,
        'driverRating': driverRating,
        'vehicleType': vehicleType,
        'vehicleModel': vehicleModel,
        'licensePlate': licensePlate,
        'currentLocation': currentLocation.toJson(),
        'estimatedArrival': estimatedArrival.toIso8601String(),
        'pricePerKm': pricePerKm,
        'baseFare': baseFare,
        'isAvailable': isAvailable,
        'driverImage': driverImage,
      };

  factory Ride.fromJson(Map<String, dynamic> json) => Ride(
        id: json['id'] ?? '',
        driverName: json['driverName'] ?? '',
        driverRating: (json['driverRating'] ?? 0.0).toDouble(),
        vehicleType: json['vehicleType'] ?? 'ECONOMY',
        vehicleModel: json['vehicleModel'] ?? '',
        licensePlate: json['licensePlate'] ?? '',
        currentLocation: GeoLocation.fromJson(json['currentLocation'] ?? {}),
        estimatedArrival: DateTime.tryParse(json['estimatedArrival'] ?? '') ?? DateTime.now(),
        pricePerKm: (json['pricePerKm'] ?? 0.0).toDouble(),
        baseFare: (json['baseFare'] ?? 0.0).toDouble(),
        isAvailable: json['isAvailable'] ?? false,
        driverImage: json['driverImage'] ?? '',
      );
}

/// API Response Wrapper
class ApiResponse<T> {
  final bool success;
  final String message;
  final T? data;
  final int? statusCode;

  ApiResponse({
    required this.success,
    required this.message,
    this.data,
    this.statusCode,
  });

  factory ApiResponse.fromJson(Map<String, dynamic> json) => ApiResponse(
        success: json['success'] ?? false,
        message: json['message'] ?? '',
        data: json['data'],
        statusCode: json['statusCode'],
      );
}

/// Delivery Order Model for Omni-Delivery Service
/// Supports all types of deliveries: Food, Grocery, Medicine, Documents, Parcels
class DeliveryOrder {
  final String id;
  final String type; // FOOD, GROCERY, MEDICINE, DOCUMENTS, PARCEL
  final String status; // PENDING, PICKED_UP, IN_TRANSIT, DELIVERED, CANCELLED
  final GeoLocation pickupLocation;
  final GeoLocation deliveryLocation;
  final List<String> items;
  final double totalAmount;
  final String currency;
  final double deliveryFee;
  final DateTime estimatedDelivery;
  final String? driverName;
  final String? driverPhone;
  final String? trackingNumber;
  final DateTime createdAt;

  DeliveryOrder({
    required this.id,
    required this.type,
    required this.status,
    required this.pickupLocation,
    required this.deliveryLocation,
    required this.items,
    required this.totalAmount,
    required this.currency,
    required this.deliveryFee,
    required this.estimatedDelivery,
    this.driverName,
    this.driverPhone,
    this.trackingNumber,
    required this.createdAt,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'type': type,
        'status': status,
        'pickupLocation': pickupLocation.toJson(),
        'deliveryLocation': deliveryLocation.toJson(),
        'items': items,
        'totalAmount': totalAmount,
        'currency': currency,
        'deliveryFee': deliveryFee,
        'estimatedDelivery': estimatedDelivery.toIso8601String(),
        'driverName': driverName,
        'driverPhone': driverPhone,
        'trackingNumber': trackingNumber,
        'createdAt': createdAt.toIso8601String(),
      };

  factory DeliveryOrder.fromJson(Map<String, dynamic> json) => DeliveryOrder(
        id: json['id'] ?? '',
        type: json['type'] ?? 'PARCEL',
        status: json['status'] ?? 'PENDING',
        pickupLocation: GeoLocation.fromJson(json['pickupLocation'] ?? {}),
        deliveryLocation: GeoLocation.fromJson(json['deliveryLocation'] ?? {}),
        items: List<String>.from(json['items'] ?? []),
        totalAmount: (json['totalAmount'] ?? 0.0).toDouble(),
        currency: json['currency'] ?? 'USD',
        deliveryFee: (json['deliveryFee'] ?? 0.0).toDouble(),
        estimatedDelivery: DateTime.tryParse(json['estimatedDelivery'] ?? '') ?? DateTime.now(),
        driverName: json['driverName'],
        driverPhone: json['driverPhone'],
        trackingNumber: json['trackingNumber'],
        createdAt: DateTime.tryParse(json['createdAt'] ?? '') ?? DateTime.now(),
      );
}

/// Hotel Service Model - الخدمات الفندقية المجانية
/// خدمات مجانية للمستأجرين بعد تأكيد الحجز
class HotelService {
  final String id;
  final String title;
  final String description;
  final String type; // FURNITURE_MOVING, MAINTENANCE, CLEANING, AIRPORT_TRANSFER, INSURANCE
  final bool isFree;
  final double? maxFreeAmount;
  final String currency;
  final String estimatedTime;
  final bool available24_7;
  final String? workingHours;
  final String? frequency;
  final List<InsurancePackage>? packages;
  final String icon;
  final String status; // AVAILABLE, BUSY, MAINTENANCE

  HotelService({
    required this.id,
    required this.title,
    required this.description,
    required this.type,
    required this.isFree,
    this.maxFreeAmount,
    required this.currency,
    required this.estimatedTime,
    required this.available24_7,
    this.workingHours,
    this.frequency,
    this.packages,
    required this.icon,
    required this.status,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'description': description,
        'type': type,
        'isFree': isFree,
        'maxFreeAmount': maxFreeAmount,
        'currency': currency,
        'estimatedTime': estimatedTime,
        'available24_7': available24_7,
        'workingHours': workingHours,
        'frequency': frequency,
        'packages': packages?.map((p) => p.toJson()).toList(),
        'icon': icon,
        'status': status,
      };

  factory HotelService.fromJson(Map<String, dynamic> json) => HotelService(
        id: json['id'] ?? '',
        title: json['title'] ?? '',
        description: json['description'] ?? '',
        type: json['type'] ?? '',
        isFree: json['isFree'] ?? false,
        maxFreeAmount: json['maxFreeAmount']?.toDouble(),
        currency: json['currency'] ?? 'QAR',
        estimatedTime: json['estimatedTime'] ?? '',
        available24_7: json['available24_7'] ?? false,
        workingHours: json['workingHours'],
        frequency: json['frequency'],
        packages: json['packages'] != null
            ? List<InsurancePackage>.from(
                json['packages'].map((p) => InsurancePackage.fromJson(p)))
            : null,
        icon: json['icon'] ?? '',
        status: json['status'] ?? 'AVAILABLE',
      );
}

/// Insurance Package Model - باقات التأمين ضد التعثر
class InsurancePackage {
  final String name;
  final double price;
  final int coverage; // months

  InsurancePackage({
    required this.name,
    required this.price,
    required this.coverage,
  });

  Map<String, dynamic> toJson() => {
        'name': name,
        'price': price,
        'coverage': coverage,
      };

  factory InsurancePackage.fromJson(Map<String, dynamic> json) => InsurancePackage(
        name: json['name'] ?? '',
        price: (json['price'] ?? 0.0).toDouble(),
        coverage: json['coverage'] ?? 0,
      );
}

/// Paid Service Model - الخدمات المدفوعة (أوبر، طلبات، إلخ)
/// خدمات خارجية متكاملة مع التطبيق
class PaidService {
  final String id;
  final String name;
  final String description;
  final String category; // TRANSPORT, FOOD, DELIVERY, SERVICES
  final String icon;
  final Color color;
  final bool isAvailable;
  final String estimatedTime;
  final double rating;
  final int totalUsers;
  final List<String> features;

  PaidService({
    required this.id,
    required this.name,
    required this.description,
    required this.category,
    required this.icon,
    required this.color,
    required this.isAvailable,
    required this.estimatedTime,
    required this.rating,
    required this.totalUsers,
    required this.features,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'description': description,
        'category': category,
        'icon': icon,
        'color': color.toARGB32(),
        'isAvailable': isAvailable,
        'estimatedTime': estimatedTime,
        'rating': rating,
        'totalUsers': totalUsers,
        'features': features,
      };

  factory PaidService.fromJson(Map<String, dynamic> json) => PaidService(
        id: json['id'] ?? '',
        name: json['name'] ?? '',
        description: json['description'] ?? '',
        category: json['category'] ?? '',
        icon: json['icon'] ?? '',
        color: Color(json['color'] ?? 0xFF000000),
        isAvailable: json['isAvailable'] ?? false,
        estimatedTime: json['estimatedTime'] ?? '',
        rating: (json['rating'] ?? 0.0).toDouble(),
        totalUsers: json['totalUsers'] ?? 0,
        features: List<String>.from(json['features'] ?? []),
      );
}
