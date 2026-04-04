import 'package:flutter/material.dart';

import '../../../core/models/models.dart';
import '../../../shared/widgets/loading_action_button.dart';

class HotelServicesScreen extends StatefulWidget {
  const HotelServicesScreen({super.key});

  @override
  State<HotelServicesScreen> createState() => _HotelServicesScreenState();
}

class _HotelServicesScreenState extends State<HotelServicesScreen> {
  List<HotelService> hotelServices = [];
  bool isLoading = true;
  String? _loadingServiceId;

  @override
  void initState() {
    super.initState();
    _loadHotelServices();
  }

  Future<void> _loadHotelServices() async {
    setState(() => isLoading = true);
    await Future.delayed(const Duration(milliseconds: 900));
    if (!mounted) {
      return;
    }
    setState(() {
      hotelServices = _generateMockHotelServices();
      isLoading = false;
    });
  }

  Future<void> _requestService(HotelService service) async {
    setState(() => _loadingServiceId = service.id);
    await Future.delayed(const Duration(milliseconds: 900));
    if (!mounted) {
      return;
    }
    setState(() => _loadingServiceId = null);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('${service.title} request submitted.')),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Free Services'),
        backgroundColor: const Color(0xFFF8FAFC),
        elevation: 0,
      ),
      body: isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF1E3A5F)))
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Container(
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
                        'Tenant free services',
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF0F172A),
                        ),
                      ),
                      SizedBox(height: 8),
                      Text(
                        'Moving, cleaning, maintenance, and airport transport are available after property confirmation.',
                        style: TextStyle(
                          color: Color(0xFF64748B),
                          height: 1.5,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                ...hotelServices.map(
                  (service) => HotelServiceCard(
                    service: service,
                    isLoading: _loadingServiceId == service.id,
                    onRequest: () => _requestService(service),
                  ),
                ),
              ],
            ),
    );
  }

  List<HotelService> _generateMockHotelServices() {
    return [
      HotelService(
        id: 'FREE-001',
        title: 'Moving',
        description: 'Move-in support with a free allowance up to 500 QAR.',
        type: 'FURNITURE_MOVING',
        isFree: true,
        maxFreeAmount: 500,
        currency: 'QAR',
        estimatedTime: 'Same week',
        available24_7: true,
        frequency: 'One move-in request',
        icon: '🚚',
        status: 'AVAILABLE',
      ),
      HotelService(
        id: 'FREE-002',
        title: 'Cleaning',
        description: 'Move-in and refresh cleaning support for tenant-ready units.',
        type: 'CLEANING',
        isFree: true,
        currency: 'QAR',
        estimatedTime: '24 hours',
        available24_7: false,
        workingHours: '08:00 - 20:00',
        frequency: 'Scheduled request',
        icon: '🧼',
        status: 'AVAILABLE',
      ),
      HotelService(
        id: 'FREE-003',
        title: 'Maintenance',
        description: 'General electrical, plumbing, and AC maintenance handling.',
        type: 'MAINTENANCE',
        isFree: true,
        currency: 'QAR',
        estimatedTime: '4 hours',
        available24_7: true,
        frequency: 'On demand',
        icon: '🛠',
        status: 'AVAILABLE',
      ),
      HotelService(
        id: 'FREE-004',
        title: 'Airport transport',
        description: 'Pickup and drop-off coordination for arrival and departure.',
        type: 'AIRPORT_TRANSFER',
        isFree: true,
        currency: 'QAR',
        estimatedTime: 'Booked slot',
        available24_7: true,
        frequency: 'Per trip',
        icon: '✈',
        status: 'AVAILABLE',
      ),
    ];
  }
}

class HotelServiceCard extends StatelessWidget {
  final HotelService service;
  final VoidCallback onRequest;
  final bool isLoading;

  const HotelServiceCard({
    super.key,
    required this.service,
    required this.onRequest,
    required this.isLoading,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(service.icon, style: const TextStyle(fontSize: 28)),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      service.title,
                      style: const TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF0F172A),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      service.description,
                      style: const TextStyle(
                        color: Color(0xFF64748B),
                        height: 1.4,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              _MetaChip(label: service.estimatedTime),
              if (service.maxFreeAmount != null)
                _MetaChip(label: 'Limit ${service.maxFreeAmount!.toStringAsFixed(0)} ${service.currency}'),
              if (service.frequency != null) _MetaChip(label: service.frequency!),
            ],
          ),
          const SizedBox(height: 16),
          LoadingActionButton(
            label: 'Request service',
            isLoading: isLoading,
            onPressed: onRequest,
            icon: Icons.arrow_forward,
            backgroundColor: const Color(0xFF1E3A5F),
          ),
        ],
      ),
    );
  }
}

class _MetaChip extends StatelessWidget {
  final String label;

  const _MetaChip({required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: const TextStyle(
          fontSize: 12,
          color: Color(0xFF475569),
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}