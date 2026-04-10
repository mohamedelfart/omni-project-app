import 'package:flutter/material.dart';

import 'omnirent_flow_state.dart';
import 'property_flow_ui.dart';

class OptionalLoginPromptScreen extends StatelessWidget {
  const OptionalLoginPromptScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF4F6F8),
      appBar: AppBar(
        backgroundColor: const Color(0xFFF4F6F8),
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        actions: const [
          Padding(
            padding: EdgeInsets.only(right: 12),
            child: OmniLanguageSwitcher(),
          ),
        ],
      ),
      body: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                OmniRentI18n.t(
                  context,
                  'Save your booking details',
                  'احفظ تفاصيل الحجز',
                ),
                style: const TextStyle(
                  color: Color(0xFF0F172A),
                  fontSize: 28,
                  fontWeight: FontWeight.w700,
                  height: 1.15,
                ),
              ),
              const SizedBox(height: 10),
              Text(
                OmniRentI18n.t(
                  context,
                  'Keep your tour plan, services, and payment details synced across devices.',
                  'احتفظ بخطة الجولة والخدمات وتفاصيل الدفع بشكل متزامن عبر أجهزتك.',
                ),
                style: const TextStyle(
                  color: Color(0xFF64748B),
                  fontSize: 14,
                  height: 1.45,
                ),
              ),
              const SizedBox(height: 24),
              PropertyPrimaryButton(
                label: OmniRentI18n.t(context, 'Sign In', 'تسجيل الدخول'),
                onPressed: () {
                  OmniRentFlowState.setLoggedIn(true);
                  Navigator.popUntil(context, (Route<dynamic> route) => route.isFirst);
                },
              ),
              const SizedBox(height: 12),
              OutlinedButton(
                onPressed: () {
                  OmniRentFlowState.setLoggedIn(true);
                  Navigator.popUntil(context, (Route<dynamic> route) => route.isFirst);
                },
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size(double.infinity, 56),
                  side: const BorderSide(color: Color(0xFFBFDBFE)),
                  foregroundColor: const Color(0xFF1D4ED8),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(18),
                  ),
                ),
                child: Text(
                  OmniRentI18n.t(context, 'Create Account', 'إنشاء حساب'),
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
              ),
              const SizedBox(height: 10),
              Center(
                child: TextButton(
                  onPressed: () {
                    Navigator.popUntil(context, (Route<dynamic> route) => route.isFirst);
                  },
                  child: Text(
                    OmniRentI18n.t(context, 'Maybe Later', 'لاحقًا'),
                    style: const TextStyle(
                      color: Color(0xFF64748B),
                      fontWeight: FontWeight.w600,
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