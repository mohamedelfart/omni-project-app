import 'package:flutter/material.dart';
import '../../../core/models/models.dart';
import '../../../core/utils/localization.dart';

// ============================================================================
// RIDES SERVICE SCREEN
// ============================================================================

class RidesScreen extends StatefulWidget {
  const RidesScreen({super.key});

  @override
  State<RidesScreen> createState() => _RidesScreenState();
}

class _RidesScreenState extends State<RidesScreen> {
  List<Ride> rides = [];
  bool isLoading = true;
  String selectedType = 'ALL';

  @override
  void initState() {
    super.initState();
    _loadRides();
  }

  Future<void> _loadRides() async {
    setState(() => isLoading = true);
    await Future.delayed(const Duration(seconds: 1));
    setState(() {
      rides = _generateMockRides();
      isLoading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(AppLocalization.get('rides')),
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          PopupMenuButton<String>(
            onSelected: (value) => setState(() => selectedType = value),
            itemBuilder: (context) => [
              const PopupMenuItem(value: 'ALL', child: Text('All Rides')),
              const PopupMenuItem(value: 'ECONOMY', child: Text('Economy')),
              const PopupMenuItem(value: 'PREMIUM', child: Text('Premium')),
              const PopupMenuItem(value: 'LUXURY', child: Text('Luxury')),
            ],
          ),
        ],
      ),
      body: isLoading
          ? const Center(child: CircularProgressIndicator())
          : rides.isEmpty
          ? _buildEmptyState()
          : _buildRidesList(),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.directions_car, size: 80, color: Colors.grey),
          const SizedBox(height: 16),
          Text(
            'No rides available',
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 8),
          Text(
            'Check back later for available rides',
            style: TextStyle(color: Colors.grey[600]),
          ),
        ],
      ),
    );
  }

  Widget _buildRidesList() {
    final filteredRides = selectedType == 'ALL'
        ? rides
        : rides.where((ride) => ride.vehicleType == selectedType).toList();

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: filteredRides.length,
      itemBuilder: (context, index) {
        return RideCard(ride: filteredRides[index]);
      },
    );
  }

  List<Ride> _generateMockRides() {
    return [
      Ride(
        id: 'RIDE-001',
        driverName: 'Ahmed Hassan',
        driverRating: 4.8,
        vehicleType: 'ECONOMY',
        vehicleModel: 'Toyota Corolla',
        licensePlate: 'ABC 123',
        currentLocation: GeoLocation(
          latitude: 25.2854,
          longitude: 55.3571,
          address: 'Dubai Marina',
          city: 'Dubai',
          country: 'AE',
        ),
        estimatedArrival: DateTime.now().add(const Duration(minutes: 5)),
        pricePerKm: 2.5,
        baseFare: 15.0,
        isAvailable: true,
        driverImage: 'https://i.pravatar.cc/150?u=driver1',
      ),
      Ride(
        id: 'RIDE-002',
        driverName: 'Fatima Al-Zahra',
        driverRating: 4.9,
        vehicleType: 'PREMIUM',
        vehicleModel: 'BMW X5',
        licensePlate: 'XYZ 789',
        currentLocation: GeoLocation(
          latitude: 25.1972,
          longitude: 55.2744,
          address: 'Downtown Dubai',
          city: 'Dubai',
          country: 'AE',
        ),
        estimatedArrival: DateTime.now().add(const Duration(minutes: 8)),
        pricePerKm: 4.0,
        baseFare: 25.0,
        isAvailable: true,
        driverImage: 'https://i.pravatar.cc/150?u=driver2',
      ),
      Ride(
        id: 'RIDE-003',
        driverName: 'Omar Khalid',
        driverRating: 4.7,
        vehicleType: 'LUXURY',
        vehicleModel: 'Mercedes S-Class',
        licensePlate: 'VIP 001',
        currentLocation: GeoLocation(
          latitude: 25.0867,
          longitude: 55.1408,
          address: 'Palm Jumeirah',
          city: 'Dubai',
          country: 'AE',
        ),
        estimatedArrival: DateTime.now().add(const Duration(minutes: 12)),
        pricePerKm: 8.0,
        baseFare: 50.0,
        isAvailable: true,
        driverImage: 'https://i.pravatar.cc/150?u=driver3',
      ),
    ];
  }
}

class RideCard extends StatefulWidget {
  final Ride ride;

  const RideCard({super.key, required this.ride});

  @override
  State<RideCard> createState() => _RideCardState();
}

class _RideCardState extends State<RideCard> {
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
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  CircleAvatar(
                    radius: 30,
                    backgroundImage: NetworkImage(widget.ride.driverImage),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          widget.ride.driverName,
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Row(
                          children: [
                            const Icon(
                              Icons.star,
                              color: Colors.amber,
                              size: 16,
                            ),
                            Text(
                              ' ${widget.ride.driverRating}',
                              style: const TextStyle(fontSize: 14),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              widget.ride.vehicleModel,
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.grey[400],
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: _getTypeColor(
                        widget.ride.vehicleType,
                      ).withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      widget.ride.vehicleType,
                      style: TextStyle(
                        color: _getTypeColor(widget.ride.vehicleType),
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  const Icon(Icons.location_on, size: 16, color: Colors.grey),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text(
                      widget.ride.currentLocation.address ??
                          'Location not available',
                      style: const TextStyle(fontSize: 14),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  const Icon(Icons.access_time, size: 16, color: Colors.grey),
                  const SizedBox(width: 4),
                  Text(
                    '${widget.ride.estimatedArrival.difference(DateTime.now()).inMinutes} min away',
                    style: const TextStyle(fontSize: 14),
                  ),
                  const Spacer(),
                  Text(
                    'AED ${widget.ride.baseFare.toStringAsFixed(0)} base',
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF00E5FF),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('Booking ${widget.ride.driverName}...'),
                        backgroundColor: const Color(0xFF00E5FF),
                      ),
                    );
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF00E5FF),
                    foregroundColor: Colors.black,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                  child: const Text(
                    'Book Ride',
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Color _getTypeColor(String type) {
    switch (type) {
      case 'ECONOMY':
        return Colors.green;
      case 'PREMIUM':
        return Colors.blue;
      case 'LUXURY':
        return Colors.purple;
      default:
        return Colors.grey;
    }
  }
}

