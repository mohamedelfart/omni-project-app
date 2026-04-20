import 'package:flutter/foundation.dart';

import 'tenant_secure_token_store.dart';

/// In-memory access + refresh JWTs mirrored to secure storage.
class TenantApiTokens extends ChangeNotifier {
  TenantApiTokens._();
  static final TenantApiTokens instance = TenantApiTokens._();

  String _access = '';
  String _refresh = '';

  static String _normalizeBearerToken(String raw) {
    String t = raw.trim();
    if (t.length >= 2) {
      final bool doubleQuoted = t.startsWith('"') && t.endsWith('"');
      final bool singleQuoted = t.startsWith("'") && t.endsWith("'");
      if (doubleQuoted || singleQuoted) {
        t = t.substring(1, t.length - 1).trim();
      }
    }
    const String bearerPrefix = 'Bearer ';
    if (t.length > bearerPrefix.length && t.substring(0, bearerPrefix.length).toLowerCase() == bearerPrefix) {
      t = t.substring(bearerPrefix.length).trim();
    }
    return t;
  }

  String get accessToken => _access;

  String get refreshToken => _refresh;

  bool get hasAccessToken => _access.isNotEmpty;

  bool get hasRefreshToken => _refresh.isNotEmpty;

  /// Load tokens from secure storage (call once at startup before [runApp]).
  Future<void> restoreFromStorage() async {
    final String? a = await TenantSecureTokenStore.instance.readAccess();
    final String? r = await TenantSecureTokenStore.instance.readRefresh();
    _access = _normalizeBearerToken(a ?? '');
    _refresh = _normalizeBearerToken(r ?? '');
    notifyListeners();
  }

  Future<void> persistSession({required String accessToken, required String refreshToken}) async {
    _access = _normalizeBearerToken(accessToken);
    _refresh = _normalizeBearerToken(refreshToken);
    await TenantSecureTokenStore.instance.writePair(accessToken: _access, refreshToken: _refresh);
    notifyListeners();
  }

  Future<void> clearSession() async {
    _access = '';
    _refresh = '';
    await TenantSecureTokenStore.instance.clear();
    notifyListeners();
  }
}
