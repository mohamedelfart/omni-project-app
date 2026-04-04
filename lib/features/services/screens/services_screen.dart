import 'package:flutter/material.dart';

import '../../../core/models/models.dart';
import '../../../shared/widgets/loading_action_button.dart';

class ServicesScreen extends StatefulWidget {
  const ServicesScreen({super.key});

  @override
  State<ServicesScreen> createState() => _ServicesScreenState();
}

class _ServicesScreenState extends State<ServicesScreen> {
  List<PaidService> paidServices = [];
  bool isLoading = true;
  String selectedCategory = 'ALL';
  String? _loadingServiceId;

  @override
  void initState() {
    super.initState();
    _loadPaidServices();
  }

  Future<void> _loadPaidServices() async {
    setState(() => isLoading = true);
    await Future.delayed(const Duration(milliseconds: 900));
    if (!mounted) {
      return;
    }
    setState(() {
      paidServices = _generateMockPaidServices();
      isLoading = false;
    });
  }

  Future<void> _openService(PaidService service) async {
    setState(() => _loadingServiceId = service.id);
    await Future.delayed(const Duration(milliseconds: 850));
    if (!mounted) {
      return;
    }
    setState(() => _loadingServiceId = null);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('${service.name} opened from the global services entry.')),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Services'),
        backgroundColor: const Color(0xFFF8FAFC),
        elevation: 0,
        actions: [
          PopupMenuButton<String>(
            onSelected: (value) => setState(() => selectedCategory = value),
            itemBuilder: (context) => const [
              PopupMenuItem(value: 'ALL', child: Text('All services')),
              PopupMenuItem(value: 'TRANSPORT', child: Text('Transport')),
              PopupMenuItem(value: 'FOOD', child: Text('Food')),
              PopupMenuItem(value: 'DELIVERY', child: Text('Delivery')),
              PopupMenuItem(value: 'SERVICES', child: Text('Services')),
            ],
          ),
        ],
      ),
      body: isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF1E3A5F)))
          : Column(
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                  child: Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: const Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Global services entry',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                            color: Color(0xFF0F172A),
                          ),
                        ),
                        SizedBox(height: 8),
                        Text(
                          'Tenant-facing entry point for partner-powered transport, food, delivery, and other external services.',
                          style: TextStyle(
                            color: Color(0xFF64748B),
                            height: 1.5,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                Expanded(child: _buildServicesGrid()),
              ],
            ),
    );
  }

  Widget _buildServicesGrid() {
    final filteredServices = selectedCategory == 'ALL'
        ? paidServices
        : paidServices
            .where((service) => service.category == selectedCategory)
            .toList();

    return GridView.builder(
      padding: const EdgeInsets.all(16),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
        childAspectRatio: 0.92,
      ),
      itemCount: filteredServices.length,
      itemBuilder: (context, index) {
        final service = filteredServices[index];
        return PaidServiceCard(
          service: service,
          isLoading: _loadingServiceId == service.id,
          onOpen: () => _openService(service),
        );
      },
    );
  }

  List<PaidService> _generateMockPaidServices() {
    return [
      PaidService(
        id: 'SERVICE-001',
        name: 'Uber',
        description: 'Fast transport across the city.',
        category: 'TRANSPORT',
        icon: '🚕',
        color: Colors.black,
        isAvailable: true,
        estimatedTime: '5-15 min',
        rating: 4.5,
        totalUsers: 50000,
        features: ['GPS tracking', 'Card payment', 'Driver ratings'],
      ),
      PaidService(
        id: 'SERVICE-002',
        name: 'Careem',
        description: 'Reliable city and airport rides.',
        category: 'TRANSPORT',
        icon: '🚗',
        color: Colors.green,
        isAvailable: true,
        estimatedTime: '3-10 min',
        rating: 4.3,
        totalUsers: 30000,
        features: ['Premium rides', 'Airport pickup', 'Corporate billing'],
      ),
      PaidService(
        id: 'SERVICE-003',
        name: 'Talabat',
        description: 'Food delivery from local and global brands.',
        category: 'FOOD',
        icon: '🍕',
        color: Colors.orange,
        isAvailable: true,
        estimatedTime: '20-45 min',
        rating: 4.4,
        totalUsers: 80000,
        features: ['Live tracking', 'Promotions', 'Group ordering'],
      ),
      PaidService(
        id: 'SERVICE-004',
        name: 'Deliveroo',
        description: 'Premium dining delivery.',
        category: 'FOOD',
        icon: '🍔',
        color: Colors.teal,
        isAvailable: true,
        estimatedTime: '15-35 min',
        rating: 4.2,
        totalUsers: 25000,
        features: ['Top-rated restaurants', 'Priority delivery', 'Offers'],
      ),
      PaidService(
        id: 'SERVICE-005',
        name: 'Amazon',
        description: 'Parcel and essentials delivery.',
        category: 'DELIVERY',
        icon: '📦',
        color: Colors.blue,
        isAvailable: true,
        estimatedTime: '1-3 days',
        rating: 4.6,
        totalUsers: 100000,
        features: ['Returns', 'Prime shipping', 'Order tracking'],
      ),
      PaidService(
        id: 'SERVICE-006',
        name: 'Noon',
        description: 'Grocery and product delivery.',
        category: 'DELIVERY',
        icon: '🛒',
        color: Colors.pink,
        isAvailable: true,
        estimatedTime: '30-60 min',
        rating: 4.3,
        totalUsers: 45000,
        features: ['Fast delivery', 'Fresh products', 'Tenant offers'],
      ),
      PaidService(
        id: 'SERVICE-007',
        name: 'ToYou',
        description: 'On-demand errands and delivery.',
        category: 'SERVICES',
        icon: '🚚',
        color: Colors.purple,
        isAvailable: true,
        estimatedTime: '1-2 hrs',
        rating: 4.1,
        totalUsers: 15000,
        features: ['Errands', 'Document delivery', 'Flexible pickup'],
      ),
      PaidService(
        id: 'SERVICE-008',
        name: 'Home Support',
        description: 'Partner network for household services.',
        category: 'SERVICES',
        icon: '🏠',
        color: Colors.indigo,
        isAvailable: true,
        estimatedTime: '2-4 hrs',
        rating: 4.4,
        totalUsers: 20000,
        features: ['Cleaning', 'Handyman', 'Appliance checks'],
      ),
    ];
  }
}

