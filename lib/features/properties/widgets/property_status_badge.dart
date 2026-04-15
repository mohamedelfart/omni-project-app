import 'package:flutter/material.dart';

enum PropertyStatusBadgeType {
  inCart,
  underViewing,
  reserved,
  living,
}

class PropertyStatusBadge extends StatelessWidget {
  final PropertyStatusBadgeType type;
  final String? labelOverride;
  final double? fontSize;
  final EdgeInsetsGeometry? padding;

  const PropertyStatusBadge({
    super.key,
    required this.type,
    this.labelOverride,
    this.fontSize,
    this.padding,
  });

  @override
  Widget build(BuildContext context) {
    Color bgColor;
    Color textColor = Colors.white;
    IconData? icon;
    String label;
    switch (type) {
      case PropertyStatusBadgeType.inCart:
        bgColor = const Color(0xFF2563EB); // blue
        icon = Icons.shopping_cart_rounded;
        label = 'In Cart';
        break;
      case PropertyStatusBadgeType.underViewing:
        bgColor = const Color(0xFFFFB300); // amber/gold
        icon = Icons.remove_red_eye_rounded;
        label = 'Under Viewing';
        textColor = Colors.black87;
        break;
      case PropertyStatusBadgeType.reserved:
        bgColor = const Color(0xFF16A34A); // green
        icon = Icons.lock_clock_rounded;
        label = 'Reserved';
        break;
      case PropertyStatusBadgeType.living:
        bgColor = const Color(0xFF7C3AED); // purple
        icon = Icons.home_rounded;
        label = 'Living';
        break;
    }
    return Container(
      padding: padding ?? const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(999),
        boxShadow: [
          BoxShadow(
            color: bgColor.withOpacity(0.18),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          ...[
          Icon(icon, size: fontSize != null ? fontSize! + 4 : 18, color: textColor),
          const SizedBox(width: 6),
        ],
          Text(
            labelOverride ?? label,
            style: TextStyle(
              color: textColor,
              fontWeight: FontWeight.w800,
              fontSize: fontSize ?? 12,
              letterSpacing: 0.2,
            ),
          ),
        ],
      ),
    );
  }
}
