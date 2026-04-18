import 'package:socket_io_client/socket_io_client.dart' as io;

import '../api/omnirent_api_env.dart';
import '../auth/tenant_api_tokens.dart';

/// Socket.IO client for Nest `/requests` namespace (JWT in `auth.token`, same as REST).
///
/// Server joins the socket to `user:{jwt.sub}`; emits are tenant-scoped for that user.
typedef UnifiedRequestRealtimeListener = void Function(String? requestId);

class UnifiedRequestsSocketClient {
  UnifiedRequestsSocketClient._();
  static final UnifiedRequestsSocketClient instance = UnifiedRequestsSocketClient._();

  static const List<String> _events = <String>[
    'request.created',
    'request.assigned',
    'request.updated',
  ];

  io.Socket? _socket;
  final List<UnifiedRequestRealtimeListener> _listeners = <UnifiedRequestRealtimeListener>[];

  void subscribe(UnifiedRequestRealtimeListener listener) {
    _listeners.add(listener);
    _syncSocket();
  }

  void unsubscribe(UnifiedRequestRealtimeListener listener) {
    _listeners.remove(listener);
    _syncSocket();
  }

  /// Call after access token rotation so the next connection uses the new JWT.
  void invalidateAfterTokenRefresh() {
    _disposeSocket();
    if (_listeners.isNotEmpty && TenantApiTokens.instance.hasAccessToken) {
      _ensureSocket();
    }
  }

  void _syncSocket() {
    if (_listeners.isEmpty) {
      _disposeSocket();
      return;
    }
    if (!TenantApiTokens.instance.hasAccessToken) {
      return;
    }
    _ensureSocket();
  }

  void _ensureSocket() {
    if (_socket != null) {
      return;
    }
    final String origin = OmnirentApiEnv.socketHttpOrigin();
    final io.Socket socket = io.io(
      '$origin/requests',
      io.OptionBuilder()
          .setTransports(<String>['websocket'])
          .setAuth(<String, dynamic>{'token': TenantApiTokens.instance.accessToken})
          .build(),
    );
    _socket = socket;
    for (final String event in _events) {
      socket.on(event, _onServerEvent);
    }
  }

  void _onServerEvent(dynamic data) {
    final String? requestId = _requestIdFromPayload(data);
    for (final UnifiedRequestRealtimeListener listener in List<UnifiedRequestRealtimeListener>.from(_listeners)) {
      listener(requestId);
    }
  }

  static String? _requestIdFromPayload(dynamic data) {
    if (data is! Map) {
      return null;
    }
    final Object? request = data['request'];
    if (request is Map) {
      final Object? id = request['id'];
      if (id is String && id.isNotEmpty) {
        return id;
      }
    }
    return null;
  }

  void _disposeSocket() {
    final io.Socket? s = _socket;
    _socket = null;
    if (s != null) {
      for (final String event in _events) {
        s.off(event);
      }
      s.dispose();
    }
  }
}
