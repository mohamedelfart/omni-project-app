import 'package:flutter/material.dart';

import 'property_flow_ui.dart';

// 1. HERO SECTION
class LivingHeroSection extends StatelessWidget {
  final String userName;
  final String userStatus;
  final String tagline;
  const LivingHeroSection({super.key, required this.userName, required this.userStatus, required this.tagline});
  @override
  Widget build(BuildContext context) {
    Color statusColor;
    switch (userStatus) {
      case 'Viewing': statusColor = const Color(0xFFFEF08A); break;
      case 'Reserved': statusColor = const Color(0xFF93C5FD); break;
      case 'Living': statusColor = const Color(0xFFBBF7D0); break;
      default: statusColor = const Color(0xFFE0E7EF);
    }
    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 18, offset: const Offset(0, 8))],
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 34,
            backgroundColor: const Color(0xFF1D4ED8),
            child: Text(userName[0], style: const TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.bold)),
          ),
          const SizedBox(width: 18),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(userName, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: Color(0xFF0F172A))),
                const SizedBox(height: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                  decoration: BoxDecoration(
                    color: statusColor,
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(userStatus, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF334155))),
                ),
                const SizedBox(height: 10),
                Text(tagline, style: const TextStyle(fontSize: 13, color: Color(0xFF64748B), fontWeight: FontWeight.w500)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// 2. TENANT JOURNEY PROGRESS
class TenantJourneyProgress extends StatelessWidget {
  final int currentStep;
  const TenantJourneyProgress({super.key, required this.currentStep});
  static const List<String> steps = ['Browse', 'Cart', 'Viewing', 'Reserved', 'Move In'];
  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: List.generate(steps.length, (i) {
        final bool active = i <= currentStep;
        return Expanded(
          child: Column(
            children: [
              Container(
                width: 32, height: 32,
                decoration: BoxDecoration(
                  color: active ? const Color(0xFF1D4ED8) : const Color(0xFFE0E7EF),
                  borderRadius: BorderRadius.circular(999),
                ),
                alignment: Alignment.center,
                child: Text('${i+1}', style: TextStyle(color: active ? Colors.white : const Color(0xFF64748B), fontWeight: FontWeight.bold)),
              ),
              const SizedBox(height: 6),
              Text(steps[i], style: TextStyle(fontSize: 12, color: active ? const Color(0xFF1D4ED8) : const Color(0xFF94A3B8), fontWeight: FontWeight.w600)),
            ],
          ),
        );
      }),
    );
  }
}

// 3. QUICK ACTIONS
class QuickActions extends StatelessWidget {
  final VoidCallback onCartTap;
  final VoidCallback onViewingsTap;
  final VoidCallback onReservationsTap;
  final VoidCallback onSavedTap;
  const QuickActions({super.key, required this.onCartTap, required this.onViewingsTap, required this.onReservationsTap, required this.onSavedTap});
  @override
  Widget build(BuildContext context) {
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisSpacing: 14,
      mainAxisSpacing: 14,
      childAspectRatio: 1.5,
      children: [
        _QuickActionCard(icon: Icons.shopping_bag_outlined, label: 'My Cart', color: const Color(0xFF1D4ED8), onTap: onCartTap),
        _QuickActionCard(icon: Icons.calendar_today_outlined, label: 'My Viewings', color: const Color(0xFF0369A1), onTap: onViewingsTap),
        _QuickActionCard(icon: Icons.home_outlined, label: 'Reservations', color: const Color(0xFF16A34A), onTap: onReservationsTap),
        _QuickActionCard(icon: Icons.favorite_border_rounded, label: 'Saved', color: const Color(0xFF7C3AED), onTap: onSavedTap),
      ],
    );
  }
}

class _QuickActionCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;
  const _QuickActionCard({required this.icon, required this.label, required this.color, required this.onTap});
  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 14, offset: const Offset(0, 6))],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Container(
              width: 38, height: 38,
              decoration: BoxDecoration(color: color.withOpacity(0.12), borderRadius: BorderRadius.circular(12)),
              alignment: Alignment.center,
              child: Icon(icon, size: 20, color: color),
            ),
            Text(label, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Color(0xFF0F172A), fontSize: 13, fontWeight: FontWeight.w700)),
          ],
        ),
      ),
    );
  }
}

// 4. BENEFITS (IMPROVED)
class BenefitsCardPremium extends StatelessWidget {
  const BenefitsCardPremium({super.key});

