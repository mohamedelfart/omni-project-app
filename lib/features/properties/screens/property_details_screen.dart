import '_service_chip.dart';
import 'viewing_request_screen.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';

import '../../../core/models/models.dart';
import '../../../shared/widgets/premium_visual_asset.dart';
import '../helpers/viewing_status_mapper.dart';
import 'omnicart_screen.dart';
import 'omnirent_flow_state.dart';
import 'profile_screen.dart';
import 'property_flow_ui.dart';

class PropertyDetailsScreen extends StatefulWidget {
  final Property property;

  const PropertyDetailsScreen({super.key, required this.property});

  @override
  State<PropertyDetailsScreen> createState() => _PropertyDetailsScreenState();
}

class _PropertyDetailsScreenState extends State<PropertyDetailsScreen> {
  Property get property => widget.property;

  String get _premiumHeadline {
    final String city = property.location.city ?? 'Doha';
    return OmniRentI18n.t(
      context,
      'Elegant living in $city',
      'سكن فاخر في $city',
    );
  }

  String get _premiumNarrative {
    final String city = property.location.city ?? 'Doha';
    final String country = property.location.country ?? 'Qatar';
    final String beds = '${property.bedrooms}';
    final String baths = '${property.bathrooms}';
    final String area = property.area.toStringAsFixed(0);

    return OmniRentI18n.t(
      context,
      'A premium apartment in $city, $country, offering $beds bedrooms, $baths bathrooms, and $area sqm of thoughtfully designed living space. This home combines bright interiors, quality furnishing, and a calm residential feel with access to top-tier amenities for a smooth move-in.',
      'شقة مميزة في $city، $country، تضم $beds غرف نوم و$baths حمامات ومساحة $area متر مربع بتصميم مدروس. يجمع هذا المنزل بين الإضاءة الطبيعية والأثاث عالي الجودة وأجواء سكنية هادئة مع مرافق راقية لانتقال مريح.',
    );
  }

  List<String> get _quickHighlights {
    return <String>[
      OmniRentI18n.t(context, 'Fully Furnished', 'مفروشة بالكامل'),
      OmniRentI18n.t(context, 'City View', 'إطلالة مدينة'),
      OmniRentI18n.t(context, 'Pool & Gym', 'مسبح وناد رياضي'),
      OmniRentI18n.t(context, 'Move-In Ready', 'جاهزة للسكن'),
    ];
  }

