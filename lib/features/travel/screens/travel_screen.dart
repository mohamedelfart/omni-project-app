import 'package:flutter/material.dart';
import '../../../core/models/models.dart';
import '../../../core/utils/localization.dart';

// ============================================================================
// TRAVEL SERVICE SCREEN
// ============================================================================

class TravelScreen extends StatefulWidget {
  const TravelScreen({super.key});

  @override
  State<TravelScreen> createState() => _TravelScreenState();
}

class _TravelScreenState extends State<TravelScreen> {
  List<TravelPackage> travelPackages = [];
  bool isLoading = true;
  String selectedType = 'ALL';

  @override
  void initState() {
    super.initState();
    _loadTravelPackages();
  }

  Future<void> _loadTravelPackages() async {
    setState(() => isLoading = true);
    await Future.delayed(const Duration(seconds: 1));
    setState(() {
      travelPackages = _generateMockTravelPackages();
      isLoading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(AppLocalization.get('travel')),
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          PopupMenuButton<String>(
            onSelected: (value) => setState(() => selectedType = value),
            itemBuilder: (context) => [
              const PopupMenuItem(value: 'ALL', child: Text('All Packages')),
              const PopupMenuItem(value: 'FLIGHT', child: Text('Flights')),
              const PopupMenuItem(value: 'HOTEL', child: Text('Hotels')),
              const PopupMenuItem(value: 'TOUR', child: Text('Tours')),
              const PopupMenuItem(value: 'CRUISE', child: Text('Cruises')),
            ],
          ),
        ],
      ),
      body: isLoading
          ? const Center(child: CircularProgressIndicator())
          : travelPackages.isEmpty
          ? _buildEmptyState()
          : _buildTravelPackagesList(),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.flight, size: 80, color: Colors.grey),
          const SizedBox(height: 16),
          Text(
            'No travel packages available',
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 8),
          Text(
            'Check back later for travel deals',
            style: TextStyle(color: Colors.grey[600]),
          ),
        ],
      ),
    );
  }

  Widget _buildTravelPackagesList() {
    final filteredPackages = selectedType == 'ALL'
        ? travelPackages
        : travelPackages
              .where((package) => package.type == selectedType)
              .toList();

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: filteredPackages.length,
      itemBuilder: (context, index) {
        return TravelPackageCard(travelPackage: filteredPackages[index]);
      },
    );
  }

  List<TravelPackage> _generateMockTravelPackages() {
    return [
      TravelPackage(
        id: 'TRAVEL-001',
        title: 'Dubai Luxury Weekend',
        description: '3 nights at Burj Al Arab with private yacht tour',
        type: 'HOTEL',
        destination: 'Dubai, UAE',
        duration: '3 Days / 2 Nights',
        price: 2500.0,
        currency: 'AED',
        rating: 4.9,
        images: [
          'https://images.unsplash.com/photo-1518684079-3c830dcef090?w=500',
          'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=500',
        ],
        includes: [
          '5-star hotel',
          'Private yacht tour',
          'Airport transfer',
          'Breakfast',
        ],
        departureDate: DateTime.now().add(const Duration(days: 30)),
        returnDate: DateTime.now().add(const Duration(days: 33)),
        availableSeats: 8,
        totalSeats: 10,
        provider: 'Emirates Luxury Travel',
        isAvailable: true,
      ),
      TravelPackage(
        id: 'TRAVEL-002',
        title: 'Paris Romantic Getaway',
        description: 'Romantic 5-day trip to the City of Love',
        type: 'TOUR',
        destination: 'Paris, France',
        duration: '5 Days / 4 Nights',
        price: 850.0,
        currency: 'EUR',
        rating: 4.7,
        images: [
          'https://images.unsplash.com/photo-1502602898536-47ad22581b52?w=500',
          'https://images.unsplash.com/photo-1431274172761-fca41d930114?w=500',
        ],
        includes: [
          '4-star hotel',
          'Eiffel Tower tickets',
          'Seine River cruise',
          'Airport transfer',
        ],
        departureDate: DateTime.now().add(const Duration(days: 45)),
        returnDate: DateTime.now().add(const Duration(days: 50)),
        availableSeats: 15,
        totalSeats: 20,
        provider: 'European Dream Tours',
        isAvailable: true,
      ),
      TravelPackage(
        id: 'TRAVEL-003',
        title: 'Tokyo Business Class',
        description: 'Premium business class flight to Tokyo',
        type: 'FLIGHT',
        destination: 'Tokyo, Japan',
        duration: 'Flight Only',
        price: 3200.0,
        currency: 'USD',
        rating: 4.8,
        images: [
          'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=500',
        ],
        includes: [
          'Business class seat',
          'Premium meals',
          'Lounge access',
          'Extra baggage',
        ],
        departureDate: DateTime.now().add(const Duration(days: 14)),
        returnDate: DateTime.now().add(const Duration(days: 21)),
        availableSeats: 25,
        totalSeats: 30,
        provider: 'Japan Airlines',
        isAvailable: true,
      ),
      TravelPackage(
        id: 'TRAVEL-004',
        title: 'Mediterranean Cruise',
        description: '7-day luxury cruise through Mediterranean',
        type: 'CRUISE',
        destination: 'Mediterranean Sea',
        duration: '7 Days / 6 Nights',
        price: 1800.0,
        currency: 'EUR',
        rating: 4.6,
        images: [
          'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=500',
          'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=500',
        ],
        includes: [
          'Oceanview cabin',
          'All meals',
          'Entertainment',
          'Port excursions',
        ],
        departureDate: DateTime.now().add(const Duration(days: 60)),
        returnDate: DateTime.now().add(const Duration(days: 67)),
        availableSeats: 120,
        totalSeats: 150,
        provider: 'MSC Cruises',
        isAvailable: true,
      ),
    ];
  }
}

