import 'package:flutter/material.dart';

import '../../../core/models/models.dart';
import '../../../shared/widgets/premium_visual_asset.dart';
import 'free_move_in_services_screen.dart';
import 'property_flow_ui.dart';

// ---------------------------------------------------------------------------
// GROUP VIEWING COORDINATOR — Premium Full-Calendar UI
// ---------------------------------------------------------------------------

class GroupViewingCoordinatorScreen extends StatefulWidget {
  final List<Property> properties;

  const GroupViewingCoordinatorScreen({
    super.key,
    required this.properties,
  });

  @override
  State<GroupViewingCoordinatorScreen> createState() =>
      _GroupViewingCoordinatorScreenState();
}

class _GroupViewingCoordinatorScreenState
    extends State<GroupViewingCoordinatorScreen> {
  late DateTime _selectedDate;
  TimeOfDay? _selectedTime;
  int _selectedHour12 = 10;
  int _selectedMinute = 0;
  String _selectedPeriod = 'AM';

  static const List<String> _enMonths = <String>[
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  static const List<String> _arMonths = <String>[
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
  ];

  @override
  void initState() {
    super.initState();
    final DateTime today = DateTime.now();
    _selectedDate = DateTime(today.year, today.month, today.day)
        .add(const Duration(days: 1));
  }

  DateTime get _minDate {
    final DateTime now = DateTime.now();
    return DateTime(now.year, now.month, now.day).add(const Duration(days: 1));
  }

  DateTime get _maxDate {
    return DateTime(_minDate.year, _minDate.month + 12, _minDate.day)
        .subtract(const Duration(days: 1));
  }

  bool _isSelectable(DateTime d) {
    final DateTime first = _minDate;
    final DateTime last = _maxDate;
    return !d.isBefore(first) && !d.isAfter(last);
  }

  List<DateTime> _calendarMonths() {
    final DateTime start = DateTime(_minDate.year, _minDate.month);
    return List<DateTime>.generate(
      12,
      (int index) => DateTime(start.year, start.month + index, 1),
    );
  }

  List<DateTime?> _calendarCellsForMonth(DateTime month) {
    final int daysInMonth = DateUtils.getDaysInMonth(month.year, month.month);
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

  List<String> _buildSuggestions(BuildContext context) {
    if (widget.properties.isEmpty || _selectedTime == null) return <String>[];
    final bool ar = OmniRentI18n.isArabic(context);
    final String dateLabel = _fmtDate();
    final String atWord = ar ? 'الساعة' : 'at';
    final int startMins = _selectedTime!.hour * 60 + _selectedTime!.minute;
    return List<String>.generate(widget.properties.length, (int i) {
      final int offset = startMins + i * 45;
      final int h = (offset ~/ 60) % 24;
      final int m = offset % 60;
      final String slot = ar
          ? '${h.toString().padLeft(2, '0')}:${m.toString().padLeft(2, '0')} ${h < 12 ? 'ص' : 'م'}'
          : '${_to12h(h)}:${m.toString().padLeft(2, '0')} ${h < 12 ? 'AM' : 'PM'}';
      return '${widget.properties[i].title}  ·  $dateLabel  $atWord  $slot';
    });
  }

  String _formatSelectedTime(BuildContext context) {
    if (_selectedTime == null) return '';
    return MaterialLocalizations.of(context)
        .formatTimeOfDay(_selectedTime!, alwaysUse24HourFormat: false);
  }

  void _applySelectedTime() {
    final int normalizedHour = _selectedHour12 % 12;
    final int hour24 =
        _selectedPeriod == 'PM' ? normalizedHour + 12 : normalizedHour;
    setState(() {
      _selectedTime = TimeOfDay(hour: hour24, minute: _selectedMinute);
    });
  }

  static String _to12h(int h24) {
    final int h = h24 % 12 == 0 ? 12 : h24 % 12;
    return h.toString();
  }

  String _fmtDate() =>
      '${_selectedDate.day.toString().padLeft(2, '0')}/${_selectedDate.month.toString().padLeft(2, '0')}/${_selectedDate.year}';

  Widget _buildDateCard(BuildContext context, bool ar) {
    final List<DateTime> months = _calendarMonths();

    return OmniCardSurface(
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Text(
            OmniRentI18n.t(context, 'Select Date', 'اختر التاريخ'),
            style: const TextStyle(
              color: Color(0xFF0F172A),
              fontSize: 16,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 12),
          Container(
            height: 560,
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFF),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: ListView.separated(
              itemCount: months.length,
              separatorBuilder: (_, __) => const SizedBox(height: 16),
              itemBuilder: (BuildContext context, int monthIndex) {
                final DateTime month = months[monthIndex];
                final List<DateTime?> cells = _calendarCellsForMonth(month);
                final String monthLabel = ar
                    ? '${_arMonths[month.month - 1]} ${month.year}'
                    : '${_enMonths[month.month - 1]} ${month.year}';

                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(
                      monthLabel,
                      style: const TextStyle(
                        color: Color(0xFF0F172A),
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: const <Widget>[
                        Expanded(child: _WeekDayLabel(label: 'Sun')),
                        Expanded(child: _WeekDayLabel(label: 'Mon')),
                        Expanded(child: _WeekDayLabel(label: 'Tue')),
                        Expanded(child: _WeekDayLabel(label: 'Wed')),
                        Expanded(child: _WeekDayLabel(label: 'Thu')),
                        Expanded(child: _WeekDayLabel(label: 'Fri')),
                        Expanded(child: _WeekDayLabel(label: 'Sat')),
                      ],
                    ),
                    const SizedBox(height: 8),
                    GridView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: cells.length,
                      gridDelegate:
                          const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 7,
                        crossAxisSpacing: 6,
                        mainAxisSpacing: 6,
                        childAspectRatio: 0.95,
                      ),
                      itemBuilder: (BuildContext context, int index) {
                        final DateTime? date = cells[index];
                        if (date == null) {
                          return const SizedBox.shrink();
                        }

                        final bool isDisabled = !_isSelectable(date);
                        final bool isSelected = date.year == _selectedDate.year &&
                            date.month == _selectedDate.month &&
                            date.day == _selectedDate.day;

                        return GestureDetector(
                          onTap: isDisabled
                              ? null
                              : () {
                                  setState(() => _selectedDate = date);
                                },
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 160),
                            decoration: BoxDecoration(
                              color: isSelected
                                  ? const Color(0xFF1D4ED8)
                                  : (isDisabled
                                      ? const Color(0xFFF8FAFC)
                                      : Colors.white),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: isSelected
                                    ? const Color(0xFF1D4ED8)
                                    : const Color(0xFFE2E8F0),
                              ),
                            ),
                            alignment: Alignment.center,
                            child: Text(
                              '${date.day}',
                              style: TextStyle(
                                color: isSelected
                                    ? Colors.white
                                    : (isDisabled
                                        ? const Color(0xFFCBD5E1)
                                        : const Color(0xFF0F172A)),
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                        );
                      },
                    ),
                  ],
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTimeCard(BuildContext context) {
    return OmniCardSurface(
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Text(
            OmniRentI18n.t(context, 'Set Time', 'حدد الوقت'),
            style: const TextStyle(
              color: Color(0xFF0F172A),
              fontSize: 16,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 14),
          Container(
            width: double.infinity,
            height: 140,
            decoration: BoxDecoration(
              color: const Color(0xFFEFF6FF),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFCFE2FF), width: 2),
            ),
            alignment: Alignment.center,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: <Widget>[
                const Icon(
                  Icons.schedule_rounded,
                  size: 48,
                  color: Color(0xFF1D4ED8),
                ),
                const SizedBox(height: 8),
                Text(
                  _selectedTime == null
                      ? '--:--'
                      : _formatSelectedTime(context),
                  style: const TextStyle(
                    color: Color(0xFF334155),
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: <Widget>[
              Expanded(
                child: _TimeSelect(
                  label: OmniRentI18n.t(context, 'Hour', 'الساعة'),
                  value: _selectedHour12,
                  items: List<int>.generate(12, (int i) => i + 1),
                  onChanged: (int value) => setState(() => _selectedHour12 = value),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _TimeSelect(
                  label: OmniRentI18n.t(context, 'Minute', 'الدقيقة'),
                  value: _selectedMinute,
                  items: List<int>.generate(60, (int i) => i),
                  formatter: (int value) => value.toString().padLeft(2, '0'),
                  onChanged: (int value) => setState(() => _selectedMinute = value),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _PeriodSelect(
                  label: OmniRentI18n.t(context, 'Period', 'الفترة'),
                  value: _selectedPeriod,
                  onChanged: (String value) => setState(() => _selectedPeriod = value),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _applySelectedTime,
              style: ElevatedButton.styleFrom(
                elevation: 0,
                backgroundColor: const Color(0xFF1D4ED8),
                padding: const EdgeInsets.symmetric(vertical: 13),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
              child: Text(
                OmniRentI18n.t(context, 'Set Time', 'تأكيد الوقت'),
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final bool ar = OmniRentI18n.isArabic(context);
    final List<String> suggestions = _buildSuggestions(context);
    final Property? lead =
        widget.properties.isNotEmpty ? widget.properties.first : null;

    return Scaffold(
      backgroundColor: const Color(0xFFF4F6F8),
      appBar: AppBar(
        backgroundColor: const Color(0xFFF4F6F8),
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded, color: Color(0xFF0F172A)),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          OmniRentI18n.t(context, 'Viewing Coordinator', 'منسق المعاينة'),
          style: const TextStyle(
            color: Color(0xFF0F172A),
            fontSize: 18,
            fontWeight: FontWeight.w700,
          ),
        ),
        actions: const <Widget>[
          Padding(
            padding: EdgeInsets.only(right: 12),
            child: OmniLanguageSwitcher(),
          ),
        ],
      ),
      body: SafeArea(
        top: false,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
          children: <Widget>[
            if (lead != null) _UnitSummaryCard(property: lead),
            if (lead != null) const SizedBox(height: 18),
            Text(
              OmniRentI18n.t(
                context,
                'Select a viewing date & time',
                'اختر تاريخ ووقت المعاينة',
              ),
              style: const TextStyle(
                color: Color(0xFF0F172A),
                fontSize: 22,
                fontWeight: FontWeight.w700,
                height: 1.2,
                letterSpacing: -0.3,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              OmniRentI18n.t(
                context,
                'We coordinate all selected properties into one smooth tour.',
                'سننسق جميع العقارات المختارة ضمن جولة واحدة سلسة.',
              ),
              style: const TextStyle(
                color: Color(0xFF64748B),
                fontSize: 14,
                height: 1.5,
              ),
            ),
            const SizedBox(height: 20),

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
                      SizedBox(
                        width: dateCardWidth,
                        child: _buildDateCard(context, ar),
                      ),
                      const SizedBox(width: 14),
                      SizedBox(
                        width: timeCardWidth,
                        child: _buildTimeCard(context),
                      ),
                    ],
                  ),
                );
              },
            ),
            const SizedBox(height: 16),

            // Dynamic Schedule
            OmniCardSurface(
              padding: const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Row(
                    children: <Widget>[
                      Expanded(
                        child: Text(
                          OmniRentI18n.t(
                              context, 'Suggested schedule', 'الجدول المقترح'),
                          style: const TextStyle(
                            color: Color(0xFF0F172A),
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                      if (_selectedTime != null)
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: const Color(0xFFEFF6FF),
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: Text(
                            _formatSelectedTime(context),
                            style: const TextStyle(
                              color: Color(0xFF1D4ED8),
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    OmniRentI18n.t(
                      context,
                      'Updates automatically as you select date & time.',
                      'يتحدث تلقائيًا عند اختيار التاريخ والوقت.',
                    ),
                    style: const TextStyle(
                      color: Color(0xFF94A3B8),
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 14),
                  if (suggestions.isNotEmpty) ...<Widget>[
                    _RouteVisualization(count: suggestions.length),
                    const SizedBox(height: 14),
                  ],
                  AnimatedSwitcher(
                    duration: const Duration(milliseconds: 300),
                    switchInCurve: Curves.easeOut,
                    switchOutCurve: Curves.easeIn,
                    transitionBuilder:
                        (Widget child, Animation<double> animation) =>
                            FadeTransition(
                      opacity: animation,
                      child: SlideTransition(
                        position: Tween<Offset>(
                          begin: const Offset(0, 0.05),
                          end: Offset.zero,
                        ).animate(CurvedAnimation(
                          parent: animation,
                          curve: Curves.easeOut,
                        )),
                        child: child,
                      ),
                    ),
                    child: _selectedTime == null
                        ? Padding(
                            key: const ValueKey<String>('no-slot'),
                            padding: const EdgeInsets.only(top: 4),
                            child: Text(
                              OmniRentI18n.t(
                                context,
                                'Select a time above to see the schedule.',
                                'اختر وقتًا أعلاه لعرض الجدول.',
                              ),
                              style: const TextStyle(
                                color: Color(0xFF94A3B8),
                                fontSize: 13,
                              ),
                            ),
                          )
                        : suggestions.isEmpty
                            ? Padding(
                                key: const ValueKey<String>('empty'),
                                padding: const EdgeInsets.only(top: 4),
                                child: Text(
                                  OmniRentI18n.t(
                                    context,
                                    'No properties in cart yet.',
                                    'لا توجد عقارات في العربة بعد.',
                                  ),
                                  style: const TextStyle(
                                    color: Color(0xFF94A3B8),
                                    fontSize: 13,
                                  ),
                                ),
                              )
                            : Column(
                                key: ValueKey<String>(
                                  '${_selectedDate.year}-${_selectedDate.month}-'
                                  '${_selectedDate.day}-${_selectedTime?.hour}-${_selectedTime?.minute}-$ar',
                                ),
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: List<Widget>.generate(
                                  suggestions.length,
                                  (int i) => Padding(
                                    padding: const EdgeInsets.only(bottom: 12),
                                    child: Row(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: <Widget>[
                                        Container(
                                          width: 22,
                                          height: 22,
                                          decoration: BoxDecoration(
                                            color: const Color(0xFF1D4ED8),
                                            borderRadius:
                                                BorderRadius.circular(999),
                                          ),
                                          alignment: Alignment.center,
                                          child: Text(
                                            '${i + 1}',
                                            style: const TextStyle(
                                              color: Colors.white,
                                              fontSize: 10,
                                              fontWeight: FontWeight.w700,
                                            ),
                                          ),
                                        ),
                                        const SizedBox(width: 10),
                                        Expanded(
                                          child: Text(
                                            suggestions[i],
                                            style: const TextStyle(
                                              color: Color(0xFF334155),
                                              fontSize: 13,
                                              fontWeight: FontWeight.w600,
                                              height: 1.45,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
          child: PropertyPrimaryButton(
            label: OmniRentI18n.t(
              context,
              'Confirm Viewing Schedule',
              'تأكيد جدول المعاينة',
            ),
            onPressed:
                (widget.properties.isEmpty || _selectedTime == null)
                    ? null
                    : () {
                        Navigator.push(
                          context,
                          MaterialPageRoute<void>(
                            builder: (_) => FreeMoveInServicesScreen(
                              property: widget.properties.first,
                              tourPlan: _buildSuggestions(context),
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

// ---------------------------------------------------------------------------
// Unit Summary Card
// ---------------------------------------------------------------------------
class _UnitSummaryCard extends StatelessWidget {
  final Property property;

  const _UnitSummaryCard({required this.property});

  @override
  Widget build(BuildContext context) {
    final String loc =
        '${property.location.address ?? ''}, ${property.location.city ?? 'Doha'}';
    final double monthly = property.price / 12;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        boxShadow: <BoxShadow>[
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 18,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Row(
        children: <Widget>[
          PremiumPropertyPhoto(
            imageUrl: property.images.isNotEmpty ? property.images.first : '',
            semanticLabel: 'Property',
            width: 76,
            height: 68,
            borderRadius: 14,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(
                  property.title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: Color(0xFF0F172A),
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 3),
                Row(
                  children: <Widget>[
                    const Icon(Icons.location_on_outlined,
                        size: 13, color: Color(0xFF64748B)),
                    const SizedBox(width: 3),
                    Expanded(
                      child: Text(
                        loc,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: Color(0xFF64748B),
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  OmniRentI18n.isArabic(context)
                      ? '${monthly.toStringAsFixed(0)} ر.ق / شهريا'
                      : 'QAR ${monthly.toStringAsFixed(0)} / month',
                  style: const TextStyle(
                    color: Color(0xFF1D4ED8),
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ],
            ),
          ),
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
  final String label;
  final String value;
  final ValueChanged<String> onChanged;

  const _PeriodSelect({
    required this.label,
    required this.value,
    required this.onChanged,
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

// ---------------------------------------------------------------------------
// Full Month Calendar
// ---------------------------------------------------------------------------
class _MonthCalendar extends StatelessWidget {
  final DateTime displayMonth;
  final DateTime selectedDate;
  final bool Function(DateTime) isSelectable;
  final VoidCallback onPrev;
  final VoidCallback onNext;
  final ValueChanged<DateTime> onSelect;
  final bool ar;
  final List<String> enMonths;
  final List<String> arMonths;

  const _MonthCalendar({
    required this.displayMonth,
    required this.selectedDate,
    required this.isSelectable,
    required this.onPrev,
    required this.onNext,
    required this.onSelect,
    required this.ar,
    required this.enMonths,
    required this.arMonths,
  });

  static const List<String> _enH = <String>['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  static const List<String> _arH = <String>['ن', 'ث', 'ر', 'خ', 'ج', 'س', 'أ'];

  @override
  Widget build(BuildContext context) {
    final String label = ar
        ? '${arMonths[displayMonth.month - 1]} ${displayMonth.year}'
        : '${enMonths[displayMonth.month - 1]} ${displayMonth.year}';

    final DateTime first = DateTime(displayMonth.year, displayMonth.month, 1);
    final int startWd = first.weekday; // 1=Mon
    final int daysInMonth =
        DateTime(displayMonth.year, displayMonth.month + 1, 0).day;

    final List<DateTime?> cells = <DateTime?>[
      for (int i = 1; i < startWd; i++) null,
      for (int d = 1; d <= daysInMonth; d++)
        DateTime(displayMonth.year, displayMonth.month, d),
    ];
    while (cells.length % 7 != 0) {
      cells.add(null);
    }

    final List<String> headers = ar ? _arH : _enH;

    return Column(
      children: <Widget>[
        // Month nav
        Row(
          children: <Widget>[
            _NavBtn(icon: Icons.chevron_left_rounded, onTap: onPrev),
            Expanded(
              child: Text(
                label,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: Color(0xFF0F172A),
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            _NavBtn(icon: Icons.chevron_right_rounded, onTap: onNext),
          ],
        ),
        const SizedBox(height: 14),
        // Weekday headers
        Row(
          children: headers
              .map((String h) => Expanded(
                    child: Text(
                      h,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        color: Color(0xFF94A3B8),
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ))
              .toList(),
        ),
        const SizedBox(height: 6),
        // Rows
        ...List<Widget>.generate(cells.length ~/ 7, (int row) {
          return Row(
            children: List<Widget>.generate(7, (int col) {
              final DateTime? d = cells[row * 7 + col];
              if (d == null) {
                return const Expanded(child: SizedBox(height: 44));
              }
              final bool ok = isSelectable(d);
              final bool sel = d.year == selectedDate.year &&
                  d.month == selectedDate.month &&
                  d.day == selectedDate.day;
              final DateTime now = DateTime.now();
              final bool today = d.year == now.year &&
                  d.month == now.month &&
                  d.day == now.day;
              return Expanded(
                child: _DayCell(
                  day: d,
                  selectable: ok,
                  selected: sel,
                  isToday: today,
                  onTap: ok ? () => onSelect(d) : null,
                ),
              );
            }),
          );
        }),
      ],
    );
  }
}

class _NavBtn extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;

  const _NavBtn({required this.icon, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: const Color(0xFFF1F5F9),
      borderRadius: BorderRadius.circular(10),
      child: InkWell(
        borderRadius: BorderRadius.circular(10),
        onTap: onTap,
        child: SizedBox(
          width: 36,
          height: 36,
          child: Icon(icon, color: const Color(0xFF334155), size: 22),
        ),
      ),
    );
  }
}

class _DayCell extends StatelessWidget {
  final DateTime day;
  final bool selectable;
  final bool selected;
  final bool isToday;
  final VoidCallback? onTap;

  const _DayCell({
    required this.day,
    required this.selectable,
    required this.selected,
    required this.isToday,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final Color bgColor = selected
        ? const Color(0xFF1D4ED8)
        : isToday
            ? const Color(0xFFDBEAFE)
            : Colors.transparent;
    final Color textColor = selected
        ? Colors.white
        : isToday
            ? const Color(0xFF1D4ED8)
            : selectable
                ? const Color(0xFF0F172A)
                : const Color(0xFFCBD5E1);

    return GestureDetector(
      onTap: onTap,
      child: SizedBox(
        height: 44,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: <Widget>[
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: bgColor,
                borderRadius: BorderRadius.circular(999),
              ),
              alignment: Alignment.center,
              child: Text(
                '${day.day}',
                style: TextStyle(
                  color: textColor,
                  fontSize: 13,
                  fontWeight:
                      selected ? FontWeight.w700 : FontWeight.w500,
                ),
              ),
            ),
            if (selectable && !selected)
              Container(
                width: 4,
                height: 4,
                margin: const EdgeInsets.only(top: 2),
                decoration: const BoxDecoration(
                  color: Color(0xFF93C5FD),
                  shape: BoxShape.circle,
                ),
              )
            else
              const SizedBox(height: 6),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Route Visualization
// ---------------------------------------------------------------------------
class _RouteVisualization extends StatelessWidget {
  final int count;

  const _RouteVisualization({required this.count});

  @override
  Widget build(BuildContext context) {
    if (count < 2) return const SizedBox.shrink();
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: const Color(0xFFF0F4FF),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        children: <Widget>[
          const Icon(Icons.route_outlined,
              size: 16, color: Color(0xFF1D4ED8)),
          const SizedBox(width: 8),
          Expanded(
            child: Row(
              children: List<Widget>.generate(count * 2 - 1, (int i) {
                if (i.isOdd) {
                  return Expanded(
                    child: Container(height: 2, color: const Color(0xFF93C5FD)),
                  );
                }
                final int idx = i ~/ 2;
                return Container(
                  width: 10,
                  height: 10,
                  decoration: BoxDecoration(
                    color: idx == 0
                        ? const Color(0xFF1D4ED8)
                        : idx == count - 1
                            ? const Color(0xFF16A34A)
                            : const Color(0xFF93C5FD),
                    shape: BoxShape.circle,
                  ),
                );
              }),
            ),
          ),
          const SizedBox(width: 8),
          Text(
            '$count ${OmniRentI18n.t(context, 'stops', 'وقفات')}',
            style: const TextStyle(
              color: Color(0xFF1D4ED8),
              fontSize: 11,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}
