import 'package:flutter/material.dart';

import '../../../core/models/models.dart';
import 'property_flow_ui.dart';
import 'omnicart_screen.dart';
import 'omnirent_flow_state.dart';

import '_smart_insights.dart';
import '_living_dashboard_widgets.dart';

// ===========================================================================
//  OMNIRENT PROFILE HUB — Premium Tenant Account Screen
//  Supports EN | AR with full RTL layout switching
// ===========================================================================

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  // ── In-memory guest/mock data (UI-only, no API) ──────────────────────────
  bool _isVerified = false;
  bool _notificationsEnabled = true;
  // saved properties (UI-only demo list)
  final List<String> _savedPropertyIds = <String>[];
  // Mock viewings & reservations counts
  final int _viewingCount = 0;
  final int _reservationCount = 0;

  // ── Helpers ───────────────────────────────────────────────────────────────
  String _t(String en, String ar) => OmniRentI18n.t(context, en, ar);

  @override
  Widget build(BuildContext context) {
    // Mock user journey state
    final String userName = 'Tenant User';
    final String userStatus = 'Viewing'; // Exploring / Viewing / Reserved / Living
    final String tagline = 'Your journey to premium living starts here.';
    final int journeyStep = 2; // 0: Browse, 1: Cart, 2: Viewing, 3: Reserved, 4: Move In

    // Mock stats
    final int savedCount = 3;
    final int viewingCount = 1;
    String smartInsight;
    switch (userStatus) {
      case 'Viewing':
        smartInsight = 'You are actively exploring premium listings.';
        break;
      case 'Reserved':
        smartInsight = 'You are close to booking your next home!';
        break;
      case 'Living':
        smartInsight = 'Enjoy your new home and exclusive benefits!';
        break;
      default:
        smartInsight = 'Start your journey to premium living.';
    }

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
          _t('Living Dashboard', 'لوحة المعيشة'),
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
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 40),
          children: <Widget>[
            // SMART INSIGHTS SECTION
            SmartInsights(
              savedCount: savedCount,
              viewingCount: viewingCount,
              journeyStage: userStatus,
              smartInsight: smartInsight,
            ),
            const SizedBox(height: 18),

            // 1. HERO SECTION
            LivingHeroSection(
              userName: userName,
              userStatus: userStatus,
              tagline: tagline,
            ),
            const SizedBox(height: 22),

            // 2. TENANT JOURNEY
            TenantJourneyProgress(currentStep: journeyStep),
            const SizedBox(height: 28),

            // 3. QUICK ACTIONS
            QuickActions(
              onCartTap: () => Navigator.push(
                context,
                MaterialPageRoute<void>(builder: (_) => const OmniCartScreen()),
              ),
              onViewingsTap: () => _showEmptySheet(
                _t('My Viewings', 'معايناتي'),
                _t('No viewings scheduled yet.', 'لا توجد معاينات مجدولة بعد.'),
              ),
              onReservationsTap: () => _showEmptySheet(
                _t('My Reservations', 'حجوزاتي'),
                _t('No reservations made yet.', 'لا توجد حجوزات بعد.'),
              ),
              onSavedTap: () => _showEmptySheet(
                _t('Saved Properties', 'العقارات المحفوظة'),
                _t('No saved properties yet.', 'لا توجد عقارات محفوظة بعد.'),
              ),
            ),
            const SizedBox(height: 28),

            // 4. BENEFITS (IMPROVED)
            _SectionTitle(label: _t('Included Benefits', 'المزايا المضمّنة')),
            const SizedBox(height: 12),
            BenefitsCardPremium(),
            const SizedBox(height: 28),

            // 5. DOCUMENTS & SETTINGS (COMPACT)
            Row(
              children: [
                Expanded(child: DocumentsCompact(onShow: _showEmptySheet)),
                const SizedBox(width: 16),
                Expanded(child: SettingsCompact(
                  notificationsEnabled: _notificationsEnabled,
                  onToggleNotifications: (v) => setState(() => _notificationsEnabled = v),
                  onShow: _showEmptySheet,
                  onComingSoon: _showComingSoon,
                )),
              ],
            ),
            const SizedBox(height: 28),

            // 6. EARNING MODE PLACEHOLDER (ENHANCED)
            EarningModePlaceholderEnhanced(),

            const SizedBox(height: 32),
            // 7. LOGOUT
            _LogoutButton(
              onTap: () => _confirmLogout(),
            ),
          ],
        ),
      ),
    );
  }

  // ── Bottom Sheets ─────────────────────────────────────────────────────────
  void _showEditProfileSheet() {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (_) => _EditProfileSheet(
        isVerified: _isVerified,
        onVerify: () {
          Navigator.pop(context);
          setState(() => _isVerified = true);
        },
      ),
    );
  }

  void _showEmptySheet(String title, String message) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (_) => _EmptyStateSheet(title: title, message: message),
    );
  }

  void _showComingSoon() {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(_t('Coming soon', 'قريباً')),
        backgroundColor: const Color(0xFF1D4ED8),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
      ),
    );
  }

  void _confirmLogout() {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (BuildContext ctx) => _LogoutConfirmSheet(
        onConfirm: () {
          Navigator.pop(ctx);
          OmniRentFlowState.setLoggedIn(false);
          OmniRentFlowState.clearCart();
          Navigator.pop(context);
        },
        onCancel: () => Navigator.pop(ctx),
      ),
    );
  }
}

