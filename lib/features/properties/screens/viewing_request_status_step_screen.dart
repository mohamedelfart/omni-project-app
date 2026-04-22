import 'package:flutter/material.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;

import '../../../core/api/omnirent_api_env.dart';
import '../../../core/api/tenant_http_client.dart';
import '../../../core/models/models.dart';
import '../../../core/realtime/unified_requests_socket.dart';
import 'free_move_in_services_screen.dart';

class ViewingRequestStatusStepScreen extends StatefulWidget {
  final Property property;
  final String requestId;
  final DateTime selectedDateTime;

  const ViewingRequestStatusStepScreen({
    super.key,
    required this.property,
    required this.requestId,
    required this.selectedDateTime,
  });

  @override
  State<ViewingRequestStatusStepScreen> createState() => _ViewingRequestStatusStepScreenState();
}

class _ViewingRequestStatusStepScreenState extends State<ViewingRequestStatusStepScreen> {
  bool _loading = true;
  Map<String, dynamic>? _request;
  Object? _error;

  @override
  void initState() {
    super.initState();
    UnifiedRequestsSocketClient.instance.subscribeUpdated(_onRequestUpdated);
    _loadRequest();
  }

  @override
  void dispose() {
    UnifiedRequestsSocketClient.instance.unsubscribeUpdated(_onRequestUpdated);
    super.dispose();
  }

  void _onRequestUpdated(String? requestId, String? status) {
    if (!mounted || requestId != widget.requestId || status == null || status.isEmpty) {
      return;
    }
    setState(() {
      _request = <String, dynamic>{
        ...?_request,
        'id': widget.requestId,
        'status': status,
      };
      _error = null;
    });
  }

  Future<void> _loadRequest() async {
    try {
      final Uri uri = Uri.parse('${OmnirentApiEnv.normalizedBase()}/unified-requests/me');
      final http.Response response = await TenantHttpClient.authorizedGet(uri);
      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw Exception('HTTP ${response.statusCode}');
      }
      final Object? decoded = jsonDecode(response.body);
      if (decoded is! Map<String, dynamic>) {
        throw const FormatException('Unexpected response');
      }
      final Object? rawData = decoded['data'];
      if (rawData is! List) {
        throw const FormatException('Expected data list');
      }
      final Map<String, dynamic>? found = rawData
          .whereType<Map<String, dynamic>>()
          .cast<Map<String, dynamic>?>()
          .firstWhere(
            (Map<String, dynamic>? row) => row?['id'] == widget.requestId,
            orElse: () => null,
          );

      if (!mounted) return;
      setState(() {
        _request = found;
        _loading = false;
        _error = null;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = e;
      });
    }
  }

  DateTime get _effectiveDateTime {
    final String? preferredTime = _request?['preferredTime'] as String?;
    final DateTime? parsed = preferredTime == null ? null : DateTime.tryParse(preferredTime);
    return parsed ?? widget.selectedDateTime;
  }

  String _formatDate() {
    final DateTime dt = _effectiveDateTime;
    final String day = dt.day.toString().padLeft(2, '0');
    final String month = dt.month.toString().padLeft(2, '0');
    final String year = dt.year.toString();
    return '$year-$month-$day';
  }

  String _formatTime(BuildContext context) {
    final DateTime dt = _effectiveDateTime;
    return MaterialLocalizations.of(context).formatTimeOfDay(
      TimeOfDay(hour: dt.hour, minute: dt.minute),
    );
  }

  String get _propertyLabelFromRequest {
    final String? requestType = _request?['requestType'] as String?;
    final String? city = _request?['city'] as String?;
    if (requestType != null && requestType.isNotEmpty) {
      return city == null || city.isEmpty ? requestType : '$requestType - $city';
    }
    return widget.property.title;
  }

  bool _isStepDone(String step) {
    final String raw = (_request?['status']?.toString() ?? '').toUpperCase();
    const List<String> order = <String>['CREATED', 'CONFIRMED', 'ASSIGNED', 'SCHEDULED'];
    const Map<String, String> aliases = <String, String>{
      'SUBMITTED': 'CREATED',
      'UNDER_REVIEW': 'CONFIRMED',
      'QUEUED': 'CONFIRMED',
      'ASSIGNED': 'ASSIGNED',
      'EN_ROUTE': 'SCHEDULED',
      'IN_PROGRESS': 'SCHEDULED',
      'COMPLETED': 'SCHEDULED',
    };
    final String normalized = order.contains(raw) ? raw : (aliases[raw] ?? 'CREATED');
    return order.indexOf(normalized) >= order.indexOf(step);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Viewing Status')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(20),
                    child: Text('Failed to load request status: $_error'),
                  ),
                )
              : Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            const Text(
              'Your viewing has been scheduled',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 18),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                border: Border.all(color: Colors.grey.shade300),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text('Property: $_propertyLabelFromRequest'),
                  const SizedBox(height: 6),
                  Text('Date: ${_formatDate()}'),
                  const SizedBox(height: 6),
                  Text('Time: ${_formatTime(context)}'),
                ],
              ),
            ),
            const SizedBox(height: 18),
            _StatusRow(label: 'Request Submitted', done: _isStepDone('CREATED')),
            _StatusRow(label: 'Time Confirmed', done: _isStepDone('CONFIRMED')),
            _StatusRow(label: 'Coordinator Assigned', done: _isStepDone('ASSIGNED')),
            _StatusRow(label: 'Viewing Scheduled', done: _isStepDone('SCHEDULED')),
            const Spacer(),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () {
                  Navigator.pushReplacement(
                    context,
                    MaterialPageRoute<void>(
                      builder: (_) => FreeMoveInServicesScreen(property: widget.property),
                    ),
                  );
                },
                child: const Text('Continue'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _StatusRow extends StatelessWidget {
  final String label;
  final bool done;

  const _StatusRow({required this.label, required this.done});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: <Widget>[
          Icon(
            done ? Icons.check_circle : Icons.radio_button_unchecked,
            color: done ? Colors.green : Colors.grey,
            size: 18,
          ),
          const SizedBox(width: 10),
          Text(label),
        ],
      ),
    );
  }
}