class PaidServiceCard extends StatefulWidget {
  final PaidService service;
  final bool isLoading;
  final VoidCallback onOpen;

  const PaidServiceCard({
    super.key,
    required this.service,
    required this.isLoading,
    required this.onOpen,
  });

  @override
  State<PaidServiceCard> createState() => _PaidServiceCardState();
}

class _PaidServiceCardState extends State<PaidServiceCard> {
  bool _isHovered = false;

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      onEnter: (_) => setState(() => _isHovered = true),
      onExit: (_) => setState(() => _isHovered = false),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 300),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
            color: _isHovered ? const Color(0xFFDCEAFB) : const Color(0xFFE2E8F0),
            width: _isHovered ? 2 : 1,
          ),
          boxShadow: _isHovered
              ? [
                  BoxShadow(
                    color: const Color(0x140F172A).withOpacity(0.2),
                    blurRadius: 16,
                    offset: const Offset(0, 8),
                  ),
                ]
              : null,
        ),
        child: InkWell(
          onTap: widget.isLoading ? null : widget.onOpen,
          borderRadius: BorderRadius.circular(18),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  width: 50,
                  height: 50,
                  decoration: BoxDecoration(
                    color: widget.service.color.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Center(
                    child: Text(
                      widget.service.icon,
                      style: const TextStyle(fontSize: 24),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  widget.service.name,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 4),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.star, size: 14, color: Colors.amber),
                    const SizedBox(width: 2),
                    Text(
                      widget.service.rating.toString(),
                      style: const TextStyle(fontSize: 12, color: Colors.grey),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      '${(widget.service.totalUsers / 1000).round()}K',
                      style: const TextStyle(fontSize: 12, color: Colors.grey),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  widget.service.estimatedTime,
                  style: const TextStyle(
                    fontSize: 12,
                    color: Color(0xFF1E3A5F),
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 10),
                LoadingActionButton(
                  label: 'Open',
                  isLoading: widget.isLoading,
                  onPressed: widget.onOpen,
                  backgroundColor: const Color(0xFF1E3A5F),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}