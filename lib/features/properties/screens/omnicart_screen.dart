import 'package:flutter/material.dart';

import '../../../core/models/models.dart';
import '../../../shared/widgets/premium_visual_asset.dart';
import 'group_viewing_coordinator_screen.dart';
import 'omnirent_flow_state.dart';
import 'profile_screen.dart';
import 'property_flow_ui.dart';

class OmniCartScreen extends StatelessWidget {
  const OmniCartScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<Map<String, Property>>(
      valueListenable: OmniRentFlowState.cart,
      builder: (context, Map<String, Property> cart, child) {
        final List<Property> items = cart.values.toList();
        final int count = items.length;

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
            actions: [
              const Padding(
                padding: EdgeInsets.only(right: 8),
                child: OmniLanguageSwitcher(),
              ),
              Padding(
                padding: const EdgeInsets.only(right: 12),
                child: OmniLoginAction(
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => const ProfileScreen(),
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
          body: ListView(
            padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
            children: [
              Text(
                OmniRentI18n.t(context, 'OmniCart', 'عربة أومني'),
                style: const TextStyle(
                  color: Color(0xFF0F172A),
                  fontSize: 28,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                OmniRentI18n.t(
                  context,
                  'Your selected properties are grouped into one coordinated tour.',
                  'العقارات المختارة تم تجميعها ضمن جولة واحدة منسقة.',
                ),
                style: const TextStyle(
                  color: Color(0xFF64748B),
                  fontSize: 14,
                  height: 1.45,
                ),
              ),
              const SizedBox(height: 16),
              if (items.isEmpty)
                OmniCardSurface(
                  child: Text(
                    OmniRentI18n.t(
                      context,
                      'Your cart is empty. Add properties to start a group tour.',
                      'العربة فارغة. أضف عقارات لبدء جولة جماعية.',
                    ),
                    style: const TextStyle(
                      color: Color(0xFF64748B),
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                )
              else
                ...items.map((Property property) {
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: OmniCardSurface(
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          PremiumPropertyPhoto(
                            imageUrl:
                                property.images.isNotEmpty ? property.images.first : '',
                            semanticLabel: 'Property visual',
                            width: 90,
                            height: 80,
                            borderRadius: 14,
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  property.title,
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    color: Color(0xFF0F172A),
                                    fontSize: 15,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  '${OmniRentI18n.t(context, 'QAR', 'ر.ق')} ${(property.price / 12).toStringAsFixed(0)} ${OmniRentI18n.t(context, '/ month', '/ شهريا')}',
                                  style: const TextStyle(
                                    color: Color(0xFF334155),
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          IconButton(
                            onPressed: () => OmniRentFlowState.toggleCart(property),
                            icon: const Icon(
                              Icons.close_rounded,
                              color: Color(0xFF64748B),
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                }),
              const SizedBox(height: 8),
              OmniCardSurface(
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        OmniRentI18n.t(
                          context,
                          'Total properties in tour: $count',
                          'إجمالي العقارات في الجولة: $count',
                        ),
                        style: const TextStyle(
                          color: Color(0xFF0F172A),
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              PropertyPrimaryButton(
                label: OmniRentI18n.t(
                  context,
                  'Request Viewing for All ($count)',
                  'اطلب معاينة للجميع ($count)',
                ),
                onPressed: count == 0
                    ? null
                    : () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => GroupViewingCoordinatorScreen(
                              properties: items,
                            ),
                          ),
                        );
                      },
              ),
            ],
          ),
        );
      },
    );
  }
}