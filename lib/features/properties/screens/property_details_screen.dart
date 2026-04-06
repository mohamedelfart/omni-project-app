import 'package:flutter/material.dart';
import '../../../core/models/models.dart';

// ============================================================================
// PROPERTY DETAILS SCREEN - QuickRent Design
// ============================================================================

class PropertyDetailsScreen extends StatelessWidget {
  final Property property;
  const PropertyDetailsScreen({super.key, required this.property});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: Stack(
        children: [
          // Scrollable Content
          CustomScrollView(
            slivers: [
              // Full-width Image Header
              SliverAppBar(
                expandedHeight: 280,
                pinned: true,
                backgroundColor: const Color(0xFF1E3A5F),
                leading: Padding(
                  padding: const EdgeInsets.all(8),
                  child: CircleAvatar(
                    backgroundColor: Colors.white,
                    child: IconButton(
                      icon: const Icon(Icons.arrow_back,
                          color: Color(0xFF1E3A5F), size: 20),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ),
                ),
                actions: [
                  Padding(
                    padding: const EdgeInsets.all(8),
                    child: CircleAvatar(
                      backgroundColor: Colors.white,
                      child: IconButton(
                        icon: const Icon(Icons.favorite_border,
                            color: Color(0xFF1E3A5F), size: 20),
                        onPressed: () {},
                      ),
                    ),
                  ),
                ],
                flexibleSpace: FlexibleSpaceBar(
                  background: Stack(
                    fit: StackFit.expand,
                    children: [
                      Image.network(
                        property.images.isNotEmpty ? property.images.first : '',
                        fit: BoxFit.cover,
                        errorBuilder: (_, _, _) => Container(
                          color: const Color(0xFFE5E7EB),
                          child: const Icon(Icons.business,
                              size: 80, color: Color(0xFF9CA3AF)),
                        ),
                      ),
                      // Gradient overlay
                      Container(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                            colors: [
                              Colors.transparent,
                              Colors.black.withValues(alpha: 0.5),
                            ],
                          ),
                        ),
                      ),
                      // Overlay text
                      Positioned(
                        bottom: 16,
                        left: 16,
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF97316),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            property.isAvailable
                                ? '✓ Available Now'
                                : '✗ Not Available',
                            style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                                fontSize: 12),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 20, 16, 100),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Title + Price
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            child: Text(
                              property.title,
                              style: const TextStyle(
                                fontSize: 22,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF1F2937),
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text(
                                property.price.toStringAsFixed(0),
                                style: const TextStyle(
                                  fontSize: 22,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFFF97316),
                                ),
                              ),
                              Text(
                                '${property.currency}/yr',
                                style: const TextStyle(
                                  fontSize: 12,
                                  color: Color(0xFF6B7280),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      // Location
                      Row(
                        children: [
                          const Icon(Icons.location_on_outlined,
                              size: 16, color: Color(0xFF6B7280)),
                          const SizedBox(width: 4),
                          Text(
                            '${property.location.address ?? ''}, ${property.location.city ?? ''}',
                            style: const TextStyle(
                                color: Color(0xFF6B7280), fontSize: 14),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),

                      // Info Row (bed/bath/size)
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.05),
                              blurRadius: 20,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceAround,
                          children: [
                            _DetailStat(
                              icon: Icons.bed_outlined,
                              value: '${property.bedrooms}',
                              label: 'Beds',
                            ),
                            _Divider(),
                            _DetailStat(
                              icon: Icons.bathtub_outlined,
                              value: '${property.bathrooms}',
                              label: 'Baths',
                            ),
                            _Divider(),
                            _DetailStat(
                              icon: Icons.square_foot_outlined,
                              value: '${property.area}',
                              label: 'm²',
                            ),
                            _Divider(),
                            _DetailStat(
                              icon: Icons.star_outline,
                              value: '${property.rating}',
                              label: 'Rating',
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 24),

                      // Description
                      _SectionTitle(title: 'Description'),
                      const SizedBox(height: 8),
                      Text(
                        property.description,
                        style: const TextStyle(
                          color: Color(0xFF6B7280),
                          fontSize: 14,
                          height: 1.6,
                        ),
                      ),
                      const SizedBox(height: 24),

                      // Amenities
                      _SectionTitle(title: 'Amenities'),
                      const SizedBox(height: 12),
                      Wrap(
                        spacing: 10,
                        runSpacing: 10,
                        children: property.amenities.map((a) {
                          return Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 14, vertical: 8),
                            decoration: BoxDecoration(
                              color: const Color(0xFF1E3A5F).withValues(alpha: 0.08),
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(
                                  color: const Color(0xFF1E3A5F).withValues(alpha: 0.2)),
                            ),
                            child: Text(
                              a,
                              style: const TextStyle(
                                color: Color(0xFF1E3A5F),
                                fontSize: 13,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          );
                        }).toList(),
                      ),
                      const SizedBox(height: 24),

                      // Lease Terms
                      _SectionTitle(title: 'Lease Terms'),
                      const SizedBox(height: 12),
                      _LeaseTermCard(
                          icon: Icons.calendar_month_outlined,
                          title: 'Lease Duration',
                          value: '12 Months'),
                      const SizedBox(height: 8),
                      _LeaseTermCard(
                          icon: Icons.payments_outlined,
                          title: 'Payment',
                          value: 'Quarterly / Annually'),
                      const SizedBox(height: 8),
                      _LeaseTermCard(
                          icon: Icons.security_outlined,
                          title: 'Security Deposit',
                          value:
                              '${(property.price * 0.05).toStringAsFixed(0)} ${property.currency}'),
                      const SizedBox(height: 24),

                      // Owner Profile
                      _SectionTitle(title: 'Owner'),
                      const SizedBox(height: 12),
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.05),
                              blurRadius: 20,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: Row(
                          children: [
                            CircleAvatar(
                              radius: 28,
                              backgroundColor: const Color(0xFF1E3A5F),
                              child: Text(
                                property.vendorId.replaceAll('VENDOR-', 'V'),
                                style: const TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.bold),
                              ),
                            ),
                            const SizedBox(width: 16),
                            const Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Property Owner',
                                    style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                      color: Color(0xFF1F2937),
                                    ),
                                  ),
                                  Text(
                                    'Verified Owner',
                                    style: TextStyle(
                                        fontSize: 12, color: Color(0xFF6B7280)),
                                  ),
                                ],
                              ),
                            ),
                            IconButton(
                              icon: const Icon(Icons.chat_outlined,
                                  color: Color(0xFF1E3A5F)),
                              onPressed: () {},
                            ),
                            IconButton(
                              icon: const Icon(Icons.call_outlined,
                                  color: Color(0xFF1E3A5F)),
                              onPressed: () {},
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),

          // Fixed Bottom Button
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: Container(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
              decoration: BoxDecoration(
                color: Colors.white,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.08),
                    blurRadius: 20,
                    offset: const Offset(0, -4),
                  ),
                ],
              ),
              child: ElevatedButton(
                onPressed: () {
                  Navigator.pop(context);
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFF97316),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  minimumSize: const Size(double.infinity, 52),
                ),
                child: const Text(
                  'Back to property search',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  final String title;
  const _SectionTitle({required this.title});

  @override
  Widget build(BuildContext context) {
    return Text(
      title,
      style: const TextStyle(
        fontSize: 18,
        fontWeight: FontWeight.bold,
        color: Color(0xFF1F2937),
      ),
    );
  }
}

class _DetailStat extends StatelessWidget {
  final IconData icon;
  final String value;
  final String label;
  const _DetailStat(
      {required this.icon, required this.value, required this.label});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Icon(icon, color: const Color(0xFF1E3A5F), size: 22),
        const SizedBox(height: 4),
        Text(value,
            style: const TextStyle(
                fontWeight: FontWeight.bold, color: Color(0xFF1F2937))),
        Text(label,
            style: const TextStyle(fontSize: 11, color: Color(0xFF6B7280))),
      ],
    );
  }
}

class _Divider extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(height: 40, width: 1, color: const Color(0xFFE5E7EB));
  }
}

class _LeaseTermCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String value;
  const _LeaseTermCard(
      {required this.icon, required this.title, required this.value});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          Icon(icon, color: const Color(0xFF1E3A5F), size: 20),
          const SizedBox(width: 12),
          Text(
            title,
            style: const TextStyle(color: Color(0xFF6B7280), fontSize: 14),
          ),
          const Spacer(),
          Text(
            value,
            style: const TextStyle(
              fontWeight: FontWeight.bold,
              color: Color(0xFF1F2937),
              fontSize: 14,
            ),
          ),
        ],
      ),
    );
  }
}
