import 'dart:async';

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../core/api/unified_requests_api.dart';
import '../../../core/realtime/unified_requests_socket.dart';
import '../tenant_request_status_ui.dart';

/// Detail for one request; REST refresh on pull; live updates via Socket.IO `/requests`.
class MyRequestDetailScreen extends StatefulWidget {
  const MyRequestDetailScreen({super.key, required this.item});

  final UnifiedRequestListItem item;

  @override
  State<MyRequestDetailScreen> createState() => _MyRequestDetailScreenState();
}

class _MyRequestDetailScreenState extends State<MyRequestDetailScreen> {
  late UnifiedRequestListItem _item;

  void _onRequestDetailSocket(String? requestId) {
    if (!mounted) return;
    if (requestId != null && requestId.isNotEmpty && requestId != _item.id) {
      return;
    }
    unawaited(_refresh(silent: true));
  }

  static String _fingerprint(UnifiedRequestListItem r) =>
      '${r.id}|${r.status}|${r.requestType}|${r.createdAt.toIso8601String()}';

  @override
  void initState() {
    super.initState();
    _item = widget.item;
    UnifiedRequestsSocketClient.instance.subscribe(_onRequestDetailSocket);
  }

  @override
  void dispose() {
    UnifiedRequestsSocketClient.instance.unsubscribe(_onRequestDetailSocket);
    super.dispose();
  }

  Future<void> _refresh({required bool silent}) async {
    final String before = _fingerprint(_item);
    try {
      final UnifiedRequestListItem next = await UnifiedRequestsApi.refreshItemForTenant(_item.id);
      if (!mounted) return;
      final String after = _fingerprint(next);
      final bool changed = before != after;
      if (changed) {
        setState(() => _item = next);
      }
      if (changed && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Updated', style: TextStyle(fontSize: 13)),
            duration: Duration(milliseconds: 1400),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } catch (_) {
      if (!silent && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Could not refresh', style: TextStyle(fontSize: 13)),
            duration: Duration(milliseconds: 1600),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final String when = DateFormat.yMMMd().add_jm().format(_item.createdAt.toLocal());
    final String? statusHint = TenantRequestStatusUi.progressionHint(
      _item.status.isEmpty ? '' : _item.status,
    );

    return Scaffold(
      backgroundColor: const Color(0xFFF4F6F8),
      appBar: AppBar(
        backgroundColor: const Color(0xFFF4F6F8),
        elevation: 0,
        foregroundColor: const Color(0xFF0F172A),
        title: const Text('Request'),
      ),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () => _refresh(silent: false),
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(20),
            children: <Widget>[
              _line('id', _item.id.isEmpty ? '—' : _item.id),
              const SizedBox(height: 16),
              _line('requestType', _item.requestType.isEmpty ? '—' : _item.requestType),
              const SizedBox(height: 16),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  const Text(
                    'status',
                    style: TextStyle(fontSize: 12, color: Color(0xFF64748B), fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 4),
                  TenantRequestStatusUi.chip(_item.status.isEmpty ? '—' : _item.status),
                  if (statusHint != null) ...<Widget>[
                    const SizedBox(height: 8),
                    Text(
                      statusHint,
                      style: const TextStyle(
                        fontSize: 13,
                        color: Color(0xFF64748B),
                        height: 1.35,
                      ),
                    ),
                  ],
                ],
              ),
              const SizedBox(height: 16),
              _line('createdAt', when),
            ],
          ),
        ),
      ),
    );
  }

  static Widget _line(String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Text(
          label,
          style: const TextStyle(fontSize: 12, color: Color(0xFF64748B), fontWeight: FontWeight.w600),
        ),
        const SizedBox(height: 4),
        SelectableText(
          value,
          style: const TextStyle(fontSize: 16, color: Color(0xFF0F172A), height: 1.35),
        ),
      ],
    );
  }
}
