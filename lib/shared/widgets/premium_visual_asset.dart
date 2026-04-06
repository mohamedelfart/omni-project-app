import 'package:flutter/material.dart';

class PremiumVisualCatalog {
  static const String login = 'https://img.icons8.com/3d-fluency/188/cottage.png';
  static const String property = 'https://img.icons8.com/3d-fluency/188/city-block.png';
  static const String insurance = 'https://img.icons8.com/3d-fluency/188/privacy.png';
  static const String payments = 'https://img.icons8.com/3d-fluency/188/card-wallet.png';
  static const String transport = 'https://img.icons8.com/3d-fluency/188/sedan.png';
  static const String food = 'https://img.icons8.com/3d-fluency/188/hamburger.png';
  static const String cleaning = 'https://img.icons8.com/3d-fluency/188/vacuum-cleaner.png';
  static const String maintenance = 'https://img.icons8.com/3d-fluency/188/toolbox.png';
  static const String globalServices = 'https://img.icons8.com/3d-fluency/188/globe-earth.png';
  static const String airport = 'https://img.icons8.com/3d-fluency/188/airport.png';
}

String resolvePremiumVisual({required String name, String? category}) {
  final normalizedName = name.toLowerCase();
  final normalizedCategory = (category ?? '').toLowerCase();

  if (normalizedName.contains('insurance')) return PremiumVisualCatalog.insurance;
  if (normalizedName.contains('payment')) return PremiumVisualCatalog.payments;
  if (normalizedName.contains('property')) return PremiumVisualCatalog.property;
  if (normalizedName.contains('move') || normalizedName.contains('airport')) {
    return PremiumVisualCatalog.airport;
  }
  if (normalizedName.contains('clean')) return PremiumVisualCatalog.cleaning;
  if (normalizedName.contains('maint')) return PremiumVisualCatalog.maintenance;

  if (normalizedCategory == 'transport') return PremiumVisualCatalog.transport;
  if (normalizedCategory == 'food') return PremiumVisualCatalog.food;
  if (normalizedCategory == 'delivery') return PremiumVisualCatalog.airport;
  if (normalizedCategory == 'services') return PremiumVisualCatalog.globalServices;

  if (normalizedName.contains('uber') || normalizedName.contains('careem')) {
    return PremiumVisualCatalog.transport;
  }
  if (normalizedName.contains('talabat') || normalizedName.contains('deliveroo')) {
    return PremiumVisualCatalog.food;
  }

  return PremiumVisualCatalog.globalServices;
}

class PremiumVisualAsset extends StatelessWidget {
  final String imageUrl;
  final String semanticLabel;
  final double aspectRatio;

  const PremiumVisualAsset({
    super.key,
    required this.imageUrl,
    required this.semanticLabel,
    this.aspectRatio = 1.4,
  });

  @override
  Widget build(BuildContext context) {
    return AspectRatio(
      aspectRatio: aspectRatio,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(18),
        child: DecoratedBox(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [Color(0xFFF8FBFF), Color(0xFFEEF4FF)],
            ),
          ),
          child: Image.network(
            imageUrl,
            fit: BoxFit.contain,
            filterQuality: FilterQuality.medium,
            loadingBuilder: (context, child, progress) {
              if (progress == null) {
                return child;
              }
              return const Center(
                child: SizedBox(
                  width: 24,
                  height: 24,
                  child: CircularProgressIndicator(strokeWidth: 2.2),
                ),
              );
            },
            errorBuilder: (context, error, stackTrace) => Center(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Text(
                  semanticLabel,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    color: Color(0xFF334155),
                    fontWeight: FontWeight.w700,
                    fontSize: 12,
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}