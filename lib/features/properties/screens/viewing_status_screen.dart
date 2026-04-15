import 'package:flutter/material.dart';

import '../../../core/models/models.dart';
import '../../../core/services/service_manager.dart';
import '../helpers/viewing_status_mapper.dart';
import '../../../shared/widgets/premium_visual_asset.dart';
import 'property_list_screen.dart';
import 'property_flow_ui.dart';

// ---------------------------------------------------------------------------
// VIEWING STATUS SCREEN
// Shown immediately after "Confirm Viewing Schedule".
// Displays booking summary, progress tracker, and property status.
// ---------------------------------------------------------------------------

class ViewingStatusScreen extends StatefulWidget {
  final Property property;
  final DateTime viewingDate;
  final TimeOfDay viewingTime;
  final String viewingRequestId;
  final List<String> tourPlan;

  const ViewingStatusScreen({
    super.key,
    required this.property,
    required this.viewingDate,
    required this.viewingTime,
    required this.viewingRequestId,
    this.tourPlan = const <String>[],
  });

  @override
  State<ViewingStatusScreen> createState() => _ViewingStatusScreenState();
}

class _ViewingStatusScreenState extends State<ViewingStatusScreen> {
  final ServiceManager _serviceManager = ServiceManager();
  ViewingRequest? _request;
  Property? _latestProperty;

  @override
  void initState() {
    super.initState();
    _refreshState();
  }

  Future<void> _refreshState() async {
    final ViewingRequest? request =
        await _serviceManager.getViewingRequestById(widget.viewingRequestId);
    final Property property =
        await _serviceManager.getPropertyDetails(widget.property.id);

    if (!mounted) return;
    setState(() {
      _request = request;
      _latestProperty = property;
    });
  }

