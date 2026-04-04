import 'package:flutter/material.dart';
import '../../../core/models/models.dart';
import '../../../core/utils/localization.dart';

// ============================================================================
// HEALTH SERVICE SCREEN
// ============================================================================

class HealthScreen extends StatefulWidget {
  const HealthScreen({super.key});

  @override
  State<HealthScreen> createState() => _HealthScreenState();
}

class _HealthScreenState extends State<HealthScreen> {
  List<HealthService> healthServices = [];
  bool isLoading = true;
  String selectedCategory = 'ALL';

  @override
  void initState() {
    super.initState();
    _loadHealthServices();
  }

  Future<void> _loadHealthServices() async {
    setState(() => isLoading = true);
    await Future.delayed(const Duration(seconds: 1));
    setState(() {
      healthServices = _generateMockHealthServices();
      isLoading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(AppLocalization.get('health')),
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          PopupMenuButton<String>(
            onSelected: (value) => setState(() => selectedCategory = value),
            itemBuilder: (context) => [
              const PopupMenuItem(value: 'ALL', child: Text('All Services')),
              const PopupMenuItem(value: 'DOCTOR', child: Text('Doctors')),
              const PopupMenuItem(value: 'CLINIC', child: Text('Clinics')),
              const PopupMenuItem(value: 'HOSPITAL', child: Text('Hospitals')),
              const PopupMenuItem(value: 'PHARMACY', child: Text('Pharmacies')),
              const PopupMenuItem(value: 'LAB', child: Text('Labs')),
            ],
          ),
        ],
      ),
      body: isLoading
          ? const Center(child: CircularProgressIndicator())
          : healthServices.isEmpty
          ? _buildEmptyState()
          : _buildHealthServicesList(),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.local_hospital, size: 80, color: Colors.grey),
          const SizedBox(height: 16),
          Text(
            'No health services available',
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 8),
          Text(
            'Check back later for healthcare options',
            style: TextStyle(color: Colors.grey[600]),
          ),
        ],
      ),
    );
  }

  Widget _buildHealthServicesList() {
    final filteredServices = selectedCategory == 'ALL'
        ? healthServices
        : healthServices
              .where((service) => service.category == selectedCategory)
              .toList();

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: filteredServices.length,
      itemBuilder: (context, index) {
        return HealthServiceCard(healthService: filteredServices[index]);
      },
    );
  }

  List<HealthService> _generateMockHealthServices() {
    return [
      HealthService(
        id: 'HEALTH-001',
        name: 'Dr. Sarah Ahmed',
        category: 'DOCTOR',
        specialty: 'Cardiologist',
        rating: 4.9,
        experience: 12,
        consultationFee: 200.0,
        currency: 'AED',
        location: GeoLocation(
          latitude: 25.1972,
          longitude: 55.2744,
          address: 'Dubai Health Care City',
          city: 'Dubai',
          country: 'AE',
        ),
        availableSlots: [
          DateTime.now().add(const Duration(days: 1, hours: 10)),
          DateTime.now().add(const Duration(days: 1, hours: 14)),
          DateTime.now().add(const Duration(days: 2, hours: 11)),
        ],
        image: 'https://i.pravatar.cc/150?u=doctor1',
        isAvailable: true,
        description:
            'Specialist in cardiovascular diseases with 12 years of experience',
        qualifications: [
          'MBBS',
          'MD Cardiology',
          'Fellowship in Interventional Cardiology',
        ],
        languages: ['English', 'Arabic'],
      ),
      HealthService(
        id: 'HEALTH-002',
        name: 'Cleveland Clinic Dubai',
        category: 'HOSPITAL',
        specialty: 'Multi-Specialty Hospital',
        rating: 4.8,
        experience: 5,
        consultationFee: 0.0, // Hospitals don't have consultation fees
        currency: 'AED',
        location: GeoLocation(
          latitude: 25.0867,
          longitude: 55.1408,
          address: 'Jumeirah Beach Residence',
          city: 'Dubai',
          country: 'AE',
        ),
        availableSlots: [], // Hospitals have different booking system
        image:
            'https://images.unsplash.com/photo-1551190822-a9333d879b1f?w=500',
        isAvailable: true,
        description:
            'World-class healthcare facility with state-of-the-art technology',
        qualifications: ['JCI Accredited', 'ISO Certified'],
        languages: ['English', 'Arabic', 'Russian'],
      ),
      HealthService(
        id: 'HEALTH-003',
        name: 'Life Pharmacy',
        category: 'PHARMACY',
        specialty: '24/7 Pharmacy',
        rating: 4.6,
        experience: 8,
        consultationFee: 0.0,
        currency: 'AED',
        location: GeoLocation(
          latitude: 25.2854,
          longitude: 55.3571,
          address: 'Dubai Marina',
          city: 'Dubai',
          country: 'AE',
        ),
        availableSlots: [], // Pharmacies are always open
        image:
            'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500',
        isAvailable: true,
        description: 'Complete healthcare pharmacy with home delivery',
        qualifications: ['Licensed Pharmacy', 'Home Delivery Available'],
        languages: ['English', 'Arabic'],
      ),
      HealthService(
        id: 'HEALTH-004',
        name: 'Dr. Michael Chen',
        category: 'DOCTOR',
        specialty: 'Dermatologist',
        rating: 4.7,
        experience: 8,
        consultationFee: 150.0,
        currency: 'AED',
        location: GeoLocation(
          latitude: 25.1882,
          longitude: 55.2719,
          address: 'Business Bay',
          city: 'Dubai',
          country: 'AE',
        ),
        availableSlots: [
          DateTime.now().add(const Duration(days: 3, hours: 9)),
          DateTime.now().add(const Duration(days: 3, hours: 15)),
          DateTime.now().add(const Duration(days: 4, hours: 10)),
        ],
        image: 'https://i.pravatar.cc/150?u=doctor2',
        isAvailable: true,
        description: 'Expert in skin care and cosmetic dermatology',
        qualifications: [
          'MD Dermatology',
          'Board Certified',
          'Laser Specialist',
        ],
        languages: ['English', 'Mandarin', 'Arabic'],
      ),
      HealthService(
        id: 'HEALTH-005',
        name: 'MedLab Diagnostics',
        category: 'LAB',
        specialty: 'Medical Laboratory',
        rating: 4.5,
        experience: 6,
        consultationFee: 0.0,
        currency: 'AED',
        location: GeoLocation(
          latitude: 25.1972,
          longitude: 55.2744,
          address: 'Al Barsha',
          city: 'Dubai',
          country: 'AE',
        ),
        availableSlots: [
          DateTime.now().add(const Duration(days: 1, hours: 8)),
          DateTime.now().add(const Duration(days: 1, hours: 12)),
          DateTime.now().add(const Duration(days: 2, hours: 9)),
        ],
        image:
            'https://images.unsplash.com/photo-1576086213369-97a306d36557?w=500',
        isAvailable: true,
        description: 'Advanced diagnostic testing with quick results',
        qualifications: ['CAP Accredited', 'ISO 15189 Certified'],
        languages: ['English', 'Arabic'],
      ),
    ];
  }
}

