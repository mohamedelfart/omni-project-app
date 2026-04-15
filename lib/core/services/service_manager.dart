import 'dart:async';
import 'package:flutter/material.dart';
import '../models/models.dart';
import '../brain/brain.dart';
import '../brain/sla/sla_engine.dart';
import '../brain/routing/routing_engine.dart';
import '../../features/properties/data/doha_areas.dart';
import '../../features/command_center/models/unified_operational_item.dart';

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
  // Centralized TicketAction log
  final List<TicketAction> _ticketActions = <TicketAction>[];
  final StreamController<SLAEvaluationResult> _slaOutputStreamController = StreamController<SLAEvaluationResult>.broadcast();
  final StreamController<RoutingResult> _routingOutputStreamController = StreamController<RoutingResult>.broadcast();
  final StreamController<BrainOutput> _brainOutputStreamController = StreamController<BrainOutput>.broadcast();

  Stream<SLAEvaluationResult> get slaOutputStream => _slaOutputStreamController.stream;
  Stream<RoutingResult> get routingOutputStream => _routingOutputStreamController.stream;
  Stream<BrainOutput> get brainOutputStream => _brainOutputStreamController.stream;

  void _setupSLAEvaluation() {
    _requestStreamController.stream.listen((ServiceRequest request) {
      final sla = SLAEngine.evaluate(request);
      _slaOutputStreamController.add(sla);
    });
  }
  void _setupRoutingEvaluation() {
    _requestStreamController.stream.listen((ServiceRequest request) {
      final routing = RoutingEngine.evaluate(request);
      _routingOutputStreamController.add(routing);
    });
  }
  void _setupBrainEvaluation() {
    _requestStreamController.stream.listen((ServiceRequest request) {
      final output = Brain.evaluateRequest(request);
      _brainOutputStreamController.add(output);
    });
  }

  /// Central method for all ticket mutations (MVP, now with escalation)
  Future<TicketAction> handleTicketAction(TicketActionRequest request) async {
    // Validate
    final ticket = _tickets.firstWhere((t) => t.ticketId == request.ticketId, orElse: () => throw Exception('Ticket not found'));

    // Snapshot before
    final stateBefore = {
      'assignedTo': ticket.assignedTo,
      'assignedTeam': ticket.assignedTeam,
      'status': ticket.status,
      'priority': ticket.request.serviceDetails['priority'],
    };

    // Simple approval logic (MVP)
    String decisionStatus = 'approved';
    String executionStatus = 'executed';


    // Execute mutation
    if (request.actionType == 'assignment') {
      ticket.assignedTo = request.payload['assignedTo'];
      ticket.assignedTeam = request.payload['assignedTeam'];
      ticket.assignedAt = DateTime.now();
      ticket.updatedAt = DateTime.now();
      ticket.updatedBy = request.sourceType;
    } else if (request.actionType == 'escalation') {
      // Escalation: update priority and optionally assignment
      final newPriority = request.payload['priority'];
      if (newPriority != null) {
        ticket.request.serviceDetails['priority'] = newPriority;
      }
      if (request.payload['assignedTo'] != null) {
        ticket.assignedTo = request.payload['assignedTo'];
        ticket.assignedAt = DateTime.now();
      }
      if (request.payload['assignedTeam'] != null) {
        ticket.assignedTeam = request.payload['assignedTeam'];
      }
      ticket.updatedAt = DateTime.now();
      ticket.updatedBy = request.sourceType;
    } else if (request.actionType == 'reassign') {
      // Reassign: only update assignment fields if changed
      bool changed = false;
      if (request.payload['assignedTo'] != null && request.payload['assignedTo'] != ticket.assignedTo) {
        ticket.assignedTo = request.payload['assignedTo'];
        changed = true;
      }
      if (request.payload['assignedTeam'] != null && request.payload['assignedTeam'] != ticket.assignedTeam) {
        ticket.assignedTeam = request.payload['assignedTeam'];
        changed = true;
      }
      if (changed) {
        ticket.assignedAt = DateTime.now();
      }
      ticket.updatedAt = DateTime.now();
      ticket.updatedBy = request.sourceType;
    } else {
      // For unsupported actions, reject
      decisionStatus = 'rejected';
      executionStatus = 'failed';
    }

    // Snapshot after
    final stateAfter = {
      'assignedTo': ticket.assignedTo,
      'assignedTeam': ticket.assignedTeam,
      'status': ticket.status,
      'priority': ticket.request.serviceDetails['priority'],
    };

    final action = TicketAction(
      id: 'action-${DateTime.now().millisecondsSinceEpoch}',
      ticketId: request.ticketId,
      actionType: request.actionType,
      sourceType: request.sourceType,
      reasonCode: request.reasonCode,
      payload: request.payload,
      decisionStatus: decisionStatus,
      executionStatus: executionStatus,
      stateBefore: stateBefore,
      stateAfter: stateAfter,
      createdAt: DateTime.now(),
    );
    _ticketActions.add(action);
    return action;
  }

  /// Assign a ServiceTicket to a user/team (now routed through TicketAction)
  Future<ServiceTicket?> assignTicket({
    required String ticketId,
    String? assignedTo,
    String? assignedTeam,
    String? updatedBy,
  }) async {
    final action = await handleTicketAction(TicketActionRequest(
      ticketId: ticketId,
      actionType: 'assignment',
      sourceType: updatedBy ?? 'command_center',
      reasonCode: 'manual_assign',
      payload: {
        'assignedTo': assignedTo,
        'assignedTeam': assignedTeam,
      },
    ));
    if (action.executionStatus == 'executed') {
      try {
        return _tickets.firstWhere((t) => t.ticketId == ticketId);
      } catch (_) {
        return null;
      }
    }
    return null;
  }

  /// Returns a unified list of UnifiedOperationalItem for Command Center
  Future<List<UnifiedOperationalItem>> getUnifiedOperationalItems() async {
    // Gather all requests and tickets
    final List<ServiceRequest> requests = await getAllRequests();
    final List<ServiceTicket> tickets = getAllTickets();

    // Map request id to ticket
    final Map<String, ServiceTicket> ticketMap = {
      for (final t in tickets) t.request.id: t
    };

    // Build unified list
    final List<UnifiedOperationalItem> items = requests.map((req) {
      final ticket = ticketMap[req.id];
      return UnifiedOperationalItem(ticket: ticket, request: req);
    }).toList();
    return items;
  }

      /// Returns all requests (for migration safety)
      Future<List<ServiceRequest>> getAllRequests() async {
        // This should be replaced with real data source in production
        // For now, gather from _requestStreamController if possible
        // (Or use a persistent store if available)
        // Placeholder: return empty list if not implemented
        return [];
      }
    // Additive: ServiceTicket management (Phase 1)
    final StreamController<ServiceTicket> _ticketStreamController = StreamController<ServiceTicket>.broadcast();
    final List<ServiceTicket> _tickets = <ServiceTicket>[];

    Stream<ServiceTicket> get ticketStream => _ticketStreamController.stream;


    /// Additive: Create a ServiceTicket for a ServiceRequest and distribute (Phase 2)
    Future<ServiceTicket> createServiceTicket({
      required ServiceRequest request,
      String createdBy = 'system',
      String status = 'open',
      int escalationLevel = 0,
      String? escalationReason,
      List<String>? previousAssignees,
      List<TicketHandoff>? handoffHistory,
    }) async {
      // Step 1: Create ticket with minimal fields
      final ticket = ServiceTicket(
        ticketId: _generateTicketId(),
        request: request,
        status: status,
        assignedTo: null,
        assignedTeam: null,
        assignedAt: null,
        createdBy: createdBy,
        escalationLevel: escalationLevel,
        escalationReason: escalationReason,
        previousAssignees: previousAssignees,
        handoffHistory: handoffHistory,
      );

      // Step 2: Distribute using DistributionEngine
      final distributionResult = DistributionEngine.distribute(ticket);

      // Step 3: Update ticket assignment fields (additive, safe)
      ticket.assignedTo = distributionResult.assignedTo;
      ticket.assignedTeam = distributionResult.assignedTeam;
      ticket.updatedAt = DateTime.now();
      // Optionally: assignedVendor, adapterRoute, escalation, fallback, audit log
      // (Extend ServiceTicket if needed in future phases)

      // Step 4: Audit log (MVP: add to handoffHistory if escalated/fallback)
      if (distributionResult.escalated || distributionResult.fallback) {
        ticket.handoffHistory.add(TicketHandoff(
          from: createdBy,
          to: distributionResult.assignedTo ?? 'unassigned',
          at: DateTime.now(),
          reason: distributionResult.auditNote,
        ));
      }

      _tickets.add(ticket);
      _ticketStreamController.add(ticket);
      return ticket;
    }

    /// List all tickets (additive, for audit/future migration)
    List<ServiceTicket> getAllTickets() => List.unmodifiable(_tickets);

    /// Find tickets by request id
    List<ServiceTicket> findTicketsByRequestId(String requestId) {
      return _tickets.where((t) => t.request.id == requestId).toList();
    }

    /// Generate unique ticket id
    String _generateTicketId() {
      return 'TICKET-[0m${DateTime.now().millisecondsSinceEpoch}-${_tickets.length + 1}';
    }
  static final ServiceManager _instance = ServiceManager._internal();

  // Services Map
  final StreamController<ServiceRequest> _requestStreamController =
      StreamController<ServiceRequest>.broadcast();
  final StreamController<ViewingRequest> _viewingRequestStreamController =
      StreamController<ViewingRequest>.broadcast();
  final List<Property> _inventory = <Property>[];
  final List<ViewingRequest> _viewingRequests = <ViewingRequest>[];

  factory ServiceManager() {
    return _instance;
  }

  ServiceManager._internal() {
    _inventory.addAll(_generateMockProperties());
    _setupBrainEvaluation();
    _setupRoutingEvaluation();
    _setupSLAEvaluation();
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
      viewingState: property.viewingState,
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
      viewingState: property.viewingState,
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

  Future<ViewingRequest> createViewingRequest({
    required String propertyId,
    required DateTime viewingDateTime,
    required String tenantId,
    required String tenantName,
    String? tenantPhone,
  }) async {
    await Future.delayed(const Duration(milliseconds: 250));

    final int propertyIndex = _inventory.indexWhere(
      (Property p) => p.id == propertyId,
    );
    if (propertyIndex < 0) {
      throw Exception('Property not found for viewing request');
    }

    final Property property = _inventory[propertyIndex];
    final List<ViewingRequestStatus> completed = <ViewingRequestStatus>[
      ViewingRequestStatus.requestSubmitted,
    ];

    ViewingRequestStatus currentStatus =
        ViewingRequestStatus.requestSubmitted;

    if (property.vendorId.trim().isNotEmpty) {
      completed.add(ViewingRequestStatus.coordinatorAssigned);
      currentStatus = ViewingRequestStatus.coordinatorAssigned;
    }

    final DateTime now = DateTime.now();
    final ViewingRequest request = ViewingRequest(
      id: _generateViewingRequestId(),
      propertyId: property.id,
      propertyTitle: property.title,
      viewingDateTime: viewingDateTime,
      tenantId: tenantId,
      tenantName: tenantName,
      tenantPhone: tenantPhone,
      coordinatorId: property.vendorId,
      coordinatorName: property.vendorId,
      notes: <String>[
        'Request submitted by $tenantName',
      ],
      currentStatus: currentStatus,
      completedStatuses: completed,
      createdAt: now,
      updatedAt: now,
    );

    _viewingRequests.insert(0, request);
    _viewingRequestStreamController.add(request);

    await _setPropertyViewingState(
      propertyId: property.id,
      state: PropertyViewingState.underViewing,
    );

    return request;
  }

  Future<ViewingRequest> updateViewingRequestStatus({
    required String requestId,
    required ViewingRequestStatus newStatus,
  }) async {
    await Future.delayed(const Duration(milliseconds: 200));

    final int index =
        _viewingRequests.indexWhere((ViewingRequest r) => r.id == requestId);
    if (index < 0) {
      throw Exception('Viewing request not found');
    }

    final ViewingRequest current = _viewingRequests[index];
    _assertStatusTransitionAllowed(
      currentStatus: current.currentStatus,
      newStatus: newStatus,
    );
    final List<ViewingRequestStatus> completed =
        List<ViewingRequestStatus>.from(current.completedStatuses);
    if (!completed.contains(newStatus)) {
      completed.add(newStatus);
    }

    final ViewingRequest updated = ViewingRequest(
      id: current.id,
      propertyId: current.propertyId,
      propertyTitle: current.propertyTitle,
      viewingDateTime: current.viewingDateTime,
      tenantId: current.tenantId,
      tenantName: current.tenantName,
      tenantPhone: current.tenantPhone,
      coordinatorId: current.coordinatorId,
      coordinatorName: current.coordinatorName,
      notes: current.notes,
      currentStatus: newStatus,
      completedStatuses: completed,
      createdAt: current.createdAt,
      updatedAt: DateTime.now(),
    );

    _viewingRequests[index] = updated;
    _viewingRequestStreamController.add(updated);

    if (newStatus == ViewingRequestStatus.unitReserved) {
      await _setPropertyViewingState(
        propertyId: updated.propertyId,
        state: PropertyViewingState.reserved,
      );
    }
    if (newStatus == ViewingRequestStatus.unitReleased) {
      await _setPropertyViewingState(
        propertyId: updated.propertyId,
        state: PropertyViewingState.available,
      );
    }

    return updated;
  }

  Future<ViewingRequest> resolveViewingDecision({
    required String requestId,
    required bool reserveUnit,
  }) async {
    final ViewingRequest withDecisionPending = await updateViewingRequestStatus(
      requestId: requestId,
      newStatus: ViewingRequestStatus.tenantDecisionPending,
    );

    final ViewingRequest result = await updateViewingRequestStatus(
      requestId: withDecisionPending.id,
      newStatus: reserveUnit
          ? ViewingRequestStatus.unitReserved
          : ViewingRequestStatus.unitReleased,
    );

    // Business rule: tenant can have multiple viewings, but only one active
    // reservation at a time. When one request is reserved, other active
    // requests for the same tenant are auto-released.
    if (reserveUnit) {
      await _autoReleaseOtherActiveRequestsForTenant(
        tenantId: result.tenantId,
        keepRequestId: result.id,
      );
      await _syncPropertyViewingStateFromRequests(propertyId: result.propertyId);
    }

    return result;
  }

  ViewingActionIntent? getPrimaryViewingIntent(ViewingRequest request) {
    switch (request.currentStatus) {
      case ViewingRequestStatus.requestSubmitted:
        return ViewingActionIntent.assignCoordinator;
      case ViewingRequestStatus.coordinatorAssigned:
        return ViewingActionIntent.vendorAccept;
      case ViewingRequestStatus.vendorConfirmed:
        return ViewingActionIntent.confirmSchedule;
      case ViewingRequestStatus.viewingScheduled:
        return ViewingActionIntent.completeViewing;
      case ViewingRequestStatus.viewingCompleted:
      case ViewingRequestStatus.tenantDecisionPending:
        return ViewingActionIntent.reserveUnit;
      case ViewingRequestStatus.unitReserved:
      case ViewingRequestStatus.unitReleased:
      case ViewingRequestStatus.vendorRejected:
        return null;
    }
  }

  Future<ViewingRequest> submitViewingIntent({
    required String requestId,
    required ViewingActionIntent intent,
    String? actorId,
    String? actorName,
    String? note,
  }) async {
    final ViewingRequest current = _requireViewingRequest(requestId);

    if (intent == ViewingActionIntent.runPrimaryAction) {
      final ViewingActionIntent? primary = getPrimaryViewingIntent(current);
      if (primary == null) {
        throw Exception('No primary action available for this viewing case');
      }
      return submitViewingIntent(
        requestId: requestId,
        intent: primary,
        actorId: actorId,
        actorName: actorName,
        note: note,
      );
    }

    _assertViewingIntentLegal(current: current, intent: intent);

    switch (intent) {
      case ViewingActionIntent.assignCoordinator:
        final String resolvedCoordinatorId =
            _resolveCoordinatorId(current, preferredActorId: actorId);
        final String resolvedCoordinatorName = _resolveCoordinatorName(
          current,
          coordinatorId: resolvedCoordinatorId,
          preferredActorName: actorName,
        );
        return assignViewingCoordinator(
          requestId: requestId,
          coordinatorId: resolvedCoordinatorId,
          coordinatorName: resolvedCoordinatorName,
        );
      case ViewingActionIntent.vendorAccept:
        return vendorAcceptAssignment(requestId: requestId);
      case ViewingActionIntent.vendorReject:
        return rejectVendorAssignment(
          requestId: requestId,
          rejectedVendorId: actorId ?? current.coordinatorId ?? '',
        );
      case ViewingActionIntent.confirmSchedule:
        return updateViewingRequestStatus(
          requestId: requestId,
          newStatus: ViewingRequestStatus.viewingScheduled,
        );
      case ViewingActionIntent.completeViewing:
        return updateViewingRequestStatus(
          requestId: requestId,
          newStatus: ViewingRequestStatus.viewingCompleted,
        );
      case ViewingActionIntent.reserveUnit:
        return resolveViewingDecision(
          requestId: requestId,
          reserveUnit: true,
        );
      case ViewingActionIntent.releaseUnit:
        return resolveViewingDecision(
          requestId: requestId,
          reserveUnit: false,
        );
      case ViewingActionIntent.addCaseNote:
        return addViewingCaseNote(
          requestId: requestId,
          note: note ?? 'Case note added by operations',
        );
      case ViewingActionIntent.runPrimaryAction:
        throw Exception('Primary action must be resolved before execution');
    }
  }

  Future<void> _autoReleaseOtherActiveRequestsForTenant({
    required String tenantId,
    required String keepRequestId,
  }) async {
    final List<int> targetIndexes = <int>[];

    for (int i = 0; i < _viewingRequests.length; i++) {
      final ViewingRequest request = _viewingRequests[i];
      final bool isSameTenant = request.tenantId == tenantId;
      final bool isSameRequest = request.id == keepRequestId;
      final bool isClosed =
          request.currentStatus == ViewingRequestStatus.unitReserved ||
          request.currentStatus == ViewingRequestStatus.unitReleased;

      if (isSameTenant && !isSameRequest && !isClosed) {
        targetIndexes.add(i);
      }
    }

    for (final int index in targetIndexes) {
      final ViewingRequest current = _viewingRequests[index];
      final List<ViewingRequestStatus> completed =
          List<ViewingRequestStatus>.from(current.completedStatuses);
      if (!completed.contains(ViewingRequestStatus.unitReleased)) {
        completed.add(ViewingRequestStatus.unitReleased);
      }

      final ViewingRequest updated = ViewingRequest(
        id: current.id,
        propertyId: current.propertyId,
        propertyTitle: current.propertyTitle,
        viewingDateTime: current.viewingDateTime,
        tenantId: current.tenantId,
        tenantName: current.tenantName,
        tenantPhone: current.tenantPhone,
        coordinatorId: current.coordinatorId,
        coordinatorName: current.coordinatorName,
        notes: <String>[
          ...current.notes,
          'Auto-released because another unit was reserved by the same tenant.',
        ],
        currentStatus: ViewingRequestStatus.unitReleased,
        completedStatuses: completed,
        createdAt: current.createdAt,
        updatedAt: DateTime.now(),
      );

      _viewingRequests[index] = updated;
      _viewingRequestStreamController.add(updated);
      await _syncPropertyViewingStateFromRequests(propertyId: updated.propertyId);
    }
  }

  Future<void> _syncPropertyViewingStateFromRequests({
    required String propertyId,
  }) async {
    final List<ViewingRequest> related = _viewingRequests
        .where((ViewingRequest r) => r.propertyId == propertyId)
        .toList();

    final bool hasReserved = related.any(
      (ViewingRequest r) => r.currentStatus == ViewingRequestStatus.unitReserved,
    );
    final bool hasActive = related.any(
      (ViewingRequest r) =>
          r.currentStatus != ViewingRequestStatus.unitReserved &&
          r.currentStatus != ViewingRequestStatus.unitReleased,
    );

    final PropertyViewingState nextState = hasReserved
        ? PropertyViewingState.reserved
        : hasActive
            ? PropertyViewingState.underViewing
            : PropertyViewingState.available;

    await _setPropertyViewingState(propertyId: propertyId, state: nextState);
  }

  Future<ViewingRequest> assignViewingCoordinator({
    required String requestId,
    required String coordinatorId,
    required String coordinatorName,
  }) async {
    await Future.delayed(const Duration(milliseconds: 150));

    final int index =
        _viewingRequests.indexWhere((ViewingRequest r) => r.id == requestId);
    if (index < 0) {
      throw Exception('Viewing request not found for coordinator assignment');
    }

    final ViewingRequest current = _viewingRequests[index];
    _assertViewingIntentLegal(
      current: current,
      intent: ViewingActionIntent.assignCoordinator,
    );
    final List<ViewingRequestStatus> completed =
        List<ViewingRequestStatus>.from(current.completedStatuses);
    if (!completed.contains(ViewingRequestStatus.coordinatorAssigned)) {
      completed.add(ViewingRequestStatus.coordinatorAssigned);
    }

    final ViewingRequest updated = ViewingRequest(
      id: current.id,
      propertyId: current.propertyId,
      propertyTitle: current.propertyTitle,
      viewingDateTime: current.viewingDateTime,
      tenantId: current.tenantId,
      tenantName: current.tenantName,
      tenantPhone: current.tenantPhone,
      coordinatorId: coordinatorId,
      coordinatorName: coordinatorName,
      notes: <String>[
        ...current.notes,
        'Coordinator assigned: $coordinatorName',
      ],
      currentStatus: ViewingRequestStatus.coordinatorAssigned,
      completedStatuses: completed,
      createdAt: current.createdAt,
      updatedAt: DateTime.now(),
    );

    _viewingRequests[index] = updated;
    _viewingRequestStreamController.add(updated);
    return updated;
  }

  Future<ViewingRequest> addViewingCaseNote({
    required String requestId,
    required String note,
  }) async {
    await Future.delayed(const Duration(milliseconds: 120));

    final int index =
        _viewingRequests.indexWhere((ViewingRequest r) => r.id == requestId);
    if (index < 0) {
      throw Exception('Viewing request not found for notes update');
    }

    final ViewingRequest current = _viewingRequests[index];
    final ViewingRequest updated = ViewingRequest(
      id: current.id,
      propertyId: current.propertyId,
      propertyTitle: current.propertyTitle,
      viewingDateTime: current.viewingDateTime,
      tenantId: current.tenantId,
      tenantName: current.tenantName,
      tenantPhone: current.tenantPhone,
      coordinatorId: current.coordinatorId,
      coordinatorName: current.coordinatorName,
      notes: <String>[...current.notes, note],
      currentStatus: current.currentStatus,
      completedStatuses: current.completedStatuses,
      createdAt: current.createdAt,
      updatedAt: DateTime.now(),
    );

    _viewingRequests[index] = updated;
    _viewingRequestStreamController.add(updated);
    return updated;
  }

  Future<ViewingRequest?> getViewingRequestById(String requestId) async {
    await Future.delayed(const Duration(milliseconds: 120));
    final int index =
        _viewingRequests.indexWhere((ViewingRequest r) => r.id == requestId);
    if (index < 0) return null;
    return _viewingRequests[index];
  }

  Future<List<ViewingRequest>> getViewingRequestsForTenant(String tenantId) async {
    await Future.delayed(const Duration(milliseconds: 120));
    return _viewingRequests
        .where((ViewingRequest request) => request.tenantId == tenantId)
        .toList();
  }

  Future<List<ViewingRequest>> getViewingRequestsForCommandCenter() async {
    await Future.delayed(const Duration(milliseconds: 120));
    return List<ViewingRequest>.from(_viewingRequests);
  }

  Future<List<ViewingRequest>> getViewingAssignmentsForVendor(
    String coordinatorId,
  ) async {
    await Future.delayed(const Duration(milliseconds: 120));
    return _viewingRequests
        .where((ViewingRequest request) => request.coordinatorId == coordinatorId)
        .toList();
  }

  // ── Mock Vendor Pool — simulation only, no distance/routing logic ──────────
  static const List<Map<String, String>> _mockVendorPool = <Map<String, String>>[
    <String, String>{'id': 'VENDOR-DEMO-001', 'name': 'Ali Hassan'},
    <String, String>{'id': 'VENDOR-DEMO-002', 'name': 'Omar Khalid'},
    <String, String>{'id': 'VENDOR-DEMO-003', 'name': 'Sara Ahmed'},
  ];

  /// Vendor accepts an assignment. Advances status to vendorConfirmed.
  Future<ViewingRequest> vendorAcceptAssignment({
    required String requestId,
  }) async {
    await Future.delayed(const Duration(milliseconds: 150));
    final ViewingRequest current = _requireViewingRequest(requestId);
    _assertViewingIntentLegal(
      current: current,
      intent: ViewingActionIntent.vendorAccept,
    );
    return updateViewingRequestStatus(
      requestId: requestId,
      newStatus: ViewingRequestStatus.vendorConfirmed,
    );
  }

  /// Vendor rejects an assignment. Core sets transient vendorRejected state,
  /// then immediately reassigns to the next available vendor in the mock pool.
  Future<ViewingRequest> rejectVendorAssignment({
    required String requestId,
    required String rejectedVendorId,
  }) async {
    await Future.delayed(const Duration(milliseconds: 150));

    final int index =
        _viewingRequests.indexWhere((ViewingRequest r) => r.id == requestId);
    if (index < 0) throw Exception('Viewing request not found for rejection');

    final ViewingRequest current = _viewingRequests[index];
    _assertViewingIntentLegal(
      current: current,
      intent: ViewingActionIntent.vendorReject,
    );

    // Step 1: set transient vendorRejected state and emit
    final ViewingRequest rejected = ViewingRequest(
      id: current.id,
      propertyId: current.propertyId,
      propertyTitle: current.propertyTitle,
      viewingDateTime: current.viewingDateTime,
      tenantId: current.tenantId,
      tenantName: current.tenantName,
      tenantPhone: current.tenantPhone,
      coordinatorId: current.coordinatorId,
      coordinatorName: current.coordinatorName,
      notes: <String>[...current.notes, 'Assignment rejected by $rejectedVendorId'],
      currentStatus: ViewingRequestStatus.vendorRejected,
      completedStatuses: List<ViewingRequestStatus>.from(current.completedStatuses),
      createdAt: current.createdAt,
      updatedAt: DateTime.now(),
    );
    _viewingRequests[index] = rejected;
    _viewingRequestStreamController.add(rejected);

    // Step 2: Core picks next vendor from pool (simple simulation — no distance logic)
    final Map<String, String> nextVendor = _mockVendorPool.firstWhere(
      (Map<String, String> v) => v['id'] != rejectedVendorId,
      orElse: () => _mockVendorPool.first,
    );

    // Step 3: Reassign via existing Core method → state returns to coordinatorAssigned
    return assignViewingCoordinator(
      requestId: requestId,
      coordinatorId: nextVendor['id']!,
      coordinatorName: nextVendor['name']!,
    );
  }

  /// Stream for real-time updates
  Stream<ServiceRequest> get requestStream => _requestStreamController.stream;
  Stream<ViewingRequest> get viewingRequestStream =>
      _viewingRequestStreamController.stream;

  /// Cleanup
  void dispose() {
    _requestStreamController.close();
    _viewingRequestStreamController.close();
    _brainOutputStreamController.close();
    _routingOutputStreamController.close();
    _slaOutputStreamController.close();
  }

  // ========== Helper Methods ==========

  String _generateRequestId() {
    return 'REQ-${DateTime.now().millisecondsSinceEpoch}-${(DateTime.now().millisecond % 1000).toString().padLeft(3, '0')}';
  }

  String _generateViewingRequestId() {
    return 'VIEW-${DateTime.now().microsecondsSinceEpoch}';
  }

  ViewingRequest _requireViewingRequest(String requestId) {
    final int index =
        _viewingRequests.indexWhere((ViewingRequest request) => request.id == requestId);
    if (index < 0) {
      throw Exception('Viewing request not found');
    }
    return _viewingRequests[index];
  }

  void _assertViewingIntentLegal({
    required ViewingRequest current,
    required ViewingActionIntent intent,
  }) {
    final ViewingRequestStatus status = current.currentStatus;

    switch (intent) {
      case ViewingActionIntent.assignCoordinator:
        if (status != ViewingRequestStatus.requestSubmitted &&
            status != ViewingRequestStatus.coordinatorAssigned &&
            status != ViewingRequestStatus.vendorRejected) {
          throw Exception('Coordinator assignment is not allowed from $status');
        }
        return;
      case ViewingActionIntent.vendorAccept:
      case ViewingActionIntent.vendorReject:
        if (status != ViewingRequestStatus.coordinatorAssigned) {
          throw Exception('Vendor action is not allowed from $status');
        }
        return;
      case ViewingActionIntent.confirmSchedule:
        if (status != ViewingRequestStatus.vendorConfirmed) {
          throw Exception('Schedule confirmation is not allowed from $status');
        }
        return;
      case ViewingActionIntent.completeViewing:
        if (status != ViewingRequestStatus.viewingScheduled) {
          throw Exception('Viewing completion is not allowed from $status');
        }
        return;
      case ViewingActionIntent.reserveUnit:
      case ViewingActionIntent.releaseUnit:
        if (status != ViewingRequestStatus.viewingCompleted &&
            status != ViewingRequestStatus.tenantDecisionPending) {
          throw Exception('Viewing decision is not allowed from $status');
        }
        return;
      case ViewingActionIntent.addCaseNote:
        return;
      case ViewingActionIntent.runPrimaryAction:
        return;
    }
  }

  void _assertStatusTransitionAllowed({
    required ViewingRequestStatus currentStatus,
    required ViewingRequestStatus newStatus,
  }) {
    if (currentStatus == newStatus) {
      return;
    }

    final Set<ViewingRequestStatus> allowed = switch (currentStatus) {
      ViewingRequestStatus.requestSubmitted => <ViewingRequestStatus>{
        ViewingRequestStatus.coordinatorAssigned,
      },
      ViewingRequestStatus.coordinatorAssigned => <ViewingRequestStatus>{
        ViewingRequestStatus.vendorConfirmed,
      },
      ViewingRequestStatus.vendorConfirmed => <ViewingRequestStatus>{
        ViewingRequestStatus.viewingScheduled,
      },
      ViewingRequestStatus.viewingScheduled => <ViewingRequestStatus>{
        ViewingRequestStatus.viewingCompleted,
      },
      ViewingRequestStatus.viewingCompleted => <ViewingRequestStatus>{
        ViewingRequestStatus.tenantDecisionPending,
      },
      ViewingRequestStatus.tenantDecisionPending => <ViewingRequestStatus>{
        ViewingRequestStatus.unitReserved,
        ViewingRequestStatus.unitReleased,
      },
      ViewingRequestStatus.unitReserved => <ViewingRequestStatus>{},
      ViewingRequestStatus.unitReleased => <ViewingRequestStatus>{},
      ViewingRequestStatus.vendorRejected => <ViewingRequestStatus>{
        ViewingRequestStatus.coordinatorAssigned,
      },
    };

    if (!allowed.contains(newStatus)) {
      throw Exception(
        'Illegal viewing status transition: $currentStatus -> $newStatus',
      );
    }
  }

  String _resolveCoordinatorId(
    ViewingRequest current, {
    String? preferredActorId,
  }) {
    final String preferred = preferredActorId?.trim() ?? '';
    if (preferred.isNotEmpty) {
      return preferred;
    }

    final String currentCoordinator = current.coordinatorId?.trim() ?? '';
    if (currentCoordinator.isNotEmpty) {
      return currentCoordinator;
    }

    return _mockVendorPool.first['id']!;
  }

  String _resolveCoordinatorName(
    ViewingRequest current, {
    required String coordinatorId,
    String? preferredActorName,
  }) {
    final String preferred = preferredActorName?.trim() ?? '';
    if (preferred.isNotEmpty) {
      return preferred;
    }

    final String currentCoordinator = current.coordinatorName?.trim() ?? '';
    if (currentCoordinator.isNotEmpty) {
      return currentCoordinator;
    }

    final Map<String, String> matched = _mockVendorPool.firstWhere(
      (Map<String, String> vendor) => vendor['id'] == coordinatorId,
      orElse: () => <String, String>{'name': 'Auto Coordinator'},
    );
    return matched['name']!;
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
      viewingState: current.viewingState,
      nationalAddress: current.nationalAddress,
    );

    _inventory[index] = updated;
    return updated;
  }

  Future<Property> _setPropertyViewingState({
    required String propertyId,
    required PropertyViewingState state,
  }) async {
    final int index = _inventory.indexWhere((Property p) => p.id == propertyId);
    if (index < 0) {
      throw Exception('Property not found for viewing-state update');
    }

    final Property current = _inventory[index];
    final bool isAvailable = state != PropertyViewingState.reserved;

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
      status: current.status,
      createdBy: current.createdBy,
      createdAt: current.createdAt,
      updatedAt: DateTime.now(),
      vendorId: current.vendorId,
      rating: current.rating,
      reviews: current.reviews,
      isAvailable: isAvailable,
      viewingState: state,
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
