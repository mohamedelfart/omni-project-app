import 'package:flutter/material.dart';

import '../../../core/models/models.dart';
import '../../../shared/widgets/premium_visual_asset.dart';
import '../../../shared/widgets/loading_action_button.dart';

class PaymentsScreen extends StatefulWidget {
  final Property? confirmedProperty;

  const PaymentsScreen({super.key, this.confirmedProperty});

  @override
  State<PaymentsScreen> createState() => _PaymentsScreenState();
}

class _PaymentsScreenState extends State<PaymentsScreen> {
  bool _isLoading = true;
  bool _isPaying = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _isLoading = true);
    await Future.delayed(const Duration(milliseconds: 900));
    if (!mounted) {
      return;
    }
    setState(() => _isLoading = false);
  }

  Future<void> _payNow() async {
    setState(() => _isPaying = true);
    await Future.delayed(const Duration(milliseconds: 1200));
    if (!mounted) {
      return;
    }
    setState(() => _isPaying = false);
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Payment request submitted.')),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Payments'),
        backgroundColor: const Color(0xFFF8FAFC),
        elevation: 0,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF1E3A5F)))
          : ListView(
              padding: const EdgeInsets.all(20),
              children: [
                if (widget.confirmedProperty != null) ...[
                  _SectionCard(
                    title: 'Confirmed property',
                    subtitle: widget.confirmedProperty!.title,
                    trailing:
                        '${widget.confirmedProperty!.price.toStringAsFixed(0)} ${widget.confirmedProperty!.currency}',
                    accent: const Color(0xFF1E3A5F),
                    visualUrl: PremiumVisualCatalog.property,
                  ),
                  const SizedBox(height: 16),
                ],
                const _SectionCard(
                  title: 'Booking payment',
                  subtitle: 'Security deposit and first installment ready for checkout.',
                  trailing: 'Due now',
                  accent: Color(0xFFF97316),
                  visualUrl: PremiumVisualCatalog.payments,
                ),
                const SizedBox(height: 16),
                const _SectionCard(
                  title: 'Insurance',
                  subtitle: 'Optional protection plan can be combined in the same payment.',
                  trailing: 'Optional',
                  accent: Color(0xFF0F766E),
                  visualUrl: PremiumVisualCatalog.insurance,
                ),
                const SizedBox(height: 16),
                const _SectionCard(
                  title: 'Service invoices',
                  subtitle: 'Track move-in, cleaning, and external service charges in one place.',
                  trailing: 'Unified',
                  accent: Color(0xFF7C3AED),
                  visualUrl: PremiumVisualCatalog.globalServices,
                ),
                const SizedBox(height: 24),
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [Color(0xFFFFFFFF), Color(0xFFF2F7FF)],
                    ),
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const PremiumVisualAsset(
                        imageUrl: PremiumVisualCatalog.payments,
                        semanticLabel: 'Payment handoff',
                        aspectRatio: 2.4,
                      ),
                      const SizedBox(height: 14),
                      const Text(
                        'Payment handoff',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF0F172A),
                        ),
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        'Use a single checkout entry for confirmed property payments and any activated tenant services.',
                        style: TextStyle(
                          color: Color(0xFF64748B),
                          height: 1.5,
                        ),
                      ),
                      const SizedBox(height: 20),
                      LoadingActionButton(
                        label: 'Pay now',
                        isLoading: _isPaying,
                        onPressed: _payNow,
                      ),
                    ],
                  ),
                ),
              ],
            ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  final String title;
  final String subtitle;
  final String trailing;
  final Color accent;
  final String visualUrl;

  const _SectionCard({
    required this.title,
    required this.subtitle,
    required this.trailing,
    required this.accent,
    required this.visualUrl,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 72,
            child: PremiumVisualAsset(
              imageUrl: visualUrl,
              semanticLabel: title,
              aspectRatio: 1,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF0F172A),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  subtitle,
                  style: const TextStyle(
                    fontSize: 13,
                    height: 1.5,
                    color: Color(0xFF64748B),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Text(
            trailing,
            style: TextStyle(
              color: accent,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}