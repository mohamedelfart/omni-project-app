import 'package:flutter/material.dart';

class LuxuryPropertyBookingShowcase extends StatefulWidget {
  const LuxuryPropertyBookingShowcase({super.key});

  @override
  State<LuxuryPropertyBookingShowcase> createState() =>
      _LuxuryPropertyBookingShowcaseState();
}

class _LuxuryPropertyBookingShowcaseState
    extends State<LuxuryPropertyBookingShowcase> {
  final PageController _pageController = PageController();
  int _activePage = 0;

  DateTime _selectedDate = DateTime(2026, 4, 17);
  String _selectedTime = '11:00 AM';
  final Set<String> _selectedServices = <String>{
    'Free Furniture Moving',
    'Free Deep Cleaning',
  };

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0xFFEAF4FF), Color(0xFFF7FBFF), Colors.white],
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 6),
                child: Row(
                  children: [
                    _RoundIconButton(
                      icon: Icons.arrow_back,
                      onPressed: () => Navigator.pop(context),
                    ),
                    const SizedBox(width: 12),
                    const Expanded(
                      child: Text(
                        'Luxury Booking Journey',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF103B73),
                        ),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(0xFF0F5BC2),
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Text(
                        '${_activePage + 1}/5',
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: PageView(
                  controller: _pageController,
                  onPageChanged: (index) => setState(() => _activePage = index),
                  children: [
                    _buildExplorePage(),
                    _buildDetailsPage(),
                    _buildViewingPage(),
                    _buildServicesPage(),
                    _buildPaymentPage(),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 10),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: List.generate(5, (index) {
                    final bool active = _activePage == index;
                    return AnimatedContainer(
                      duration: const Duration(milliseconds: 180),
                      width: active ? 26 : 8,
                      height: 8,
                      margin: const EdgeInsets.symmetric(horizontal: 3),
                      decoration: BoxDecoration(
                        color: active
                            ? const Color(0xFF0F5BC2)
                            : const Color(0xFFBDD7F7),
                        borderRadius: BorderRadius.circular(999),
                      ),
                    );
                  }),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
                child: ElevatedButton(
                  onPressed: _activePage == 4
                      ? () => ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Payment flow demo completed.'),
                            ),
                          )
                      : () => _pageController.nextPage(
                            duration: const Duration(milliseconds: 260),
                            curve: Curves.easeOut,
                          ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF0F5BC2),
                    foregroundColor: Colors.white,
                    minimumSize: const Size(double.infinity, 56),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(18),
                    ),
                    elevation: 0,
                  ),
                  child: Text(
                    _activePage == 4 ? 'Finish Demo' : 'Continue',
                    style: const TextStyle(
                      fontSize: 16,
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
  }

  Widget _buildExplorePage() {
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 10, 20, 6),
      children: [
        const _PageHeading(
          title: '1. Search & Explore',
          subtitle: 'Find premium homes in West Bay with quick smart filters.',
        ),
        const SizedBox(height: 14),
        _CardShell(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              TextField(
                readOnly: true,
                decoration: InputDecoration(
                  hintText: 'Search luxury properties...',
                  prefixIcon: const Icon(Icons.search),
                  suffixIcon: IconButton(
                    onPressed: () {},
                    icon: const Icon(Icons.tune),
                  ),
                  filled: true,
                  fillColor: const Color(0xFFF5F9FF),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: const BorderSide(color: Color(0xFFD9E8FA)),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: const BorderSide(color: Color(0xFFD9E8FA)),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                children: const [
                  _FilterChip(label: 'Apartments'),
                  _FilterChip(label: '2 Bedrooms'),
                  _FilterChip(label: 'West Bay'),
                ],
              ),
              const SizedBox(height: 16),
              _PropertyVisualCard(
                title: 'Skyline Pearl Residence',
                meta: '120 sqm • 2 Bedrooms • 2 Baths',
                price: 'QAR 6,800 / month',
              ),
              const SizedBox(height: 12),
              Container(
                height: 108,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(16),
                  gradient: const LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [Color(0xFFCDE3FD), Color(0xFFA8CCF7)],
                  ),
                ),
                child: Stack(
                  children: [
                    Positioned.fill(
                      child: Opacity(
                        opacity: 0.5,
                        child: CustomPaint(painter: _MiniMapPainter()),
                      ),
                    ),
                    const Positioned(
                      left: 14,
                      bottom: 14,
                      child: Row(
                        children: [
                          Icon(Icons.place, color: Color(0xFF0F5BC2)),
                          SizedBox(width: 4),
                          Text(
                            'West Bay, Doha',
                            style: TextStyle(
                              color: Color(0xFF0D3C7A),
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () {},
                      icon: const Icon(Icons.call_outlined),
                      label: const Text('Call Agent'),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () {},
                      icon: const Icon(Icons.chat_bubble_outline),
                      label: const Text('Message'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF0F5BC2),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildDetailsPage() {
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 10, 20, 6),
      children: [
        const _PageHeading(
          title: '2. Property Details',
          subtitle: 'Clear details with visual trust signals and one primary action.',
        ),
        const SizedBox(height: 14),
        _CardShell(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const _PropertyVisualCard(
                title: 'Luxury Apartment',
                meta: 'Al Nuaimi Tower • 3rd Floor',
                price: 'QAR 6,800 / month',
              ),
              const SizedBox(height: 16),
              const Text(
                'Highlights',
                style: TextStyle(
                  fontWeight: FontWeight.w800,
                  fontSize: 16,
                  color: Color(0xFF0D366A),
                ),
              ),
              const SizedBox(height: 10),
              const Row(
                children: [
                  Expanded(
                    child: _FeatureTile(
                      icon: Icons.receipt_long_outlined,
                      title: 'Bills Included',
                    ),
                  ),
                  SizedBox(width: 10),
                  Expanded(
                    child: _FeatureTile(
                      icon: Icons.local_parking_outlined,
                      title: 'Parking Available',
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFF2F8FF),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.verified_user, color: Color(0xFF0F5BC2)),
                    SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Verified listing with premium service support.',
                        style: TextStyle(color: Color(0xFF305A8D)),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 18),
              ElevatedButton(
                onPressed: () => _pageController.animateToPage(
                  2,
                  duration: const Duration(milliseconds: 250),
                  curve: Curves.easeOut,
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF0F5BC2),
                  minimumSize: const Size(double.infinity, 54),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                ),
                child: const Text(
                  'Book Viewing',
                  style: TextStyle(fontWeight: FontWeight.w700),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildViewingPage() {
    final List<String> times = ['10:00 AM', '11:00 AM', '12:30 PM', '05:00 PM'];
    final List<DateTime> dates = List.generate(
      5,
      (index) => DateTime(2026, 4, 16 + index),
    );

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 10, 20, 6),
      children: [
        const _PageHeading(
          title: '3. Book Viewing',
          subtitle: 'Schedule selection is simple, fast, and confidence-oriented.',
        ),
        const SizedBox(height: 14),
        _CardShell(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Choose Date',
                style: TextStyle(
                  fontWeight: FontWeight.w800,
                  fontSize: 16,
                  color: Color(0xFF0D366A),
                ),
              ),
              const SizedBox(height: 10),
              SizedBox(
                height: 82,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemBuilder: (_, index) {
                    final date = dates[index];
                    final selected = _selectedDate == date;
                    return GestureDetector(
                      onTap: () => setState(() => _selectedDate = date),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 160),
                        width: 74,
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        decoration: BoxDecoration(
                          color: selected
                              ? const Color(0xFF0F5BC2)
                              : const Color(0xFFF4F8FF),
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              _weekdayLabel(date.weekday),
                              style: TextStyle(
                                color: selected
                                    ? Colors.white
                                    : const Color(0xFF5D7FA8),
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              '${date.day} Apr',
                              style: TextStyle(
                                color: selected
                                    ? Colors.white
                                    : const Color(0xFF103B73),
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                  separatorBuilder: (_, _) => const SizedBox(width: 8),
                  itemCount: dates.length,
                ),
              ),
              const SizedBox(height: 18),
              const Text(
                'Choose Time',
                style: TextStyle(
                  fontWeight: FontWeight.w800,
                  fontSize: 16,
                  color: Color(0xFF0D366A),
                ),
              ),
              const SizedBox(height: 10),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: times.map((time) {
                  final selected = _selectedTime == time;
                  return ChoiceChip(
                    label: Text(time),
                    selected: selected,
                    onSelected: (_) => setState(() => _selectedTime = time),
                    selectedColor: const Color(0xFF0F5BC2),
                    backgroundColor: const Color(0xFFF4F8FF),
                    labelStyle: TextStyle(
                      color: selected ? Colors.white : const Color(0xFF275A94),
                      fontWeight: FontWeight.w600,
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                      side: BorderSide.none,
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: 18),
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: const Color(0xFFF3F9FF),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFFCFE2F8)),
                ),
                child: Text(
                  'Selected: ${_weekdayLabel(_selectedDate.weekday)}, ${_selectedDate.day} April at $_selectedTime',
                  style: const TextStyle(
                    color: Color(0xFF124785),
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              const SizedBox(height: 14),
              ElevatedButton(
                onPressed: () => _pageController.animateToPage(
                  3,
                  duration: const Duration(milliseconds: 250),
                  curve: Curves.easeOut,
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF0F5BC2),
                  minimumSize: const Size(double.infinity, 54),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                ),
                child: const Text('Confirm Viewing Slot'),
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  TextButton.icon(
                    onPressed: () {},
                    icon: const Icon(Icons.chat_outlined),
                    label: const Text('Chat Client'),
                  ),
                  TextButton.icon(
                    onPressed: () {},
                    icon: const Icon(Icons.call_outlined),
                    label: const Text('Call'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildServicesPage() {
    final List<_MoveInService> services = const [
      _MoveInService(
        title: 'Free Furniture Moving',
        value: 'Worth QAR 400',
        icon: Icons.local_shipping_outlined,
      ),
      _MoveInService(
        title: 'Free Deep Cleaning',
        value: 'Worth QAR 250',
        icon: Icons.cleaning_services_outlined,
      ),
      _MoveInService(
        title: 'Free AC & Furniture Setup',
        value: 'Worth QAR 150',
        icon: Icons.handyman_outlined,
      ),
    ];

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 10, 20, 6),
      children: [
        const _PageHeading(
          title: '4. Move-In Services',
          subtitle: 'Free service bundle creates clear value and conversion boost.',
        ),
        const SizedBox(height: 14),
        _CardShell(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              ...services.map((service) {
                final selected = _selectedServices.contains(service.title);
                return Container(
                  margin: const EdgeInsets.only(bottom: 10),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(14),
                    onTap: () {
                      setState(() {
                        if (selected) {
                          _selectedServices.remove(service.title);
                        } else {
                          _selectedServices.add(service.title);
                        }
                      });
                    },
                    child: Ink(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: selected
                            ? const Color(0xFFE8F2FF)
                            : const Color(0xFFF8FBFF),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(
                          color: selected
                              ? const Color(0xFF0F5BC2)
                              : const Color(0xFFD9E8FA),
                        ),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 40,
                            height: 40,
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Icon(service.icon, color: const Color(0xFF0F5BC2)),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  service.title,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w700,
                                    color: Color(0xFF103B73),
                                  ),
                                ),
                                const SizedBox(height: 3),
                                Text(
                                  service.value,
                                  style: const TextStyle(
                                    color: Color(0xFF2E649F),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Checkbox(
                            value: selected,
                            activeColor: const Color(0xFF0F5BC2),
                            onChanged: (_) {
                              setState(() {
                                if (selected) {
                                  _selectedServices.remove(service.title);
                                } else {
                                  _selectedServices.add(service.title);
                                }
                              });
                            },
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              }),
              const SizedBox(height: 6),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF0E58BC), Color(0xFF2B87E7)],
                  ),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.redeem, color: Colors.white),
                    const SizedBox(width: 8),
                    Text(
                      'Selected ${_selectedServices.length} free services',
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildPaymentPage() {
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 10, 20, 6),
      children: [
        const _PageHeading(
          title: '5. Payment & Confirmation',
          subtitle: 'Simple secure deposit with transparent guarantee.',
        ),
        const SizedBox(height: 14),
        _CardShell(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [Color(0xFF0F5BC2), Color(0xFF1B7CE4)],
                  ),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: const Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Deposit Required',
                      style: TextStyle(color: Colors.white70),
                    ),
                    SizedBox(height: 6),
                    Text(
                      'QAR 500',
                      style: TextStyle(
                        fontSize: 32,
                        fontWeight: FontWeight.w800,
                        color: Colors.white,
                      ),
                    ),
                    SizedBox(height: 4),
                    Text(
                      'Reserve the unit and activate free move-in services.',
                      style: TextStyle(color: Colors.white),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),
              const _GuaranteeRow(
                icon: Icons.shield_outlined,
                title: '100% Refundable within 24 hours',
              ),
              const _GuaranteeRow(
                icon: Icons.lock_outline,
                title: 'Payment is secured and compliant',
              ),
              const _GuaranteeRow(
                icon: Icons.receipt_long_outlined,
                title: 'Instant digital confirmation invoice',
              ),
              const SizedBox(height: 18),
              ElevatedButton(
                onPressed: () {
                  showDialog<void>(
                    context: context,
                    builder: (dialogContext) => AlertDialog(
                      title: const Text('Payment Confirmed'),
                      content: const Text(
                        'Your viewing reservation is active. The deposit remains fully refundable for 24 hours.',
                      ),
                      actions: [
                        TextButton(
                          onPressed: () => Navigator.pop(dialogContext),
                          child: const Text('Done'),
                        ),
                      ],
                    ),
                  );
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF0F5BC2),
                  foregroundColor: Colors.white,
                  minimumSize: const Size(double.infinity, 56),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                ),
                child: const Text(
                  'Pay QAR 500',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              const SizedBox(height: 8),
              const Center(
                child: Text(
                  'Powered by secured payment gateway',
                  style: TextStyle(
                    color: Color(0xFF6B85A5),
                    fontSize: 12,
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  String _weekdayLabel(int weekday) {
    switch (weekday) {
      case DateTime.monday:
        return 'Mon';
      case DateTime.tuesday:
        return 'Tue';
      case DateTime.wednesday:
        return 'Wed';
      case DateTime.thursday:
        return 'Thu';
      case DateTime.friday:
        return 'Fri';
      case DateTime.saturday:
        return 'Sat';
      default:
        return 'Sun';
    }
  }
}

class _CardShell extends StatelessWidget {
  final Widget child;

  const _CardShell({required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: const Color(0xFFDDEBFB)),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF0B4D99).withValues(alpha: 0.06),
            blurRadius: 18,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: child,
    );
  }
}

class _PageHeading extends StatelessWidget {
  final String title;
  final String subtitle;

  const _PageHeading({required this.title, required this.subtitle});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.w800,
            color: Color(0xFF0D366A),
          ),
        ),
        const SizedBox(height: 4),
        Text(
          subtitle,
          style: const TextStyle(
            color: Color(0xFF4D7198),
            height: 1.4,
          ),
        ),
      ],
    );
  }
}

class _RoundIconButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback onPressed;

  const _RoundIconButton({required this.icon, required this.onPressed});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 40,
      height: 40,
      child: Material(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: onPressed,
          child: Icon(icon, size: 18, color: const Color(0xFF103B73)),
        ),
      ),
    );
  }
}

class _PropertyVisualCard extends StatelessWidget {
  final String title;
  final String meta;
  final String price;

  const _PropertyVisualCard({
    required this.title,
    required this.meta,
    required this.price,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 190,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(18),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF144F9D), Color(0xFF2E8AEB)],
        ),
      ),
      child: Stack(
        children: [
          Positioned.fill(
            child: Opacity(
              opacity: 0.18,
              child: CustomPaint(painter: _WavePainter()),
            ),
          ),
          Positioned(
            top: 14,
            left: 14,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(999),
              ),
              child: const Text(
                'Luxury',
                style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
              ),
            ),
          ),
          Positioned(
            left: 14,
            right: 14,
            bottom: 14,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 19,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  meta,
                  style: const TextStyle(color: Colors.white70),
                ),
                const SizedBox(height: 8),
                Text(
                  price,
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w700,
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

class _FilterChip extends StatelessWidget {
  final String label;

  const _FilterChip({required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: const Color(0xFFEFF6FF),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: const Color(0xFFD2E6FD)),
      ),
      child: Text(
        label,
        style: const TextStyle(
          color: Color(0xFF275A94),
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

class _FeatureTile extends StatelessWidget {
  final IconData icon;
  final String title;

  const _FeatureTile({required this.icon, required this.title});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFF6FAFF),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFD7E8FB)),
      ),
      child: Row(
        children: [
          Icon(icon, color: const Color(0xFF0F5BC2), size: 20),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              title,
              style: const TextStyle(
                color: Color(0xFF124785),
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _GuaranteeRow extends StatelessWidget {
  final IconData icon;
  final String title;

  const _GuaranteeRow({required this.icon, required this.title});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        children: [
          Icon(icon, color: const Color(0xFF0F5BC2), size: 20),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              title,
              style: const TextStyle(
                color: Color(0xFF214D7E),
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _MoveInService {
  final String title;
  final String value;
  final IconData icon;

  const _MoveInService({
    required this.title,
    required this.value,
    required this.icon,
  });
}

class _WavePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.white
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.6;

    final path1 = Path()
      ..moveTo(0, size.height * 0.72)
      ..quadraticBezierTo(
        size.width * 0.25,
        size.height * 0.58,
        size.width * 0.5,
        size.height * 0.72,
      )
      ..quadraticBezierTo(
        size.width * 0.75,
        size.height * 0.86,
        size.width,
        size.height * 0.72,
      );

    final path2 = Path()
      ..moveTo(0, size.height * 0.4)
      ..quadraticBezierTo(
        size.width * 0.22,
        size.height * 0.24,
        size.width * 0.5,
        size.height * 0.38,
      )
      ..quadraticBezierTo(
        size.width * 0.78,
        size.height * 0.52,
        size.width,
        size.height * 0.36,
      );

    canvas.drawPath(path1, paint);
    canvas.drawPath(path2, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class _MiniMapPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final linePaint = Paint()
      ..color = const Color(0xFF80AAD9)
      ..strokeWidth = 1;

    for (double x = 16; x < size.width; x += 28) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), linePaint);
    }
    for (double y = 12; y < size.height; y += 20) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), linePaint);
    }

    final markerPaint = Paint()..color = const Color(0xFF0F5BC2);
    canvas.drawCircle(Offset(size.width * 0.7, size.height * 0.45), 7, markerPaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}