class TravelPackageCard extends StatefulWidget {
  final TravelPackage travelPackage;

  const TravelPackageCard({super.key, required this.travelPackage});

  @override
  State<TravelPackageCard> createState() => _TravelPackageCardState();
}

class _TravelPackageCardState extends State<TravelPackageCard> {
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
                    TravelDetailScreen(travelPackage: widget.travelPackage),
              ),
            );
          },
          borderRadius: BorderRadius.circular(15),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Image and Type Badge
                Stack(
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: Image.network(
                        widget.travelPackage.images.first,
                        height: 150,
                        width: double.infinity,
                        fit: BoxFit.cover,
                        errorBuilder: (context, error, stackTrace) {
                          return Container(
                            height: 150,
                            color: Colors.grey[800],
                            child: const Icon(
                              Icons.flight,
                              color: Color(0xFF6B7280),
                              size: 50,
                            ),
                          );
                        },
                      ),
                    ),
                    Positioned(
                      top: 8,
                      right: 8,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: _getTypeColor(
                            widget.travelPackage.type,
                          ).withValues(alpha: 0.9),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          widget.travelPackage.type,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // Title and Rating
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        widget.travelPackage.title,
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    Row(
                      children: [
                        const Icon(Icons.star, color: Colors.amber, size: 16),
                        Text(
                          ' ${widget.travelPackage.rating}',
                          style: const TextStyle(fontSize: 14),
                        ),
                      ],
                    ),
                  ],
                ),

                const SizedBox(height: 4),
                Text(
                  widget.travelPackage.destination,
                  style: TextStyle(fontSize: 14, color: Colors.grey[400]),
                ),

                const SizedBox(height: 8),
                Row(
                  children: [
                    const Icon(
                      Icons.calendar_today,
                      size: 16,
                      color: Colors.grey,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      widget.travelPackage.duration,
                      style: const TextStyle(fontSize: 14),
                    ),
                    const SizedBox(width: 12),
                    const Icon(Icons.group, size: 16, color: Colors.grey),
                    const SizedBox(width: 4),
                    Text(
                      '${widget.travelPackage.availableSeats}/${widget.travelPackage.totalSeats} seats',
                      style: const TextStyle(fontSize: 14),
                    ),
                  ],
                ),

                const SizedBox(height: 8),
                Text(
                  widget.travelPackage.description,
                  style: TextStyle(fontSize: 13, color: Colors.grey[500]),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),

                const SizedBox(height: 12),
                Row(
                  children: [
                    Text(
                      '${widget.travelPackage.currency} ${widget.travelPackage.price.toStringAsFixed(0)}',
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF00E5FF),
                      ),
                    ),
                    const Spacer(),
                    ElevatedButton(
                      onPressed: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text(
                              'Booking ${widget.travelPackage.title}...',
                            ),
                            backgroundColor: const Color(0xFF00E5FF),
                          ),
                        );
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF00E5FF),
                        foregroundColor: Colors.black,
                        padding: const EdgeInsets.symmetric(
                          horizontal: 20,
                          vertical: 8,
                        ),
                      ),
                      child: const Text('Book Now'),
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

  Color _getTypeColor(String type) {
    switch (type) {
      case 'FLIGHT':
        return Colors.blue;
      case 'HOTEL':
        return Colors.green;
      case 'TOUR':
        return Colors.purple;
      case 'CRUISE':
        return Colors.orange;
      default:
        return Colors.grey;
    }
  }
}

