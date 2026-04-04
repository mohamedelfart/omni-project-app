import 'package:flutter/material.dart';
import '../../../core/models/models.dart';
import '../../../core/utils/localization.dart';

// ============================================================================
// DELIVERY SERVICE SCREEN
// ============================================================================

class DeliveryScreen extends StatefulWidget {
  const DeliveryScreen({super.key});

  @override
  State<DeliveryScreen> createState() => _DeliveryScreenState();
}

class _DeliveryScreenState extends State<DeliveryScreen> {
  List<DeliveryOrder> deliveryOrders = [];
  bool isLoading = true;
  String selectedType = 'ALL';

  @override
  void initState() {
    super.initState();
    _loadDeliveryOrders();
  }

  Future<void> _loadDeliveryOrders() async {
    setState(() => isLoading = true);
    await Future.delayed(const Duration(seconds: 1));
    setState(() {
      deliveryOrders = _generateMockDeliveryOrders();
      isLoading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(AppLocalization.get('delivery')),
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          PopupMenuButton<String>(
            onSelected: (value) => setState(() => selectedType = value),
            itemBuilder: (context) => [
              const PopupMenuItem(value: 'ALL', child: Text('All Deliveries')),
              const PopupMenuItem(value: 'FOOD', child: Text('Food Delivery')),
              const PopupMenuItem(value: 'GROCERY', child: Text('Groceries')),
              const PopupMenuItem(value: 'MEDICINE', child: Text('Medicine')),
              const PopupMenuItem(value: 'DOCUMENTS', child: Text('Documents')),
              const PopupMenuItem(value: 'PARCEL', child: Text('Parcels')),
            ],
          ),
        ],
      ),
      body: isLoading
          ? const Center(child: CircularProgressIndicator())
          : deliveryOrders.isEmpty
          ? _buildEmptyState()
          : _buildDeliveryOrdersList(),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showNewDeliveryDialog(),
        backgroundColor: const Color(0xFF00E5FF),
        child: const Icon(Icons.add, color: Colors.black),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.local_shipping, size: 80, color: Colors.grey),
          const SizedBox(height: 16),
          Text(
            'No deliveries yet',
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 8),
          Text(
            'Order your first delivery and enjoy fast service',
            style: TextStyle(color: Colors.grey[600]),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 24),
          ElevatedButton.icon(
            onPressed: () => _showNewDeliveryDialog(),
            icon: const Icon(Icons.add),
            label: const Text('New Delivery'),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF00E5FF),
              foregroundColor: Colors.black,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDeliveryOrdersList() {
    final filteredOrders = selectedType == 'ALL'
        ? deliveryOrders
        : deliveryOrders.where((order) => order.type == selectedType).toList();

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: filteredOrders.length,
      itemBuilder: (context, index) {
        return DeliveryOrderCard(deliveryOrder: filteredOrders[index]);
      },
    );
  }

  void _showNewDeliveryDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('New Delivery Order'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Choose what you want to deliver:'),
            const SizedBox(height: 16),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                _buildDeliveryTypeButton('FOOD', '🍕 Food'),
                _buildDeliveryTypeButton('GROCERY', '🛒 Groceries'),
                _buildDeliveryTypeButton('MEDICINE', '💊 Medicine'),
                _buildDeliveryTypeButton('DOCUMENTS', '📄 Documents'),
                _buildDeliveryTypeButton('PARCEL', '📦 Parcel'),
              ],
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
        ],
      ),
    );
  }

  Widget _buildDeliveryTypeButton(String type, String label) {
    return ElevatedButton(
      onPressed: () {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Ordering $label delivery...'),
            backgroundColor: const Color(0xFF00E5FF),
          ),
        );
      },
      style: ElevatedButton.styleFrom(
        backgroundColor: const Color(0xFFE5E7EB),
        foregroundColor: Colors.white,
      ),
      child: Text(label),
    );
  }

  List<DeliveryOrder> _generateMockDeliveryOrders() {
    return [
      DeliveryOrder(
        id: 'DEL-001',
        type: 'FOOD',
        status: 'IN_TRANSIT',
        pickupLocation: GeoLocation(
          latitude: 25.1972,
          longitude: 55.2744,
          address: 'Al Khalidi Restaurant, Dubai Marina',
          city: 'Dubai',
          country: 'AE',
        ),
        deliveryLocation: GeoLocation(
          latitude: 25.1854,
          longitude: 55.2671,
          address: 'Villa 123, Jumeirah Beach Residence',
          city: 'Dubai',
          country: 'AE',
        ),
        items: ['Chicken Shawarma', 'Falafel Wrap', 'Soft Drinks'],
        totalAmount: 85.0,
        currency: 'AED',
        deliveryFee: 5.0,
        estimatedDelivery: DateTime.now().add(const Duration(minutes: 25)),
        driverName: 'Ahmed Hassan',
        driverPhone: '+971501234567',
        trackingNumber: 'OMNI-DEL-2026-001',
        createdAt: DateTime.now().subtract(const Duration(minutes: 15)),
      ),
      DeliveryOrder(
        id: 'DEL-002',
        type: 'GROCERY',
        status: 'DELIVERED',
        pickupLocation: GeoLocation(
          latitude: 25.0867,
          longitude: 55.1408,
          address: 'Carrefour Market, Mall of Emirates',
          city: 'Dubai',
          country: 'AE',
        ),
        deliveryLocation: GeoLocation(
          latitude: 25.1854,
          longitude: 55.2671,
          address: 'Villa 123, Jumeirah Beach Residence',
          city: 'Dubai',
          country: 'AE',
        ),
        items: ['Milk', 'Bread', 'Fruits', 'Vegetables', 'Cleaning Supplies'],
        totalAmount: 145.0,
        currency: 'AED',
        deliveryFee: 10.0,
        estimatedDelivery: DateTime.now().add(const Duration(minutes: 45)),
        driverName: 'Fatima Al-Zahra',
        driverPhone: '+971507654321',
        trackingNumber: 'OMNI-DEL-2026-002',
        createdAt: DateTime.now().subtract(const Duration(hours: 2)),
      ),
      DeliveryOrder(
        id: 'DEL-003',
        type: 'MEDICINE',
        status: 'PICKED_UP',
        pickupLocation: GeoLocation(
          latitude: 25.1972,
          longitude: 55.2744,
          address: 'Life Pharmacy, Business Bay',
          city: 'Dubai',
          country: 'AE',
        ),
        deliveryLocation: GeoLocation(
          latitude: 25.1854,
          longitude: 55.2671,
          address: 'Villa 123, Jumeirah Beach Residence',
          city: 'Dubai',
          country: 'AE',
        ),
        items: ['Painkillers', 'Antibiotics', 'Vitamins', 'Bandages'],
        totalAmount: 67.0,
        currency: 'AED',
        deliveryFee: 8.0,
        estimatedDelivery: DateTime.now().add(const Duration(minutes: 20)),
        driverName: 'Omar Khalid',
        driverPhone: '+971509876543',
        trackingNumber: 'OMNI-DEL-2026-003',
        createdAt: DateTime.now().subtract(const Duration(minutes: 35)),
      ),
    ];
  }
}

