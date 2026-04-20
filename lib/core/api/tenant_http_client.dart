import 'dart:convert';

import 'package:http/http.dart' as http;

import '../auth/tenant_api_tokens.dart';
import '../realtime/unified_requests_socket.dart';
import 'omnirent_api_env.dart';

/// Central HTTP client: `Authorization: Bearer`, 401 → `/auth/refresh` once → retry.
class TenantHttpClient {
  TenantHttpClient._();

  static String _base() => OmnirentApiEnv.normalizedBase();

  static Future<bool> _tryRefreshSession() async {
    final String rt = TenantApiTokens.instance.refreshToken;
    if (rt.isEmpty) {
      return false;
    }
    final Uri uri = Uri.parse('${_base()}/auth/refresh');
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
      await TenantApiTokens.instance.persistSession(accessToken: at, refreshToken: rt2);
      UnifiedRequestsSocketClient.instance.invalidateAfterTokenRefresh();
      return true;
    } catch (_) {
      return false;
    }
  }

  /// One 401 → refresh → single retry of [send].
  static Future<http.Response> _with401Retry(Future<http.Response> Function() send) async {
    http.Response r = await send();
    if (r.statusCode != 401) {
      return r;
    }
    if (!TenantApiTokens.instance.hasRefreshToken) {
      return r;
    }
    final bool ok = await _tryRefreshSession();
    if (!ok) {
      return r;
    }
    return send();
  }

  static Map<String, String> _authHeaders(Map<String, String>? extra) {
    return <String, String>{
      'Accept': 'application/json',
      ...?extra,
      'Authorization': 'Bearer ${TenantApiTokens.instance.accessToken}',
    };
  }

  static Future<http.Response> authorizedGet(Uri uri, {Map<String, String>? headers}) {
    return _with401Retry(() => http.get(uri, headers: _authHeaders(headers)));
  }

  static Future<http.Response> authorizedPost(
    Uri uri, {
    Object? body,
    Map<String, String>? headers,
    Encoding? encoding,
  }) {
    final Map<String, String> h = _authHeaders(<String, String>{
      'Content-Type': 'application/json',
      ...?headers,
    });
    return _with401Retry(
      () => http.post(uri, headers: h, body: body, encoding: encoding),
    );
  }
}
