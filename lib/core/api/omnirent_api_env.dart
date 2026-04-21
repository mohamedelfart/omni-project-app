/// Compile-time API base from `--dart-define=OMNIRENT_API_BASE=...`.
class OmnirentApiEnv {
  OmnirentApiEnv._();

  static const String baseUrl = String.fromEnvironment(
    'OMNIRENT_API_BASE',
    defaultValue: 'http://localhost:4000/api/v1',
  );

  static String normalizedBase() {
    final String trimmed = baseUrl.trim();
    if (trimmed.isEmpty) {
      return 'http://localhost:4000/api/v1';
    }
    return trimmed.replaceAll(RegExp(r'/+$'), '');
  }

  /// HTTP origin for Socket.IO (strip trailing `/api/v1`).
  static String socketHttpOrigin() {
    return normalizedBase().replaceFirst(RegExp(r'/api/v1/?$', caseSensitive: false), '');
  }
}
