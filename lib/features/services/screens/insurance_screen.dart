import 'package:flutter/material.dart';

import '../../../shared/widgets/premium_visual_asset.dart';
import '../../../shared/widgets/loading_action_button.dart';

class InsuranceScreen extends StatefulWidget {
  const InsuranceScreen({super.key});

  @override
  State<InsuranceScreen> createState() => _InsuranceScreenState();
}

class _InsuranceScreenState extends State<InsuranceScreen> {
  bool _isLoading = true;
  bool _isSubmitting = false;
  String _selectedPlan = 'Secure 6';

  final List<_InsurancePlan> _plans = const [
    _InsurancePlan(
      name: 'Secure 3',
      priceLabel: '500 QAR',
      description: 'Three months of payment interruption cover.',
      visualUrl: PremiumVisualCatalog.insurance,
      highlight: false,
    ),
    _InsurancePlan(
      name: 'Secure 6',
      priceLabel: '900 QAR',
      description: 'Balanced coverage for move-in and early tenancy risk.',
      visualUrl: PremiumVisualCatalog.insurance,
      highlight: true,
    ),
    _InsurancePlan(
      name: 'Secure 12',
      priceLabel: '1,500 QAR',
      description: 'Full-year protection for rent disruption scenarios.',
      visualUrl: PremiumVisualCatalog.insurance,
      highlight: false,
    ),
  ];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _isLoading = true);
    await Future.delayed(const Duration(milliseconds: 800));
    if (!mounted) {
      return;
    }
    setState(() => _isLoading = false);
  }

  Future<void> _activate() async {
    setState(() => _isSubmitting = true);
    await Future.delayed(const Duration(milliseconds: 1100));
    if (!mounted) {
      return;
    }
    setState(() => _isSubmitting = false);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('$_selectedPlan insurance added to payments.')),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Insurance'),
        backgroundColor: const Color(0xFFF8FAFC),
        elevation: 0,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF1E3A5F)))
          : ListView(
              padding: const EdgeInsets.all(20),
              children: [
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [Color(0xFF1E3A5F), Color(0xFF355C8A)],
                    ),
                    borderRadius: BorderRadius.circular(28),
                  ),
                  child: const Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      PremiumVisualAsset(
                        imageUrl: PremiumVisualCatalog.insurance,
                        semanticLabel: 'Insurance protection',
                        aspectRatio: 2.3,
                      ),
                      SizedBox(height: 14),
                      Text(
                        'Tenant protection',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 22,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      SizedBox(height: 10),
                      Text(
                        'Highlight insurance during the tenant journey and push selected coverage into the payment handoff.',
                        style: TextStyle(
                          color: Colors.white70,
                          height: 1.5,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                ..._plans.map(
                  (plan) => Padding(
                    padding: const EdgeInsets.only(bottom: 16),
                    child: GestureDetector(
                      onTap: () => setState(() => _selectedPlan = plan.name),
                      child: _PlanCard(
                        plan: plan,
                        isSelected: _selectedPlan == plan.name,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                LoadingActionButton(
                  label: 'Add insurance to payments',
                  isLoading: _isSubmitting,
                  onPressed: _activate,
                ),
              ],
            ),
    );
  }
}

class _PlanCard extends StatelessWidget {
  final _InsurancePlan plan;
  final bool isSelected;

  const _PlanCard({required this.plan, required this.isSelected});

  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 180),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: isSelected ? const Color(0xFF1E3A5F) : const Color(0xFFE2E8F0),
          width: isSelected ? 2 : 1,
        ),
        boxShadow: isSelected
            ? const [
                BoxShadow(
                  color: Color(0x141E3A5F),
                  blurRadius: 20,
                  offset: Offset(0, 8),
                ),
              ]
            : null,
      ),
      child: Row(
        children: [
          SizedBox(
            width: 86,
            child: PremiumVisualAsset(
              imageUrl: plan.visualUrl,
              semanticLabel: plan.name,
              aspectRatio: 1,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      plan.name,
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF0F172A),
                      ),
                    ),
                    if (plan.highlight) ...[
                      const SizedBox(width: 10),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 5,
                        ),
                        decoration: BoxDecoration(
                          color: const Color(0xFFDBEAFE),
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: const Text(
                          'Recommended',
                          style: TextStyle(
                            color: Color(0xFF1D4ED8),
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  plan.description,
                  style: const TextStyle(
                    color: Color(0xFF64748B),
                    height: 1.5,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Text(
            plan.priceLabel,
            style: const TextStyle(
              color: Color(0xFF1E3A5F),
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }
}

class _InsurancePlan {
  final String name;
  final String priceLabel;
  final String description;
  final String visualUrl;
  final bool highlight;

  const _InsurancePlan({
    required this.name,
    required this.priceLabel,
    required this.description,
    required this.visualUrl,
    required this.highlight,
  });
}