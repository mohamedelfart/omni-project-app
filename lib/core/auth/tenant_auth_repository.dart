import 'dart:convert';

import 'package:http/http.dart' as http;

import '../api/omnirent_api_env.dart';
import '../realtime/unified_requests_socket.dart';
import 'tenant_api_tokens.dart';

/// Real `/auth/*` flows (no dart-define tokens).
class TenantAuthRepository {
  TenantAuthRepository._();
  static final TenantAuthRepository instance = TenantAuthRepository._();

  static String _base() => OmnirentApiEnv.normalizedBase();

  Future<void> createGuestSession() async {
    final Uri uri = Uri.parse('${_base()}/auth/guest-session');
    final http.Response res = await http.post(
      uri,
      headers: const <String, String>{
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: jsonEncode(<String, dynamic>{}),
    );
    await _persistTokensFromAuthResponse(res, fallbackErrorPrefix: 'Guest session failed');
  }

  /// `POST /auth/login` — persists tokens to memory + secure storage on success.
  Future<void> loginWithEmailPassword({required String email, required String password}) async {
    final Uri uri = Uri.parse('${_base()}/auth/login');
    final http.Response res = await http.post(
      uri,
      headers: <String, String>{
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: jsonEncode(<String, String>{
        'email': email.trim(),
        'password': password,
      }),
    );

    await _persistTokensFromAuthResponse(res, fallbackErrorPrefix: 'Login failed');
  }

  /// Clears session locally, best-effort `POST /auth/logout`, tears down realtime socket.
  Future<void> logout() async {
    if (TenantApiTokens.instance.hasAccessToken) {
      try {
        final Uri uri = Uri.parse('${_base()}/auth/logout');
        await http.post(
          uri,
          headers: <String, String>{
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': 'Bearer ${TenantApiTokens.instance.accessToken}',
          },
          body: jsonEncode(<String, dynamic>{}),
        );
      } catch (_) {
        /* ignore network errors on logout */
      }
    }
    await TenantApiTokens.instance.clearSession();
    UnifiedRequestsSocketClient.instance.disconnectAll();
  }

  Future<void> _persistTokensFromAuthResponse(http.Response res, {required String fallbackErrorPrefix}) async {
    if (res.statusCode < 200 || res.statusCode >= 300) {
      String message = '$fallbackErrorPrefix: HTTP ${res.statusCode}';
      try {
        final Object? decoded = jsonDecode(res.body);
        if (decoded is Map<String, dynamic>) {
          final Object? err = decoded['message'] ?? decoded['error'];
          if (err is String && err.isNotEmpty) {
            message = err;
          }
        }
      } catch (_) {
        if (res.body.isNotEmpty) {
          message = res.body.length > 200 ? '${res.body.substring(0, 200)}…' : res.body;
        }
      }
      throw Exception(message);
    }

    final Object? decoded = jsonDecode(res.body);
    if (decoded is! Map<String, dynamic>) {
      throw const FormatException('Unexpected auth response');
    }
    final Object? data = decoded['data'];
    if (data is! Map<String, dynamic>) {
      throw const FormatException('Auth response missing data envelope');
    }
    final Object? at = data['accessToken'];
    final Object? rt = data['refreshToken'];
    if (at is! String || rt is! String || at.isEmpty || rt.isEmpty) {
      throw const FormatException('Auth response missing tokens');
    }
    await TenantApiTokens.instance.persistSession(accessToken: at, refreshToken: rt);
  }
}
