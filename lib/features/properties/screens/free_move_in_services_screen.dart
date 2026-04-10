import 'package:flutter/material.dart';
import 'package:carousel_slider/carousel_slider.dart';
import 'package:flutter/foundation.dart';
import 'package:smooth_page_indicator/smooth_page_indicator.dart';

import '../../../core/models/models.dart';
import 'final_confirmation_payment_screen.dart';
import 'property_flow_ui.dart';

class FreeMoveInServicesScreen extends StatefulWidget {
  final Property property;
  final List<String> tourPlan;

  const FreeMoveInServicesScreen({
    super.key,
    required this.property,
    this.tourPlan = const <String>[],
  });

  @override
  State<FreeMoveInServicesScreen> createState() =>
      _FreeMoveInServicesScreenState();
}

class _FreeMoveInServicesScreenState extends State<FreeMoveInServicesScreen> {
  static const List<String> _dummyImageUrls = <String>[
    'https://images.unsplash.com/photo-1560185007-5f0bb1866cab?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1613977257592-487ecd136cc3?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=1400&q=80',
  ];

  final CarouselSliderController _carouselController =
      CarouselSliderController();
  final Set<String> _selectedServices = <String>{'Moving', 'Cleaning', 'Setup'};
  int _currentImageIndex = 0;
  bool _showArrows = false;

