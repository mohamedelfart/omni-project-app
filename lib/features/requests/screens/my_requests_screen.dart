import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../core/api/unified_requests_api.dart';
import 'my_request_detail_screen.dart';
import '../tenant_request_status_ui.dart';

/// Tenant list of unified requests from `GET /api/v1/unified-requests/me`.
class MyRequestsScreen extends StatefulWidget {
  const MyRequestsScreen({super.key});

  @override
  State<MyRequestsScreen> createState() => _MyRequestsScreenState();
}

class _MyRequestsScreenState extends State<MyRequestsScreen> {
  List<UnifiedRequestListItem>? _items;
  Object? _error;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final List<UnifiedRequestListItem> rows = await UnifiedRequestsApi.listMineForTenant();
      if (!mounted) return;
      setState(() {
        _items = rows;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e;
        _loading = false;
        _items = null;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF4F6F8),
      appBar: AppBar(
        backgroundColor: const Color(0xFFF4F6F8),
        elevation: 0,
        foregroundColor: const Color(0xFF0F172A),
        title: const Text('My Requests'),
      ),
      body: SafeArea(
        child: _loading
            ? const Center(child: CircularProgressIndicator(color: Color(0xFF1D4ED8)))
            : _error != null
                ? Center(
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            'Could not load requests.\n$_error',
                            textAlign: TextAlign.center,
                            style: const TextStyle(color: Color(0xFF64748B)),
                          ),
                          const SizedBox(height: 16),
                          TextButton(
                            onPressed: _load,
                            child: const Text('Retry'),
                          ),
                        ],
                      ),
                    ),
                  )
                : RefreshIndicator(
                    onRefresh: _load,
                    child: (_items == null || _items!.isEmpty)
                        ? ListView(
                            physics: const AlwaysScrollableScrollPhysics(),
                            children: const [
                              SizedBox(height: 120),
                              Center(
                                child: Text(
                                  'No requests yet.',
                                  style: TextStyle(color: Color(0xFF64748B)),
                                ),
                              ),
                            ],
                          )
                        : ListView.separated(
                            physics: const AlwaysScrollableScrollPhysics(),
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                            itemCount: _items!.length,
                            separatorBuilder: (_, _) => const Divider(height: 1),
                            itemBuilder: (BuildContext context, int index) {
                              final UnifiedRequestListItem r = _items![index];
                              final String when = DateFormat.yMMMd().add_jm().format(r.createdAt.toLocal());
                              return Material(
                                color: Colors.transparent,
                                child: InkWell(
                                  onTap: () {
                                    Navigator.push<void>(
                                      context,
                                      MaterialPageRoute<void>(
                                        builder: (_) => MyRequestDetailScreen(item: r),
                                      ),
                                    );
                                  },
                                  child: Padding(
                                    padding: const EdgeInsets.symmetric(vertical: 10),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: <Widget>[
                                        Text(
                                          'id: ${r.id}',
                                          style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          'requestType: ${r.requestType.isEmpty ? '—' : r.requestType}',
                                          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
                                        ),
                                        const SizedBox(height: 6),
                                        Row(
                                          children: <Widget>[
                                            const Text(
                                              'status: ',
                                              style: TextStyle(fontSize: 13, color: Color(0xFF334155)),
                                            ),
                                            TenantRequestStatusUi.chip(r.status),
                                          ],
                                        ),
                                        const SizedBox(height: 2),
                                        Text(
                                          'createdAt: $when',
                                          style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              );
                            },
                          ),
                  ),
      ),
    );
  }
}
