import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';

import '../../../core/models/models.dart';
import '../../../core/services/service_manager.dart';
import '../data/doha_areas.dart';
import 'omnicart_screen.dart';
import 'omnirent_flow_state.dart';
import 'profile_screen.dart';
import 'property_details_screen.dart';
import 'property_flow_ui.dart';

class PropertyListScreen extends StatefulWidget {
  const PropertyListScreen({super.key});

  @override
  State<PropertyListScreen> createState() => _PropertyListScreenState();
}

class _PropertyListScreenState extends State<PropertyListScreen> {
  final ServiceManager _serviceManager = ServiceManager();
  final TextEditingController _searchController = TextEditingController();

  List<Property> _properties = <Property>[];
  List<Property> _filtered = <Property>[];
  final Set<String> _savedPropertyIds = <String>{};

  bool _isLoading = true;
  bool _loadFailed = false;
  bool _isFilterExpanded = false;
  String _query = '';
  _AdvancedSearchFilters _filters = const _AdvancedSearchFilters();

  static const List<String> _preferredAreaOrder = <String>[
    'doha',
    'the pearl',
    'west bay',
    'west bay lagoon',
    'lusail',
    'jabal thuaileb',
    'msheireb',
    'al dafna',
    'al sadd',
    'al mansoura',
    'bin mahmoud',
    'najma',
    'al gharrafa',
    'muraikh',
    'al aziziyah',
    'ain khaled',
    'muaither',
    'al wakra',
    'al wakrah',
    'al wukair',
    'madinat khalifa',
    'al rayyan',
    'al daayen',
    'umm salal',
    'al khor',
    'mesaieed',
    'madinat al shamal',
  ];

