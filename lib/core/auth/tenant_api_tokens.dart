/// Runtime access + refresh JWTs for tenant API calls.
///
/// Bootstraps from `--dart-define=OMNIRENT_API_TOKEN` (access) and
/// `--dart-define=OMNIRENT_API_REFRESH_TOKEN` (refresh); updated after `POST /auth/refresh`.
class TenantApiTokens {
  TenantApiTokens._();
  static final TenantApiTokens instance = TenantApiTokens._();

  static const String _accessFromEnv = String.fromEnvironment(
    'OMNIRENT_API_TOKEN',
    defaultValue: '',
  );
  static const String _refreshFromEnv = String.fromEnvironment(
    'OMNIRENT_API_REFRESH_TOKEN',
    defaultValue: '',
  );

  String _access = _normalizeBearerToken(_accessFromEnv);
  String _refresh = _normalizeBearerToken(_refreshFromEnv);

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

  void setTokens({required String accessToken, required String refreshToken}) {
    _access = _normalizeBearerToken(accessToken);
    _refresh = _normalizeBearerToken(refreshToken);
  }
}