class TravelDetailScreen extends StatelessWidget {
  final TravelPackage travelPackage;

  const TravelDetailScreen({super.key, required this.travelPackage});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(travelPackage.title),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Image Carousel
            SizedBox(
              height: 250,
              child: PageView.builder(
                itemCount: travelPackage.images.length,
                itemBuilder: (context, index) {
                  return Image.network(
                    travelPackage.images[index],
                    fit: BoxFit.cover,
                    errorBuilder: (context, error, stackTrace) {
                      return Container(
                        color: Colors.grey[800],
                        child: const Icon(
                          Icons.flight,
                          size: 80,
                          color: Color(0xFF6B7280),
                        ),
                      );
                    },
                  );
                },
              ),
            ),

            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Title and Rating
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          travelPackage.title,
                          style: const TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.amber.withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Row(
                          children: [
                            const Icon(
                              Icons.star,
                              color: Colors.amber,
                              size: 16,
                            ),
                            Text(
                              ' ${travelPackage.rating}',
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 8),
                  Text(
                    travelPackage.destination,
                    style: TextStyle(fontSize: 16, color: Colors.grey[400]),
                  ),

                  const SizedBox(height: 16),

                  // Package Details
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFFFFF),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFE5E7EB)),
                    ),
                    child: Column(
                      children: [
                        _buildDetailRow(
                          Icons.calendar_today,
                          'Duration',
                          travelPackage.duration,
                        ),
                        const SizedBox(height: 8),
                        _buildDetailRow(
                          Icons.flight_takeoff,
                          'Departure',
                          '${travelPackage.departureDate.day}/${travelPackage.departureDate.month}/${travelPackage.departureDate.year}',
                        ),
                        const SizedBox(height: 8),
                        _buildDetailRow(
                          Icons.flight_land,
                          'Return',
                          '${travelPackage.returnDate.day}/${travelPackage.returnDate.month}/${travelPackage.returnDate.year}',
                        ),
                        const SizedBox(height: 8),
                        _buildDetailRow(
                          Icons.group,
                          'Available Seats',
                          '${travelPackage.availableSeats}/${travelPackage.totalSeats}',
                        ),
                        const SizedBox(height: 8),
                        _buildDetailRow(
                          Icons.business,
                          'Provider',
                          travelPackage.provider,
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 24),

                  // What's Included
                  const Text(
                    "What's Included",
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 12),
                  ...travelPackage.includes.map(
                    (item) => Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Row(
                        children: [
                          const Icon(
                            Icons.check_circle,
                            color: Colors.green,
                            size: 20,
                          ),
                          const SizedBox(width: 8),
                          Text(item, style: const TextStyle(fontSize: 16)),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(height: 24),

                  // Description
                  const Text(
                    'Description',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    travelPackage.description,
                    style: const TextStyle(fontSize: 16, height: 1.5),
                  ),

                  const SizedBox(height: 32),

                  // Book Now Button
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text('Booking ${travelPackage.title}...'),
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
                        'Book Now - ${travelPackage.currency} ${travelPackage.price.toStringAsFixed(0)}',
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

  Widget _buildDetailRow(IconData icon, String label, String value) {
    return Row(
      children: [
        Icon(icon, size: 20, color: Colors.grey[400]),
        const SizedBox(width: 8),
        Text(
          '$label:',
          style: TextStyle(
            fontSize: 14,
            color: Colors.grey[400],
            fontWeight: FontWeight.w500,
          ),
        ),
        const SizedBox(width: 8),
        Expanded(child: Text(value, style: const TextStyle(fontSize: 14))),
      ],
    );
  }
}

