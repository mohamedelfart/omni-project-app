import 'package:flutter/material.dart';

class PremiumVisualCatalog {
  static const String login = 'https://img.icons8.com/3d-fluency/188/cottage.png';
  static const String property = 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80';
  static const String villaProperty = 'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=800&q=80';
  static const String apartmentProperty = 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80';
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

String resolvePropertyTypeFallback(String propertyType) {
  final String normalized = propertyType.toLowerCase();
  if (normalized.contains('villa')) {
    return PremiumVisualCatalog.villaProperty;
  }
  return PremiumVisualCatalog.apartmentProperty;
}

String resolveOptimizedImageUrl(
  String rawUrl, {
  int targetWidth = 1600,
  int quality = 85,
}) {
  if (rawUrl.isEmpty) {
    return rawUrl;
  }

  final Uri? uri = Uri.tryParse(rawUrl);
  if (uri == null) {
    return rawUrl;
  }

  if (uri.host.contains('images.unsplash.com')) {
    return uri.replace(
      queryParameters: <String, String>{
        ...uri.queryParameters,
        'auto': 'format',
        'fit': 'crop',
        'q': '$quality',
        'w': '$targetWidth',
      },
    ).toString();
  }

  return rawUrl;
}

Widget buildPropertyFallback({required String semanticLabel}) {
  return PremiumVisualAsset(
    imageUrl: PremiumVisualCatalog.property,
    semanticLabel: semanticLabel,
    aspectRatio: 1.4,
  );
}

Widget buildTypedPropertyFallback({
  required String semanticLabel,
  required String propertyType,
}) {
  return PremiumVisualAsset(
    imageUrl: resolvePropertyTypeFallback(propertyType),
    semanticLabel: semanticLabel,
    aspectRatio: 1.4,
  );
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

class PremiumPropertyPhoto extends StatelessWidget {
  final String imageUrl;
  final String semanticLabel;
  final double borderRadius;
  final BoxFit fit;
  final Alignment alignment;
  final double? width;
  final double? height;
  final bool showOverlay;

  const PremiumPropertyPhoto({
    super.key,
    required this.imageUrl,
    required this.semanticLabel,
    this.borderRadius = 20,
    this.fit = BoxFit.cover,
    this.alignment = Alignment.center,
    this.width,
    this.height,
    this.showOverlay = true,
  });

  @override
  Widget build(BuildContext context) {
    final Widget content = ClipRRect(
      borderRadius: BorderRadius.circular(borderRadius),
      child: Stack(
        fit: StackFit.expand,
        children: <Widget>[
          const DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: <Color>[Color(0xFFF8FBFF), Color(0xFFE8F0FB)],
              ),
            ),
          ),
          if (imageUrl.isNotEmpty)
            Image.network(
              resolveOptimizedImageUrl(imageUrl, targetWidth: 1600),
              fit: fit,
              alignment: alignment,
              filterQuality: FilterQuality.high,
              frameBuilder: (context, child, frame, wasSynchronouslyLoaded) {
                if (wasSynchronouslyLoaded || frame != null) {
                  return AnimatedOpacity(
                    opacity: 1.0,
                    duration: const Duration(milliseconds: 260),
                    child: child,
                  );
                }
                return Stack(
                  fit: StackFit.expand,
                  children: [
                    const Center(
                      child: SizedBox(
                        width: 24,
                        height: 24,
                        child: CircularProgressIndicator(strokeWidth: 2.2),
                      ),
                    ),
                    AnimatedOpacity(
                      opacity: frame == null ? 0.0 : 1.0,
                      duration: const Duration(milliseconds: 260),
                      child: child,
                    ),
                  ],
                );
              },
              errorBuilder: (_, __, ___) =>
                  buildPropertyFallback(semanticLabel: semanticLabel),
            )
          else
            buildPropertyFallback(semanticLabel: semanticLabel),
          if (showOverlay)
            IgnorePointer(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: <Color>[
                      Colors.white.withValues(alpha: 0.03),
                      Colors.transparent,
                      const Color(0xFF0F172A).withValues(alpha: 0.10),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
    );

    if (width != null || height != null) {
      return SizedBox(width: width, height: height, child: content);
    }

    return content;
  }
}