  void _goToListings(BuildContext context) {
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute<void>(builder: (_) => const PropertyListScreen()),
      (Route<dynamic> route) => route.isFirst,
    );
  }

  String _fmtDate() =>
      '${widget.viewingDate.day.toString().padLeft(2, '0')}/'
      '${widget.viewingDate.month.toString().padLeft(2, '0')}/'
      '${widget.viewingDate.year}';

  String _fmtTime(BuildContext context) =>
      MaterialLocalizations.of(context)
          .formatTimeOfDay(widget.viewingTime, alwaysUse24HourFormat: false);

  @override
  Widget build(BuildContext context) {
    final bool ar = OmniRentI18n.isArabic(context);
    final Property currentProperty = _latestProperty ?? widget.property;

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
          OmniRentI18n.t(context, 'Viewing Status', 'حالة المعاينة'),
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
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 100),
          children: <Widget>[
            // ── Success Banner
            _SuccessBanner(ar: ar),
            const SizedBox(height: 20),

            // ── Booking Summary
            _BookingSummaryCard(
              property: currentProperty,
              date: _fmtDate(),
              time: _fmtTime(context),
              ar: ar,
            ),
            const SizedBox(height: 16),

            // ── Progress Tracker
            _ProgressTrackerCard(ar: ar, request: _request),
            const SizedBox(height: 16),

            // ── Property Status
            _PropertyStatusCard(ar: ar, property: currentProperty),
          ],
        ),
      ),
      bottomNavigationBar: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
          child: Row(
            children: <Widget>[
              Expanded(
                child: OutlinedButton(
                  onPressed: () {
                    _goToListings(context);
                  },
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 15),
                    side: const BorderSide(color: Color(0xFF1D4ED8)),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                  child: Text(
                    OmniRentI18n.t(context, 'Back to Home', 'العودة للرئيسية'),
                    style: const TextStyle(
                      color: Color(0xFF1D4ED8),
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton(
                  onPressed: () {
                    _goToListings(context);
                  },
                  style: ElevatedButton.styleFrom(
                    elevation: 0,
                    backgroundColor: const Color(0xFF1D4ED8),
                    padding: const EdgeInsets.symmetric(vertical: 15),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                  child: Text(
                    OmniRentI18n.t(context, 'Continue', 'متابعة'),
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Success Banner
// ---------------------------------------------------------------------------
class _SuccessBanner extends StatelessWidget {
  final bool ar;

  const _SuccessBanner({required this.ar});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 28, horizontal: 20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: <Color>[Color(0xFF1D4ED8), Color(0xFF3B82F6)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(22),
        boxShadow: <BoxShadow>[
          BoxShadow(
            color: const Color(0xFF1D4ED8).withValues(alpha: 0.25),
            blurRadius: 24,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        children: <Widget>[
          Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.2),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.check_circle_outline_rounded,
              size: 36,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 14),
          Text(
            ar ? 'تم جدولة معاينتك' : 'Your viewing is scheduled',
            style: const TextStyle(
              color: Colors.white,
              fontSize: 20,
              fontWeight: FontWeight.w800,
              letterSpacing: -0.3,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 6),
          Text(
            ar
                ? 'سيتواصل معك المنسق قريبًا لتأكيد التفاصيل.'
                : 'The coordinator will contact you shortly to confirm details.',
            style: TextStyle(
              color: Colors.white.withValues(alpha: 0.85),
              fontSize: 13,
              height: 1.5,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Booking Summary Card
// ---------------------------------------------------------------------------
class _BookingSummaryCard extends StatelessWidget {
  final Property property;
  final String date;
  final String time;
  final bool ar;

  const _BookingSummaryCard({
    required this.property,
    required this.date,
    required this.time,
    required this.ar,
  });

  @override
  Widget build(BuildContext context) {
    return OmniCardSurface(
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Text(
            ar ? 'تفاصيل الحجز' : 'Booking Details',
            style: const TextStyle(
              color: Color(0xFF0F172A),
              fontSize: 16,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 14),
          // Property row
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              PremiumPropertyPhoto(
                imageUrl:
                    property.images.isNotEmpty ? property.images.first : '',
                semanticLabel: 'Property',
                width: 72,
                height: 64,
                borderRadius: 12,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(
                      property.title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: Color(0xFF0F172A),
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        height: 1.35,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      '${property.location.address ?? ''}, ${property.location.city ?? ''}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: Color(0xFF64748B),
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          const Divider(color: Color(0xFFE2E8F0), height: 1),
          const SizedBox(height: 14),
          // Date & Time rows
          _InfoRow(
            icon: Icons.calendar_today_outlined,
            label: ar ? 'التاريخ' : 'Date',
            value: date,
          ),
          const SizedBox(height: 10),
          _InfoRow(
            icon: Icons.schedule_outlined,
            label: ar ? 'الوقت' : 'Time',
            value: time,
          ),
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _InfoRow({
    required this.icon,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: <Widget>[
        Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            color: const Color(0xFFEFF6FF),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, size: 18, color: const Color(0xFF1D4ED8)),
        ),
        const SizedBox(width: 12),
        Text(
          label,
          style: const TextStyle(
            color: Color(0xFF64748B),
            fontSize: 13,
            fontWeight: FontWeight.w500,
          ),
        ),
        const Spacer(),
        Text(
          value,
          style: const TextStyle(
            color: Color(0xFF0F172A),
            fontSize: 13,
            fontWeight: FontWeight.w700,
          ),
        ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// Progress Tracker Card
// ---------------------------------------------------------------------------
class _ProgressTrackerCard extends StatelessWidget {
  final bool ar;
  final ViewingRequest? request;

  const _ProgressTrackerCard({required this.ar, required this.request});

  bool _isDone(TenantFacingStatus status) {
    if (request == null) return false;
    final ViewingRequestStatus current = request!.currentStatus;

    switch (status) {
      case TenantFacingStatus.requestSubmitted:
        return true;
      case TenantFacingStatus.assignmentInProgress:
        return current != ViewingRequestStatus.requestSubmitted;
      case TenantFacingStatus.coordinatorOnTheWay:
        return current == ViewingRequestStatus.vendorConfirmed ||
            current == ViewingRequestStatus.viewingScheduled ||
            current == ViewingRequestStatus.viewingCompleted ||
            current == ViewingRequestStatus.tenantDecisionPending ||
            current == ViewingRequestStatus.unitReserved ||
            current == ViewingRequestStatus.unitReleased;
      case TenantFacingStatus.viewingConfirmed:
        return current == ViewingRequestStatus.viewingScheduled ||
            current == ViewingRequestStatus.viewingCompleted ||
            current == ViewingRequestStatus.tenantDecisionPending ||
            current == ViewingRequestStatus.unitReserved ||
            current == ViewingRequestStatus.unitReleased;
      case TenantFacingStatus.viewingCompleted:
        return current == ViewingRequestStatus.viewingCompleted ||
            current == ViewingRequestStatus.tenantDecisionPending ||
            current == ViewingRequestStatus.unitReserved ||
            current == ViewingRequestStatus.unitReleased;
      case TenantFacingStatus.decisionPending:
        return current == ViewingRequestStatus.tenantDecisionPending ||
            current == ViewingRequestStatus.unitReserved ||
            current == ViewingRequestStatus.unitReleased;
      case TenantFacingStatus.unitReserved:
        return current == ViewingRequestStatus.unitReserved;
      case TenantFacingStatus.unitReleased:
        return current == ViewingRequestStatus.unitReleased;
    }
  }

  @override
  Widget build(BuildContext context) {
    final List<TenantFacingStatus> order = <TenantFacingStatus>[
      TenantFacingStatus.requestSubmitted,
      TenantFacingStatus.assignmentInProgress,
      TenantFacingStatus.coordinatorOnTheWay,
      TenantFacingStatus.viewingConfirmed,
      TenantFacingStatus.viewingCompleted,
      TenantFacingStatus.decisionPending,
      TenantFacingStatus.unitReserved,
      TenantFacingStatus.unitReleased,
    ];

    final List<_TrackStep> steps = <_TrackStep>[
      ...order.map((TenantFacingStatus status) {
        return _TrackStep(
          label: tenantFacingStatusLabel(status, ar: ar),
          status: _isDone(status) ? _StepStatus.done : _StepStatus.pending,
        );
      }),
    ];

    return OmniCardSurface(
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Text(
            ar ? 'تتبع الطلب' : 'Request Progress',
            style: const TextStyle(
              color: Color(0xFF0F172A),
              fontSize: 16,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 16),
          ...List<Widget>.generate(steps.length, (int i) {
            final _TrackStep step = steps[i];
            final bool isLast = i == steps.length - 1;
            return _StepRow(step: step, isLast: isLast);
          }),
        ],
      ),
    );
  }
}

enum _StepStatus { done, pending }

class _TrackStep {
  final String label;
  final _StepStatus status;

  const _TrackStep({required this.label, required this.status});
}

class _StepRow extends StatelessWidget {
  final _TrackStep step;
  final bool isLast;

  const _StepRow({required this.step, required this.isLast});

  @override
  Widget build(BuildContext context) {
    final bool isDone = step.status == _StepStatus.done;

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          SizedBox(
            width: 28,
            child: Column(
              children: <Widget>[
                Container(
                  width: 28,
                  height: 28,
                  decoration: BoxDecoration(
                    color: isDone
                        ? const Color(0xFF16A34A)
                        : const Color(0xFFE2E8F0),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    isDone
                        ? Icons.check_rounded
                        : Icons.hourglass_empty_rounded,
                    size: 15,
                    color: isDone ? Colors.white : const Color(0xFF94A3B8),
                  ),
                ),
                if (!isLast)
                  Expanded(
                    child: Container(
                      width: 2,
                      color: isDone
                          ? const Color(0xFF16A34A).withValues(alpha: 0.35)
                          : const Color(0xFFE2E8F0),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Padding(
            padding: EdgeInsets.only(
              top: 4,
              bottom: isLast ? 0 : 20,
            ),
            child: Text(
              step.label,
              style: TextStyle(
                color:
                    isDone ? const Color(0xFF0F172A) : const Color(0xFF94A3B8),
                fontSize: 13,
                fontWeight: isDone ? FontWeight.w700 : FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Property Status Card
// ---------------------------------------------------------------------------
class _PropertyStatusCard extends StatelessWidget {
  final bool ar;
  final Property property;

  const _PropertyStatusCard({required this.ar, required this.property});

  String _statusMessage(PropertyViewingState state) {
    switch (state) {
      case PropertyViewingState.available:
        return ar
            ? 'العقار متاح حاليًا للمعاينة والحجز.'
            : 'The property is currently available for viewing and reservation.';
      case PropertyViewingState.underViewing:
        return ar
            ? 'العقار حاليًا قيد المعاينة. سيتم تحديث الحالة بعد قرار المستأجر.'
            : 'The property is currently under viewing. Status updates after the tenant decision.';
      case PropertyViewingState.reserved:
        return ar
            ? 'العقار محجوز حاليًا ولا يقبل طلبات جديدة.'
            : 'The property is currently reserved and does not accept new requests.';
    }
  }

  @override
  Widget build(BuildContext context) {
    final PropertyViewingState currentStatus = property.viewingState;

    return OmniCardSurface(
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Text(
            ar ? 'حالة العقار' : 'Property Status',
            style: const TextStyle(
              color: Color(0xFF0F172A),
              fontSize: 16,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 14),
          Row(
            children: <Widget>[
              _StatusChip(status: PropertyViewingState.available, current: currentStatus, ar: ar),
              const SizedBox(width: 8),
              _StatusChip(status: PropertyViewingState.underViewing, current: currentStatus, ar: ar),
              const SizedBox(width: 8),
              _StatusChip(status: PropertyViewingState.reserved, current: currentStatus, ar: ar),
            ],
          ),
          const SizedBox(height: 14),
          Text(
            _statusMessage(currentStatus),
            style: const TextStyle(
              color: Color(0xFF64748B),
              fontSize: 12,
              height: 1.55,
            ),
          ),
        ],
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  final PropertyViewingState status;
  final PropertyViewingState current;
  final bool ar;

  const _StatusChip({
    required this.status,
    required this.current,
    required this.ar,
  });

  String get _label {
    switch (status) {
      case PropertyViewingState.available:
        return ar ? 'متاح' : 'Available';
      case PropertyViewingState.underViewing:
        return ar ? 'قيد المعاينة' : 'Under Viewing';
      case PropertyViewingState.reserved:
        return ar ? 'محجوز' : 'Reserved';
    }
  }

  Color get _activeColor {
    switch (status) {
      case PropertyViewingState.available:
        return const Color(0xFF16A34A);
      case PropertyViewingState.underViewing:
        return const Color(0xFFD97706);
      case PropertyViewingState.reserved:
        return const Color(0xFF1D4ED8);
    }
  }

  @override
  Widget build(BuildContext context) {
    final bool isActive = status == current;

    return AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: isActive ? _activeColor : const Color(0xFFF1F5F9),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(
          color: isActive ? _activeColor : const Color(0xFFE2E8F0),
        ),
      ),
      child: Text(
        _label,
        style: TextStyle(
          color: isActive ? Colors.white : const Color(0xFF94A3B8),
          fontSize: 12,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}
