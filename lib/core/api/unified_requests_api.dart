import 'dart:convert';

import 'package:http/http.dart' as http;

import '../auth/tenant_api_tokens.dart';
import '../models/models.dart';
import '../realtime/unified_requests_socket.dart';
import 'omnirent_api_env.dart';

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

/// Tenant unified requests API (`POST` create, `GET` mine`).
///
/// Configure at run time:
/// - `OMNIRENT_API_BASE` (default `http://127.0.0.1:4000/api/v1`)
/// - `OMNIRENT_API_TOKEN` — access JWT (`Authorization: Bearer …`)
/// - `OMNIRENT_API_REFRESH_TOKEN` — refresh JWT for `POST /auth/refresh` after HTTP 401
class UnifiedRequestsApi {
  UnifiedRequestsApi._();

  static const String _accessFromEnv = String.fromEnvironment(
    'OMNIRENT_API_TOKEN',
    defaultValue: '',
  );

  /// Raw compile-time access token (for debug only).
  static String get bearerTokenFromEnvironment => _accessFromEnv;

  /// `true` when a non-empty access JWT is available.
  static bool get hasTenantJwt => TenantApiTokens.instance.hasAccessToken;

  /// Access JWT for REST `Authorization` and Socket.IO `auth.token`.
  static String get tenantJwt => TenantApiTokens.instance.accessToken;

  /// For logs: `Authorization: Bearer <first10>…<last10>`.
  static String maskedAuthorizationHeader() {
    final String t = TenantApiTokens.instance.accessToken;
    if (t.isEmpty) {
      return 'Authorization: Bearer <empty>';
    }
    if (t.length <= 20) {
      return 'Authorization: Bearer <redacted len=${t.length}>';
    }
    return 'Authorization: Bearer ${t.substring(0, 10)}...${t.substring(t.length - 10)}';
  }

  /// Temporary static tenant label for auditing only; server uses JWT `userId` as `tenantId`.
  static const String staticTenantLabel = 'tenant-demo-001';

  static String _normalizeBase() => OmnirentApiEnv.normalizedBase();

  /// HTTP origin for Socket.IO (same host as API, without trailing `/api/v1`).
  static String socketHttpOrigin() => OmnirentApiEnv.socketHttpOrigin();

