import 'package:flutter/material.dart';

import '../../../core/models/models.dart';
import '../../../core/services/service_manager.dart';
import '../../../shared/widgets/premium_visual_asset.dart';
import 'property_flow_ui.dart';

class PropertyViewingFlowScreen extends StatefulWidget {
  final List<Property> selectedProperties;

  const PropertyViewingFlowScreen({
    super.key,
    required this.selectedProperties,
  });

  @override
  State<PropertyViewingFlowScreen> createState() =>
      _PropertyViewingFlowScreenState();
}

class _PropertyViewingFlowScreenState extends State<PropertyViewingFlowScreen> {
  final ServiceManager _serviceManager = ServiceManager();
  DateTime? _selectedDate;
  TimeOfDay? _selectedTime;

  final DateTime _minDate = DateTime.now();
  int _selectedHour12 = 12;
  String _selectedPeriod = 'AM';
  int _selectedMinute = 0;

  Property get _property => widget.selectedProperties.first;

  @override
  void initState() {
    super.initState();
    _selectedDate = null;
    _selectedTime = null;
  }

  bool _sameDay(DateTime a, DateTime b) {
    return a.year == b.year && a.month == b.month && a.day == b.day;
  }

  List<DateTime?> _calendarCellsForMonth(DateTime month) {
    final int daysInMonth =
        DateUtils.getDaysInMonth(month.year, month.month);
    final DateTime firstDay = DateTime(month.year, month.month, 1);
    final int startOffset = firstDay.weekday % 7;
    final int totalCells = ((startOffset + daysInMonth + 6) ~/ 7) * 7;

    return List<DateTime?>.generate(totalCells, (int index) {
      final int dayNumber = index - startOffset + 1;
      if (dayNumber < 1 || dayNumber > daysInMonth) {
        return null;
      }
      return DateTime(month.year, month.month, dayNumber);
    });
  }

  List<DateTime> _calendarMonths() {
    final DateTime start = DateTime(_minDate.year, _minDate.month);
    return List<DateTime>.generate(
      12,
      (int index) => DateTime(start.year, start.month + index, 1),
    );
  }

  void _applySelectedTime() {
    final int normalizedHour = _selectedHour12 % 12;
    final int hour24 =
        _selectedPeriod == 'PM' ? normalizedHour + 12 : normalizedHour;
    setState(() {
      _selectedTime = TimeOfDay(hour: hour24, minute: _selectedMinute);
    });
  }

  void _confirmDateSelection() {
    if (_selectedDate == null) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Event date set to ${_formatDate(_selectedDate!)}'),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  String _formatDate(DateTime date) {
    return '${_weekdayName(date.weekday)}, ${_monthName(date.month)} ${date.day}, ${date.year}';
  }

  String _formatTime(BuildContext context) {
    if (_selectedTime == null) {
      return '--:--';
    }
    return MaterialLocalizations.of(context)
        .formatTimeOfDay(_selectedTime!, alwaysUse24HourFormat: false);
  }

  Widget _buildDateCard() {
    return _SectionCard(
      title: 'Select Date',
      child: Column(
        children: <Widget>[
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
        ],
      ),
    );
  }

