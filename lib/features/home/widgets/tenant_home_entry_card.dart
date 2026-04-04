import 'package:flutter/material.dart';

class TenantHomeEntryCard extends StatelessWidget {
  final String title;
  final String subtitle;
  final IconData icon;
  final Color accentColor;
  final VoidCallback onTap;
  final bool highlighted;
  final bool isLoading;

  const TenantHomeEntryCard({
    super.key,
    required this.title,
    required this.subtitle,
    required this.icon,
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
                : null,
            color: highlighted ? null : Colors.white,
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
                Row(
                  children: [
                    Container(
                      width: 48,
                      height: 48,
                      decoration: BoxDecoration(
                        color: highlighted
                            ? Colors.white.withOpacity(0.16)
                            : accentColor.withOpacity(0.12),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Icon(
                        icon,
                        color: highlighted ? Colors.white : accentColor,
                        size: 24,
                      ),
                    ),
                    const Spacer(),
                    if (highlighted)
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.14),
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: const Text(
                          'Highlighted',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      )
                    else
                      Icon(
                        Icons.arrow_forward_ios,
                        size: 14,
                        color: accentColor,
                      ),
                  ],
                ),
                const SizedBox(height: 20),
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
                          ? Colors.white.withOpacity(0.84)
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
                            const SizedBox(width: 8),
                            Icon(
                              Icons.arrow_forward,
                              size: 16,
                              color: highlighted ? Colors.white : accentColor,
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