  @override
  Widget build(BuildContext context) {
    final double monthlyPrice = property.price / 12;
    final String locationText =
        '${property.location.address ?? 'Prime district'}, ${property.location.city ?? 'Doha'}';

    final double heroHeight = (MediaQuery.sizeOf(context).width * 9 / 16).clamp(240.0, 520.0);

    return Scaffold(
      backgroundColor: const Color(0xFFF4F6F8),
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            expandedHeight: heroHeight,
            pinned: true,
            backgroundColor: const Color(0xFFF4F6F8),
            surfaceTintColor: Colors.transparent,
            leading: Padding(
              padding: const EdgeInsets.only(left: 12, top: 8, bottom: 8),
              child: _CircleTopButton(
                icon: Icons.arrow_back_rounded,
                onTap: () => Navigator.pop(context),
              ),
            ),
            actions: [
              Padding(
                padding: const EdgeInsets.only(top: 8, bottom: 8, right: 8),
                child: OmniCartAction(
                  onTap: () {},
                ),
              ),
              Padding(
                padding: const EdgeInsets.only(top: 8, bottom: 8, right: 12),
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
            flexibleSpace: FlexibleSpaceBar(
              collapseMode: CollapseMode.pin,
              background: PropertyGalleryHero(images: property.images),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 18, 20, 120),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    property.title,
                    style: const TextStyle(
                      color: Color(0xFF0F172A),
                      fontSize: 28,
                      fontWeight: FontWeight.w700,
                      height: 1.15,
                      letterSpacing: -0.4,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      const Icon(
                        Icons.location_on_outlined,
                        size: 16,
                        color: Color(0xFF64748B),
                      ),
                      const SizedBox(width: 5),
                      Expanded(
                        child: Text(
                          locationText,
                          style: const TextStyle(
                            color: Color(0xFF64748B),
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ],
                  ),
                  if (mapPropertyViewingStateToTenantStatus(property.viewingState) !=
                      null) ...[
                    const SizedBox(height: 10),
                    _TenantViewingContextBadge(state: property.viewingState),
                  ],
                  const SizedBox(height: 16),
                  Text(
                    'QAR ${monthlyPrice.toStringAsFixed(0)} / month',
                    style: const TextStyle(
                      color: Color(0xFF0F172A),
                      fontSize: 30,
                      fontWeight: FontWeight.w800,
                      letterSpacing: -0.5,
                    ),
                  ),
                  const SizedBox(height: 18),
                  PropertyMiniMapPreview(
                    locationLabel: property.location.city ?? 'Doha',
                    height: 112,
                  ),
                  const SizedBox(height: 18),
                  OmniCardSurface(
                    child: Row(
                      children: [
                        const Icon(
                          Icons.vrpano_outlined,
                          size: 20,
                          color: Color(0xFF1D4ED8),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            OmniRentI18n.t(
                              context,
                              'Virtual tour available',
                              'جولة افتراضية متاحة',
                            ),
                            style: const TextStyle(
                              color: Color(0xFF0F172A),
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                        TextButton(
                          onPressed: () {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(
                                  OmniRentI18n.t(
                                    context,
                                    'Virtual tour UI ready.',
                                    'واجهة الجولة الافتراضية جاهزة.',
                                  ),
                                ),
                              ),
                            );
                          },
                          child: Text(
                            OmniRentI18n.t(context, 'Open', 'فتح'),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 18),
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.04),
                          blurRadius: 16,
                          offset: const Offset(0, 8),
                        ),
                      ],
                    ),
                    child: Wrap(
                      spacing: 10,
                      runSpacing: 10,
                      children: [
                        PropertyFeaturePill(
                          icon: Icons.king_bed_outlined,
                          label: '${property.bedrooms} Beds',
                        ),
                        PropertyFeaturePill(
                          icon: Icons.bathtub_outlined,
                          label: '${property.bathrooms} Baths',
                        ),
                        PropertyFeaturePill(
                          icon: Icons.square_foot_outlined,
                          label: '${property.area.toStringAsFixed(0)} sqm',
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
                  Text(
                    _premiumHeadline,
                    style: const TextStyle(
                      color: Color(0xFF0F172A),
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    _premiumNarrative,
                    style: const TextStyle(
                      color: Color(0xFF475569),
                      fontSize: 14,
                      height: 1.5,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 18),
                  Text(
                    OmniRentI18n.t(
                      context,
                      'Quick highlights',
                      'أبرز المزايا السريعة',
                    ),
                    style: const TextStyle(
                      color: Color(0xFF0F172A),
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 10,
                    runSpacing: 10,
                    children: _quickHighlights.map((String item) {
                      return PropertyFeaturePill(
                        icon: Icons.check_circle_outline_rounded,
                        label: item,
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 20),
                  Text(
                    OmniRentI18n.t(context, 'Key amenities', 'المرافق الأساسية'),
                    style: const TextStyle(
                      color: Color(0xFF0F172A),
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 10,
                    runSpacing: 10,
                    children: property.amenities.take(6).map((String amenity) {
                      return _AmenityChip(
                        icon: _amenityIconFor(amenity),
                        label: amenity,
                      );
                    }).toList(),
                  ),
                 const SizedBox(height: 24),
                 // --- Services Section ---
                 Text(
                   OmniRentI18n.t(context, 'Included Services', 'الخدمات المشمولة'),
                   style: const TextStyle(
                     color: Color(0xFF0F172A),
                     fontSize: 18,
                     fontWeight: FontWeight.w700,
                   ),
                 ),
                 const SizedBox(height: 10),
                 Wrap(
                   spacing: 10,
                   runSpacing: 10,
                   children: [
                     ServiceChip(icon: Icons.local_shipping_outlined, label: 'Free Moving'),
                     ServiceChip(icon: Icons.cleaning_services_outlined, label: 'Free Cleaning'),
                     ServiceChip(icon: Icons.home_repair_service_outlined, label: 'Free Setup'),
                   ],
                 ),
                 const SizedBox(height: 20),
                 Text(
                   OmniRentI18n.t(context, 'Optional / Paid Services', 'خدمات إضافية / مدفوعة'),
                   style: const TextStyle(
                     color: Color(0xFF0F172A),
                     fontSize: 18,
                     fontWeight: FontWeight.w700,
                   ),
                 ),
                 const SizedBox(height: 10),
                 // Placeholder for future paid services
                 Container(
                   padding: const EdgeInsets.all(14),
                   decoration: BoxDecoration(
                     color: Colors.white,
                     borderRadius: BorderRadius.circular(16),
                     border: Border.all(color: Color(0xFFE2E8F0)),
                   ),
                   child: Text(
                     OmniRentI18n.t(
                       context,
                       'No paid services available yet.',
                       'لا توجد خدمات مدفوعة حالياً.',
                     ),
                     style: const TextStyle(
                       color: Color(0xFF64748B),
                       fontSize: 13,
                       fontWeight: FontWeight.w500,
                     ),
                   ),
                 ),
                ],
              ),
            ),
          ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 20),
          child: Row(
            children: [
              Expanded(
                child: ValueListenableBuilder<Map<String, Property>>(
                  valueListenable: OmniRentFlowState.cart,
                  builder: (context, Map<String, Property> cart, child) {
                    final bool inCart = cart.containsKey(property.id);
                    return PropertyPrimaryButton(
                      label: inCart
                          ? OmniRentI18n.t(
                              context,
                              'Go to Cart',
                              'اذهب إلى العربة',
                            )
                          : OmniRentI18n.t(
                              context,
                              'Add to OmniCart',
                              'أضف إلى العربة',
                            ),
                      icon: inCart ? Icons.shopping_cart_rounded : Icons.add_rounded,
                      onPressed: () {
                        if (inCart) {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => const OmniCartScreen(),
                            ),
                          );
                        } else {
                          OmniRentFlowState.toggleCart(property);
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text(
                                OmniRentI18n.t(
                                  context,
                                  'Added to cart',
                                  'تمت الإضافة إلى العربة',
                                ),
                              ),
                              duration: const Duration(seconds: 2),
                            ),
                          );
                        }
                      },
                    );
                  },
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Color(0xFF1D4ED8),
                    foregroundColor: Colors.white,
                    minimumSize: Size(double.infinity, 52),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    textStyle: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => ViewingRequestScreen(property: property),
                      ),
                    );
                  },
                  child: Text(OmniRentI18n.t(context, 'Request Viewing', 'طلب معاينة')),
                ),
              ),
            ],
          ),
        ),
      ),
      // --- Under Viewing Badge Widget (reuse from list) ---
      // If you want to show the badge in details hero, add similar logic as in list.
    );
  }

  IconData _amenityIconFor(String amenity) {
    final String key = amenity.toLowerCase();
    if (key.contains('pool')) return Icons.pool_outlined;
    if (key.contains('gym') || key.contains('fitness')) {
      return Icons.fitness_center_outlined;
    }
    if (key.contains('parking')) return Icons.local_parking_outlined;
    if (key.contains('wifi') || key.contains('internet')) {
      return Icons.wifi_outlined;
    }
    if (key.contains('security')) return Icons.shield_outlined;
    if (key.contains('balcony')) return Icons.deck_outlined;
    return Icons.check_circle_outline_rounded;
  }
}

class _AmenityChip extends StatelessWidget {
  final IconData icon;
  final String label;

