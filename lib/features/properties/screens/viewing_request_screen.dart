import 'package:flutter/material.dart';
import '../../../core/models/models.dart';

class ViewingRequest {
  final String propertyId;
  final String propertyName;
  final DateTime selectedDate;
  final TimeOfDay selectedTime;
  final String status;

  ViewingRequest({
    required this.propertyId,
    required this.propertyName,
    required this.selectedDate,
    required this.selectedTime,
    this.status = 'PENDING',
  });
}

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
                        final request = ViewingRequest(
                          propertyId: widget.property.id,
                          propertyName: widget.property.title,
                          selectedDate: _selectedDate!,
                          selectedTime: _selectedTime!,
                        );
                        await Future.delayed(const Duration(milliseconds: 600));
                        if (!mounted) return;
                        setState(() => _submitting = false);
                        showDialog(
                          context: context,
                          builder: (_) => AlertDialog(
                            title: const Text('Success'),
                            content: const Text('Viewing request submitted!'),
                            actions: [
                              TextButton(
                                onPressed: () {
                                  Navigator.of(context).pop();
                                  Navigator.of(context).popUntil((route) => route.isFirst);
                                },
                                child: const Text('OK'),
                              ),
                            ],
                          ),
                        );
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
