import 'dart:convert';

import 'package:http/http.dart' as http;

import '../models/models.dart';

/// One row from `GET /api/v1/unified-requests/me`.
class UnifiedRequestListItem {
  UnifiedRequestListItem({
    required this.id,
    required this.requestType,
    required this.status,
    required this.createdAt,
  });

  final String id;
  final String requestType;
  final String status;
  final DateTime createdAt;

  static UnifiedRequestListItem fromJson(Map<String, dynamic> json) {
    final Object? createdRaw = json['createdAt'];
    DateTime createdAt = DateTime.fromMillisecondsSinceEpoch(0);
    if (createdRaw is String) {
      createdAt = DateTime.tryParse(createdRaw) ?? createdAt;
    }
    return UnifiedRequestListItem(
      id: json['id'] as String? ?? '',
      requestType: json['requestType'] as String? ?? '',
      status: json['status']?.toString() ?? '',
      createdAt: createdAt,
    );
  }
}

/// Tenant unified requests API (`POST` create, `GET` mine).
///
/// Configure at run time:
/// - `OMNIRENT_API_BASE` (default `http://127.0.0.1:4000/api/v1`)
/// - `OMNIRENT_API_TOKEN` — JWT for a user allowed to call this endpoint (required for real backend).
class UnifiedRequestsApi {
  UnifiedRequestsApi._();

  static const String _baseUrl = String.fromEnvironment(
    'OMNIRENT_API_BASE',
    defaultValue: 'http://127.0.0.1:4000/api/v1',
  );

  static const String _bearerToken = String.fromEnvironment(
    'OMNIRENT_API_TOKEN',
    defaultValue: '',
  );

  /// Temporary static tenant label for auditing only; server uses JWT `userId` as `tenantId`.
  static const String staticTenantLabel = 'tenant-demo-001';

  static String _normalizeBase() {
    final String trimmed = _baseUrl.trim();
    if (trimmed.isEmpty) {
      return 'http://127.0.0.1:4000/api/v1';
    }
    return trimmed.replaceAll(RegExp(r'/+$'), '');
  }

  static String _countryFor(Property property) {
    final String? c = property.location.country?.trim();
    if (c != null && c.isNotEmpty) {
      return c;
    }
    return 'QA';
  }

  static String _cityFor(Property property) {
    final String fromLoc = property.location.city?.trim() ?? '';
    if (fromLoc.isNotEmpty) {
      return fromLoc;
    }
    final String fromProp = property.city.trim();
    return fromProp.isNotEmpty ? fromProp : 'Doha';
  }

  /// Returns created unified request `id` from the API response body.
  static Future<String> createViewingUnifiedRequest({
    required List<Property> properties,
    required DateTime preferredDateTime,
  }) async {
    if (properties.isEmpty) {
      throw StateError('At least one property is required');
    }
    if (_bearerToken.isEmpty) {
      throw Exception(
        'Missing JWT: set OMNIRENT_API_TOKEN via --dart-define=OMNIRENT_API_TOKEN=...',
      );
    }

    final Property first = properties.first;
    final Uri uri = Uri.parse('${_normalizeBase()}/unified-requests');
    final List<String> propertyIds = properties.map((Property p) => p.id).toList();

    final Map<String, Object?> body = <String, Object?>{
      'requestType': 'viewing',
      'serviceType': 'property-viewing',
      'country': _countryFor(first),
      'city': _cityFor(first),
      'propertyIds': propertyIds,
      'preferredTime': preferredDateTime.toUtc().toIso8601String(),
      'metadata': <String, Object?>{
        'tenantId': staticTenantLabel,
        'source': 'flutter-tenant',
        'flow': 'group-viewing-coordinator',
      },
    };

    final http.Response response = await http.post(
      uri,
      headers: <String, String>{
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $_bearerToken',
      },
      body: jsonEncode(body),
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      String message = 'HTTP ${response.statusCode}';
      try {
        final Object? decoded = jsonDecode(response.body);
        if (decoded is Map<String, dynamic>) {
          final Object? err = decoded['message'] ?? decoded['error'];
          if (err is String && err.isNotEmpty) {
            message = err;
          }
        }
      } catch (_) {
        if (response.body.isNotEmpty) {
          message = response.body.length > 200 ? '${response.body.substring(0, 200)}…' : response.body;
        }
      }
      throw Exception(message);
    }

    final Object? decoded = jsonDecode(response.body);
    if (decoded is! Map<String, dynamic>) {
      throw const FormatException('Unexpected unified-requests response shape');
    }

    final Map<String, dynamic> map = decoded;
    // Nest uses ResponseEnvelopeInterceptor: { success, data, ... }
    final Object? rawData = map['data'];
    final Map<String, dynamic> entity = rawData is Map<String, dynamic>
        ? rawData
        : map;
    final Object? id = entity['id'];
    if (id is! String || id.isEmpty) {
      throw const FormatException('Unified request response missing id');
    }
    return id;
  }

  /// Tenant-safe list: `GET /api/v1/unified-requests/me` (@Roles tenant).
  static Future<List<UnifiedRequestListItem>> listMineForTenant() async {
    if (_bearerToken.isEmpty) {
      throw Exception(
        'Missing JWT: set OMNIRENT_API_TOKEN via --dart-define=OMNIRENT_API_TOKEN=...',
      );
    }

    final Uri uri = Uri.parse('${_normalizeBase()}/unified-requests/me');
    final http.Response response = await http.get(
      uri,
      headers: <String, String>{
        'Accept': 'application/json',
        'Authorization': 'Bearer $_bearerToken',
      },
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      String message = 'HTTP ${response.statusCode}';
      try {
        final Object? decoded = jsonDecode(response.body);
        if (decoded is Map<String, dynamic>) {
          final Object? err = decoded['message'] ?? decoded['error'];
          if (err is String && err.isNotEmpty) {
            message = err;
          }
        }
      } catch (_) {
        if (response.body.isNotEmpty) {
          message = response.body.length > 200 ? '${response.body.substring(0, 200)}…' : response.body;
        }
      }
      throw Exception(message);
    }

    final Object? decoded = jsonDecode(response.body);
    if (decoded is! Map<String, dynamic>) {
      throw const FormatException('Unexpected unified-requests list response shape');
    }
    final Object? rawData = decoded['data'];
    if (rawData is! List) {
      throw const FormatException('Expected envelope data array for GET /unified-requests/me');
    }
    return rawData
        .map((Object? e) => UnifiedRequestListItem.fromJson(e as Map<String, dynamic>))
        .toList();
  }
}