class DeliveryOrderCard extends StatefulWidget {
  final DeliveryOrder deliveryOrder;

  const DeliveryOrderCard({super.key, required this.deliveryOrder});

  @override
  State<DeliveryOrderCard> createState() => _DeliveryOrderCardState();
}

class _DeliveryOrderCardState extends State<DeliveryOrderCard> {
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
                    DeliveryDetailScreen(deliveryOrder: widget.deliveryOrder),
              ),
            );
          },
          borderRadius: BorderRadius.circular(15),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header with Type and Status
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: _getTypeColor(
                          widget.deliveryOrder.type,
                        ).withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        widget.deliveryOrder.type,
                        style: TextStyle(
                          color: _getTypeColor(widget.deliveryOrder.type),
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    const Spacer(),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: _getStatusColor(
                          widget.deliveryOrder.status,
                        ).withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        widget.deliveryOrder.status.replaceAll('_', ' '),
                        style: TextStyle(
                          color: _getStatusColor(widget.deliveryOrder.status),
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 12),

                // Tracking Number
                Text(
                  'Tracking: ${widget.deliveryOrder.trackingNumber}',
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey[400],
                    fontWeight: FontWeight.w500,
                  ),
                ),

                const SizedBox(height: 8),

                // Route
                Row(
                  children: [
                    const Icon(Icons.location_on, size: 16, color: Colors.red),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        widget.deliveryOrder.pickupLocation.address ??
                            'Pickup location',
                        style: const TextStyle(fontSize: 14),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    const Icon(Icons.flag, size: 16, color: Colors.green),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        widget.deliveryOrder.deliveryLocation.address ??
                            'Delivery location',
                        style: const TextStyle(fontSize: 14),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 12),

                // Items Preview
                Text(
                  'Items: ${widget.deliveryOrder.items.take(2).join(', ')}${widget.deliveryOrder.items.length > 2 ? ' +${widget.deliveryOrder.items.length - 2} more' : ''}',
                  style: TextStyle(fontSize: 13, color: Colors.grey[400]),
                ),

                const SizedBox(height: 8),

                // Driver Info and ETA
                Row(
                  children: [
                    CircleAvatar(
                      radius: 16,
                      backgroundImage: NetworkImage(
                        'https://i.pravatar.cc/150?u=${widget.deliveryOrder.driverName}',
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            widget.deliveryOrder.driverName ?? 'Driver',
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          Text(
                            '${widget.deliveryOrder.estimatedDelivery.difference(DateTime.now()).inMinutes} min remaining',
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.grey[400],
                            ),
                          ),
                        ],
                      ),
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          '${widget.deliveryOrder.currency} ${widget.deliveryOrder.totalAmount.toStringAsFixed(0)}',
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF00E5FF),
                          ),
                        ),
                        Text(
                          '+${widget.deliveryOrder.deliveryFee.toStringAsFixed(0)} delivery',
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey[400],
                          ),
                        ),
                      ],
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
      case 'FOOD':
        return Colors.orange;
      case 'GROCERY':
        return Colors.green;
      case 'MEDICINE':
        return Colors.red;
      case 'DOCUMENTS':
        return Colors.blue;
      case 'PARCEL':
        return Colors.purple;
      default:
        return Colors.grey;
    }
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'PENDING':
        return Colors.yellow;
      case 'PICKED_UP':
        return Colors.blue;
      case 'IN_TRANSIT':
        return Colors.orange;
      case 'DELIVERED':
        return Colors.green;
      case 'CANCELLED':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }
}

