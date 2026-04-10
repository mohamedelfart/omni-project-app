import 'package:flutter/material.dart';

import '../../../core/models/models.dart';
import 'omnirent_flow_state.dart';

class OmniRentI18n {
  static bool isArabic(BuildContext context) {
    return Localizations.localeOf(context).languageCode.toLowerCase() == 'ar';
  }

  static String t(BuildContext context, String en, String ar) {
    return isArabic(context) ? ar : en;
  }
}

class OmniLanguageSwitcher extends StatelessWidget {
  const OmniLanguageSwitcher({super.key});

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<Locale>(
      valueListenable: OmniRentFlowState.locale,
      builder: (context, Locale current, child) {
        final bool ar = current.languageCode == 'ar';

        Widget item(String code, bool selected) {
          return GestureDetector(
            onTap: () => OmniRentFlowState.setLocale(code),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
              decoration: BoxDecoration(
                color: selected ? const Color(0xFFDBEAFE) : Colors.white,
                borderRadius: BorderRadius.circular(999),
              ),
              child: Text(
                code.toUpperCase(),
                style: TextStyle(
                  color: selected
                      ? const Color(0xFF1D4ED8)
                      : const Color(0xFF64748B),
                  fontSize: 10,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          );
        }

        return Container(
          padding: const EdgeInsets.all(4),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(999),
            border: Border.all(color: const Color(0xFFE2E8F0)),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              item('en', !ar),
              const SizedBox(width: 4),
              item('ar', ar),
            ],
          ),
        );
      },
    );
  }
}

class PropertyPrimaryButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;

  const PropertyPrimaryButton({
    super.key,
    required this.label,
    this.onPressed,
    this.icon,
  });

  @override
  Widget build(BuildContext context) {
    final bool enabled = onPressed != null;

    return Opacity(
      opacity: enabled ? 1 : 0.55,
      child: DecoratedBox(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(18),
          gradient: const LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF2F6BFF), Color(0xFF1B4ED8)],
          ),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFF1D4ED8).withValues(alpha: 0.22),
              blurRadius: 18,
              offset: const Offset(0, 10),
            ),
          ],
        ),
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            borderRadius: BorderRadius.circular(18),
            onTap: onPressed,
            child: SizedBox(
              height: 56,
              width: double.infinity,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  if (icon != null) ...[
                    Icon(icon, size: 18, color: Colors.white),
                    const SizedBox(width: 8),
                  ],
                  Text(
                    label,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.1,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class PropertyMiniMapPreview extends StatelessWidget {
  final String locationLabel;
  final double height;

  const PropertyMiniMapPreview({
    super.key,
    required this.locationLabel,
    this.height = 96,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: height,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(18),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFFF8FBFF), Color(0xFFEAF1FF)],
        ),
        border: Border.all(color: const Color(0xFFD9E5FF)),
      ),
      child: Stack(
        children: [
          Positioned.fill(child: CustomPaint(painter: _MapPainter())),
          Positioned(
            top: 12,
            left: 12,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.95),
                borderRadius: BorderRadius.circular(999),
              ),
              child: Text(
                OmniRentI18n.t(context, 'Map Preview', 'معاينة الخريطة'),
                style: const TextStyle(
                  color: Color(0xFF1E3A8A),
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ),
          Positioned(
            right: 18,
            top: 24,
            child: Container(
              width: 26,
              height: 26,
              decoration: BoxDecoration(
                color: const Color(0xFF2F6BFF),
                borderRadius: BorderRadius.circular(999),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF2F6BFF).withValues(alpha: 0.25),
                    blurRadius: 10,
                    offset: const Offset(0, 6),
                  ),
                ],
              ),
              child: const Icon(
                Icons.location_on_rounded,
                size: 15,
                color: Colors.white,
              ),
            ),
          ),
          Positioned(
            left: 14,
            right: 14,
            bottom: 12,
            child: Row(
              children: [
                const Icon(
                  Icons.near_me_rounded,
                  color: Color(0xFF1E40AF),
                  size: 15,
                ),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    locationLabel,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: Color(0xFF334155),
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
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

class PropertyFeaturePill extends StatelessWidget {
  final IconData icon;
  final String label;

  const PropertyFeaturePill({
    super.key,
    required this.icon,
    required this.label,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: const Color(0xFFF7F9FC),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 15, color: const Color(0xFF3B82F6)),
          const SizedBox(width: 6),
          Text(
            label,
            style: const TextStyle(
              color: Color(0xFF334155),
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

class OmniCardSurface extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;

  const OmniCardSurface({
    super.key,
    required this.child,
    this.padding,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: padding ?? const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        boxShadow: [
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

class OmniLoginAction extends StatelessWidget {
  final VoidCallback onTap;

  const OmniLoginAction({super.key, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<bool>(
      valueListenable: OmniRentFlowState.isLoggedIn,
      builder: (context, bool loggedIn, child) {
        if (loggedIn) {
          return Material(
            color: Colors.white,
            borderRadius: BorderRadius.circular(999),
            child: InkWell(
              onTap: onTap,
              borderRadius: BorderRadius.circular(999),
              child: const Padding(
                padding: EdgeInsets.all(9),
                child: Icon(
                  Icons.account_circle_rounded,
                  size: 22,
                  color: Color(0xFF1E3A8A),
                ),
              ),
            ),
          );
        }

        return Material(
          color: const Color(0xFFEFF6FF),
          borderRadius: BorderRadius.circular(999),
          child: InkWell(
            onTap: onTap,
            borderRadius: BorderRadius.circular(999),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              child: Text(
                OmniRentI18n.t(context, 'Login', 'تسجيل الدخول'),
                style: const TextStyle(
                  color: Color(0xFF1E3A8A),
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}

class OmniCartAction extends StatelessWidget {
  final VoidCallback onTap;

  const OmniCartAction({super.key, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<Map<String, Property>>(
      valueListenable: OmniRentFlowState.cart,
      builder: (context, Map<String, Property> value, child) {
        final int count = value.length;
        return Material(
          color: Colors.white,
          borderRadius: BorderRadius.circular(999),
          child: InkWell(
            onTap: onTap,
            borderRadius: BorderRadius.circular(999),
            child: Padding(
              padding: const EdgeInsets.all(10),
              child: Stack(
                clipBehavior: Clip.none,
                children: [
                  const Icon(
                    Icons.shopping_bag_outlined,
                    size: 20,
                    color: Color(0xFF0F172A),
                  ),
                  if (count > 0)
                    Positioned(
                      top: -7,
                      right: -8,
                      child: Container(
                        constraints: const BoxConstraints(minWidth: 16),
                        height: 16,
                        padding: const EdgeInsets.symmetric(horizontal: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFF1D4ED8),
                          borderRadius: BorderRadius.circular(999),
                        ),
                        alignment: Alignment.center,
                        child: Text(
                          '$count',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 10,
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
      },
    );
  }
}

class _MapPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final Paint linePaint = Paint()
      ..color = const Color(0xFFCCDCF8)
      ..strokeWidth = 1.1
      ..style = PaintingStyle.stroke;

    final Paint routePaint = Paint()
      ..color = const Color(0xFF5B8CFF)
      ..strokeWidth = 3
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    for (double y = 18; y < size.height; y += 22) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y - 6), linePaint);
    }

    for (double x = 22; x < size.width; x += 34) {
      canvas.drawLine(Offset(x, 0), Offset(x - 8, size.height), linePaint);
    }

    final Path route = Path()
      ..moveTo(24, size.height - 28)
      ..quadraticBezierTo(
        size.width * 0.35,
        size.height - 56,
        size.width * 0.52,
        size.height - 38,
      )
      ..quadraticBezierTo(
        size.width * 0.7,
        size.height - 10,
        size.width - 38,
        34,
      );

    canvas.drawPath(route, routePaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