  void _toggleService(String key) {
    setState(() {
      if (_selectedServices.contains(key)) {
        _selectedServices.remove(key);
      } else {
        _selectedServices.add(key);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF4F6F8),
      appBar: AppBar(
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        backgroundColor: const Color(0xFFF4F6F8),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded, color: Color(0xFF0F172A)),
          onPressed: () => Navigator.pop(context),
        ),
        actions: const <Widget>[
          Padding(
            padding: EdgeInsets.only(right: 12),
            child: OmniLanguageSwitcher(),
          ),
        ],
      ),
      body: SafeArea(
        top: false,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
          children: <Widget>[
            Text(
              OmniRentI18n.t(
                context,
                'Choose your FREE Move-In Services',
                'اختر الخدمات المجانية',
              ),
              style: const TextStyle(
                color: Color(0xFF0F172A),
                fontSize: 28,
                fontWeight: FontWeight.w700,
                height: 1.15,
              ),
            ),
            const SizedBox(height: 10),
            _buildPropertyImageCarousel(),
            const SizedBox(height: 18),
            _SelectableServiceCard(
              icon: Icons.local_shipping_outlined,
              title: OmniRentI18n.t(context, 'Moving', 'النقل'),
              description: OmniRentI18n.t(context, 'مجانا', 'مجانا'),
              badge: '',
              selected: _selectedServices.contains('Moving'),
              onTap: () => _toggleService('Moving'),
            ),
            const SizedBox(height: 12),
            _SelectableServiceCard(
              icon: Icons.cleaning_services_outlined,
              title: OmniRentI18n.t(context, 'Cleaning', 'التنظيف'),
              description: OmniRentI18n.t(context, 'مجانا', 'مجانا'),
              badge: '',
              selected: _selectedServices.contains('Cleaning'),
              onTap: () => _toggleService('Cleaning'),
            ),
            const SizedBox(height: 12),
            _SelectableServiceCard(
              icon: Icons.home_repair_service_outlined,
              title: OmniRentI18n.t(context, 'Maintenance', 'صيانه'),
              description: OmniRentI18n.t(context, 'مجانا', 'مجانا'),
              badge: '',
              selected: _selectedServices.contains('Setup'),
              onTap: () => _toggleService('Setup'),
            ),
          ],
        ),
      ),
      bottomNavigationBar: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
          child: PropertyPrimaryButton(
            label: OmniRentI18n.t(context, 'Continue', 'متابعة'),
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => FinalConfirmationPaymentScreen(
                    property: widget.property,
                    selectedServices: _selectedServices.toList(),
                  ),
                ),
              );
            },
          ),
        ),
      ),
    );
  }

  Widget _buildPropertyImageCarousel() {
    final bool isWeb = kIsWeb;
    final bool showArrows = isWeb ? _showArrows : true;

    return MouseRegion(
      onEnter: (_) => setState(() => _showArrows = true),
      onExit: (_) => setState(() => _showArrows = false),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(24),
          boxShadow: <BoxShadow>[
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.06),
              blurRadius: 22,
              offset: const Offset(0, 10),
            ),
          ],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(24),
          child: Stack(
            alignment: Alignment.center,
            children: <Widget>[
              CarouselSlider.builder(
                carouselController: _carouselController,
                itemCount: _dummyImageUrls.length,
                itemBuilder: (BuildContext context, int index, int _) {
                  return Stack(
                    fit: StackFit.expand,
                    children: <Widget>[
                      Image.network(
                        _dummyImageUrls[index],
                        fit: BoxFit.cover,
                        loadingBuilder: (
                          BuildContext context,
                          Widget child,
                          ImageChunkEvent? loadingProgress,
                        ) {
                          if (loadingProgress == null) {
                            return child;
                          }
                          return const _ImageLoadingPlaceholder();
                        },
                        errorBuilder: (
                          BuildContext context,
                          Object error,
                          StackTrace? stackTrace,
                        ) {
                          return Container(
                            color: const Color(0xFFE2E8F0),
                            alignment: Alignment.center,
                            child: const Icon(
                              Icons.broken_image_outlined,
                              color: Color(0xFF64748B),
                              size: 32,
                            ),
                          );
                        },
                      ),
                      DecoratedBox(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                            colors: <Color>[
                              Colors.transparent,
                              Colors.black.withValues(alpha: 0.18),
                            ],
                          ),
                        ),
                      ),
                    ],
                  );
                },
                options: CarouselOptions(
                  height: 210,
                  viewportFraction: 1,
                  enableInfiniteScroll: true,
                  autoPlay: false,
                  enlargeCenterPage: false,
                  onPageChanged: (int index, CarouselPageChangedReason reason) {
                    setState(() => _currentImageIndex = index);
                  },
                ),
              ),
              Positioned(
                left: 10,
                child: _CarouselArrowButton(
                  icon: Icons.arrow_back_ios_new_rounded,
                  onTap: _carouselController.previousPage,
                  visible: showArrows,
                ),
              ),
              Positioned(
                right: 10,
                child: _CarouselArrowButton(
                  icon: Icons.arrow_forward_ios_rounded,
                  onTap: _carouselController.nextPage,
                  visible: showArrows,
                ),
              ),
              Positioned(
                bottom: 14,
                child: AnimatedSmoothIndicator(
                  activeIndex: _currentImageIndex,
                  count: _dummyImageUrls.length,
                  effect: ExpandingDotsEffect(
                    dotHeight: 7,
                    dotWidth: 7,
                    expansionFactor: 3,
                    spacing: 6,
                    dotColor: Colors.white.withValues(alpha: 0.46),
                    activeDotColor: const Color(0xFFFFFFFF),
                  ),
                  onDotClicked: (int index) {
                    _carouselController.animateToPage(index);
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ImageLoadingPlaceholder extends StatelessWidget {
  const _ImageLoadingPlaceholder();

  @override
  Widget build(BuildContext context) {
    return Container(
      color: const Color(0xFFE2E8F0),
      child: const Center(
        child: SizedBox(
          width: 26,
          height: 26,
          child: CircularProgressIndicator(
            strokeWidth: 2.4,
            color: Color(0xFF3B82F6),
          ),
        ),
      ),
    );
  }
}

class _CarouselArrowButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  final bool visible;

  const _CarouselArrowButton({
    required this.icon,
    required this.onTap,
    required this.visible,
  });

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      ignoring: !visible,
      child: AnimatedOpacity(
        duration: const Duration(milliseconds: 180),
        opacity: visible ? 1 : 0,
        child: Material(
          color: Colors.black.withValues(alpha: 0.28),
          shape: const CircleBorder(),
          child: InkWell(
            customBorder: const CircleBorder(),
            onTap: onTap,
            child: SizedBox(
              width: 38,
              height: 38,
              child: Icon(
                icon,
                color: Colors.white,
                size: 18,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _SelectableServiceCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String description;
  final String badge;
  final bool selected;
  final VoidCallback onTap;

  const _SelectableServiceCard({
    required this.icon,
    required this.title,
    required this.description,
    required this.badge,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(22),
          border: Border.all(
            color: selected ? const Color(0xFF93C5FD) : const Color(0xFFE2E8F0),
            width: selected ? 1.5 : 1,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.035),
              blurRadius: 16,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 46,
              height: 46,
              decoration: BoxDecoration(
                color: const Color(0xFFEFF6FF),
                borderRadius: BorderRadius.circular(14),
              ),
              alignment: Alignment.center,
              child: Icon(icon, size: 22, color: const Color(0xFF1D4ED8)),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          title,
                          style: const TextStyle(
                            color: Color(0xFF0F172A),
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                      Container(
                        width: 24,
                        height: 24,
                        decoration: BoxDecoration(
                          color: selected
                              ? const Color(0xFFDBEAFE)
                              : const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(999),
                          border: Border.all(
                            color: selected
                                ? const Color(0xFF60A5FA)
                                : const Color(0xFFE2E8F0),
                          ),
                        ),
                        alignment: Alignment.center,
                        child: Icon(
                          Icons.check,
                          size: 15,
                          color: selected
                              ? const Color(0xFF1D4ED8)
                              : Colors.transparent,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    description,
                    style: const TextStyle(
                      color: Color(0xFF64748B),
                      fontSize: 13,
                      height: 1.4,
                    ),
                  ),
                  if (badge.isNotEmpty) ...<Widget>[
                    const SizedBox(height: 10),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 5,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(0xFFDCFCE7),
                        borderRadius: BorderRadius.circular(999),
                        border: Border.all(
                          color: const Color(0xFF86EFAC),
                        ),
                      ),
                      child: Text(
                        badge,
                        style: const TextStyle(
                          color: Color(0xFF166534),
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
