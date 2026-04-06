import 'package:flutter/material.dart';

import '../../../shared/widgets/premium_visual_asset.dart';

class TenantHomeEntryCard extends StatelessWidget {
  final String title;
  final String subtitle;
  final String visualUrl;
  final Color accentColor;
  final VoidCallback onTap;
  final bool highlighted;
  final bool isLoading;

  const TenantHomeEntryCard({
    super.key,
    required this.title,
    required this.subtitle,
    required this.visualUrl,
    required this.accentColor,
    required this.onTap,
    this.highlighted = false,
    this.isLoading = false,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: isLoading ? null : onTap,
        borderRadius: BorderRadius.circular(24),
        child: Ink(
          decoration: BoxDecoration(
            gradient: highlighted
                ? const LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [Color(0xFF1E3A5F), Color(0xFF355C8A)],
                  )
                : const LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [Color(0xFFFFFFFF), Color(0xFFF8FAFF)],
                  ),
            borderRadius: BorderRadius.circular(24),
            border: Border.all(
              color: highlighted ? const Color(0xFF1E3A5F) : const Color(0xFFE2E8F0),
            ),
            boxShadow: [
              BoxShadow(
                color: highlighted
                    ? const Color(0x331E3A5F)
                    : const Color(0x0F0F172A),
                blurRadius: highlighted ? 28 : 18,
                offset: const Offset(0, 10),
              ),
            ],
          ),
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                PremiumVisualAsset(
                  imageUrl: visualUrl,
                  semanticLabel: title,
                  aspectRatio: highlighted ? 2.2 : 1.8,
                ),
                const SizedBox(height: 14),
                Text(
                  title,
                  style: TextStyle(
                    color: highlighted ? Colors.white : const Color(0xFF0F172A),
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 8),
                Expanded(
                  child: Text(
                    subtitle,
                    style: TextStyle(
                      color: highlighted
                          ? Colors.white.withValues(alpha: 0.84)
                          : const Color(0xFF64748B),
                      fontSize: 13,
                      height: 1.5,
                    ),
                  ),
                ),
                const SizedBox(height: 14),
                AnimatedSwitcher(
                  duration: const Duration(milliseconds: 180),
                  child: isLoading
                      ? SizedBox(
                          key: const ValueKey('loading'),
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2.2,
                            valueColor: AlwaysStoppedAnimation<Color>(
                              highlighted ? Colors.white : accentColor,
                            ),
                          ),
                        )
                      : Row(
                          key: const ValueKey('cta'),
                          children: [
                            Text(
                              highlighted ? 'Explore cover' : 'Open',
                              style: TextStyle(
                                color: highlighted
                                    ? Colors.white
                                    : const Color(0xFF0F172A),
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            const SizedBox(width: 10),
                            Container(
                              height: 2,
                              width: 18,
                              decoration: BoxDecoration(
                                color: highlighted ? Colors.white : accentColor,
                                borderRadius: BorderRadius.circular(999),
                              ),
                            ),
                          ],
                        ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}