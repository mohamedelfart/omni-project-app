import 'package:flutter/material.dart';

// ============================================================================
// VENDOR PLACEHOLDER SCREEN
// Temporary screen — Vendor Portal implementation pending.
// ============================================================================

class VendorPlaceholderScreen extends StatelessWidget {
  const VendorPlaceholderScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('بوابة المندوبين'),
        backgroundColor: Colors.white,
        foregroundColor: const Color(0xFF1F2937),
        elevation: 0,
      ),
      body: const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.handyman_outlined,
              size: 72,
              color: Color(0xFF10B981),
            ),
            SizedBox(height: 24),
            Text(
              'بوابة المندوبين',
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w700,
                color: Color(0xFF1F2937),
              ),
            ),
            SizedBox(height: 8),
            Text(
              'قريباً — Vendor Portal',
              style: TextStyle(fontSize: 15, color: Color(0xFF6B7280)),
            ),
          ],
        ),
      ),
    );
  }
}
