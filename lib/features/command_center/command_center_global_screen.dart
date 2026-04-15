import 'package:flutter/material.dart';

import 'command_center_requests_screen.dart';

class CommandCenterGlobalScreen extends StatelessWidget {
  const CommandCenterGlobalScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 5,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('OmniRent Command Center'),
          backgroundColor: Colors.white,
          foregroundColor: Colors.black,
          elevation: 0.5,
          bottom: const TabBar(
            isScrollable: true,
            labelColor: Color(0xFF2563EB),
            unselectedLabelColor: Color(0xFF64748B),
            indicatorColor: Color(0xFF2563EB),
            tabs: [
              Tab(text: 'Property Control'),
              Tab(text: 'Live Ops'),
              Tab(text: 'Intelligence'),
              Tab(text: 'Market'),
              Tab(text: 'Revenue'),
            ],
          ),
        ),
        backgroundColor: const Color(0xFFF4F6F8),
        body: const TabBarView(
          children: [
            _PropertyControlPanel(),
            _LiveOperationsPanel(),
            _IntelligenceDashboardPanel(),
            _MarketAnalyticsPanel(),
            _RevenuePanel(),
          ],
        ),
      ),
    );
  }
}

// 1. PROPERTY CONTROL PANEL
class _PropertyControlPanel extends StatelessWidget {
  const _PropertyControlPanel();

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Row(
          children: [
            ElevatedButton.icon(
              icon: const Icon(Icons.add_box_rounded),
              label: const Text('Add Property'),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF2563EB),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                textStyle: const TextStyle(fontWeight: FontWeight.w700),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              onPressed: () {},
            ),
            const SizedBox(width: 12),
            ElevatedButton.icon(
              icon: const Icon(Icons.edit_rounded),
              label: const Text('Edit / Update'),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF64748B),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                textStyle: const TextStyle(fontWeight: FontWeight.w700),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              onPressed: () {},
            ),
            const SizedBox(width: 12),
            ElevatedButton.icon(
              icon: const Icon(Icons.visibility_rounded),
              label: const Text('Publish / Hide'),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFCBD5E1),
                foregroundColor: Colors.black,
                padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                textStyle: const TextStyle(fontWeight: FontWeight.w700),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              onPressed: () {},
            ),
            const SizedBox(width: 12),
            ElevatedButton.icon(
              icon: const Icon(Icons.price_change_rounded),
              label: const Text('Pricing'),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFFEF08A),
                foregroundColor: Colors.black,
                padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                textStyle: const TextStyle(fontWeight: FontWeight.w700),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              onPressed: () {},
            ),
          ],
        ),
        const SizedBox(height: 24),
        Card(
          elevation: 2,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: const [
                Text('Property List (Mock)', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 18)),
                SizedBox(height: 8),
                Text('• Pearl Tower 2 (Published)\n• West Bay Residence (Hidden)\n• Lusail Heights (Published)', style: TextStyle(fontSize: 15)),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

// 2. LIVE OPERATIONS PANEL
class _LiveOperationsPanel extends StatelessWidget {
  const _LiveOperationsPanel();

  @override
  Widget build(BuildContext context) {
    return CommandCenterRequestsScreen();
  }
}

// 3. INTELLIGENCE DASHBOARD PANEL
class _IntelligenceDashboardPanel extends StatelessWidget {
  const _IntelligenceDashboardPanel();

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Card(
          elevation: 2,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Property Intelligence', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 18)),
                const SizedBox(height: 8),
                _PropertyIntelligenceRow(
                  property: 'Pearl Tower 2',
                  occupancy: 0.92,
                  demand: 'High',
                  timeToRent: 5,
                  conversion: 0.41,
                ),
                _PropertyIntelligenceRow(
                  property: 'West Bay Residence',
                  occupancy: 0.68,
                  demand: 'Medium',
                  timeToRent: 14,
                  conversion: 0.22,
                ),
                _PropertyIntelligenceRow(
                  property: 'Lusail Heights',
                  occupancy: 0.81,
                  demand: 'Low',
                  timeToRent: 21,
                  conversion: 0.13,
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 24),
        Card(
          elevation: 2,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: const [
                Text('AI Insights', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 18)),
                SizedBox(height: 8),
                Text('• Price too high compared to market\n• High demand area\n• Low performance property', style: TextStyle(fontSize: 15)),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _PropertyIntelligenceRow extends StatelessWidget {
  final String property;
  final double occupancy;
  final String demand;
  final int timeToRent;
  final double conversion;
  const _PropertyIntelligenceRow({
    required this.property,
    required this.occupancy,
    required this.demand,
    required this.timeToRent,
    required this.conversion,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Expanded(flex: 2, child: Text(property, style: const TextStyle(fontSize: 15))),
          Expanded(child: Text('${(occupancy * 100).toStringAsFixed(0)}%', style: const TextStyle(fontSize: 15))),
          Expanded(child: Text(demand, style: TextStyle(fontSize: 15, color: demand == 'High' ? Colors.green : demand == 'Low' ? Colors.red : Colors.orange))),
          Expanded(child: Text('$timeToRent d', style: const TextStyle(fontSize: 15))),
          Expanded(child: Text('${(conversion * 100).toStringAsFixed(0)}%', style: const TextStyle(fontSize: 15))),
        ],
      ),
    );
  }
}

// 4. MARKET ANALYTICS PANEL
class _MarketAnalyticsPanel extends StatelessWidget {
  const _MarketAnalyticsPanel();

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Card(
          elevation: 2,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: const [
                Text('Top Performing Areas', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 18)),
                SizedBox(height: 8),
                Text('1. The Pearl\n2. West Bay\n3. Lusail', style: TextStyle(fontSize: 15)),
              ],
            ),
          ),
        ),
        const SizedBox(height: 24),
        Card(
          elevation: 2,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: const [
                Text('Average Rent Prices', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 18)),
                SizedBox(height: 8),
                Text('The Pearl: QAR 12,000\nWest Bay: QAR 10,500\nLusail: QAR 8,900', style: TextStyle(fontSize: 15)),
              ],
            ),
          ),
        ),
        const SizedBox(height: 24),
        Card(
          elevation: 2,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: const [
                Text('Demand Trends', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 18)),
                SizedBox(height: 8),
                Text('• Demand rising in Lusail\n• Stable in The Pearl\n• Slight drop in Al Sadd', style: TextStyle(fontSize: 15)),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

// 5. REVENUE PANEL
class _RevenuePanel extends StatelessWidget {
  const _RevenuePanel();

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Card(
          elevation: 2,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: const [
                Text('Revenue Overview', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 18)),
                SizedBox(height: 8),
                Text('Monthly Revenue: QAR 320,000\nExpected Revenue: QAR 350,000\nLost Opportunities: QAR 18,000', style: TextStyle(fontSize: 15)),
              ],
            ),
          ),
        ),
        const SizedBox(height: 24),
        Card(
          elevation: 2,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: const [
                Text('Vendor Performance', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 18)),
                SizedBox(height: 8),
                Text('• Vendor A: 4.8★, Fast, Efficient\n• Vendor B: 4.2★, Average speed\n• Vendor C: 3.7★, Slow, High cost', style: TextStyle(fontSize: 15)),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