  @override
  void initState() {
    super.initState();
    _loadProperties();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadProperties() async {
    try {
      setState(() {
        _isLoading = true;
        _loadFailed = false;
      });
      final List<Property> result = await _serviceManager.searchProperties(
        location: GeoLocation(latitude: 25.2854, longitude: 51.5310),
      );

      if (!mounted) {
        return;
      }

      setState(() {
        _properties = result;
        _filtered = result;
        _isLoading = false;
      });
      _applySearchAndFilters();
    } catch (_) {
      if (!mounted) {
        return;
      }
      setState(() {
        _isLoading = false;
        _loadFailed = true;
      });
    }
  }

  void _onSearchChanged(String value) {
    setState(() => _query = value);
    _applySearchAndFilters();
  }

  void _applySearchAndFilters() {
    final String normalizedQuery = _query.trim().toLowerCase();

    final List<Property> queryFiltered = _properties.where((Property property) {
      if (normalizedQuery.isEmpty) {
        return true;
      }

      final String city = (property.location.city ?? '').toLowerCase();
      final String country = (property.location.country ?? '').toLowerCase();
      final String address = (property.location.address ?? '').toLowerCase();
      final String area = property.areaName.toLowerCase();
      final String type = property.propertyType.toLowerCase();
      final String nationalAddress = property.nationalAddress.toLowerCase();
      final String amenities = property.amenities.join(' ').toLowerCase();

      return property.title.toLowerCase().contains(normalizedQuery) ||
          city.contains(normalizedQuery) ||
          country.contains(normalizedQuery) ||
          address.contains(normalizedQuery) ||
          area.contains(normalizedQuery) ||
          type.contains(normalizedQuery) ||
          nationalAddress.contains(normalizedQuery) ||
          amenities.contains(normalizedQuery);
    }).toList();

    List<Property> advancedFiltered = queryFiltered.where((Property property) {
      final double monthlyPrice = property.price / 12;
      final Set<String> amenityPool = property.amenities
          .map((String amenity) => amenity.trim().toLowerCase())
          .toSet();

      if (_filters.propertyType != 'all' &&
          property.propertyType.toLowerCase() != _filters.propertyType) {
        return false;
      }

      if (_filters.area != 'all' &&
          property.areaName.toLowerCase() != _filters.area) {
        return false;
      }

      if (property.bedrooms < _filters.minBedrooms) {
        return false;
      }

      if (property.bathrooms < _filters.minBathrooms) {
        return false;
      }

      if (_filters.furnished != _FurnishedFilter.any) {
        final bool wantsFurnished =
            _filters.furnished == _FurnishedFilter.furnished;
        if (property.furnished != wantsFurnished) {
          return false;
        }
      }

      if (property.parkingCount < _filters.minParkingCount) {
        return false;
      }

      if (_filters.availability != _AvailabilityFilter.any) {
        final bool wantsAvailable =
            _filters.availability == _AvailabilityFilter.available;
        if (property.isAvailable != wantsAvailable) {
          return false;
        }
      }

      if (monthlyPrice < _filters.minMonthlyPrice ||
          monthlyPrice > _filters.maxMonthlyPrice) {
        return false;
      }

      if (property.sizeSqm < _filters.minSizeSqm ||
          property.sizeSqm > _filters.maxSizeSqm) {
        return false;
      }

      if (_filters.selectedAmenities.isNotEmpty &&
          !_filters.selectedAmenities.every((String selected) {
            final String normalized = selected.toLowerCase();
            if (normalized == 'sea view') {
              return amenityPool.contains('sea view') ||
                  amenityPool.contains('waterfront') ||
                  amenityPool.contains('city view');
            }
            if (normalized == 'near metro') {
              return amenityPool.contains('near metro') ||
                  amenityPool.contains('metro') ||
                  amenityPool.contains('metro access');
            }
            if (normalized == 'security') {
              return amenityPool.contains('security') ||
                  amenityPool.contains('concierge');
            }
            return amenityPool.contains(normalized);
          })) {
        return false;
      }

      return true;
    }).toList();

    switch (_filters.sort) {
      case _PropertySort.priceLowToHigh:
        advancedFiltered.sort((Property a, Property b) =>
            (a.price / 12).compareTo(b.price / 12));
        break;
      case _PropertySort.priceHighToLow:
        advancedFiltered.sort((Property a, Property b) =>
            (b.price / 12).compareTo(a.price / 12));
        break;
      case _PropertySort.largestSpace:
        advancedFiltered.sort((Property a, Property b) =>
            b.sizeSqm.compareTo(a.sizeSqm));
        break;
      case _PropertySort.newest:
        advancedFiltered.sort((Property a, Property b) =>
            b.createdAt.compareTo(a.createdAt));
        break;
      case _PropertySort.recommended:
        advancedFiltered.sort((Property a, Property b) =>
            b.rating.compareTo(a.rating));
        break;
    }

    setState(() => _filtered = advancedFiltered);
  }

  void _toggleInlineFilters() {
    setState(() => _isFilterExpanded = !_isFilterExpanded);
  }

  void _applyInlineFilters(_AdvancedSearchFilters next) {
    setState(() {
      _filters = next;
      _isFilterExpanded = false;
    });
    _applySearchAndFilters();
  }

  void _resetInlineFilters() {
    setState(() {
      _filters = const _AdvancedSearchFilters();
      _isFilterExpanded = false;
    });
    _applySearchAndFilters();
  }

  List<String> get _availableAreas {
    final Set<String> areas = <String>{};
    for (final DohaArea area in dohaAreas) {
      final String name = area.name.trim();
      if (name.isNotEmpty) {
        areas.add(name);
      }
    }
    for (final Property property in _properties) {
      final String area = property.areaName.trim();
      if (area.isNotEmpty) {
        areas.add(area);
      }
    }
    final List<String> ordered = areas.toList()
      ..sort((String a, String b) {
        final int indexA = _preferredAreaOrder.indexOf(a.toLowerCase());
        final int indexB = _preferredAreaOrder.indexOf(b.toLowerCase());
        if (indexA >= 0 && indexB >= 0) {
          return indexA.compareTo(indexB);
        }
        if (indexA >= 0) {
          return -1;
        }
        if (indexB >= 0) {
          return 1;
        }
        return a.compareTo(b);
      });
    return ordered;
  }

  int get _activeAdvancedFilterCount => _filters.activeCount;

  void _toggleSaved(String propertyId) {
    setState(() {
      if (_savedPropertyIds.contains(propertyId)) {
        _savedPropertyIds.remove(propertyId);
      } else {
        _savedPropertyIds.add(propertyId);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF4F6F8),
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 10, 20, 6),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          OmniRentI18n.t(
                            context,
                            'Find your next home',
                            'ابحث عن منزلك القادم',
                          ),
                          style: const TextStyle(
                            color: Color(0xFF0F172A),
                            fontSize: 28,
                            fontWeight: FontWeight.w700,
                            letterSpacing: -0.4,
                          ),
                        ),
                      ),
                      const OmniLanguageSwitcher(),
                      const SizedBox(width: 8),
                      OmniCartAction(
                        onTap: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => const OmniCartScreen(),
                            ),
                          );
                        },
                      ),
                      const SizedBox(width: 10),
                      OmniLoginAction(
                        onTap: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => const ProfileScreen(),
                            ),
                          );
                        },
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    OmniRentI18n.t(
                      context,
                      'Premium rentals in Doha with a calm, guided browsing experience.',
                      'إيجارات فاخرة في الدوحة مع تجربة تصفح هادئة وموجهة.',
                    ),
                    style: const TextStyle(
                      color: Color(0xFF64748B),
                      fontSize: 14,
                      height: 1.4,
                    ),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 10, 20, 10),
              child: Row(
                children: [
                  Expanded(
                    child: Container(
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(22),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.04),
                            blurRadius: 18,
                            offset: const Offset(0, 10),
                          ),
                        ],
                      ),
                      child: TextField(
                        controller: _searchController,
                        onChanged: _onSearchChanged,
                        decoration: InputDecoration(
                          hintText: OmniRentI18n.t(
                            context,
                            'Search apartments, areas, landmarks',
                            'ابحث عن شقق ومناطق ومعالم',
                          ),
                          hintStyle: const TextStyle(
                            color: Color(0xFF94A3B8),
                            fontWeight: FontWeight.w500,
                          ),
                          prefixIcon: const Icon(
                            Icons.search_rounded,
                            color: Color(0xFF64748B),
                          ),
                          border: InputBorder.none,
                          contentPadding: const EdgeInsets.symmetric(vertical: 18),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  _AdvancedFilterButton(
                    activeCount: _activeAdvancedFilterCount,
                    isExpanded: _isFilterExpanded,
                    onTap: _toggleInlineFilters,
                  ),
                ],
              ),
            ),
            AnimatedSize(
              duration: const Duration(milliseconds: 260),
              curve: Curves.easeOutCubic,
              child: _isFilterExpanded
                  ? Padding(
                      padding: const EdgeInsets.fromLTRB(20, 0, 20, 10),
                      child: _InlineFiltersPanel(
                        initialFilters: _filters,
                        areaOptions: _availableAreas,
                        onApply: _applyInlineFilters,
                        onReset: _resetInlineFilters,
                      ),
                    )
                  : const SizedBox.shrink(),
            ),
            const SizedBox(height: 6),
            Expanded(
              child: ValueListenableBuilder<Map<String, Property>>(
                valueListenable: OmniRentFlowState.cart,
                builder: (
                  BuildContext context,
                  Map<String, Property> cart,
                  _,
                ) {
                  if (_isLoading) {
                    return const Center(
                      child: CircularProgressIndicator(
                        color: Color(0xFF1D4ED8),
                      ),
                    );
                  }

                  if (_loadFailed) {
                    return _ReloadErrorState(onRetry: _loadProperties);
                  }

                  if (_filtered.isEmpty) {
                    return const _DiscoveryEmptyState();
                  }

                  return ListView.separated(
                    padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
                    itemCount: _filtered.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 18),
                    itemBuilder: (BuildContext context, int index) {
                      final Property property = _filtered[index];
                      return _PropertyCard(
                        property: property,
                        isSaved: _savedPropertyIds.contains(property.id),
                        onSaveToggle: () => _toggleSaved(property.id),
                        onAddToCart: () => OmniRentFlowState.toggleCart(property),
                        inCart: cart.containsKey(property.id),
                        onTap: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) =>
                                  PropertyDetailsScreen(property: property),
                            ),
                          );
                        },
                      );
                    },
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ReloadErrorState extends StatelessWidget {
  final VoidCallback onRetry;

  const _ReloadErrorState({required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24),
        child: OmniCardSurface(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              const Icon(
                Icons.wifi_off_rounded,
                size: 30,
                color: Color(0xFF64748B),
              ),
              const SizedBox(height: 10),
              Text(
                OmniRentI18n.t(
                  context,
                  'Could not load properties after refresh.',
                  'تعذر تحميل العقارات بعد إعادة التحديث.',
                ),
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: Color(0xFF334155),
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 12),
              PropertyPrimaryButton(
                label: OmniRentI18n.t(context, 'Try Again', 'إعادة المحاولة'),
                onPressed: onRetry,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _DiscoveryEmptyState extends StatelessWidget {
  const _DiscoveryEmptyState();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24),
        child: Text(
          OmniRentI18n.t(
            context,
            'No properties found for the current filters.',
            'لا توجد عقارات مطابقة للفلاتر الحالية.',
          ),
          textAlign: TextAlign.center,
          style: const TextStyle(
            color: Color(0xFF64748B),
            fontSize: 14,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
    );
  }
}

class _PropertyCard extends StatelessWidget {
  final Property property;
  final bool isSaved;
  final bool inCart;
  final VoidCallback onSaveToggle;
  final VoidCallback onAddToCart;
  final VoidCallback onTap;

  const _PropertyCard({
    required this.property,
    required this.isSaved,
    required this.inCart,
    required this.onSaveToggle,
    required this.onAddToCart,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final double monthlyPrice = property.price / 12;
    final String areaLabel = property.areaName.isNotEmpty
      ? property.areaName
      : (property.location.city?.isNotEmpty ?? false)
        ? property.location.city!
        : OmniRentI18n.t(context, 'Doha', 'الدوحة');
    final String? areaImageUrl = dohaAreaImageForName(areaLabel);

    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(28),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 18,
              offset: const Offset(0, 10),
            ),
          ],
        ),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Stack(
                children: [
                  _CardImageGallery(
                    images: property.images,
                    fallbackImageUrl: areaImageUrl,
                    height: 210,
                    borderRadius: 22,
                  ),
                  Positioned(
                    left: 12,
                    top: 12,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.95),
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Text(
                        property.type.toUpperCase(),
                        style: const TextStyle(
                          color: Color(0xFF1E3A8A),
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ),
                  ),
                  Positioned(
                    top: 12,
                    right: 12,
                    child: Material(
                      color: Colors.white.withValues(alpha: 0.95),
                      borderRadius: BorderRadius.circular(999),
                      child: InkWell(
                        borderRadius: BorderRadius.circular(999),
                        onTap: onSaveToggle,
                        child: Padding(
                          padding: const EdgeInsets.all(9),
                          child: Icon(
                            (isSaved || inCart)
                                ? Icons.favorite_rounded
                                : Icons.favorite_border_rounded,
                            size: 19,
                            color: inCart
                                ? const Color(0xFF16A34A)
                                : isSaved
                                    ? const Color(0xFF1D4ED8)
                                    : const Color(0xFF475569),
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Text(
                property.title,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: Color(0xFF0F172A),
                  fontSize: 19,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                areaLabel,
                style: const TextStyle(
                  color: Color(0xFF64748B),
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                property.nationalAddress,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: Color(0xFF94A3B8),
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 14),
              Row(
                children: [
                  Expanded(
                    child: Text(
                      '${OmniRentI18n.t(context, 'QAR', 'ر.ق')} ${monthlyPrice.toStringAsFixed(0)}',
                      style: const TextStyle(
                        color: Color(0xFF0F172A),
                        fontSize: 24,
                        fontWeight: FontWeight.w800,
                        letterSpacing: -0.4,
                      ),
                    ),
                  ),
                  Text(
                    OmniRentI18n.t(context, '/ month', '/ شهريا'),
                    style: const TextStyle(
                      color: Color(0xFF64748B),
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  PropertyFeaturePill(
                    icon: Icons.king_bed_outlined,
                    label: '${property.bedrooms} ${OmniRentI18n.t(context, 'Beds', 'غرف')}',
                  ),
                  PropertyFeaturePill(
                    icon: Icons.bathtub_outlined,
                    label: '${property.bathrooms} ${OmniRentI18n.t(context, 'Baths', 'حمامات')}',
                  ),
                  PropertyFeaturePill(
                    icon: Icons.square_foot_outlined,
                    label: '${property.area.toStringAsFixed(0)} sqm',
                  ),
                  PropertyFeaturePill(
                    icon: Icons.local_parking_outlined,
                    label: OmniRentI18n.t(context, 'Parking', 'موقف'),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              PropertyPrimaryButton(
                label: inCart
                    ? OmniRentI18n.t(
                        context,
                        'Added to OmniCart',
                        'تمت الإضافة إلى العربة',
                      )
                    : OmniRentI18n.t(
                        context,
                        'Add to OmniCart',
                        'أضف إلى العربة',
                      ),
                icon: inCart ? Icons.check_rounded : Icons.add_rounded,
                onPressed: onAddToCart,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CardImageGallery extends StatefulWidget {
  final List<String> images;
  final String? fallbackImageUrl;
  final double height;
  final double borderRadius;

  const _CardImageGallery({
    required this.images,
    this.fallbackImageUrl,
    required this.height,
    required this.borderRadius,
  });

  @override
  State<_CardImageGallery> createState() => _CardImageGalleryState();
}

class _CardImageGalleryState extends State<_CardImageGallery> {
  final PageController _controller = PageController();
  int _index = 0;

  bool get _canSlide => _images.length > 1;

  void _goToPrev() {
    if (!_canSlide) return;
    _controller.previousPage(
      duration: const Duration(milliseconds: 240),
      curve: Curves.easeOut,
    );
  }

  void _goToNext() {
    if (!_canSlide) return;
    _controller.nextPage(
      duration: const Duration(milliseconds: 240),
      curve: Curves.easeOut,
    );
  }

  List<String> get _images {
    if (widget.images.isNotEmpty) {
      return widget.images;
    }
    if (widget.fallbackImageUrl != null && widget.fallbackImageUrl!.isNotEmpty) {
      return <String>[widget.fallbackImageUrl!];
    }
    return <String>[''];
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(widget.borderRadius),
      child: SizedBox(
        height: widget.height,
        width: double.infinity,
        child: Stack(
          fit: StackFit.expand,
          children: [
            ScrollConfiguration(
              behavior: ScrollConfiguration.of(context).copyWith(
                dragDevices: {
                  PointerDeviceKind.touch,
                  PointerDeviceKind.mouse,
                },
              ),
              child: PageView.builder(
                controller: _controller,
                onPageChanged: (int v) => setState(() => _index = v),
                itemCount: _images.length,
                itemBuilder: (_, int i) {
                  return Image.network(
                    _images[i],
                    fit: BoxFit.cover,
                    filterQuality: FilterQuality.high,
                    frameBuilder: (_, child, frame, sync) {
                      if (sync || frame != null) return child;
                      return Stack(
                        fit: StackFit.expand,
                        children: [
                          const ColoredBox(color: Color(0xFFEEF2FF)),
                          AnimatedOpacity(
                            opacity: frame == null ? 0.0 : 1.0,
                            duration: const Duration(milliseconds: 260),
                            child: child,
                          ),
                        ],
                      );
                    },
                    errorBuilder: (
                      BuildContext context,
                      Object error,
                      StackTrace? stackTrace,
                    ) => const ColoredBox(
                      color: Color(0xFFEEF2FF),
                    ),
                  );
                },
              ),
            ),
            if (_canSlide)
              Positioned(
                left: 10,
                top: 0,
                bottom: 0,
                child: Center(
                  child: _GalleryArrow(
                    icon: Icons.chevron_left_rounded,
                    onTap: _goToPrev,
                  ),
                ),
              ),
            if (_canSlide)
              Positioned(
                right: 10,
                top: 0,
                bottom: 0,
                child: Center(
                  child: _GalleryArrow(
                    icon: Icons.chevron_right_rounded,
                    onTap: _goToNext,
                  ),
                ),
              ),
            if (_canSlide)
              Positioned(
                bottom: 10,
                left: 0,
                right: 0,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: List<Widget>.generate(_images.length, (int dot) {
                    final bool active = dot == _index;
                    return AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      width: active ? 16 : 6,
                      height: 6,
                      margin: const EdgeInsets.symmetric(horizontal: 2.5),
                      decoration: BoxDecoration(
                        color: active
                            ? Colors.white
                            : Colors.white.withValues(alpha: 0.55),
                        borderRadius: BorderRadius.circular(999),
                      ),
                    );
                  }),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _GalleryArrow extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;

  const _GalleryArrow({
    required this.icon,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.black.withValues(alpha: 0.18),
      shape: const CircleBorder(),
      child: InkWell(
        customBorder: const CircleBorder(),
        onTap: onTap,
        child: SizedBox(
          width: 28,
          height: 28,
          child: Icon(
            icon,
            color: Colors.white.withValues(alpha: 0.9),
            size: 18,
          ),
        ),
      ),
    );
  }
}

class _AdvancedFilterButton extends StatelessWidget {
  final int activeCount;
  final bool isExpanded;
  final VoidCallback onTap;

  const _AdvancedFilterButton({
    required this.activeCount,
    required this.isExpanded,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(18),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: Container(
          height: 56,
          padding: const EdgeInsets.symmetric(horizontal: 14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(18),
            border: Border.all(
              color: activeCount > 0
                  ? const Color(0xFF93C5FD)
                  : const Color(0xFFE2E8F0),
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.04),
                blurRadius: 18,
                offset: const Offset(0, 10),
              ),
            ],
          ),
          child: Row(
            children: [
              const Icon(
                Icons.tune_rounded,
                size: 19,
                color: Color(0xFF0F172A),
              ),
              const SizedBox(width: 6),
              AnimatedRotation(
                duration: const Duration(milliseconds: 220),
                turns: isExpanded ? 0.5 : 0,
                child: const Icon(
                  Icons.keyboard_arrow_down_rounded,
                  size: 18,
                  color: Color(0xFF475569),
                ),
              ),
              if (activeCount > 0) ...[
                const SizedBox(width: 8),
                Container(
                  width: 20,
                  height: 20,
                  decoration: const BoxDecoration(
                    color: Color(0xFF1D4ED8),
                    shape: BoxShape.circle,
                  ),
                  alignment: Alignment.center,
                  child: Text(
                    '$activeCount',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 10,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

enum _FurnishedFilter {
  any,
  furnished,
  unfurnished;

  String label(BuildContext context) {
    switch (this) {
      case _FurnishedFilter.any:
        return OmniRentI18n.t(context, 'Any', 'الكل');
      case _FurnishedFilter.furnished:
        return OmniRentI18n.t(context, 'Furnished', 'مفروش');
      case _FurnishedFilter.unfurnished:
        return OmniRentI18n.t(context, 'Unfurnished', 'غير مفروش');
    }
  }
}

enum _AvailabilityFilter {
  any,
  available,
  unavailable;

  String label(BuildContext context) {
    switch (this) {
      case _AvailabilityFilter.any:
        return OmniRentI18n.t(context, 'Any', 'الكل');
      case _AvailabilityFilter.available:
        return OmniRentI18n.t(context, 'Available', 'متاح');
      case _AvailabilityFilter.unavailable:
        return OmniRentI18n.t(context, 'Unavailable', 'غير متاح');
    }
  }
}

enum _PropertySort {
  recommended,
  priceLowToHigh,
  priceHighToLow,
  largestSpace,
  newest;

  String label(BuildContext context) {
    switch (this) {
      case _PropertySort.recommended:
        return OmniRentI18n.t(context, 'Recommended', 'الأفضل');
      case _PropertySort.priceLowToHigh:
        return OmniRentI18n.t(context, 'Price: Low to High', 'السعر: من الأقل');
      case _PropertySort.priceHighToLow:
        return OmniRentI18n.t(context, 'Price: High to Low', 'السعر: من الأعلى');
      case _PropertySort.largestSpace:
        return OmniRentI18n.t(context, 'Largest Space', 'الأكبر مساحة');
      case _PropertySort.newest:
        return OmniRentI18n.t(context, 'Newest', 'الأحدث');
    }
  }
}

class _AdvancedSearchFilters {
  static const double defaultMinMonthlyPrice = 3000;
  static const double defaultMaxMonthlyPrice = 500000;
  static const double defaultMinSizeSqm = 50;
  static const double defaultMaxSizeSqm = 500;
  static const List<String> availableAmenities = <String>[
    'Sea View',
    'Near Metro',
    'Gym',
    'Pool',
    'Security',
    'Balcony',
  ];

  final String propertyType;
  final String area;
  final int minBedrooms;
  final int minBathrooms;
  final _FurnishedFilter furnished;
  final int minParkingCount;
  final _AvailabilityFilter availability;
  final double minMonthlyPrice;
  final double maxMonthlyPrice;
  final double minSizeSqm;
  final double maxSizeSqm;
  final Set<String> selectedAmenities;
  final _PropertySort sort;

  const _AdvancedSearchFilters({
    this.propertyType = 'all',
    this.area = 'all',
    this.minBedrooms = 0,
    this.minBathrooms = 0,
    this.furnished = _FurnishedFilter.any,
    this.minParkingCount = 0,
    this.availability = _AvailabilityFilter.any,
    this.minMonthlyPrice = defaultMinMonthlyPrice,
    this.maxMonthlyPrice = defaultMaxMonthlyPrice,
    this.minSizeSqm = defaultMinSizeSqm,
    this.maxSizeSqm = defaultMaxSizeSqm,
    this.selectedAmenities = const <String>{},
    this.sort = _PropertySort.recommended,
  });

  _AdvancedSearchFilters copyWith({
    String? propertyType,
    String? area,
    int? minBedrooms,
    int? minBathrooms,
    _FurnishedFilter? furnished,
    int? minParkingCount,
    _AvailabilityFilter? availability,
    double? minMonthlyPrice,
    double? maxMonthlyPrice,
    double? minSizeSqm,
    double? maxSizeSqm,
    Set<String>? selectedAmenities,
    _PropertySort? sort,
  }) {
    return _AdvancedSearchFilters(
      propertyType: propertyType ?? this.propertyType,
      area: area ?? this.area,
      minBedrooms: minBedrooms ?? this.minBedrooms,
      minBathrooms: minBathrooms ?? this.minBathrooms,
      furnished: furnished ?? this.furnished,
      minParkingCount: minParkingCount ?? this.minParkingCount,
      availability: availability ?? this.availability,
      minMonthlyPrice: minMonthlyPrice ?? this.minMonthlyPrice,
      maxMonthlyPrice: maxMonthlyPrice ?? this.maxMonthlyPrice,
      minSizeSqm: minSizeSqm ?? this.minSizeSqm,
      maxSizeSqm: maxSizeSqm ?? this.maxSizeSqm,
      selectedAmenities: selectedAmenities ?? this.selectedAmenities,
      sort: sort ?? this.sort,
    );
  }

  int get activeCount {
    int count = 0;
    if (propertyType != 'all') count++;
    if (area != 'all') count++;
    if (minBedrooms > 0) count++;
    if (minBathrooms > 0) count++;
    if (furnished != _FurnishedFilter.any) count++;
    if (minParkingCount > 0) count++;
    if (availability != _AvailabilityFilter.any) count++;
    if (minMonthlyPrice > defaultMinMonthlyPrice) count++;
    if (maxMonthlyPrice < defaultMaxMonthlyPrice) count++;
    if (minSizeSqm > defaultMinSizeSqm) count++;
    if (maxSizeSqm < defaultMaxSizeSqm) count++;
    if (selectedAmenities.isNotEmpty) count++;
    if (sort != _PropertySort.recommended) count++;
    return count;
  }
}

class _InlineFiltersPanel extends StatefulWidget {
  final _AdvancedSearchFilters initialFilters;
  final List<String> areaOptions;
  final ValueChanged<_AdvancedSearchFilters> onApply;
  final VoidCallback onReset;

  const _InlineFiltersPanel({
    required this.initialFilters,
    required this.areaOptions,
    required this.onApply,
    required this.onReset,
  });

  @override
  State<_InlineFiltersPanel> createState() => _InlineFiltersPanelState();
}

class _InlineFiltersPanelState extends State<_InlineFiltersPanel> {
  late _AdvancedSearchFilters _draft;

  @override
  void initState() {
    super.initState();
    _draft = widget.initialFilters;
  }

  @override
  void didUpdateWidget(covariant _InlineFiltersPanel oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.initialFilters != widget.initialFilters) {
      _draft = widget.initialFilters;
    }
  }

  @override
  Widget build(BuildContext context) {
    final double panelMaxHeight = MediaQuery.of(context).size.height * 0.52;

    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 14,
            offset: const Offset(0, 7),
          ),
        ],
      ),
      child: ConstrainedBox(
        constraints: BoxConstraints(maxHeight: panelMaxHeight),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
          child: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    OmniRentI18n.t(context, 'Advanced Filters', 'فلاتر متقدمة'),
                    style: const TextStyle(
                      color: Color(0xFF0F172A),
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
                TextButton(
                  onPressed: () {
                    setState(() => _draft = const _AdvancedSearchFilters());
                    widget.onReset();
                  },
                  child: Text(
                    OmniRentI18n.t(context, 'Reset', 'إعادة ضبط'),
                    style: const TextStyle(
                      color: Color(0xFF1D4ED8),
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            _FilterSection(
              title: OmniRentI18n.t(context, 'Property Type', 'نوع العقار'),
              child: _WrapChoiceGroup<String>(
                value: _draft.propertyType,
                options: <String>['all', 'apartment', 'villa', 'studio'],
                labelBuilder: (String option) {
                  switch (option) {
                    case 'apartment':
                      return OmniRentI18n.t(context, 'Apartment', 'شقة');
                    case 'villa':
                      return OmniRentI18n.t(context, 'Villa', 'فيلا');
                    case 'studio':
                      return OmniRentI18n.t(context, 'Studio', 'استوديو');
                    default:
                      return OmniRentI18n.t(context, 'All Types', 'كل الأنواع');
                  }
                },
                onChanged: (String value) {
                  setState(() => _draft = _draft.copyWith(propertyType: value));
                },
              ),
            ),
            _FilterSection(
              title: OmniRentI18n.t(context, 'Area', 'المنطقة'),
              child: _SearchableAreaField(
                value: _draft.area,
                items: <String>[
                  'all',
                  ...widget.areaOptions.map((String area) => area.toLowerCase()),
                ],
                labelBuilder: (String value) {
                  if (value == 'all') {
                    return OmniRentI18n.t(context, 'All Areas', 'كل المناطق');
                  }
                  return widget.areaOptions.firstWhere(
                    (String option) => option.toLowerCase() == value,
                    orElse: () => value,
                  );
                },
                onChanged: (String value) {
                  setState(() => _draft = _draft.copyWith(area: value));
                },
              ),
            ),
            Row(
              children: [
                Expanded(
                  child: _FilterSection(
                    title: OmniRentI18n.t(context, 'Bedrooms', 'غرف النوم'),
                    child: _SelectField<int>(
                      value: _draft.minBedrooms,
                      items: const <int>[0, 1, 2, 3, 4],
                      labelBuilder: (int value) => value == 0
                          ? OmniRentI18n.t(context, 'Any', 'الكل')
                          : '$value+',
                      onChanged: (int value) {
                        setState(() => _draft = _draft.copyWith(minBedrooms: value));
                      },
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _FilterSection(
                    title: OmniRentI18n.t(context, 'Bathrooms', 'الحمامات'),
                    child: _SelectField<int>(
                      value: _draft.minBathrooms,
                      items: const <int>[0, 1, 2, 3],
                      labelBuilder: (int value) => value == 0
                          ? OmniRentI18n.t(context, 'Any', 'الكل')
                          : '$value+',
                      onChanged: (int value) {
                        setState(() => _draft = _draft.copyWith(minBathrooms: value));
                      },
                    ),
                  ),
                ),
              ],
            ),
            Row(
              children: [
                Expanded(
                  child: _FilterSection(
                    title: OmniRentI18n.t(context, 'Furnishing', 'الفرش'),
                    child: _SelectField<_FurnishedFilter>(
                      value: _draft.furnished,
                      items: _FurnishedFilter.values,
                      labelBuilder: (_FurnishedFilter value) => value.label(context),
                      onChanged: (_FurnishedFilter value) {
                        setState(() => _draft = _draft.copyWith(furnished: value));
                      },
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _FilterSection(
                    title: OmniRentI18n.t(context, 'Parking', 'المواقف'),
                    child: _SelectField<int>(
                      value: _draft.minParkingCount,
                      items: const <int>[0, 1, 2],
                      labelBuilder: (int value) => value == 0
                          ? OmniRentI18n.t(context, 'Any', 'الكل')
                          : '$value+',
                      onChanged: (int value) {
                        setState(() => _draft = _draft.copyWith(minParkingCount: value));
                      },
                    ),
                  ),
                ),
              ],
            ),
            Row(
              children: [
                Expanded(
                  child: _FilterSection(
                    title: OmniRentI18n.t(context, 'Availability', 'التوفر'),
                    child: _SelectField<_AvailabilityFilter>(
                      value: _draft.availability,
                      items: _AvailabilityFilter.values,
                      labelBuilder: (_AvailabilityFilter value) => value.label(context),
                      onChanged: (_AvailabilityFilter value) {
                        setState(() => _draft = _draft.copyWith(availability: value));
                      },
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                const Expanded(child: SizedBox.shrink()),
              ],
            ),
            _FilterSection(
              title: OmniRentI18n.t(context, 'Monthly Budget', 'الميزانية الشهرية'),
              child: Container(
                padding: const EdgeInsets.fromLTRB(12, 10, 12, 4),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${_draft.minMonthlyPrice.toStringAsFixed(0)} - ${_draft.maxMonthlyPrice.toStringAsFixed(0)} ${OmniRentI18n.t(context, 'QAR / month', 'ر.ق / شهر')}',
                      style: const TextStyle(
                        color: Color(0xFF0F172A),
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    RangeSlider(
                      values: RangeValues(_draft.minMonthlyPrice, _draft.maxMonthlyPrice),
                      min: _AdvancedSearchFilters.defaultMinMonthlyPrice,
                      max: _AdvancedSearchFilters.defaultMaxMonthlyPrice,
                      divisions: 50,
                      activeColor: const Color(0xFF1D4ED8),
                      onChanged: (RangeValues values) {
                        setState(() {
                          _draft = _draft.copyWith(
                            minMonthlyPrice: values.start,
                            maxMonthlyPrice: values.end,
                          );
                        });
                      },
                    ),
                  ],
                ),
              ),
            ),
            _FilterSection(
              title: OmniRentI18n.t(context, 'Area Size', 'المساحة'),
              child: Container(
                padding: const EdgeInsets.fromLTRB(12, 10, 12, 4),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${_draft.minSizeSqm.toStringAsFixed(0)} - ${_draft.maxSizeSqm.toStringAsFixed(0)} sqm',
                      style: const TextStyle(
                        color: Color(0xFF0F172A),
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    RangeSlider(
                      values: RangeValues(_draft.minSizeSqm, _draft.maxSizeSqm),
                      min: _AdvancedSearchFilters.defaultMinSizeSqm,
                      max: _AdvancedSearchFilters.defaultMaxSizeSqm,
                      divisions: 45,
                      activeColor: const Color(0xFF1D4ED8),
                      onChanged: (RangeValues values) {
                        setState(() {
                          _draft = _draft.copyWith(
                            minSizeSqm: values.start,
                            maxSizeSqm: values.end,
                          );
                        });
                      },
                    ),
                  ],
                ),
              ),
            ),
            _FilterSection(
              title: OmniRentI18n.t(context, 'Amenities', 'المميزات'),
              child: Wrap(
                spacing: 8,
                runSpacing: 8,
                children: _AdvancedSearchFilters.availableAmenities.map((String amenity) {
                  final bool selected = _draft.selectedAmenities.contains(amenity);
                  return FilterChip(
                    label: Text(amenity),
                    selected: selected,
                    onSelected: (bool value) {
                      final Set<String> next = _draft.selectedAmenities.toSet();
                      if (value) {
                        next.add(amenity);
                      } else {
                        next.remove(amenity);
                      }
                      setState(() => _draft = _draft.copyWith(selectedAmenities: next));
                    },
                    showCheckmark: false,
                    selectedColor: const Color(0xFFDBEAFE),
                    side: BorderSide(
                      color: selected ? const Color(0xFF93C5FD) : const Color(0xFFE2E8F0),
                    ),
                    labelStyle: TextStyle(
                      color: selected ? const Color(0xFF1D4ED8) : const Color(0xFF475569),
                      fontWeight: FontWeight.w700,
                      fontSize: 12,
                    ),
                  );
                }).toList(),
              ),
            ),
            _FilterSection(
              title: OmniRentI18n.t(context, 'Sort Results', 'ترتيب النتائج'),
              child: _WrapChoiceGroup<_PropertySort>(
                value: _draft.sort,
                options: _PropertySort.values,
                labelBuilder: (_PropertySort option) => option.label(context),
                onChanged: (_PropertySort value) {
                  setState(() => _draft = _draft.copyWith(sort: value));
                },
              ),
            ),
            const SizedBox(height: 8),
            PropertyPrimaryButton(
              label: OmniRentI18n.t(context, 'Apply Filters', 'تطبيق الفلاتر'),
              onPressed: () => widget.onApply(_draft),
            ),
            ],
          ),
        ),
      ),
      ),
    );
  }
}

class _FilterSection extends StatelessWidget {
  final String title;
  final Widget child;

  const _FilterSection({required this.title, required this.child});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              color: Color(0xFF334155),
              fontSize: 12,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 6),
          child,
        ],
      ),
    );
  }
}

class _WrapChoiceGroup<T> extends StatelessWidget {
  final T value;
  final List<T> options;
  final String Function(T value) labelBuilder;
  final ValueChanged<T> onChanged;

  const _WrapChoiceGroup({
    required this.value,
    required this.options,
    required this.labelBuilder,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: options.map((T option) {
        final bool selected = option == value;
        return GestureDetector(
          onTap: () => onChanged(option),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 180),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: selected ? const Color(0xFFDBEAFE) : Colors.white,
              borderRadius: BorderRadius.circular(999),
              border: Border.all(
                color: selected
                    ? const Color(0xFF93C5FD)
                    : const Color(0xFFE2E8F0),
              ),
            ),
            child: Text(
              labelBuilder(option),
              style: TextStyle(
                color: selected
                    ? const Color(0xFF1D4ED8)
                    : const Color(0xFF475569),
                fontSize: 11,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        );
      }).toList(),
    );
  }
}

class _SelectField<T> extends StatelessWidget {
  final T value;
  final List<T> items;
  final String Function(T value) labelBuilder;
  final ValueChanged<T> onChanged;

  const _SelectField({
    required this.value,
    required this.items,
    required this.labelBuilder,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 0),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<T>(
          value: value,
          isExpanded: true,
          icon: const Icon(Icons.keyboard_arrow_down_rounded),
          borderRadius: BorderRadius.circular(16),
          items: items.map((T item) {
            return DropdownMenuItem<T>(
              value: item,
              child: Text(
                labelBuilder(item),
                style: const TextStyle(
                  color: Color(0xFF0F172A),
                  fontWeight: FontWeight.w600,
                ),
              ),
            );
          }).toList(),
          onChanged: (T? next) {
            if (next != null) {
              onChanged(next);
            }
          },
        ),
      ),
    );
  }
}

class _SearchableAreaField extends StatefulWidget {
  final String value;
  final List<String> items;
  final String Function(String value) labelBuilder;
  final ValueChanged<String> onChanged;

  const _SearchableAreaField({
    required this.value,
    required this.items,
    required this.labelBuilder,
    required this.onChanged,
  });

  @override
  State<_SearchableAreaField> createState() => _SearchableAreaFieldState();
}

class _SearchableAreaFieldState extends State<_SearchableAreaField> {
  final TextEditingController _controller = TextEditingController();

  @override
  void didUpdateWidget(covariant _SearchableAreaField oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.value != widget.value) {
      _controller.text = widget.labelBuilder(widget.value);
    }
  }

  @override
  void initState() {
    super.initState();
    _controller.text = widget.labelBuilder(widget.value);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Autocomplete<String>(
        initialValue: TextEditingValue(text: widget.labelBuilder(widget.value)),
        optionsBuilder: (TextEditingValue value) {
          final String query = value.text.trim().toLowerCase();
          if (query.isEmpty) {
            return widget.items;
          }
          return widget.items.where((String item) {
            return widget.labelBuilder(item).toLowerCase().contains(query);
          });
        },
        displayStringForOption: (String option) => widget.labelBuilder(option),
        onSelected: (String selected) {
          widget.onChanged(selected);
        },
        fieldViewBuilder: (
          BuildContext context,
          TextEditingController textController,
          FocusNode focusNode,
          VoidCallback onFieldSubmitted,
        ) {
          if (textController.text != _controller.text) {
            textController.text = _controller.text;
            textController.selection = TextSelection.fromPosition(
              TextPosition(offset: textController.text.length),
            );
          }
          return TextField(
            controller: textController,
            focusNode: focusNode,
            decoration: InputDecoration(
              isDense: true,
              border: InputBorder.none,
              prefixIcon: const Icon(
                Icons.search_rounded,
                size: 18,
                color: Color(0xFF64748B),
              ),
              hintText: OmniRentI18n.t(
                context,
                'Search area',
                'ابحث عن منطقة',
              ),
              hintStyle: const TextStyle(
                color: Color(0xFF94A3B8),
                fontWeight: FontWeight.w500,
              ),
              suffixIcon: widget.value != 'all'
                  ? IconButton(
                      icon: const Icon(Icons.close_rounded, size: 18),
                      onPressed: () {
                        widget.onChanged('all');
                        textController.text = widget.labelBuilder('all');
                        textController.selection = TextSelection.fromPosition(
                          TextPosition(offset: textController.text.length),
                        );
                      },
                    )
                  : null,
            ),
          );
        },
        optionsViewBuilder: (
          BuildContext context,
          AutocompleteOnSelected<String> onSelected,
          Iterable<String> options,
        ) {
          return Align(
            alignment: Alignment.topLeft,
            child: Material(
              elevation: 4,
              borderRadius: BorderRadius.circular(12),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxHeight: 180, minWidth: 220),
                child: ListView.builder(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  itemCount: options.length,
                  itemBuilder: (BuildContext context, int index) {
                    final String option = options.elementAt(index);
                    final bool selected = option == widget.value;
                    return InkWell(
                      onTap: () {
                        _controller.text = widget.labelBuilder(option);
                        onSelected(option);
                      },
                      child: Padding(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 10,
                        ),
                        child: Text(
                          widget.labelBuilder(option),
                          style: TextStyle(
                            color: selected
                                ? const Color(0xFF1D4ED8)
                                : const Color(0xFF0F172A),
                            fontWeight:
                                selected ? FontWeight.w700 : FontWeight.w500,
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}
