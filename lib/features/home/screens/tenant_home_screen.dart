import 'package:flutter/material.dart';

import '../../hotel_services/screens/hotel_services_screen.dart';
import '../../payments/screens/payments_screen.dart';
import '../../properties/screens/property_list_screen.dart';
import '../../services/screens/insurance_screen.dart';
import '../../services/screens/services_screen.dart';
import '../widgets/tenant_home_entry_card.dart';

class TenantHomeScreen extends StatefulWidget {
  const TenantHomeScreen({super.key});

  @override
  State<TenantHomeScreen> createState() => _TenantHomeScreenState();
}

class _TenantHomeScreenState extends State<TenantHomeScreen> {
  String? _loadingKey;

  Future<void> _open(String key, Widget screen) async {
    setState(() => _loadingKey = key);
    await Future.delayed(const Duration(milliseconds: 320));
    if (!mounted) {
      return;
    }
    setState(() => _loadingKey = null);
    await Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => screen),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
          children: [
            Row(
              children: [
                Container(
                  width: 52,
                  height: 52,
                  decoration: BoxDecoration(
                    color: const Color(0xFF1E3A5F),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: const Icon(
                    Icons.apartment_rounded,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(width: 14),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Tenant Home',
                        style: TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF0F172A),
                        ),
                      ),
                      SizedBox(height: 4),
                      Text(
                        'Property search, viewing, services, payments, and insurance in one place.',
                        style: TextStyle(
                          color: Color(0xFF64748B),
                          height: 1.4,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: const Row(
                children: [
                  Icon(Icons.search, color: Color(0xFF1E3A5F)),
                  SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'Search properties, launch services, or continue to payments.',
                      style: TextStyle(
                        color: Color(0xFF64748B),
                        fontSize: 14,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            SizedBox(
              height: 220,
              child: TenantHomeEntryCard(
                title: 'Insurance',
                subtitle:
                    'Highlighted tenant protection flow with direct handoff into payments.',
                icon: Icons.shield_outlined,
                accentColor: const Color(0xFF1E3A5F),
                highlighted: true,
                isLoading: _loadingKey == 'insurance',
                onTap: () => _open('insurance', const InsuranceScreen()),
              ),
            ),
            const SizedBox(height: 16),
            GridView.count(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisCount: 2,
              crossAxisSpacing: 16,
              mainAxisSpacing: 16,
              childAspectRatio: 0.95,
              children: [
                TenantHomeEntryCard(
                  title: 'Property Search',
                  subtitle: 'Select up to 3 homes, add them to cart, and request a viewing.',
                  icon: Icons.home_work_outlined,
                  accentColor: const Color(0xFF1E3A5F),
                  isLoading: _loadingKey == 'property',
                  onTap: () => _open('property', const PropertyListScreen()),
                ),
                TenantHomeEntryCard(
                  title: 'Free Services',
                  subtitle: 'Moving, cleaning, maintenance, and airport transport for tenants.',
                  icon: Icons.handyman_outlined,
                  accentColor: const Color(0xFF0F766E),
                  isLoading: _loadingKey == 'free-services',
                  onTap: () => _open('free-services', const HotelServicesScreen()),
                ),
                TenantHomeEntryCard(
                  title: 'Services',
                  subtitle: 'Open the global services entry for partner-led tenant requests.',
                  icon: Icons.public_outlined,
                  accentColor: const Color(0xFF7C3AED),
                  isLoading: _loadingKey == 'services',
                  onTap: () => _open('services', const ServicesScreen()),
                ),
                TenantHomeEntryCard(
                  title: 'Payments',
                  subtitle: 'Continue from confirmed property to the tenant payment handoff.',
                  icon: Icons.payments_outlined,
                  accentColor: const Color(0xFFF97316),
                  isLoading: _loadingKey == 'payments',
                  onTap: () => _open('payments', const PaymentsScreen()),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}