class DeliveryDetailScreen extends StatelessWidget {
  final DeliveryOrder deliveryOrder;

  const DeliveryDetailScreen({super.key, required this.deliveryOrder});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Delivery #${deliveryOrder.trackingNumber}'),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Status Banner
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              color: _getStatusColor(
                deliveryOrder.status,
              ).withValues(alpha: 0.1),
              child: Row(
                children: [
                  Icon(
                    _getStatusIcon(deliveryOrder.status),
                    color: _getStatusColor(deliveryOrder.status),
                    size: 24,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          deliveryOrder.status.replaceAll('_', ' '),
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: _getStatusColor(deliveryOrder.status),
                          ),
                        ),
                        Text(
                          _getStatusMessage(deliveryOrder.status),
                          style: TextStyle(
                            fontSize: 14,
                            color: Colors.grey[400],
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Route Details
                  const Text(
                    'Delivery Route',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 16),

                  // Pickup
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.red.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: Colors.red.withValues(alpha: 0.3),
                      ),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.location_on, color: Colors.red),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Pickup Location',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.red,
                                ),
                              ),
                              Text(
                                deliveryOrder.pickupLocation.address ??
                                    'Address not available',
                                style: const TextStyle(fontSize: 14),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 12),

                  // Delivery
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.green.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: Colors.green.withValues(alpha: 0.3),
                      ),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.flag, color: Colors.green),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Delivery Location',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.green,
                                ),
                              ),
                              Text(
                                deliveryOrder.deliveryLocation.address ??
                                    'Address not available',
                                style: const TextStyle(fontSize: 14),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 24),

                  // Driver Info
                  const Text(
                    'Delivery Driver',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 12),

                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFFFFF),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFE5E7EB)),
                    ),
                    child: Row(
                      children: [
                        CircleAvatar(
                          radius: 30,
                          backgroundImage: NetworkImage(
                            'https://i.pravatar.cc/150?u=${deliveryOrder.driverName}',
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                deliveryOrder.driverName ?? 'Driver',
                                style: const TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              Text(
                                deliveryOrder.driverPhone ??
                                    'Phone not available',
                                style: TextStyle(
                                  fontSize: 14,
                                  color: Colors.grey[400],
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'Estimated delivery: ${deliveryOrder.estimatedDelivery.difference(DateTime.now()).inMinutes} minutes',
                                style: const TextStyle(
                                  fontSize: 14,
                                  color: Color(0xFF00E5FF),
                                ),
                              ),
                            ],
                          ),
                        ),
                        IconButton(
                          onPressed: () {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('Calling driver...'),
                                backgroundColor: Color(0xFF00E5FF),
                              ),
                            );
                          },
                          icon: const Icon(
                            Icons.phone,
                            color: Color(0xFF00E5FF),
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 24),

                  // Order Items
                  const Text(
                    'Order Items',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 12),

                  ...deliveryOrder.items.map(
                    (item) => Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Row(
                        children: [
                          const Icon(
                            Icons.check_circle,
                            color: Colors.green,
                            size: 20,
                          ),
                          const SizedBox(width: 12),
                          Text(item, style: const TextStyle(fontSize: 16)),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(height: 24),

                  // Order Summary
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFFFFF),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFE5E7EB)),
                    ),
                    child: Column(
                      children: [
                        _buildSummaryRow(
                          'Subtotal',
                          '${deliveryOrder.currency} ${(deliveryOrder.totalAmount - deliveryOrder.deliveryFee).toStringAsFixed(0)}',
                        ),
                        const SizedBox(height: 8),
                        _buildSummaryRow(
                          'Delivery Fee',
                          '${deliveryOrder.currency} ${deliveryOrder.deliveryFee.toStringAsFixed(0)}',
                        ),
                        const Divider(color: Color(0xFFE5E7EB), height: 16),
                        _buildSummaryRow(
                          'Total',
                          '${deliveryOrder.currency} ${deliveryOrder.totalAmount.toStringAsFixed(0)}',
                          isTotal: true,
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 24),

                  // Action Buttons
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('Tracking opened...'),
                                backgroundColor: Color(0xFF00E5FF),
                              ),
                            );
                          },
                          icon: const Icon(Icons.track_changes),
                          label: const Text('Track Order'),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: const Color(0xFF00E5FF),
                            side: const BorderSide(color: Color(0xFF00E5FF)),
                            padding: const EdgeInsets.symmetric(vertical: 12),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: () {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('Support contacted...'),
                                backgroundColor: Color(0xFF00E5FF),
                              ),
                            );
                          },
                          icon: const Icon(Icons.support_agent),
                          label: const Text('Support'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF00E5FF),
                            foregroundColor: Colors.black,
                            padding: const EdgeInsets.symmetric(vertical: 12),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSummaryRow(String label, String value, {bool isTotal = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: isTotal ? 18 : 16,
            fontWeight: isTotal ? FontWeight.bold : FontWeight.normal,
            color: isTotal ? const Color(0xFF00E5FF) : Colors.white,
          ),
        ),
        Text(
          value,
          style: TextStyle(
            fontSize: isTotal ? 18 : 16,
            fontWeight: isTotal ? FontWeight.bold : FontWeight.normal,
            color: isTotal ? const Color(0xFF00E5FF) : Colors.white,
          ),
        ),
      ],
    );
  }

  IconData _getStatusIcon(String status) {
    switch (status) {
      case 'PENDING':
        return Icons.schedule;
      case 'PICKED_UP':
        return Icons.inventory;
      case 'IN_TRANSIT':
        return Icons.local_shipping;
      case 'DELIVERED':
        return Icons.check_circle;
      case 'CANCELLED':
        return Icons.cancel;
      default:
        return Icons.info;
    }
  }

  String _getStatusMessage(String status) {
    switch (status) {
      case 'PENDING':
        return 'Your order is being prepared';
      case 'PICKED_UP':
        return 'Driver has picked up your order';
      case 'IN_TRANSIT':
        return 'Your order is on the way';
      case 'DELIVERED':
        return 'Order delivered successfully';
      case 'CANCELLED':
        return 'Order has been cancelled';
      default:
        return 'Status unknown';
    }
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'PENDING':
        return Colors.yellow;
      case 'PICKED_UP':
        return Colors.blue;
      case 'IN_TRANSIT':
        return Colors.orange;
      case 'DELIVERED':
        return Colors.green;
      case 'CANCELLED':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }
}