class HealthServiceCard extends StatefulWidget {
  final HealthService healthService;

  const HealthServiceCard({super.key, required this.healthService});

  @override
  State<HealthServiceCard> createState() => _HealthServiceCardState();
}

class _HealthServiceCardState extends State<HealthServiceCard> {
  bool _isHovered = false;

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      onEnter: (_) => setState(() => _isHovered = true),
      onExit: (_) => setState(() => _isHovered = false),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 300),
        margin: const EdgeInsets.only(bottom: 16),
        decoration: BoxDecoration(
          color: const Color(0xFFFFFFFF),
          borderRadius: BorderRadius.circular(15),
          border: Border.all(
            color: _isHovered ? const Color(0xFFDCEAFB) : const Color(0xFFF1F5F9),
            width: _isHovered ? 2 : 1,
          ),
          boxShadow: _isHovered
              ? [
                  BoxShadow(
                    color: const Color(0xFF00E5FF).withValues(alpha: 0.3),
                    blurRadius: 10,
                    spreadRadius: 2,
                  ),
                ]
              : null,
        ),
        child: InkWell(
          onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) =>
                    HealthDetailScreen(healthService: widget.healthService),
              ),
            );
          },
          borderRadius: BorderRadius.circular(15),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                // Profile Image
                CircleAvatar(
                  radius: 35,
                  backgroundImage: widget.healthService.category == 'DOCTOR'
                      ? NetworkImage(widget.healthService.image)
                      : null,
                  backgroundColor: widget.healthService.category != 'DOCTOR'
                      ? Colors.grey[800]
                      : null,
                  child: widget.healthService.category != 'DOCTOR'
                      ? Icon(
                          _getCategoryIcon(widget.healthService.category),
                          color: Colors.white,
                          size: 30,
                        )
                      : null,
                ),
                const SizedBox(width: 16),

                // Service Details
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        widget.healthService.name,
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        widget.healthService.specialty,
                        style: TextStyle(fontSize: 14, color: Colors.grey[400]),
                      ),
                      const SizedBox(height: 8),

                      // Rating and Experience
                      Row(
                        children: [
                          const Icon(Icons.star, color: Colors.amber, size: 16),
                          Text(
                            ' ${widget.healthService.rating}',
                            style: const TextStyle(fontSize: 14),
                          ),
                          if (widget.healthService.category == 'DOCTOR') ...[
                            const SizedBox(width: 12),
                            const Icon(
                              Icons.work,
                              size: 16,
                              color: Colors.grey,
                            ),
                            Text(
                              ' ${widget.healthService.experience}y exp',
                              style: const TextStyle(fontSize: 14),
                            ),
                          ],
                        ],
                      ),

                      const SizedBox(height: 4),

                      // Location
                      Row(
                        children: [
                          const Icon(
                            Icons.location_on,
                            size: 16,
                            color: Colors.grey,
                          ),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              widget.healthService.location.address ??
                                  'Address not available',
                              style: const TextStyle(fontSize: 14),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),

                      // Consultation Fee (only for doctors)
                      if (widget.healthService.category == 'DOCTOR' &&
                          widget.healthService.consultationFee > 0)
                        Padding(
                          padding: const EdgeInsets.only(top: 4),
                          child: Text(
                            'Consultation: ${widget.healthService.currency} ${widget.healthService.consultationFee.toStringAsFixed(0)}',
                            style: const TextStyle(
                              fontSize: 14,
                              color: Color(0xFF00E5FF),
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                    ],
                  ),
                ),

                // Category Badge and Action
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: _getCategoryColor(
                          widget.healthService.category,
                        ).withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        widget.healthService.category,
                        style: TextStyle(
                          color: _getCategoryColor(
                            widget.healthService.category,
                          ),
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: widget.healthService.isAvailable
                            ? Colors.green.withValues(alpha: 0.2)
                            : Colors.red.withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        widget.healthService.isAvailable ? 'Available' : 'Busy',
                        style: TextStyle(
                          color: widget.healthService.isAvailable
                              ? Colors.green
                              : Colors.red,
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  IconData _getCategoryIcon(String category) {
    switch (category) {
      case 'DOCTOR':
        return Icons.person;
      case 'CLINIC':
        return Icons.local_hospital;
      case 'HOSPITAL':
        return Icons.local_hospital;
      case 'PHARMACY':
        return Icons.local_pharmacy;
      case 'LAB':
        return Icons.science;
      default:
        return Icons.health_and_safety;
    }
  }

  Color _getCategoryColor(String category) {
    switch (category) {
      case 'DOCTOR':
        return Colors.blue;
      case 'CLINIC':
        return Colors.green;
      case 'HOSPITAL':
        return Colors.purple;
      case 'PHARMACY':
        return Colors.orange;
      case 'LAB':
        return Colors.teal;
      default:
        return Colors.grey;
    }
  }
}

class HealthDetailScreen extends StatelessWidget {
  final HealthService healthService;

  const HealthDetailScreen({super.key, required this.healthService});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(healthService.name),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header Image
            Container(
              height: 200,
              width: double.infinity,
              decoration: BoxDecoration(
                color: Colors.grey[800],
                image: healthService.category == 'DOCTOR'
                    ? DecorationImage(
                        image: NetworkImage(healthService.image),
                        fit: BoxFit.cover,
                      )
                    : null,
              ),
              child: healthService.category != 'DOCTOR'
                  ? Icon(
                      _getCategoryIcon(healthService.category),
                      size: 80,
                      color: const Color(0xFF6B7280),
                    )
                  : null,
            ),

            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Name and Category
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          healthService.name,
                          style: const TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          color: _getCategoryColor(
                            healthService.category,
                          ).withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          healthService.category,
                          style: TextStyle(
                            color: _getCategoryColor(healthService.category),
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 8),
                  Text(
                    healthService.specialty,
                    style: TextStyle(fontSize: 16, color: Colors.grey[400]),
                  ),

                  const SizedBox(height: 16),

                  // Rating and Stats
                  Row(
                    children: [
                      const Icon(Icons.star, color: Colors.amber),
                      Text(
                        ' ${healthService.rating}',
                        style: const TextStyle(fontSize: 16),
                      ),
                      if (healthService.category == 'DOCTOR') ...[
                        const SizedBox(width: 16),
                        const Icon(Icons.work, color: Colors.grey),
                        Text(
                          ' ${healthService.experience} years experience',
                          style: const TextStyle(fontSize: 16),
                        ),
                      ],
                    ],
                  ),

                  const SizedBox(height: 16),

                  // Location
                  Row(
                    children: [
                      const Icon(Icons.location_on, color: Colors.grey),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          healthService.location.address ??
                              'Address not available',
                          style: const TextStyle(fontSize: 16),
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 16),

                  // Description
                  const Text(
                    'About',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    healthService.description,
                    style: const TextStyle(fontSize: 16, height: 1.5),
                  ),

                  const SizedBox(height: 24),

                  // Qualifications
                  if (healthService.qualifications.isNotEmpty) ...[
                    const Text(
                      'Qualifications',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 12),
                    ...healthService.qualifications.map(
                      (qualification) => Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: Row(
                          children: [
                            const Icon(
                              Icons.check_circle,
                              color: Colors.green,
                              size: 20,
                            ),
                            const SizedBox(width: 8),
                            Text(
                              qualification,
                              style: const TextStyle(fontSize: 16),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],

                  const SizedBox(height: 24),

                  // Languages
                  if (healthService.languages.isNotEmpty) ...[
                    const Text(
                      'Languages',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: healthService.languages
                          .map(
                            (language) => Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 12,
                                vertical: 6,
                              ),
                              decoration: BoxDecoration(
                                color: Colors.blue.withValues(alpha: 0.2),
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: Text(
                                language,
                                style: const TextStyle(color: Colors.blue),
                              ),
                            ),
                          )
                          .toList(),
                    ),
                  ],

                  const SizedBox(height: 32),

                  // Available Slots (for doctors and labs)
                  if (healthService.availableSlots.isNotEmpty) ...[
                    const Text(
                      'Available Appointments',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 12),
                    ...healthService.availableSlots.map(
                      (slot) => Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: ElevatedButton(
                          onPressed: () {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(
                                  'Booking appointment for ${slot.day}/${slot.month} at ${slot.hour}:00',
                                ),
                                backgroundColor: const Color(0xFF00E5FF),
                              ),
                            );
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFFE5E7EB),
                            foregroundColor: Colors.white,
                            minimumSize: const Size(double.infinity, 50),
                          ),
                          child: Text(
                            '${slot.day}/${slot.month}/${slot.year} at ${slot.hour}:00',
                            style: const TextStyle(fontSize: 16),
                          ),
                        ),
                      ),
                    ),
                  ],

                  const SizedBox(height: 24),

                  // Book Appointment Button
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text('Booking ${healthService.name}...'),
                            backgroundColor: const Color(0xFF00E5FF),
                          ),
                        );
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF00E5FF),
                        foregroundColor: Colors.black,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        textStyle: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      child: Text(
                        healthService.category == 'DOCTOR'
                            ? 'Book Consultation - ${healthService.currency} ${healthService.consultationFee.toStringAsFixed(0)}'
                            : 'Contact Now',
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  IconData _getCategoryIcon(String category) {
    switch (category) {
      case 'DOCTOR':
        return Icons.person;
      case 'CLINIC':
        return Icons.local_hospital;
      case 'HOSPITAL':
        return Icons.local_hospital;
      case 'PHARMACY':
        return Icons.local_pharmacy;
      case 'LAB':
        return Icons.science;
      default:
        return Icons.health_and_safety;
    }
  }

  Color _getCategoryColor(String category) {
    switch (category) {
      case 'DOCTOR':
        return Colors.blue;
      case 'CLINIC':
        return Colors.green;
      case 'HOSPITAL':
        return Colors.purple;
      case 'PHARMACY':
        return Colors.orange;
      case 'LAB':
        return Colors.teal;
      default:
        return Colors.grey;
    }
  }
}

