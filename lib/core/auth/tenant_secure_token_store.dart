import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Keychain / Keystore persistence for API tokens (not dart-define).
class TenantSecureTokenStore {
  TenantSecureTokenStore._();
  static final TenantSecureTokenStore instance = TenantSecureTokenStore._();

  static const String _kAccess = 'omnirent_access_token';
  static const String _kRefresh = 'omnirent_refresh_token';

  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  Future<String?> readAccess() => _storage.read(key: _kAccess);

  Future<String?> readRefresh() => _storage.read(key: _kRefresh);

  Future<void> writePair({required String accessToken, required String refreshToken}) async {
    await _storage.write(key: _kAccess, value: accessToken);
    await _storage.write(key: _kRefresh, value: refreshToken);
  }

  Future<void> clear() async {
    await _storage.delete(key: _kAccess);
    await _storage.delete(key: _kRefresh);
  }
}
