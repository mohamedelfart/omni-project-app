import 'package:flutter/material.dart';

import '../../../core/models/models.dart';

class CartScreen extends StatefulWidget {
  final Property? selectedProperty;
  final List<CartServiceItem>? initialServices;
  final List<CartBillItem>? initialBills;
  final VoidCallback? onPayNow;
  final VoidCallback? onAddMore;

  const CartScreen({
    super.key,
    this.selectedProperty,
    this.initialServices,
    this.initialBills,
    this.onPayNow,
    this.onAddMore,
  });

  @override
  State<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends State<CartScreen> {
  Property? _selectedProperty;
  late List<CartServiceItem> _services;
  late List<CartBillItem> _bills;
  DateTime _lastUpdated = DateTime.now();

  static const String _fallbackPropertyImage =
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1600&q=80';

  @override
  void initState() {
    super.initState();
    _selectedProperty = widget.selectedProperty ?? _mockProperty();
    _services = widget.initialServices ?? _mockServices();
    _bills = widget.initialBills ?? _mockBills();
  }

  bool get _isEmpty =>
      _selectedProperty == null && _services.isEmpty && _bills.isEmpty;

  int get _itemCount {
    var count = _services.length + _bills.length;
    if (_selectedProperty != null) {
      count += 1;
    }
    return count;
  }

  double get _subtotal {
    final propertyAmount = _selectedProperty?.price ?? 0;
    final servicesAmount = _services.fold<double>(
      0,
      (sum, item) => sum + item.amount,
    );
    final billsAmount = _bills.fold<double>(
      0,
      (sum, item) => sum + item.amount,
    );
    return propertyAmount + servicesAmount + billsAmount;
  }

  double get _fees {
    if (_subtotal <= 0) {
      return 0;
    }
    if (_services.isEmpty && _bills.isEmpty) {
      return 0;
    }
    return 24;
  }

  double get _total => _subtotal + _fees;

  void _touchUpdated() {
    setState(() => _lastUpdated = DateTime.now());
  }

  String _statusText() {
    if (_isEmpty) {
      return 'Cart is empty';
    }
    return 'Ready for checkout';
  }

  String _updatedText() {
    final hour = _lastUpdated.hour.toString().padLeft(2, '0');
    final minute = _lastUpdated.minute.toString().padLeft(2, '0');
    return 'Updated at $hour:$minute';
  }

  String _money(double amount, {String currency = 'QAR'}) {
    final fixed = amount.toStringAsFixed(0);
    final pattern = RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))');
    final withComma = fixed.replaceAllMapped(pattern, (m) => '${m[1]},');
    return '$withComma $currency';
  }

  void _removeProperty() {
    if (_selectedProperty == null) {
      return;
    }
    setState(() {
      _selectedProperty = null;
      _lastUpdated = DateTime.now();
    });
  }

  void _removeService(CartServiceItem item) {
    setState(() {
      _services.removeWhere((service) => service.id == item.id);
      _lastUpdated = DateTime.now();
    });
  }

  void _removeBill(CartBillItem item) {
    setState(() {
      _bills.removeWhere((bill) => bill.id == item.id);
      _lastUpdated = DateTime.now();
    });
  }

  void _onPayNow() {
    if (widget.onPayNow != null) {
      widget.onPayNow!();
      return;
    }
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Payment flow will continue from this cart summary.'),
      ),
    );
  }

  void _onAddMore() {
    if (widget.onAddMore != null) {
      widget.onAddMore!();
      return;
    }
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Continue browsing properties and services.'),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Cart'),
        backgroundColor: const Color(0xFFF8FAFC),
        elevation: 0,
      ),
      body: SafeArea(
        child: _isEmpty ? _buildEmptyState(context) : _buildContent(context),
      ),
    );
  }

  Widget _buildContent(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 20),
      children: [
        _buildHeader(),
        const SizedBox(height: 16),
        if (_selectedProperty != null) ...[
          _buildPropertyBlock(_selectedProperty!),
          const SizedBox(height: 16),
        ],
        if (_services.isNotEmpty) ...[
          _buildServicesBlock(),
          const SizedBox(height: 16),
        ],
        if (_bills.isNotEmpty) ...[
          _buildBillsBlock(),
          const SizedBox(height: 16),
        ],
        _buildSummaryBlock(),
        const SizedBox(height: 18),
        _buildActionArea(),
      ],
    );
  }

  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: _cardDecoration(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Your Cart',
            style: TextStyle(
              fontSize: 26,
              fontWeight: FontWeight.w800,
              color: Color(0xFF0F172A),
              height: 1.15,
            ),
          ),
          const SizedBox(height: 10),
          Text(
            '$_itemCount items',
            style: const TextStyle(
              fontSize: 14,
              color: Color(0xFF334155),
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            '${_updatedText()} • ${_statusText()}',
            style: const TextStyle(fontSize: 13, color: Color(0xFF64748B)),
          ),
        ],
      ),
    );
  }

  Widget _buildPropertyBlock(Property property) {
    final location =
        [
              property.location.address,
              property.location.city,
              property.location.country,
            ]
            .where((part) => part != null && part.trim().isNotEmpty)
            .map((part) => part!)
            .join(', ');
    final imageUrl = property.images.isNotEmpty
        ? property.images.first
        : _fallbackPropertyImage;

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: _cardDecoration(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Expanded(
                child: Text(
                  'Selected Property',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF0F172A),
                  ),
                ),
              ),
              TextButton(onPressed: _touchUpdated, child: const Text('Edit')),
              TextButton(
                onPressed: _removeProperty,
                child: const Text(
                  'Remove',
                  style: TextStyle(color: Color(0xFFB91C1C)),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ClipRRect(
            borderRadius: BorderRadius.circular(18),
            child: AspectRatio(
              aspectRatio: 16 / 9,
              child: Image.network(
                imageUrl,
                fit: BoxFit.cover,
                errorBuilder: (_, _, _) => Container(
                  color: const Color(0xFFE2E8F0),
                  alignment: Alignment.center,
                  child: const Text(
                    'Property image unavailable',
                    style: TextStyle(
                      color: Color(0xFF475569),
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(height: 14),
          Text(
            property.title,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: Color(0xFF111827),
            ),
          ),
          const SizedBox(height: 6),
          Text(
            location.isEmpty ? property.nationalAddress : location,
            style: const TextStyle(color: Color(0xFF64748B), height: 1.4),
          ),
          const SizedBox(height: 10),
          Text(
            _money(property.price, currency: property.currency),
            style: const TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.w800,
              color: Color(0xFF0F172A),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildServicesBlock() {
    return Container(
      padding: const EdgeInsets.fromLTRB(18, 18, 18, 8),
      decoration: _cardDecoration(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Services',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w800,
              color: Color(0xFF0F172A),
            ),
          ),
          const SizedBox(height: 8),
          ..._services.map(
            (service) => _LineItemRow(
              title: service.title,
              subtitle: service.subtitle,
              amountText: _money(service.amount),
              onRemove: () => _removeService(service),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBillsBlock() {
    return Container(
      padding: const EdgeInsets.fromLTRB(18, 18, 18, 8),
      decoration: _cardDecoration(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Bills',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w800,
              color: Color(0xFF0F172A),
            ),
          ),
          const SizedBox(height: 8),
          ..._bills.map(
            (bill) => _LineItemRow(
              title: bill.title,
              subtitle: bill.subtitle,
              amountText: _money(bill.amount),
              onRemove: () => _removeBill(bill),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryBlock() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: _cardDecoration(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Summary',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w800,
              color: Color(0xFF0F172A),
            ),
          ),
          const SizedBox(height: 14),
          _SummaryRow(label: 'Subtotal', value: _money(_subtotal)),
          if (_fees > 0) ...[
            const SizedBox(height: 10),
            _SummaryRow(label: 'Fees', value: _money(_fees)),
          ],
          const SizedBox(height: 12),
          const Divider(height: 1, color: Color(0xFFE2E8F0)),
          const SizedBox(height: 14),
          _SummaryRow(label: 'Total', value: _money(_total), emphasize: true),
        ],
      ),
    );
  }

  Widget _buildActionArea() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        children: [
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _onPayNow,
              style: ElevatedButton.styleFrom(
                minimumSize: const Size.fromHeight(52),
                backgroundColor: const Color(0xFF1E3A5F),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
              child: const Text(
                'Pay Now',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
              ),
            ),
          ),
          const SizedBox(height: 10),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton(
              onPressed: _onAddMore,
              style: OutlinedButton.styleFrom(
                minimumSize: const Size.fromHeight(50),
                side: const BorderSide(color: Color(0xFFCBD5E1)),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
              child: const Text(
                'Add More',
                style: TextStyle(
                  color: Color(0xFF1E293B),
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
      children: [
        Container(
          padding: const EdgeInsets.all(22),
          decoration: _cardDecoration(),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Your Cart',
                style: TextStyle(
                  fontSize: 26,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF0F172A),
                ),
              ),
              const SizedBox(height: 8),
              Text(
                '${_updatedText()} • ${_statusText()}',
                style: const TextStyle(color: Color(0xFF64748B)),
              ),
              const SizedBox(height: 14),
              ClipRRect(
                borderRadius: BorderRadius.circular(18),
                child: AspectRatio(
                  aspectRatio: 16 / 9,
                  child: Image.network(
                    'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=1600&q=80',
                    fit: BoxFit.cover,
                    errorBuilder: (_, _, _) =>
                        Container(color: const Color(0xFFE2E8F0)),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                'No items yet',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF0F172A),
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Browse properties and services, then return to review and pay from one trusted cart.',
                style: TextStyle(color: Color(0xFF64748B), height: 1.45),
              ),
              const SizedBox(height: 18),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _onAddMore,
                  style: ElevatedButton.styleFrom(
                    minimumSize: const Size.fromHeight(52),
                    backgroundColor: const Color(0xFF1E3A5F),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                  child: const Text(
                    'Browse Properties & Services',
                    style: TextStyle(fontWeight: FontWeight.w700),
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  BoxDecoration _cardDecoration() {
    return BoxDecoration(
      color: const Color(0xFFFFFEFC),
      borderRadius: BorderRadius.circular(22),
      border: Border.all(color: const Color(0xFFE2E8F0)),
      boxShadow: const [
        BoxShadow(
          color: Color(0x120F172A),
          blurRadius: 18,
          offset: Offset(0, 10),
        ),
      ],
    );
  }

  Property _mockProperty() {
    return Property(
      id: 'PROP-101',
      title: 'Bayview Residence, 2BR Apartment',
      description: 'Tenant-ready apartment with marina access.',
      type: 'APARTMENT',
      location: GeoLocation(
        latitude: 25.2048,
        longitude: 55.2708,
        address: 'Dubai Marina',
        city: 'Dubai',
        country: 'UAE',
      ),
      nationalAddress: 'Dubai Marina, UAE',
      price: 8200,
      currency: 'QAR',
      bedrooms: 2,
      bathrooms: 2,
      area: 118,
      images: const [
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80',
      ],
      amenities: const ['Parking', 'Gym', 'Concierge'],
      rating: 4.7,
      reviews: const [],
      vendorId: 'V-21',
      isAvailable: true,
      createdAt: DateTime(2026, 1, 2),
    );
  }

  List<CartServiceItem> _mockServices() {
    return const [
      CartServiceItem(
        id: 'SRV-01',
        title: 'Move-in Cleaning',
        subtitle: 'Scheduled for Apr 10',
        amount: 260,
      ),
      CartServiceItem(
        id: 'SRV-02',
        title: 'Furniture Moving',
        subtitle: '2-hour slot reserved',
        amount: 380,
      ),
    ];
  }

  List<CartBillItem> _mockBills() {
    return const [
      CartBillItem(
        id: 'BILL-01',
        title: 'Water Utility',
        subtitle: 'March 2026',
        amount: 145,
      ),
      CartBillItem(
        id: 'BILL-02',
        title: 'Internet Subscription',
        subtitle: 'April 2026',
        amount: 220,
      ),
    ];
  }
}

class CartServiceItem {
  final String id;
  final String title;
  final String subtitle;
  final double amount;

  const CartServiceItem({
    required this.id,
    required this.title,
    required this.subtitle,
    required this.amount,
  });
}

class CartBillItem {
  final String id;
  final String title;
  final String subtitle;
  final double amount;

  const CartBillItem({
    required this.id,
    required this.title,
    required this.subtitle,
    required this.amount,
  });
}

class _LineItemRow extends StatelessWidget {
  final String title;
  final String subtitle;
  final String amountText;
  final VoidCallback onRemove;

  const _LineItemRow({
    required this.title,
    required this.subtitle,
    required this.amountText,
    required this.onRemove,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: const Color(0xFFF9FBFF),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF111827),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  subtitle,
                  style: const TextStyle(
                    color: Color(0xFF64748B),
                    fontSize: 13,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                amountText,
                style: const TextStyle(
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF0F172A),
                ),
              ),
              const SizedBox(height: 4),
              TextButton(
                onPressed: onRemove,
                style: TextButton.styleFrom(
                  minimumSize: const Size(0, 28),
                  padding: EdgeInsets.zero,
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
                child: const Text(
                  'Remove',
                  style: TextStyle(
                    color: Color(0xFFB91C1C),
                    fontWeight: FontWeight.w600,
                    fontSize: 12,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _SummaryRow extends StatelessWidget {
  final String label;
  final String value;
  final bool emphasize;

  const _SummaryRow({
    required this.label,
    required this.value,
    this.emphasize = false,
  });

  @override
  Widget build(BuildContext context) {
    final labelStyle = TextStyle(
      fontSize: emphasize ? 17 : 14,
      fontWeight: emphasize ? FontWeight.w800 : FontWeight.w600,
      color: emphasize ? const Color(0xFF0F172A) : const Color(0xFF475569),
    );

    final valueStyle = TextStyle(
      fontSize: emphasize ? 20 : 14,
      fontWeight: emphasize ? FontWeight.w900 : FontWeight.w700,
      color: emphasize ? const Color(0xFF0F172A) : const Color(0xFF1E293B),
    );

    return Row(
      children: [
        Text(label, style: labelStyle),
        const Spacer(),
        Text(value, style: valueStyle),
      ],
    );
  }
}
