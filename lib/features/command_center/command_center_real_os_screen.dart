import 'package:flutter/material.dart';
import 'mock_data.dart';
import 'screens/tenant_profile_screen.dart';
import 'screens/property_details_screen.dart';
import 'screens/vendor_profile_screen.dart';

class CommandCenterRealOSScreen extends StatelessWidget {
  const CommandCenterRealOSScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('OmniRent Command Center'),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        elevation: 0.5,
      ),
      backgroundColor: const Color(0xFFF4F6F8),
      body: Row(
        children: [
          // Left: Live Feed (70%)
          Expanded(
            flex: 7,
            child: _LiveFeedPanel(),
          ),
          // Right: Property DNA + Insights (30%)
          Container(
            width: 1,
            color: Colors.grey.shade200,
            margin: const EdgeInsets.symmetric(vertical: 24),
          ),
          Expanded(
            flex: 3,
            child: Column(
              children: const [
                Expanded(flex: 6, child: _PropertyDNAPanel()),
                Divider(height: 1, thickness: 1),
                Expanded(flex: 4, child: _InsightsPanel()),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _LiveFeedPanel extends StatelessWidget {
  const _LiveFeedPanel();

  @override
  Widget build(BuildContext context) {
    // Track selected card index for highlight
    return _LiveFeedInteractiveList();
  }
}

class _LiveFeedInteractiveList extends StatefulWidget {
  const _LiveFeedInteractiveList();
  @override
  State<_LiveFeedInteractiveList> createState() => _LiveFeedInteractiveListState();
}

class _LiveFeedInteractiveListState extends State<_LiveFeedInteractiveList> {
  int? selectedIndex;

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      key: const PageStorageKey('LiveFeedList'),
      padding: const EdgeInsets.all(20),
      itemCount: mockUnifiedRequests.length,
      separatorBuilder: (_, _) => const SizedBox(height: 16),
      itemBuilder: (context, index) {
        final req = mockUnifiedRequests[index];
        final isSelected = selectedIndex == index;
        return MouseRegion(
          cursor: SystemMouseCursors.click,
          onEnter: (_) => setState(() {}),
          child: GestureDetector(
            onTap: () => setState(() => selectedIndex = index),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 150),
              decoration: BoxDecoration(
                color: isSelected ? Colors.blue.shade50 : Colors.white,
                borderRadius: BorderRadius.circular(18),
                border: isSelected ? Border.all(color: Colors.blue, width: 2) : null,
                boxShadow: [
                  if (isSelected)
                    BoxShadow(
                      color: Colors.blue.withOpacity(0.08),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                ],
              ),
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.circle, color: _statusColor(req.status), size: 14),
                        const SizedBox(width: 8),
                        Expanded(
                          child: InkWell(
                            onTap: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (_) => PropertyDetailsScreen(propertyName: req.property),
                                ),
                              );
                            },
                            child: MouseRegion(
                              cursor: SystemMouseCursors.click,
                              child: Text(
                                req.property,
                                style: const TextStyle(
                                  fontWeight: FontWeight.w700,
                                  fontSize: 18,
                                  color: Color(0xFF0F172A),
                                  decoration: TextDecoration.underline,
                                ),
                              ),
                            ),
                          ),
                        ),
                        Text('#${req.id}', style: const TextStyle(fontWeight: FontWeight.w600, color: Color(0xFF64748B))),
                        const SizedBox(width: 12),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: _statusColor(req.status).withOpacity(0.12),
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: Text(
                            req.status,
                            style: TextStyle(
                              color: _statusColor(req.status),
                              fontWeight: FontWeight.w700,
                              fontSize: 13,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        const Icon(Icons.person_outline, size: 18, color: Color(0xFF64748B)),
                        const SizedBox(width: 6),
                        InkWell(
                          onTap: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) => TenantProfileScreen(tenantName: req.tenant),
                              ),
                            );
                          },
                          child: MouseRegion(
                            cursor: SystemMouseCursors.click,
                            child: Text(
                              req.tenant,
                              style: const TextStyle(fontSize: 15, color: Color(0xFF334155), decoration: TextDecoration.underline),
                            ),
                          ),
                        ),
                        const SizedBox(width: 18),
                        const Icon(Icons.handshake, size: 18, color: Color(0xFF64748B)),
                        const SizedBox(width: 6),
                        req.assignedVendor.isEmpty
                            ? Text('Unassigned', style: const TextStyle(fontSize: 15, color: Color(0xFF334155)))
                            : InkWell(
                                onTap: () {
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                      builder: (_) => VendorProfileScreen(vendorName: req.assignedVendor),
                                    ),
                                  );
                                },
                                child: MouseRegion(
                                  cursor: SystemMouseCursors.click,
                                  child: Text(
                                    req.assignedVendor,
                                    style: const TextStyle(fontSize: 15, color: Color(0xFF334155), decoration: TextDecoration.underline),
                                  ),
                                ),
                              ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: Colors.blue.shade50,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            req.type,
                            style: const TextStyle(
                              color: Color(0xFF2563EB),
                              fontWeight: FontWeight.w600,
                              fontSize: 13,
                            ),
                          ),
                        ),
                        const Spacer(),
                        OutlinedButton.icon(
                          style: OutlinedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                            minimumSize: const Size(0, 36),
                            side: const BorderSide(color: Color(0xFFCBD5E1)),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                            foregroundColor: const Color(0xFF2563EB),
                            textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                          ),
                          onPressed: () {},
                          icon: const Icon(Icons.assignment_ind, size: 17),
                          label: const Text('Assign Vendor'),
                        ),
                        const SizedBox(width: 8),
                        OutlinedButton.icon(
                          style: OutlinedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                            minimumSize: const Size(0, 36),
                            side: const BorderSide(color: Color(0xFFCBD5E1)),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                            foregroundColor: const Color(0xFF2563EB),
                            textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                          ),
                          onPressed: () {},
                          icon: const Icon(Icons.check_circle, size: 17),
                          label: const Text('Mark Completed'),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    // Timeline visualization
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Timeline:', style: TextStyle(fontWeight: FontWeight.w600)),
                        const SizedBox(width: 8),
                        Expanded(
                          child: SingleChildScrollView(
                            scrollDirection: Axis.horizontal,
                            child: Row(
                              children: req.timeline.map((e) => Row(
                                children: [
                                  Column(
                                    children: [
                                      Icon(Icons.fiber_manual_record, size: 14, color: _statusColor(req.status)),
                                      if (e != req.timeline.last)
                                        Container(width: 2, height: 18, color: Colors.grey.shade300),
                                    ],
                                  ),
                                  Padding(
                                    padding: const EdgeInsets.symmetric(horizontal: 6),
                                    child: Text(e.label, style: const TextStyle(fontSize: 13)),
                                  ),
                                ],
                              )).toList(),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}

Color _statusColor(String status) {
  switch (status) {
    case 'Pending':
      return Colors.orange.shade600;
    case 'Scheduled':
      return Colors.blue.shade700;
    case 'Completed':
      return Colors.green.shade700;
    default:
      return Colors.grey.shade400;
  }
}

class _PropertyDNAPanel extends StatelessWidget {
  const _PropertyDNAPanel();

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: mockPropertyDNA.map((dna) {
        return Card(
          elevation: 3,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          color: Colors.white,
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(Icons.home_work, color: Colors.blue.shade700, size: 22),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(dna.propertyName, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 18)),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 16,
                  runSpacing: 8,
                  children: [
                    _dnaStat('Total Requests', dna.requests.length.toString(), Icons.assignment),
                    _dnaStat('Bookings', dna.bookings.length.toString(), Icons.calendar_today),
                  ],
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 16,
                  runSpacing: 8,
                  children: [
                    _dnaStat('Last Maintenance', dna.maintenanceRecords.isNotEmpty ? dna.maintenanceRecords.last : '-', Icons.build),
                    _dnaStat('Feedback', dna.feedbacks.isNotEmpty ? dna.feedbacks.last : '-', Icons.star),
                  ],
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 16,
                  runSpacing: 8,
                  children: [
                    _dnaStat('Price Trend', dna.pricingHistory.join(' → '), Icons.trending_up),
                  ],
                ),
              ],
            ),
          ),
        );
      }).toList(),
    );
  }
}