  @override
  Widget build(BuildContext context) {
    // Mock benefit status
    final List<Map<String, dynamic>> benefits = [
      {'icon': Icons.local_shipping_outlined, 'label': 'Free Moving', 'status': 'Available'},
      {'icon': Icons.cleaning_services_outlined, 'label': 'Free Cleaning', 'status': 'Used'},
      {'icon': Icons.home_repair_service_outlined, 'label': 'Free Setup', 'status': 'Available'},
    ];
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: <Color>[Color(0xFFEFF6FF), Color(0xFFF0FDF4)],
        ),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: const Color(0xFFBFDBFE), width: 1.2),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 14, offset: const Offset(0, 6))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Expanded(
                child: Text('Included Benefits', style: TextStyle(color: Color(0xFF0F172A), fontSize: 16, fontWeight: FontWeight.w700)),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(color: const Color(0xFF16A34A), borderRadius: BorderRadius.circular(999)),
                child: const Text('🎁 Free', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w700)),
              ),
            ],
          ),
          const SizedBox(height: 16),
          ...benefits.map((b) => Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Row(
              children: [
                Container(
                  width: 40, height: 40,
                  decoration: BoxDecoration(color: const Color(0xFFDCFCE7), borderRadius: BorderRadius.circular(12)),
                  alignment: Alignment.center,
                  child: Icon(b['icon'], size: 20, color: const Color(0xFF16A34A)),
                ),
                const SizedBox(width: 12),
                Expanded(child: Text(b['label'], style: const TextStyle(color: Color(0xFF0F172A), fontSize: 14, fontWeight: FontWeight.w700))),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: b['status'] == 'Available' ? const Color(0xFFDCFCE7) : const Color(0xFFFDE68A),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(b['status'], style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: b['status'] == 'Available' ? const Color(0xFF16A34A) : const Color(0xFFB45309))),
                ),
              ],
            ),
          )),
        ],
      ),
    );
  }
}

// 5. DOCUMENTS & SETTINGS (COMPACT)
class DocumentsCompact extends StatelessWidget {
  final void Function(String, String) onShow;
  const DocumentsCompact({super.key, required this.onShow});
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(18), boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 12, offset: const Offset(0, 4))]),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Documents', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15, color: Color(0xFF0F172A))),
          const SizedBox(height: 10),
          _DocMini(icon: Icons.description_outlined, label: 'Lease Docs', onTap: () {}),
          _DocMini(icon: Icons.receipt_long_outlined, label: 'Confirmations', onTap: () {}),
          _DocMini(icon: Icons.credit_card_outlined, label: 'Receipts', onTap: () {}),
        ],
      ),
    );
  }
}
class _DocMini extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  const _DocMini({required this.icon, required this.label, required this.onTap});
  @override
  Widget build(BuildContext context) {
    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: Icon(icon, color: const Color(0xFF1D4ED8)),
      title: Text(label, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
      onTap: onTap,
      dense: true,
      minLeadingWidth: 0,
    );
  }
}
class SettingsCompact extends StatelessWidget {
  final bool notificationsEnabled;
  final ValueChanged<bool> onToggleNotifications;
  final void Function(String, String) onShow;
  final VoidCallback onComingSoon;
  const SettingsCompact({
    required this.notificationsEnabled,
    required this.onToggleNotifications,
    required this.onShow,
    required this.onComingSoon,
    super.key,
  });
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(18), boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 12, offset: const Offset(0, 4))]),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Settings', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15, color: Color(0xFF0F172A))),
          const SizedBox(height: 10),
          SwitchListTile(
            value: notificationsEnabled,
            onChanged: onToggleNotifications,
            title: const Text('Notifications', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
            activeThumbColor: const Color(0xFF1D4ED8),
            contentPadding: EdgeInsets.zero,
          ),
          ListTile(
            leading: const Icon(Icons.language_outlined, color: Color(0xFF1D4ED8)),
            title: const Text('Language', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
            trailing: OmniLanguageSwitcher(),
            onTap: onComingSoon,
            dense: true,
            minLeadingWidth: 0,
          ),
          ListTile(
            leading: const Icon(Icons.payment_outlined, color: Color(0xFF1D4ED8)),
            title: const Text('Payment Methods', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
            onTap: () => onShow('Payment Methods', 'No payment methods saved.'),
            dense: true,
            minLeadingWidth: 0,
          ),
        ],
      ),
    );
  }
}

// 6. EARNING MODE PLACEHOLDER
class EarningModePlaceholderEnhanced extends StatelessWidget {
  const EarningModePlaceholderEnhanced({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: const Color(0xFFF1F5F9),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFF93C5FD), width: 1.1),
      ),
      child: Row(
        children: [
          Container(
            width: 44, height: 44,
            decoration: BoxDecoration(
              color: const Color(0xFFDBEAFE),
              borderRadius: BorderRadius.circular(12),
            ),
            alignment: Alignment.center,
            child: const Icon(Icons.trending_up_rounded, color: Color(0xFF1D4ED8), size: 26),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: const [
                Text('Earning Mode (Coming Soon)', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15, color: Color(0xFF0F172A))),
                SizedBox(height: 4),
                Text('List your property and track future income potential', style: TextStyle(fontSize: 12, color: Color(0xFF64748B), fontWeight: FontWeight.w500)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}