import 'package:flutter/material.dart';

import '../../../core/models/models.dart';
import '../../../core/services/service_manager.dart';
import '../models/unified_operational_item.dart';
import 'command_center_viewing_screen.dart' as viewing;

// ============================================================================
// COMMAND CENTER HOME — Operations Hub
// Entry point for Admin role. No business logic — reads existing ServiceManager APIs.
// ============================================================================

class CommandCenterHomeScreen extends StatefulWidget {
  const CommandCenterHomeScreen({super.key});

  @override
  State<CommandCenterHomeScreen> createState() =>
      _CommandCenterHomeScreenState();
}

class _CommandCenterHomeScreenState extends State<CommandCenterHomeScreen> {
  final ServiceManager _serviceManager = ServiceManager();

  List<UnifiedOperationalItem> _operationalItems = [];
  int _totalProperties = 0;
  int _pendingActions = 0;
  bool _isLoadingHome = true;

  @override
  void initState() {
    super.initState();
    _loadStats();
  }

  Future<void> _loadStats() async {
    setState(() => _isLoadingHome = true);

    final List<UnifiedOperationalItem> items = await _serviceManager.getUnifiedOperationalItems();
    final List<Property> properties = await _serviceManager.dashboardListProperties(actorRole: 'ADMIN');

    if (!mounted) return;
    setState(() {
      _operationalItems = items;
      _pendingActions = items.where((item) => item.status == 'PENDING').length;
      _totalProperties = properties.length;
      _isLoadingHome = false;
    });
  }
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _isLoadingHome
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadStats,
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
                children: [
                  _ModuleCard(
                    label: 'Properties',
                    subtitle: 'View and manage property inventory',
                    icon: Icons.apartment_outlined,
                    color: const Color(0xFF0047AB),
                    isComingSoon: true,
                  ),
                  const SizedBox(height: 10),
                  _ModuleCard(
                    label: 'Tenants',
                    subtitle: 'View tenant records and activity',
                    icon: Icons.people_outlined,
                    color: const Color(0xFF10B981),
                    isComingSoon: true,
                  ),
                  const SizedBox(height: 10),
                  _ModuleCard(
                    label: 'Payments',
                    subtitle: 'Track payments and financial activity',
                    icon: Icons.payments_outlined,
                    color: const Color(0xFF8B5CF6),
                    isComingSoon: true,
                  ),
                  const SizedBox(height: 16),
                  // Main Operational List (ticket-aware)
                  ..._operationalItems.map((item) => ListTile(
                        title: Text(item.serviceType),
                        subtitle: Text('Status: ${item.status}'),
                        trailing: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            item.isTicketed
                                ? Icon(Icons.confirmation_num, color: Colors.blue)
                                : Icon(Icons.assignment, color: Colors.grey),
                            IconButton(
                              icon: Icon(Icons.person_add_alt_1, color: Colors.green),
                              tooltip: 'Assign',
                              onPressed: () async {
                                // MVP: Assign to a hardcoded user/team for demo
                                final assignedTo = 'operator_1';
                                final assignedTeam = 'OpsTeam';
                                final manager = ServiceManager();
                                if (item.isTicketed) {
                                  await manager.assignTicket(
                                    ticketId: item.ticket!.ticketId,
                                    assignedTo: assignedTo,
                                    assignedTeam: assignedTeam,
                                    updatedBy: 'command_center',
                                  );
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(content: Text('Ticket assigned via Core!')),
                                  );
                                } else {
                                  // Legacy fallback: show warning or handle request-based assignment
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(content: Text('Legacy request: assignment not supported in MVP')), 
                                  );
                                }
                                setState(() {});
                              },
                            ),
                          ],
                        ),
                        onTap: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => viewing.CommandCenterViewingScreen(item: item),
                            ),
                          );
                        },
                      )),
                ],
              ),
            ),
    );
  }
// Removed misplaced widget/variable definitions outside of classes. All widget trees must be inside build methods.
}

// ── Header Card ───────────────────────────────────────────────────────────────

class _HeaderCard extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final DateTime now = DateTime.now();
    final String date =
        '${now.day.toString().padLeft(2, '0')}/${now.month.toString().padLeft(2, '0')}/${now.year}';
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      decoration: BoxDecoration(
        color: const Color(0xFF1E3A5F),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          const Icon(Icons.dashboard_outlined, color: Colors.white, size: 28),
          const SizedBox(width: 14),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Operations Control Layer',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                date,
                style: const TextStyle(
                  color: Color(0xFFCBD5E1),
                  fontSize: 13,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// ── Stat Tile ─────────────────────────────────────────────────────────────────

class _StatTile extends StatelessWidget {
  const _StatTile({
    required this.label,
    required this.value,
    required this.color,
  });

  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            value,
            style: TextStyle(
              color: color,
              fontSize: 26,
              fontWeight: FontWeight.w800,
              letterSpacing: -0.5,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: const TextStyle(
              color: Color(0xFF64748B),
              fontSize: 11,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

// ── Module Card ───────────────────────────────────────────────────────────────

class _ModuleCard extends StatelessWidget {

  const _ModuleCard({
    required this.label,
    required this.subtitle,
    required this.icon,
    required this.color,
    this.isComingSoon,
    this.onTap,
    this.badgeCount = 0,
  });

  final String label;
  final VoidCallback? onTap;
  final int badgeCount;
  final String subtitle;
  final IconData icon;
  final Color color;
  final bool? isComingSoon;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
                color: (isComingSoon ?? false)
                  ? const Color(0xFFE2E8F0)
                  : color.withValues(alpha: 0.25),
            ),
          ),
          child: Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: (isComingSoon ?? false) ? 0.06 : 0.12),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  icon,
                    color: (isComingSoon ?? false)
                      ? color.withValues(alpha: 0.4)
                      : color,
                  size: 24,
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      label,
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: (isComingSoon ?? false)
                          ? const Color(0xFF94A3B8)
                          : const Color(0xFF1F2937),
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      (isComingSoon ?? false) ? 'قريباً' : subtitle,
                      style: const TextStyle(
                        fontSize: 12,
                        color: Color(0xFF94A3B8),
                      ),
                    ),
                  ],
                ),
              ),
              if (badgeCount > 0)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(
                    badgeCount.toString(),
                    style: TextStyle(
                      color: color,
                      fontSize: 12,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                )
              else if (!(isComingSoon ?? false))
                Icon(
                  Icons.arrow_forward_ios_rounded,
                  color: color,
                  size: 14,
                ),
            ],
          ),
        ),
      ),
    );
  }
}