// ===========================================================================
//  1. PROFILE HEADER
// ===========================================================================

class _ProfileHeader extends StatelessWidget {
  final bool isVerified;
  final VoidCallback onEditTap;

  const _ProfileHeader({required this.isVerified, required this.onEditTap});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: <BoxShadow>[
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          // Avatar
          Stack(
            children: <Widget>[
              Container(
                width: 72,
                height: 72,
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: <Color>[Color(0xFF002366), Color(0xFF0047AB)],
                  ),
                ),
                alignment: Alignment.center,
                child: const Text(
                  'T',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 28,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              Positioned(
                bottom: 0,
                right: 0,
                child: Container(
                  width: 20,
                  height: 20,
                  decoration: BoxDecoration(
                    color: isVerified
                        ? const Color(0xFF16A34A)
                        : const Color(0xFF94A3B8),
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white, width: 2),
                  ),
                  child: Icon(
                    isVerified ? Icons.check : Icons.person,
                    size: 10,
                    color: Colors.white,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(
                  OmniRentI18n.t(context, 'Tenant User', 'المستخدم'),
                  style: const TextStyle(
                    color: Color(0xFF0F172A),
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  OmniRentI18n.t(
                      context, 'tenant@omnirent.qa', 'tenant@omnirent.qa'),
                  style: const TextStyle(
                    color: Color(0xFF64748B),
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 8),
                Row(
                  children: <Widget>[
                    // Status badge
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: isVerified
                            ? const Color(0xFFDCFCE7)
                            : const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: <Widget>[
                          Icon(
                            isVerified
                                ? Icons.verified_rounded
                                : Icons.person_outline_rounded,
                            size: 12,
                            color: isVerified
                                ? const Color(0xFF16A34A)
                                : const Color(0xFF64748B),
                          ),
                          const SizedBox(width: 4),
                          Text(
                            isVerified
                                ? OmniRentI18n.t(
                                    context, 'Verified', 'موثّق')
                                : OmniRentI18n.t(
                                    context, 'Guest', 'زائر'),
                            style: TextStyle(
                              color: isVerified
                                  ? const Color(0xFF16A34A)
                                  : const Color(0xFF64748B),
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          // Edit button
          GestureDetector(
            onTap: onEditTap,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
              decoration: BoxDecoration(
                color: const Color(0xFFEFF6FF),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                OmniRentI18n.t(context, 'Edit', 'تعديل'),
                style: const TextStyle(
                  color: Color(0xFF1D4ED8),
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ===========================================================================
//  2. ACTIVITY GRID
// ===========================================================================

class _ActivityGrid extends StatelessWidget {
  final int viewingCount;
  final int reservationCount;
  final int savedCount;
  final VoidCallback onCartTap;
  final VoidCallback onViewingsTap;
  final VoidCallback onReservationsTap;
  final VoidCallback onSavedTap;

  const _ActivityGrid({
    required this.viewingCount,
    required this.reservationCount,
    required this.savedCount,
    required this.onCartTap,
    required this.onViewingsTap,
    required this.onReservationsTap,
    required this.onSavedTap,
  });

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<Map<String, Property>>(
      valueListenable: OmniRentFlowState.cart,
      builder: (context, Map<String, Property> cart, _) {
        final int cartCount = cart.length;
        return GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
          childAspectRatio: 1.45,
          children: <Widget>[
            _ActivityCard(
              icon: Icons.shopping_bag_outlined,
              label: OmniRentI18n.t(context, 'My Cart', 'عربة التسوق'),
              count: cartCount,
              color: const Color(0xFF1D4ED8),
              onTap: onCartTap,
            ),
            _ActivityCard(
              icon: Icons.calendar_today_outlined,
              label: OmniRentI18n.t(
                  context, 'My Viewings', 'معايناتي'),
              count: viewingCount,
              color: const Color(0xFF0369A1),
              onTap: onViewingsTap,
            ),
            _ActivityCard(
              icon: Icons.home_outlined,
              label: OmniRentI18n.t(
                  context, 'Reservations', 'الحجوزات'),
              count: reservationCount,
              color: const Color(0xFF16A34A),
              onTap: onReservationsTap,
            ),
            _ActivityCard(
              icon: Icons.favorite_border_rounded,
              label: OmniRentI18n.t(
                  context, 'Saved', 'المحفوظات'),
              count: savedCount,
              color: const Color(0xFF7C3AED),
              onTap: onSavedTap,
            ),
          ],
        );
      },
    );
  }
}

class _ActivityCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final int count;
  final Color color;
  final VoidCallback onTap;

  const _ActivityCard({
    required this.icon,
    required this.label,
    required this.count,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          boxShadow: <BoxShadow>[
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 14,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: <Widget>[
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: <Widget>[
                Container(
                  width: 38,
                  height: 38,
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  alignment: Alignment.center,
                  child: Icon(icon, size: 20, color: color),
                ),
                if (count > 0)
                  Container(
                    constraints:
                        const BoxConstraints(minWidth: 22, minHeight: 22),
                    padding:
                        const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                    decoration: BoxDecoration(
                      color: color,
                      borderRadius: BorderRadius.circular(999),
                    ),
                    alignment: Alignment.center,
                    child: Text(
                      '$count',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
              ],
            ),
            Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                color: Color(0xFF0F172A),
                fontSize: 13,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ===========================================================================
//  3. BENEFITS CARD
// ===========================================================================

class _BenefitsCard extends StatelessWidget {
  const _BenefitsCard();

  @override
  Widget build(BuildContext context) {
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
        boxShadow: <BoxShadow>[
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 14,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            children: <Widget>[
              Expanded(
                child: Text(
                  OmniRentI18n.t(
                      context, 'Included Benefits', 'المزايا المضمّنة'),
                  style: const TextStyle(
                    color: Color(0xFF0F172A),
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                    horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: const Color(0xFF16A34A),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: const Text(
                  '🎁 مجاني',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          _BenefitRow(
            icon: Icons.local_shipping_outlined,
            label: OmniRentI18n.t(context, 'Free Moving', 'نقل مجاني'),
          ),
          const SizedBox(height: 12),
          _BenefitRow(
            icon: Icons.cleaning_services_outlined,
            label: OmniRentI18n.t(context, 'Free Cleaning', 'تنظيف مجاني'),
          ),
          const SizedBox(height: 12),
          _BenefitRow(
            icon: Icons.home_repair_service_outlined,
            label: OmniRentI18n.t(context, 'Free Setup', 'تجهيز مجاني'),
          ),
        ],
      ),
    );
  }
}

class _BenefitRow extends StatelessWidget {
  final IconData icon;
  final String label;

  const _BenefitRow({
    required this.icon,
    required this.label,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: <Widget>[
        Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: const Color(0xFFDCFCE7),
            borderRadius: BorderRadius.circular(12),
          ),
          alignment: Alignment.center,
          child: Icon(icon, size: 20, color: const Color(0xFF16A34A)),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Text(
            label,
            style: const TextStyle(
              color: Color(0xFF0F172A),
              fontSize: 14,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
        Container(
          width: 22,
          height: 22,
          decoration: const BoxDecoration(
            color: Color(0xFF16A34A),
            shape: BoxShape.circle,
          ),
          alignment: Alignment.center,
          child: const Icon(Icons.check, size: 13, color: Colors.white),
        ),
      ],
    );
  }
}

// ===========================================================================
//  UTILITIES: Card container, section title, rows, divider
// ===========================================================================

class _OmniCard extends StatelessWidget {
  final Widget child;

  const _OmniCard({required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        boxShadow: <BoxShadow>[
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 16,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: child,
    );
  }
}

class _SectionTitle extends StatelessWidget {
  final String label;

  const _SectionTitle({required this.label});

  @override
  Widget build(BuildContext context) {
    return Text(
      label,
      style: const TextStyle(
        color: Color(0xFF0F172A),
        fontSize: 17,
        fontWeight: FontWeight.w700,
        letterSpacing: -0.2,
      ),
    );
  }
}

class _RowDivider extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return const Padding(
      padding: EdgeInsets.symmetric(horizontal: 16),
      child: Divider(height: 1, thickness: 1, color: Color(0xFFF1F5F9)),
    );
  }
}

class _DocRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _DocRow({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: const BorderRadius.vertical(top: Radius.circular(22)),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          child: Row(
            children: <Widget>[
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: const Color(0xFFEFF6FF),
                  borderRadius: BorderRadius.circular(11),
                ),
                alignment: Alignment.center,
                child: Icon(icon, size: 18, color: const Color(0xFF1D4ED8)),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Text(
                  label,
                  style: const TextStyle(
                    color: Color(0xFF0F172A),
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              const Icon(
                Icons.chevron_right_rounded,
                size: 20,
                color: Color(0xFFCBD5E1),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SettingsRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final Widget? trailing;
  final VoidCallback? onTap;
  final Color? accentColor;

  const _SettingsRow({
    required this.icon,
    required this.label,
    this.trailing,
    this.onTap,
    this.accentColor,
  });

  @override
  Widget build(BuildContext context) {
    final Color accent = accentColor ?? const Color(0xFF1D4ED8);

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          child: Row(
            children: <Widget>[
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: accent.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(11),
                ),
                alignment: Alignment.center,
                child: Icon(icon, size: 18, color: accent),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Text(
                  label,
                  style: const TextStyle(
                    color: Color(0xFF0F172A),
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              trailing ??
                  const Icon(
                    Icons.chevron_right_rounded,
                    size: 20,
                    color: Color(0xFFCBD5E1),
                  ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ToggleRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool value;
  final ValueChanged<bool> onChanged;

  const _ToggleRow({
    required this.icon,
    required this.label,
    required this.value,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      child: Row(
        children: <Widget>[
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: const Color(0xFF1D4ED8).withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(11),
            ),
            alignment: Alignment.center,
            child: Icon(icon, size: 18, color: const Color(0xFF1D4ED8)),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Text(
              label,
              style: const TextStyle(
                color: Color(0xFF0F172A),
                fontSize: 14,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          Switch(
            value: value,
            onChanged: onChanged,
            activeThumbColor: const Color(0xFF1D4ED8),
            materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
          ),
        ],
      ),
    );
  }
}

// ===========================================================================
//  7. LOGOUT BUTTON
// ===========================================================================

class _LogoutButton extends StatelessWidget {
  final VoidCallback onTap;

  const _LogoutButton({required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: 56,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: const Color(0xFFFECACA), width: 1.2),
          boxShadow: <BoxShadow>[
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.03),
              blurRadius: 12,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: <Widget>[
            const Icon(
              Icons.logout_rounded,
              size: 18,
              color: Color(0xFFEF4444),
            ),
            const SizedBox(width: 8),
            Text(
              OmniRentI18n.t(context, 'Log Out', 'تسجيل الخروج'),
              style: const TextStyle(
                color: Color(0xFFEF4444),
                fontSize: 15,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ===========================================================================
//  BOTTOM SHEETS
// ===========================================================================

class _EditProfileSheet extends StatelessWidget {
  final bool isVerified;
  final VoidCallback onVerify;

  const _EditProfileSheet({required this.isVerified, required this.onVerify});

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 18),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              // Drag handle
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: const Color(0xFFE2E8F0),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 20),
              Text(
                OmniRentI18n.t(context, 'Edit Profile', 'تعديل الملف الشخصي'),
                style: const TextStyle(
                  color: Color(0xFF0F172A),
                  fontSize: 22,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                OmniRentI18n.t(
                  context,
                  'Update your name, contact details, or verify your account.',
                  'حدّث اسمك وبيانات التواصل أو ابدأ التحقق من حسابك.',
                ),
                style: const TextStyle(
                  color: Color(0xFF64748B),
                  fontSize: 14,
                  height: 1.45,
                ),
              ),
              const SizedBox(height: 20),
              _SheetRow(
                icon: Icons.person_outline_rounded,
                label: OmniRentI18n.t(context, 'Full Name', 'الاسم الكامل'),
                value: OmniRentI18n.t(context, 'Tenant User', 'المستخدم'),
              ),
              const SizedBox(height: 12),
              _SheetRow(
                icon: Icons.email_outlined,
                label: OmniRentI18n.t(context, 'Email', 'البريد الإلكتروني'),
                value: 'tenant@omnirent.qa',
              ),
              const SizedBox(height: 20),
              if (!isVerified)
                _VerifyButton(onTap: onVerify)
              else
                Center(
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: <Widget>[
                      const Icon(Icons.verified_rounded,
                          size: 18, color: Color(0xFF16A34A)),
                      const SizedBox(width: 6),
                      Text(
                        OmniRentI18n.t(
                            context, 'Account Verified', 'الحساب موثّق'),
                        style: const TextStyle(
                          color: Color(0xFF16A34A),
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SheetRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _SheetRow({
    required this.icon,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Row(
        children: <Widget>[
          Icon(icon, size: 18, color: const Color(0xFF64748B)),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(
                  label,
                  style: const TextStyle(
                    color: Color(0xFF94A3B8),
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                Text(
                  value,
                  style: const TextStyle(
                    color: Color(0xFF0F172A),
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
          const Icon(
            Icons.edit_outlined,
            size: 16,
            color: Color(0xFF1D4ED8),
          ),
        ],
      ),
    );
  }
}

class _VerifyButton extends StatelessWidget {
  final VoidCallback onTap;

  const _VerifyButton({required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: 52,
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: <Color>[Color(0xFF002366), Color(0xFF0047AB)],
          ),
          borderRadius: BorderRadius.circular(16),
          boxShadow: <BoxShadow>[
            BoxShadow(
              color: const Color(0xFF0047AB).withValues(alpha: 0.22),
              blurRadius: 16,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        alignment: Alignment.center,
        child: Text(
          OmniRentI18n.t(context, 'Verify Account', 'توثيق الحساب'),
          style: const TextStyle(
            color: Colors.white,
            fontSize: 15,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Empty State Sheet
// ---------------------------------------------------------------------------
class _EmptyStateSheet extends StatelessWidget {
  final String title;
  final String message;

  const _EmptyStateSheet({required this.title, required this.message});

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: const Color(0xFFE2E8F0),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 24),
              Container(
                width: 72,
                height: 72,
                decoration: BoxDecoration(
                  color: const Color(0xFFEFF6FF),
                  borderRadius: BorderRadius.circular(20),
                ),
                alignment: Alignment.center,
                child: const Icon(
                  Icons.inbox_outlined,
                  size: 36,
                  color: Color(0xFF1D4ED8),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                title,
                style: const TextStyle(
                  color: Color(0xFF0F172A),
                  fontSize: 20,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                message,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: Color(0xFF64748B),
                  fontSize: 14,
                  height: 1.45,
                ),
              ),
              const SizedBox(height: 20),
              GestureDetector(
                onTap: () => Navigator.pop(context),
                child: Container(
                  width: double.infinity,
                  height: 48,
                  decoration: BoxDecoration(
                    color: const Color(0xFFEFF6FF),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  alignment: Alignment.center,
                  child: Text(
                    OmniRentI18n.t(context, 'Close', 'إغلاق'),
                    style: const TextStyle(
                      color: Color(0xFF1D4ED8),
                      fontSize: 14,
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
// Logout Confirm Sheet
// ---------------------------------------------------------------------------
class _LogoutConfirmSheet extends StatelessWidget {
  final VoidCallback onConfirm;
  final VoidCallback onCancel;

  const _LogoutConfirmSheet({
    required this.onConfirm,
    required this.onCancel,
  });

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 18),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: const Color(0xFFE2E8F0),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 24),
              Container(
                width: 60,
                height: 60,
                decoration: BoxDecoration(
                  color: const Color(0xFFFEF2F2),
                  borderRadius: BorderRadius.circular(18),
                ),
                alignment: Alignment.center,
                child: const Icon(
                  Icons.logout_rounded,
                  size: 28,
                  color: Color(0xFFEF4444),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                OmniRentI18n.t(context, 'Log Out?', 'تسجيل الخروج؟'),
                style: const TextStyle(
                  color: Color(0xFF0F172A),
                  fontSize: 22,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                OmniRentI18n.t(
                  context,
                  'Your cart and session will be cleared. Continue?',
                  'سيتم مسح العربة والجلسة. هل تريد المتابعة؟',
                ),
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: Color(0xFF64748B),
                  fontSize: 14,
                  height: 1.45,
                ),
              ),
              const SizedBox(height: 24),
              Row(
                children: <Widget>[
                  Expanded(
                    child: GestureDetector(
                      onTap: onCancel,
                      child: Container(
                        height: 52,
                        decoration: BoxDecoration(
                          color: const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        alignment: Alignment.center,
                        child: Text(
                          OmniRentI18n.t(context, 'Cancel', 'إلغاء'),
                          style: const TextStyle(
                            color: Color(0xFF334155),
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: GestureDetector(
                      onTap: onConfirm,
                      child: Container(
                        height: 52,
                        decoration: BoxDecoration(
                          color: const Color(0xFFEF4444),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        alignment: Alignment.center,
                        child: Text(
                          OmniRentI18n.t(context, 'Log Out', 'خروج'),
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