  static Future<bool> _tryRefreshSession() async {
    final String rt = TenantApiTokens.instance.refreshToken;
    if (rt.isEmpty) {
      return false;
    }
    final Uri uri = Uri.parse('${_normalizeBase()}/auth/refresh');
    try {
      final http.Response res = await http.post(
        uri,
        headers: <String, String>{
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: jsonEncode(<String, String>{'refreshToken': rt}),
      );
      if (res.statusCode < 200 || res.statusCode >= 300) {
        return false;
      }
      final Object? decoded = jsonDecode(res.body);
      if (decoded is! Map<String, dynamic>) {
        return false;
      }
      final Object? data = decoded['data'];
      if (data is! Map<String, dynamic>) {
        return false;
      }
      final Object? at = data['accessToken'];
      final Object? rt2 = data['refreshToken'];
      if (at is! String || rt2 is! String || at.isEmpty || rt2.isEmpty) {
        return false;
      }
      TenantApiTokens.instance.setTokens(accessToken: at, refreshToken: rt2);
      // ignore: avoid_print
      print('[UnifiedRequestsApi] auth/refresh succeeded (new access + refresh stored)');
      UnifiedRequestsSocketClient.instance.invalidateAfterTokenRefresh();
      return true;
    } catch (_) {
      return false;
    }
  }

  /// On HTTP 401, refreshes session once then retries [send].
  static Future<http.Response> _with401Retry(Future<http.Response> Function() send) async {
    http.Response r = await send();
    if (r.statusCode != 401) {
      return r;
    }
    // ignore: avoid_print
    print('[UnifiedRequestsApi] HTTP 401 — attempting POST /auth/refresh …');
    if (!TenantApiTokens.instance.hasRefreshToken) {
      return r;
    }
    final bool ok = await _tryRefreshSession();
    if (!ok) {
      return r;
    }
    // ignore: avoid_print
    print('[UnifiedRequestsApi] retrying original request after refresh …');
    r = await send();
    if (r.statusCode >= 200 && r.statusCode < 300) {
      // ignore: avoid_print
      print('[UnifiedRequestsApi] request retry succeeded (${r.statusCode})');
    }
    return r;
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
    if (!TenantApiTokens.instance.hasAccessToken) {
      throw Exception(
        'Missing JWT: set OMNIRENT_API_TOKEN via --dart-define=OMNIRENT_API_TOKEN=... '
        'and OMNIRENT_API_REFRESH_TOKEN for automatic renewal '
        '(raw access length=${_accessFromEnv.length}, repr=${jsonEncode(_accessFromEnv)})',
      );
    }

    final Property first = properties.first;
    final Uri uri = Uri.parse('${_normalizeBase()}/unified-requests');
    final List<String> propertyIds = properties.map((Property p) => p.id).toList();

    // ignore: avoid_print
    print('JWT used: $tenantJwt');
    // ignore: avoid_print
    print(
      'OMNIRENT_API_TOKEN raw length=${_accessFromEnv.length}, access runtime length=${TenantApiTokens.instance.accessToken.length}',
    );
    // ignore: avoid_print
    print('Authorization header (masked): ${maskedAuthorizationHeader()}');

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

    final http.Response response = await _with401Retry(() {
      final String authHeaderValue = 'Bearer ${TenantApiTokens.instance.accessToken}';
      return http.post(
        uri,
        headers: <String, String>{
          'Content-Type': 'application/json',
          'Authorization': authHeaderValue,
        },
        body: jsonEncode(body),
      );
    });

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
    if (!TenantApiTokens.instance.hasAccessToken) {
      throw Exception(
        'Missing JWT: set OMNIRENT_API_TOKEN via --dart-define=OMNIRENT_API_TOKEN=... '
        'and OMNIRENT_API_REFRESH_TOKEN for automatic renewal',
      );
    }

    final Uri uri = Uri.parse('${_normalizeBase()}/unified-requests/me');
    final http.Response response = await _with401Retry(() {
      return http.get(
        uri,
        headers: <String, String>{
          'Accept': 'application/json',
          'Authorization': 'Bearer ${TenantApiTokens.instance.accessToken}',
        },
      );
    });

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

  static UnifiedRequestListItem _parseEnvelopeObject(String body) {
    final Object? decoded = jsonDecode(body);
    if (decoded is! Map<String, dynamic>) {
      throw const FormatException('Unexpected unified-requests response shape');
    }
    final Object? rawData = decoded['data'];
    if (rawData is! Map<String, dynamic>) {
      throw const FormatException('Expected envelope data object');
    }
    return UnifiedRequestListItem.fromJson(rawData);
  }

  /// `GET /api/v1/unified-requests/:id` when possible; otherwise falls back to list + match.
  static Future<UnifiedRequestListItem> refreshItemForTenant(String id) async {
    if (id.isEmpty) {
      throw ArgumentError('id required');
    }
    if (!TenantApiTokens.instance.hasAccessToken) {
      throw Exception(
        'Missing JWT: set OMNIRENT_API_TOKEN via --dart-define=OMNIRENT_API_TOKEN=... '
        'and OMNIRENT_API_REFRESH_TOKEN for automatic renewal',
      );
    }

    final Uri uri = Uri.parse('${_normalizeBase()}/unified-requests/${Uri.encodeComponent(id)}');
    try {
      final http.Response response = await _with401Retry(() {
        return http.get(
          uri,
          headers: <String, String>{
            'Accept': 'application/json',
            'Authorization': 'Bearer ${TenantApiTokens.instance.accessToken}',
          },
        );
      });
      if (response.statusCode >= 200 && response.statusCode < 300) {
        return _parseEnvelopeObject(response.body);
      }
    } catch (_) {
      // fall through to list
    }

    final List<UnifiedRequestListItem> list = await listMineForTenant();
    for (final UnifiedRequestListItem row in list) {
      if (row.id == id) {
        return row;
      }
    }
    throw Exception('Request not found in your list');
  }
}
