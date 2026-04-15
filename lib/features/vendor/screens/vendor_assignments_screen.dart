import 'package:flutter/material.dart';

import '../../../core/models/models.dart';
import '../../../core/services/service_manager.dart';

// ============================================================================
// VENDOR ASSIGNMENTS SCREEN — Assignment Execution Layer
// Vendor sees only their own assignments. All state changes go through Core.
// vendorId is passed from outside — no hardcoding inside this screen.
// ============================================================================

class VendorAssignmentsScreen extends StatefulWidget {
  const VendorAssignmentsScreen({super.key, required this.vendorId});

  /// Injected from outside — allows future auth replacement without screen changes.
  final String vendorId;

  @override
  State<VendorAssignmentsScreen> createState() =>
      _VendorAssignmentsScreenState();
}

class _VendorAssignmentsScreenState extends State<VendorAssignmentsScreen> {
  final ServiceManager _serviceManager = ServiceManager();
  List<ViewingRequest> _assignments = <ViewingRequest>[];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _isLoading = true);
    final List<ViewingRequest> results =
        await _serviceManager.getViewingAssignmentsForVendor(widget.vendorId);
    if (!mounted) return;
    setState(() {
      _assignments = results;
      _isLoading = false;
    });
  }

  Future<void> _submitIntent(
    ViewingRequest request,
    ViewingActionIntent intent,
  ) async {
    try {
      await _serviceManager.submitViewingIntent(
        requestId: request.id,
        intent: intent,
        actorId: widget.vendorId,
      );
      if (!mounted) return;
      await _load();
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error.toString())),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F7FB),
      appBar: AppBar(
        title: const Text(
          'My Assignments',
          style: TextStyle(fontWeight: FontWeight.w800),
        ),
        backgroundColor: const Color(0xFFF5F7FB),
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        actions: [
          IconButton(
            tooltip: 'Refresh',
            icon: const Icon(Icons.refresh_rounded),
            onPressed: _load,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: _assignments.isEmpty
                  ? _EmptyState(vendorId: widget.vendorId)
                  : ListView.separated(
                      padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
                      itemCount: _assignments.length,
                      separatorBuilder: (_, _) => const SizedBox(height: 12),
                      itemBuilder: (BuildContext context, int index) {
                        final ViewingRequest request = _assignments[index];
                        return _AssignmentCard(
                          request: request,
                          onAccept: () => _submitIntent(
                            request,
                            ViewingActionIntent.vendorAccept,
                          ),
                          onReject: () => _submitIntent(
                            request,
                            ViewingActionIntent.vendorReject,
                          ),
                          onConfirmSchedule: () => _submitIntent(
                            request,
                            ViewingActionIntent.confirmSchedule,
                          ),
                          onMarkCompleted: () => _submitIntent(
                            request,
                            ViewingActionIntent.completeViewing,
                          ),
                        );
                      },
                    ),
            ),
    );
  }
}

// ── Assignment Card ───────────────────────────────────────────────────────────

class _AssignmentCard extends StatelessWidget {
  const _AssignmentCard({
    required this.request,
    required this.onAccept,
    required this.onReject,
    required this.onConfirmSchedule,
    required this.onMarkCompleted,
  });

  final ViewingRequest request;
  final VoidCallback onAccept;
  final VoidCallback onReject;
  final VoidCallback onConfirmSchedule;
  final VoidCallback onMarkCompleted;

  @override
  Widget build(BuildContext context) {
    final _StatusMeta meta = _statusMeta(request.currentStatus);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: meta.color.withValues(alpha: 0.25),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Top row: property title + status badge ────────────────────────
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(
                  request.propertyTitle,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF0F172A),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              _StatusBadge(label: meta.label, color: meta.color),
            ],
          ),
          const SizedBox(height: 8),

          // ── Tenant + date ─────────────────────────────────────────────────
          _InfoRow(icon: Icons.person_outline, text: request.tenantName),
          const SizedBox(height: 4),
          _InfoRow(
            icon: Icons.schedule_outlined,
            text: _fmtDateTime(request.viewingDateTime),
          ),
          if (request.tenantPhone != null &&
              request.tenantPhone!.isNotEmpty) ...[
            const SizedBox(height: 4),
            _InfoRow(icon: Icons.phone_outlined, text: request.tenantPhone!),
          ],

          const SizedBox(height: 14),

          // ── Action area by status ─────────────────────────────────────────
          _ActionArea(
            status: request.currentStatus,
            onAccept: onAccept,
            onReject: onReject,
            onConfirmSchedule: onConfirmSchedule,
            onMarkCompleted: onMarkCompleted,
          ),
        ],
      ),
    );
  }

  String _fmtDateTime(DateTime dt) {
    String p(int v) => v.toString().padLeft(2, '0');
    final int h = dt.hour % 12 == 0 ? 12 : dt.hour % 12;
    return '${p(dt.day)}/${p(dt.month)}/${dt.year}  $h:${p(dt.minute)} ${dt.hour < 12 ? 'AM' : 'PM'}';
  }

  _StatusMeta _statusMeta(ViewingRequestStatus status) {
    switch (status) {
      case ViewingRequestStatus.coordinatorAssigned:
        return _StatusMeta('Pending Your Action', const Color(0xFFD97706));
      case ViewingRequestStatus.vendorConfirmed:
        return _StatusMeta('Confirmed', const Color(0xFF0EA5E9));
      case ViewingRequestStatus.viewingScheduled:
        return _StatusMeta('Viewing Scheduled', const Color(0xFF8B5CF6));
      case ViewingRequestStatus.viewingCompleted:
        return _StatusMeta('Completed', const Color(0xFF16A34A));
      case ViewingRequestStatus.vendorRejected:
        return _StatusMeta('Rejected — Reassigning', const Color(0xFFEF4444));
      default:
        return _StatusMeta('In Progress', const Color(0xFF475569));
    }
  }
}