  Widget _buildTimeCard() {
    return _SectionCard(
      title: 'Set Time',
      child: Column(
        children: <Widget>[
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
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final String location =
        '${_property.location.city ?? 'Doha'}, ${_property.location.country ?? 'Qatar'}';

    return Scaffold(
      backgroundColor: const Color(0xFFF3F6FB),
      appBar: AppBar(
        elevation: 0,
        centerTitle: true,
        surfaceTintColor: Colors.transparent,
        backgroundColor: const Color(0xFFF3F6FB),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded, color: Color(0xFF0F172A)),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          'Book Viewing',
          style: TextStyle(
            color: Color(0xFF0F172A),
            fontSize: 20,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 6, 20, 24),
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(22),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.04),
                  blurRadius: 18,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            child: Row(
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(16),
                  child: PremiumPropertyPhoto(
                    imageUrl:
                        _property.images.isNotEmpty ? _property.images.first : '',
                    semanticLabel: 'Property visual',
                    width: 92,
                    height: 78,
                    borderRadius: 16,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _property.title,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: Color(0xFF0F172A),
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        location,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: Color(0xFF64748B),
                          fontSize: 13,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 18),
          const Text(
            'Choose Date & Time',
            style: TextStyle(
              color: Color(0xFF0F172A),
              fontSize: 22,
              fontWeight: FontWeight.w800,
              letterSpacing: -0.2,
            ),
          ),
          const SizedBox(height: 6),
          const Text(
            'Select your preferred viewing day and exact time.',
            style: TextStyle(
              color: Color(0xFF64748B),
              fontSize: 13,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 14),
          LayoutBuilder(
            builder: (BuildContext context, BoxConstraints constraints) {
              final double dateCardWidth = constraints.maxWidth > 1080
                  ? (constraints.maxWidth * 0.62)
                  : 560;
              final double timeCardWidth = constraints.maxWidth > 1080
                  ? (constraints.maxWidth * 0.34)
                  : 360;

              return SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    SizedBox(width: dateCardWidth, child: _buildDateCard()),
                    const SizedBox(width: 14),
                    SizedBox(width: timeCardWidth, child: _buildTimeCard()),
                  ],
                ),
              );
            },
          ),
          const SizedBox(height: 18),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: const Color(0xFFE2E8F0)),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.035),
                  blurRadius: 12,
                  offset: const Offset(0, 6),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                const Text(
                  'Selected Date',
                  style: TextStyle(
                    color: Color(0xFF64748B),
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  _selectedDate == null ? '—' : _formatDate(_selectedDate!),
                  style: const TextStyle(
                    color: Color(0xFF0F172A),
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 10),
                const Text(
                  'Selected Time',
                  style: TextStyle(
                    color: Color(0xFF64748B),
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  _formatTime(context),
                  style: const TextStyle(
                    color: Color(0xFF475569),
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 18),
          PropertyPrimaryButton(
            label: 'Confirm Viewing',
            onPressed: (_selectedDate != null && _selectedTime != null)
                ? () async {
                    final NavigatorState navigator = Navigator.of(context);
                    final ScaffoldMessengerState messenger =
                        ScaffoldMessenger.of(context);
                    final DateTime viewingDateTime = DateTime(
                      _selectedDate!.year,
                      _selectedDate!.month,
                      _selectedDate!.day,
                      _selectedTime!.hour,
                      _selectedTime!.minute,
                    );
                    try {
                      final ViewingRequest request =
                          await _serviceManager.createViewingRequest(
                        propertyId: _property.id,
                        viewingDateTime: viewingDateTime,
                        tenantId: 'tenant-demo-001',
                        tenantName: 'Tenant User',
                      );
                      if (!mounted) return;
                      setState(() {
                        _selectedDate = null;
                        _selectedTime = null;
                      });
                      // Show success and return to HomeScreen
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
                    } catch (e) {
                      if (!mounted) return;
                      messenger.showSnackBar(
                        SnackBar(
                          content: Text('Failed to create viewing request: $e'),
                        ),
                      );
                    }
                  }
                : null,
          ),
          const SizedBox(height: 10),
          Align(
            child: TextButton(
              onPressed: () {},
              child: const Text(
                'Need help? Contact support',
                style: TextStyle(
                  color: Color(0xFF64748B),
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _weekdayName(int weekday) {
    switch (weekday) {
      case DateTime.monday:
        return 'Mon';
      case DateTime.tuesday:
        return 'Tue';
      case DateTime.wednesday:
        return 'Wed';
      case DateTime.thursday:
        return 'Thu';
      case DateTime.friday:
        return 'Fri';
      case DateTime.saturday:
        return 'Sat';
      case DateTime.sunday:
        return 'Sun';
      default:
        return 'Day';
    }
  }

  String _monthName(int month) {
    const List<String> months = <String>[
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return months[month - 1];
  }
}

class _SectionCard extends StatelessWidget {
  final String title;
  final Widget child;

  const _SectionCard({required this.title, required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 16,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              color: Color(0xFF0F172A),
              fontSize: 16,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 12),
          child,
        ],
      ),
    );
  }
}

class _WeekDayLabel extends StatelessWidget {
  final String label;

  const _WeekDayLabel({required this.label});

  @override
  Widget build(BuildContext context) {
    return Text(
      label,
      textAlign: TextAlign.center,
      style: const TextStyle(
        color: Color(0xFF94A3B8),
        fontSize: 11,
        fontWeight: FontWeight.w700,
      ),
    );
  }
}

class _TimeSelect extends StatelessWidget {
  final String label;
  final int value;
  final List<int> items;
  final ValueChanged<int> onChanged;
  final String Function(int)? formatter;

  const _TimeSelect({
    required this.label,
    required this.value,
    required this.items,
    required this.onChanged,
    this.formatter,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Text(
          label,
          style: const TextStyle(
            color: Color(0xFF64748B),
            fontSize: 12,
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 6),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          decoration: BoxDecoration(
            color: const Color(0xFFF8FAFC),
            border: Border.all(color: const Color(0xFFE2E8F0)),
            borderRadius: BorderRadius.circular(12),
          ),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<int>(
              value: value,
              isExpanded: true,
              icon: const Icon(Icons.keyboard_arrow_down_rounded),
              borderRadius: BorderRadius.circular(12),
              items: items
                  .map(
                    (int option) => DropdownMenuItem<int>(
                      value: option,
                      child: Text(
                        formatter?.call(option) ?? option.toString(),
                        style: const TextStyle(
                          color: Color(0xFF0F172A),
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  )
                  .toList(),
              onChanged: (int? next) {
                if (next != null) {
                  onChanged(next);
                }
              },
            ),
          ),
        ),
      ],
    );
  }
}

class _PeriodSelect extends StatelessWidget {
  final String value;
  final ValueChanged<String> onChanged;

  const _PeriodSelect({required this.value, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        const Text(
          'Period',
          style: TextStyle(
            color: Color(0xFF64748B),
            fontSize: 12,
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 6),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          decoration: BoxDecoration(
            color: const Color(0xFFF8FAFC),
            border: Border.all(color: const Color(0xFFE2E8F0)),
            borderRadius: BorderRadius.circular(12),
          ),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<String>(
              value: value,
              isExpanded: true,
              icon: const Icon(Icons.keyboard_arrow_down_rounded),
              borderRadius: BorderRadius.circular(12),
              items: const <DropdownMenuItem<String>>[
                DropdownMenuItem<String>(value: 'AM', child: Text('AM')),
                DropdownMenuItem<String>(value: 'PM', child: Text('PM')),
              ],
              onChanged: (String? next) {
                if (next != null) {
                  onChanged(next);
                }
              },
            ),
          ),
        ),
      ],
    );
  }
}