Widget _dnaStat(String label, String value, IconData icon) {
  return Row(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Icon(icon, size: 16, color: Colors.blue.shade400),
      const SizedBox(width: 4),
      Text('$label: ', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
      Flexible(
        child: Text(
          value,
          style: const TextStyle(fontWeight: FontWeight.w400, fontSize: 13),
          softWrap: true,
          overflow: TextOverflow.visible,
        ),
      ),
    ],
  );
}

class _InsightsPanel extends StatelessWidget {
  const _InsightsPanel();

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _insightCard(
          icon: Icons.trending_up,
          color: Colors.orange.shade700,
          title: 'High Demand Property',
          description: 'This property is receiving above-average requests and bookings.',
        ),
        _insightCard(
          icon: Icons.price_change,
          color: Colors.red.shade400,
          title: 'Price Above Market',
          description: 'Pricing is above the local market average. Consider review.',
        ),
        _insightCard(
          icon: Icons.build_circle,
          color: Colors.purple.shade400,
          title: 'Frequent Maintenance Issues',
          description: 'This property has recurring maintenance requests.',
        ),
        _insightCard(
          icon: Icons.thumb_down,
          color: Colors.blueGrey.shade700,
          title: 'Low Vendor Performance',
          description: 'Assigned vendors have low completion rates or feedback.',
        ),
      ],
    );
  }
}

Widget _insightCard({required IconData icon, required Color color, required String title, required String description}) {
  return Card(
    elevation: 2,
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
    child: Padding(
      padding: const EdgeInsets.all(18),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color, size: 28),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                const SizedBox(height: 4),
                Text(description, style: const TextStyle(fontSize: 14, color: Color(0xFF64748B))),
              ],
            ),
          ),
        ],
      ),
    ),
  );
}