// ── Action Area ───────────────────────────────────────────────────────────────

class _ActionArea extends StatelessWidget {
  const _ActionArea({
    required this.status,
    required this.onAccept,
    required this.onReject,
    required this.onConfirmSchedule,
    required this.onMarkCompleted,
  });

  final ViewingRequestStatus status;
  final VoidCallback onAccept;
  final VoidCallback onReject;
  final VoidCallback onConfirmSchedule;
  final VoidCallback onMarkCompleted;

  @override
  Widget build(BuildContext context) {
    switch (status) {
      case ViewingRequestStatus.coordinatorAssigned:
        return Row(
          children: [
            Expanded(
              child: OutlinedButton.icon(
                onPressed: onReject,
                icon: const Icon(Icons.close_rounded, size: 16),
                label: const Text('Reject'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: const Color(0xFFEF4444),
                  side: const BorderSide(color: Color(0xFFEF4444)),
                ),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: ElevatedButton.icon(
                onPressed: onAccept,
                icon: const Icon(Icons.check_rounded, size: 16),
                label: const Text('Accept'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF16A34A),
                ),
              ),
            ),
          ],
        );

      case ViewingRequestStatus.vendorConfirmed:
        return SizedBox(
          width: double.infinity,
          child: ElevatedButton.icon(
            onPressed: onConfirmSchedule,
            icon: const Icon(Icons.calendar_today_outlined, size: 16),
            label: const Text('Confirm Viewing Schedule'),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF0EA5E9),
            ),
          ),
        );

      case ViewingRequestStatus.viewingScheduled:
        return SizedBox(
          width: double.infinity,
          child: ElevatedButton.icon(
            onPressed: onMarkCompleted,
            icon: const Icon(Icons.done_all_rounded, size: 16),
            label: const Text('Mark Completed'),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF8B5CF6),
            ),
          ),
        );

      case ViewingRequestStatus.vendorRejected:
        // Transient state — Core is processing reassignment.
        return const Row(
          children: [
            SizedBox(
              width: 16,
              height: 16,
              child: CircularProgressIndicator(strokeWidth: 2),
            ),
            SizedBox(width: 10),
            Text(
              'Reassigning to next vendor...',
              style: TextStyle(
                fontSize: 13,
                color: Color(0xFFEF4444),
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        );

      default:
        // viewingCompleted and other closed states — read-only
        return const Text(
          'No action required',
          style: TextStyle(
            fontSize: 13,
            color: Color(0xFF94A3B8),
            fontStyle: FontStyle.italic,
          ),
        );
    }
  }
}

// ── Supporting Widgets ────────────────────────────────────────────────────────

class _StatusBadge extends StatelessWidget {
  const _StatusBadge({required this.label, required this.color});
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontSize: 11,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.icon, required this.text});
  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 14, color: const Color(0xFF94A3B8)),
        const SizedBox(width: 6),
        Expanded(
          child: Text(
            text,
            style: const TextStyle(
              fontSize: 13,
              color: Color(0xFF475569),
              fontWeight: FontWeight.w500,
            ),
          ),
        ),
      ],
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.vendorId});
  final String vendorId;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(
              Icons.assignment_outlined,
              size: 64,
              color: Color(0xFFCBD5E1),
            ),
            const SizedBox(height: 16),
            const Text(
              'No Assignments',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: Color(0xFF1F2937),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'No assignments found for vendor $vendorId.\nNew assignments will appear here.',
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 14,
                color: Color(0xFF64748B),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Internal Data Class ───────────────────────────────────────────────────────

class _StatusMeta {
  const _StatusMeta(this.label, this.color);
  final String label;
  final Color color;
}
