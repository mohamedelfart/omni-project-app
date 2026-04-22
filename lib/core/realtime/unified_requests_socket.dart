import 'package:socket_io_client/socket_io_client.dart' as io;

import '../api/omnirent_api_env.dart';
import '../auth/tenant_api_tokens.dart';

/// Socket.IO client for Nest `/requests` namespace (JWT in `auth.token`, same as REST).
///
/// Server joins the socket to `user:{jwt.sub}`; emits are tenant-scoped for that user.
typedef UnifiedRequestRealtimeListener = void Function(String? requestId);
typedef UnifiedRequestUpdatedListener = void Function(String? requestId, String? status);

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
  final List<UnifiedRequestUpdatedListener> _updatedListeners = <UnifiedRequestUpdatedListener>[];

  void subscribe(UnifiedRequestRealtimeListener listener) {
    _listeners.add(listener);
    _syncSocket();
  }

  void unsubscribe(UnifiedRequestRealtimeListener listener) {
    _listeners.remove(listener);
    _syncSocket();
  }

  void subscribeUpdated(UnifiedRequestUpdatedListener listener) {
    _updatedListeners.add(listener);
    _syncSocket();
  }

  void unsubscribeUpdated(UnifiedRequestUpdatedListener listener) {
    _updatedListeners.remove(listener);
    _syncSocket();
  }

  /// Call after access token rotation so the next connection uses the new JWT.
  void invalidateAfterTokenRefresh() {
    _disposeSocket();
    if (_listeners.isNotEmpty && TenantApiTokens.instance.hasAccessToken) {
      _ensureSocket();
    }
  }

  /// Logout / revoked session: drop all listeners and close the socket (no reconnect).
  void disconnectAll() {
    _listeners.clear();
    _updatedListeners.clear();
    _disposeSocket();
  }

  void _syncSocket() {
    if (_listeners.isEmpty && _updatedListeners.isEmpty) {
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
    final String? status = _statusFromPayload(data);
    for (final UnifiedRequestRealtimeListener listener in List<UnifiedRequestRealtimeListener>.from(_listeners)) {
      listener(requestId);
    }
    for (final UnifiedRequestUpdatedListener listener in List<UnifiedRequestUpdatedListener>.from(_updatedListeners)) {
      listener(requestId, status);
    }
  }

  static String? _requestIdFromPayload(dynamic data) {
    if (data is! Map) {
      return null;
    }
    final Object? requestId = data['requestId'];
    if (requestId is String && requestId.isNotEmpty) {
      return requestId;
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

  static String? _statusFromPayload(dynamic data) {
    if (data is! Map) {
      return null;
    }
    final Object? status = data['status'];
    if (status is String && status.isNotEmpty) {
      return status;
    }
    final Object? request = data['request'];
    if (request is Map) {
      final Object? nestedStatus = request['status'];
      if (nestedStatus is String && nestedStatus.isNotEmpty) {
        return nestedStatus;
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