  const _AmenityChip({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: const Color(0xFF3B82F6)),
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

class _TenantViewingContextBadge extends StatelessWidget {
  final PropertyViewingState state;

  const _TenantViewingContextBadge({required this.state});

  @override
  Widget build(BuildContext context) {
    final TenantFacingStatus? mapped =
        mapPropertyViewingStateToTenantStatus(state);
    if (mapped == null) {
      return const SizedBox.shrink();
    }

    final Color color = tenantFacingStatusColor(mapped);
    final String label = tenantFacingStatusLabel(
      mapped,
      ar: OmniRentI18n.isArabic(context),
    );

    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(999),
          border: Border.all(color: color.withValues(alpha: 0.25)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(tenantFacingStatusIcon(mapped), size: 14, color: color),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                color: color,
                fontSize: 12,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CircleTopButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;

  const _CircleTopButton({required this.icon, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white.withValues(alpha: 0.94),
      borderRadius: BorderRadius.circular(999),
      child: InkWell(
        borderRadius: BorderRadius.circular(999),
        onTap: onTap,
        child: SizedBox(
          width: 40,
          height: 40,
          child: Icon(icon, size: 20, color: const Color(0xFF0F172A)),
        ),
      ),
    );
  }
}

class PropertyGalleryHero extends StatefulWidget {
  final List<String> images;

  const PropertyGalleryHero({super.key, required this.images});

  @override
  State<PropertyGalleryHero> createState() => _PropertyGalleryHeroState();
}

class _PropertyGalleryHeroState extends State<PropertyGalleryHero> {
  late final PageController _controller;
  int _index = 0;

  List<String> get _images =>
      widget.images.isEmpty ? <String>[''] : widget.images.take(8).toList();

  List<String> _orderedLabels(BuildContext context) {
    return <String>[
      OmniRentI18n.t(context, 'Exterior', 'الواجهة الخارجية'),
      OmniRentI18n.t(context, 'Entrance', 'المدخل'),
      OmniRentI18n.t(context, 'Living Room', 'غرفة المعيشة'),
      OmniRentI18n.t(context, 'Kitchen', 'المطبخ'),
      OmniRentI18n.t(context, 'Bedroom', 'غرفة النوم'),
      OmniRentI18n.t(context, 'Bathroom', 'الحمام'),
      OmniRentI18n.t(context, 'Balcony / View', 'الشرفة / الإطلالة'),
      OmniRentI18n.t(context, 'Building Facility', 'مرفق المبنى'),
    ];
  }

  void _openFullscreenViewer(int initialPage) {
    showDialog<void>(
      context: context,
      barrierColor: Colors.black.withValues(alpha: 0.9),
      builder: (_) => _FullscreenGalleryViewer(
        images: _images,
        initialPage: initialPage,
      ),
    );
  }

  @override
  void initState() {
    super.initState();
    _controller = PageController();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ClipRect(
      child: Stack(
        fit: StackFit.expand,
        children: [
          GestureDetector(
            onTap: () => _openFullscreenViewer(_index),
            child: ScrollConfiguration(
              behavior: ScrollConfiguration.of(context).copyWith(
                dragDevices: {
                  PointerDeviceKind.touch,
                  PointerDeviceKind.mouse,
                },
              ),
              child: PageView.builder(
                controller: _controller,
                onPageChanged: (int value) => setState(() => _index = value),
                itemCount: _images.length,
              itemBuilder: (_, int i) {
                return Image.network(
                  resolveOptimizedImageUrl(
                    _images[i],
                    targetWidth: 1920,
                    quality: 88,
                  ),
                  fit: BoxFit.cover,
                  filterQuality: FilterQuality.high,
                  frameBuilder: (context, child, frame, wasSynchronouslyLoaded) {
                    if (wasSynchronouslyLoaded || frame != null) return child;
                    return Stack(
                      fit: StackFit.expand,
                      children: [
                        const Center(
                          child: SizedBox(
                            width: 28,
                            height: 28,
                            child: CircularProgressIndicator(strokeWidth: 2.4),
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
                  errorBuilder: (_, _, _) => PremiumVisualAsset(
                    imageUrl: PremiumVisualCatalog.apartmentProperty,
                    semanticLabel: 'Property visual',
                    aspectRatio: 1.8,
                  ),
                );
              },
            ),
            ),
          ),
          IgnorePointer(
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: <Color>[
                    Colors.white.withValues(alpha: 0.04),
                    Colors.transparent,
                    const Color(0xFF020617).withValues(alpha: 0.16),
                  ],
                ),
              ),
            ),
          ),
          Positioned(
            left: 14,
            top: 72,
            child: AnimatedSwitcher(
              duration: const Duration(milliseconds: 250),
              child: Container(
                key: ValueKey<int>(_index),
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.88),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  _orderedLabels(context)[_index % _orderedLabels(context).length],
                  style: const TextStyle(
                    color: Color(0xFF0F172A),
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),
          ),
          Positioned(
            left: 12,
            right: 12,
            bottom: 16,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                _ArrowCircle(
                  icon: Icons.chevron_left_rounded,
                  onTap: () {
                    final int prev = (_index - 1 + _images.length) % _images.length;
                    _controller.animateToPage(
                      prev,
                      duration: const Duration(milliseconds: 260),
                      curve: Curves.easeOut,
                    );
                    setState(() => _index = prev);
                  },
                ),
                Row(
                  children: List<Widget>.generate(_images.length, (int dot) {
                    final bool active = dot == _index;
                    return Container(
                      width: active ? 18 : 7,
                      height: 7,
                      margin: const EdgeInsets.symmetric(horizontal: 3),
                      decoration: BoxDecoration(
                        color: active
                            ? Colors.white
                            : Colors.white.withValues(alpha: 0.5),
                        borderRadius: BorderRadius.circular(999),
                      ),
                    );
                  }),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.88),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(
                    '${_index + 1}/${_images.length}',
                    style: const TextStyle(
                      color: Color(0xFF0F172A),
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                _ArrowCircle(
                  icon: Icons.chevron_right_rounded,
                  onTap: () {
                    final int next = (_index + 1) % _images.length;
                    _controller.animateToPage(
                      next,
                      duration: const Duration(milliseconds: 260),
                      curve: Curves.easeOut,
                    );
                    setState(() => _index = next);
                  },
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _FullscreenGalleryViewer extends StatefulWidget {
  final List<String> images;
  final int initialPage;

  const _FullscreenGalleryViewer({
    required this.images,
    required this.initialPage,
  });

  @override
  State<_FullscreenGalleryViewer> createState() => _FullscreenGalleryViewerState();
}

class _FullscreenGalleryViewerState extends State<_FullscreenGalleryViewer> {
  late final PageController _pageController;
  int _page = 0;

  @override
  void initState() {
    super.initState();
    _page = widget.initialPage;
    _pageController = PageController(initialPage: widget.initialPage);
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: SafeArea(
        child: Stack(
          children: [
            ScrollConfiguration(
              behavior: ScrollConfiguration.of(context).copyWith(
                dragDevices: {
                  PointerDeviceKind.touch,
                  PointerDeviceKind.mouse,
                },
              ),
              child: PageView.builder(
                controller: _pageController,
                itemCount: widget.images.length,
                onPageChanged: (int value) => setState(() => _page = value),
              itemBuilder: (_, int index) {
                return InteractiveViewer(
                  minScale: 1,
                  maxScale: 4,
                  child: Center(
                    child: Image.network(
                      resolveOptimizedImageUrl(
                        widget.images[index],
                        targetWidth: 2200,
                        quality: 90,
                      ),
                      fit: BoxFit.contain,
                      filterQuality: FilterQuality.high,
                      frameBuilder: (context, child, frame, wasSynchronouslyLoaded) {
                        if (wasSynchronouslyLoaded || frame != null) return child;
                        return Stack(
                          alignment: Alignment.center,
                          children: [
                            const SizedBox(
                              width: 28,
                              height: 28,
                              child: CircularProgressIndicator(
                                strokeWidth: 2.4,
                                color: Colors.white70,
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
                      errorBuilder: (_, _, _) => const Icon(
                        Icons.broken_image_outlined,
                        color: Colors.white54,
                        size: 64,
                      ),
                    ),
                  ),
                );
              },
            ),
            ),
            Positioned(
              top: 8,
              left: 8,
              child: IconButton(
                onPressed: () => Navigator.pop(context),
                icon: const Icon(Icons.close_rounded, color: Colors.white),
              ),
            ),
            Positioned(
              top: 14,
              right: 14,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.black.withValues(alpha: 0.4),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  '${_page + 1}/${widget.images.length}',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ArrowCircle extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;

  const _ArrowCircle({required this.icon, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white.withValues(alpha: 0.88),
      borderRadius: BorderRadius.circular(999),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(999),
        child: SizedBox(
          width: 34,
          height: 34,
          child: Icon(icon, color: const Color(0xFF0F172A), size: 22),
        ),
      ),
    );
  }
}
