import 'package:flutter/material.dart';
import '../../auth/screens/login_screen.dart';

// ============================================================================
// APP ENTRY SCREEN — Role Selection
// Role determines the destination after login. No business logic here.
// ============================================================================

enum UserRole { tenant, vendor, admin }

class AppEntryScreen extends StatelessWidget {
  const AppEntryScreen({super.key});

  void _goToLogin(BuildContext context, UserRole role) {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => LoginScreen(role: role)),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 40),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 32),

              // ── Title ──────────────────────────────────────────
              const Text(
                'OmniRent',
                style: TextStyle(
                  fontSize: 34,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF1E3A5F),
                  letterSpacing: -0.5,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'اختر نوع حسابك للمتابعة',
                style: TextStyle(fontSize: 16, color: Color(0xFF6B7280)),
              ),

              const Spacer(),

              // ── Role Cards ─────────────────────────────────────
              _RoleCard(
                label: 'مستأجر',
                subtitle: 'ابحث عن عقار واحجز جولة الآن',
                icon: Icons.home_outlined,
                color: const Color(0xFF0047AB),
                onTap: () => _goToLogin(context, UserRole.tenant),
              ),
              const SizedBox(height: 16),
              _RoleCard(
                label: 'مندوب / منسق',
                subtitle: 'إدارة الجولات والمهام الميدانية',
                icon: Icons.handyman_outlined,
                color: const Color(0xFF10B981),
                onTap: () => _goToLogin(context, UserRole.vendor),
              ),
              const SizedBox(height: 16),
              _RoleCard(
                label: 'Command Center',
                subtitle: 'مركز العمليات والإشراف الإداري',
                icon: Icons.dashboard_outlined,
                color: const Color(0xFF1E3A5F),
                onTap: () => _goToLogin(context, UserRole.admin),
              ),

              const Spacer(),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Role Card Widget ──────────────────────────────────────────────────────────

class _RoleCard extends StatelessWidget {
  const _RoleCard({
    required this.label,
    required this.subtitle,
    required this.icon,
    required this.color,
    required this.onTap,
  });

  final String label;
  final String subtitle;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(16),
      elevation: 0,
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFE5E7EB)),
          ),
          child: Row(
            children: [
              Container(
                width: 52,
                height: 52,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(icon, color: color, size: 26),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      label,
                      style: const TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF1F2937),
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      subtitle,
                      style: const TextStyle(
                        fontSize: 13,
                        color: Color(0xFF6B7280),
                      ),
                    ),
                  ],
                ),
              ),
              Icon(Icons.arrow_forward_ios_rounded, color: color, size: 16),
            ],
          ),
        ),
      ),
    );
  }
}
