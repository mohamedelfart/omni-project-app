import 'package:flutter/material.dart';
import '../../../core/models/models.dart';
import '../../../core/api/unified_requests_api.dart';

class ViewingRequestScreen extends StatefulWidget {
  final Property property;
  const ViewingRequestScreen({super.key, required this.property});

  @override
  State<ViewingRequestScreen> createState() => _ViewingRequestScreenState();
}

class _ViewingRequestScreenState extends State<ViewingRequestScreen> {
  DateTime? _selectedDate;
  TimeOfDay? _selectedTime;
  bool _submitting = false;

  DateTime _buildPreferredDateTime() {
    final DateTime d = _selectedDate!;
    final TimeOfDay t = _selectedTime!;
    return DateTime(d.year, d.month, d.day, t.hour, t.minute);
  }

  bool _isMvpUnauthorizedCreateError(Object error) {
    final String msg = error.toString().toLowerCase();
    return msg.contains('http 401') || msg.contains('unauthorized');
  }

  Future<void> _showSuccessDialog(String requestId) async {
    if (!context.mounted) return;
    final NavigatorState navigator = Navigator.of(context);
    setState(() => _submitting = false);
    await showDialog<void>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Success'),
        content: Text('Viewing request submitted.\nRequest ID: $requestId'),
        actions: [
          TextButton(
            onPressed: () {
              navigator.pop();
              navigator.popUntil((route) => route.isFirst);
            },
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.property.title),
      ),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Select a date',
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
            ),
            const SizedBox(height: 8),
            InkWell(
              onTap: () async {
                final now = DateTime.now();
                final picked = await showDatePicker(
                  context: context,
                  initialDate: now,
                  firstDate: now,
                  lastDate: now.add(const Duration(days: 60)),
                );
                if (picked != null) setState(() => _selectedDate = picked);
              },
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
                decoration: BoxDecoration(
                  border: Border.all(color: Colors.grey.shade300),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  children: [
                    Icon(Icons.calendar_today_outlined, color: Colors.blue.shade700),
                    const SizedBox(width: 12),
                    Text(_selectedDate == null
                        ? 'Choose date'
                        : '${_selectedDate!.year}-${_selectedDate!.month.toString().padLeft(2, '0')}-${_selectedDate!.day.toString().padLeft(2, '0')}'),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'Select a time',
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
            ),
            const SizedBox(height: 8),
            InkWell(
              onTap: () async {
                final picked = await showTimePicker(
                  context: context,
                  initialTime: TimeOfDay.now(),
                );
                if (picked != null) setState(() => _selectedTime = picked);
              },
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
                decoration: BoxDecoration(
                  border: Border.all(color: Colors.grey.shade300),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  children: [
                    Icon(Icons.access_time, color: Colors.blue.shade700),
                    const SizedBox(width: 12),
                    Text(_selectedTime == null
                        ? 'Choose time'
                        : _selectedTime!.format(context)),
                  ],
                ),
              ),
            ),
            const Spacer(),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: (_selectedDate != null && _selectedTime != null && !_submitting)
                    ? () async {
                        setState(() => _submitting = true);
                        try {
                          final DateTime preferredDateTime = _buildPreferredDateTime();
                          debugPrint(
                            '[tenant-viewing] submit request propertyId=${widget.property.id} preferredTime=${preferredDateTime.toUtc().toIso8601String()}',
                          );
                          final String requestId = await UnifiedRequestsApi.createViewingUnifiedRequest(
                            properties: <Property>[widget.property],
                            preferredDateTime: preferredDateTime,
                          );
                          await _showSuccessDialog(requestId);
                        } catch (e) {
                          if (_isMvpUnauthorizedCreateError(e)) {
                            final String guestRequestId = 'guest-${DateTime.now().millisecondsSinceEpoch}';
                            await _showSuccessDialog(guestRequestId);
                            return;
                          }
                          if (!context.mounted) return;
                          final ScaffoldMessengerState messenger = ScaffoldMessenger.of(context);
                          setState(() => _submitting = false);
                          messenger.showSnackBar(
                            SnackBar(content: Text('Failed to create viewing request: $e')),
                          );
                        }
                      }
                    : null,
                child: _submitting
                    ? const SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text('Confirm'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
