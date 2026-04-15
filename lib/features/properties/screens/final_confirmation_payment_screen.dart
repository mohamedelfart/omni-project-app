import 'package:flutter/material.dart';

import '../../../core/models/models.dart';
import 'optional_login_prompt_screen.dart';
import 'property_flow_ui.dart';

class FinalConfirmationPaymentScreen extends StatelessWidget {
  final Property property;
  final List<String> selectedServices;

  const FinalConfirmationPaymentScreen({
    super.key,
    required this.property,
    required this.selectedServices,
  });

  int get _depositAmount => 500;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF4F6F8),
      appBar: AppBar(
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        backgroundColor: const Color(0xFFF4F6F8),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded, color: Color(0xFF0F172A)),
          onPressed: () => Navigator.pop(context),
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: const OmniLanguageSwitcher(),
          ),
        ],
      ),
      body: SafeArea(
        top: false,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 6, 20, 24),
          children: [
            Text(
              OmniRentI18n.t(context, 'Almost done', 'تبقى القليل'),
              style: const TextStyle(
                color: Color(0xFF0F172A),
                fontSize: 30,
                fontWeight: FontWeight.w700,
                letterSpacing: -0.5,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              OmniRentI18n.t(
                context,
                'Secure your reservation deposit to activate the viewing and included move-in services.',
                'ادفع عربون الحجز لتفعيل المعاينة وخدمات الانتقال المجانية.',
              ),
              style: const TextStyle(
                color: Color(0xFF64748B),
                fontSize: 14,
                height: 1.45,
              ),
            ),
            const SizedBox(height: 18),
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(24),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.04),
                    blurRadius: 18,
                    offset: const Offset(0, 10),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    OmniRentI18n.t(
                      context,
                      'Reservation deposit',
                      'عربون الحجز',
                    ),
                    style: const TextStyle(
                      color: Color(0xFF64748B),
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    '${OmniRentI18n.t(context, 'QAR', 'ر.ق')} $_depositAmount',
                    style: const TextStyle(
                      color: Color(0xFF0F172A),
                      fontSize: 34,
                      fontWeight: FontWeight.w800,
                      letterSpacing: -0.7,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    property.title,
                    style: const TextStyle(
                      color: Color(0xFF0F172A),
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    '${property.location.city ?? 'Doha'}, ${property.location.country ?? 'Qatar'}',
                    style: const TextStyle(
                      color: Color(0xFF64748B),
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            _ChecklistTile(
              icon: Icons.verified_user_outlined,
              title: OmniRentI18n.t(
                context,
                'Refund policy',
                'سياسة الاسترداد',
              ),
              subtitle: OmniRentI18n.t(
                context,
                'Fully refundable within 3 days from payment. After 3 days, non-refundable.',
                'مسترد بالكامل خلال 3 أيام من الدفع، وبعد 3 أيام غير مسترد.',
              ),
            ),
            const SizedBox(height: 10),
            _ChecklistTile(
              icon: Icons.lock_outline_rounded,
              title: OmniRentI18n.t(
                context,
                'Secured reservation',
                'حجز مؤمن',
              ),
              subtitle: OmniRentI18n.t(
                context,
                'The unit stays reserved while you complete the next steps.',
                'يبقى العقار محجوزا حتى تكمل الخطوات التالية.',
              ),
            ),
            const SizedBox(height: 10),
            _ChecklistTile(
              icon: Icons.auto_awesome_outlined,
              title: OmniRentI18n.t(
                context,
                'Services activated',
                'تم تفعيل الخدمات',
              ),
              subtitle: selectedServices.isEmpty
                  ? OmniRentI18n.t(
                      context,
                      'Move-in services are ready to be activated after payment.',
                      'خدمات الانتقال جاهزة للتفعيل بعد الدفع.',
                    )
                  : OmniRentI18n.t(
                      context,
                      '${selectedServices.join(', ')} activated with your reservation.',
                      'تم تفعيل ${selectedServices.join(', ')} مع الحجز.',
                    ),
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(22),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    OmniRentI18n.t(
                      context,
                      'Included service selection',
                      'الخدمات المضمنة المختارة',
                    ),
                    style: const TextStyle(
                      color: Color(0xFF0F172A),
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: selectedServices.map((String service) {
                      return PropertyFeaturePill(
                        icon: Icons.check_circle_outline_rounded,
                        label: service,
                      );
                    }).toList(),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 22),
            PropertyPrimaryButton(
              label:
                  '${OmniRentI18n.t(context, 'Pay', 'ادفع')} ${OmniRentI18n.t(context, 'QAR', 'ر.ق')} $_depositAmount',
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => const OptionalLoginPromptScreen(),
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _ChecklistTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;

  const _ChecklistTile({
    required this.icon,
    required this.title,
    required this.subtitle,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.035),
            blurRadius: 14,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: const Color(0xFFEFF6FF),
              borderRadius: BorderRadius.circular(12),
            ),
            alignment: Alignment.center,
            child: Icon(icon, size: 20, color: const Color(0xFF1D4ED8)),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    color: Color(0xFF0F172A),
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  subtitle,
                  style: const TextStyle(
                    color: Color(0xFF64748B),
                    fontSize: 13,
                    height: 1.45,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
