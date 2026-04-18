import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../core/api/unified_requests_api.dart';
import '../tenant_request_status_ui.dart';

/// Minimal detail view for one row from `GET /api/v1/unified-requests/me` (no extra fetch).
class MyRequestDetailScreen extends StatelessWidget {
  const MyRequestDetailScreen({super.key, required this.item});

  final UnifiedRequestListItem item;

  @override
  Widget build(BuildContext context) {
    final String when = DateFormat.yMMMd().add_jm().format(item.createdAt.toLocal());
    final String? statusHint = TenantRequestStatusUi.progressionHint(
      item.status.isEmpty ? '' : item.status,
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
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              _line('id', item.id.isEmpty ? '—' : item.id),
              const SizedBox(height: 16),
              _line('requestType', item.requestType.isEmpty ? '—' : item.requestType),
              const SizedBox(height: 16),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  const Text(
                    'status',
                    style: TextStyle(fontSize: 12, color: Color(0xFF64748B), fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 4),
                  TenantRequestStatusUi.chip(item.status.isEmpty ? '—' : item.status),
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
