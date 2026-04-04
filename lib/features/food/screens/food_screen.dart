import 'package:flutter/material.dart';
import '../../../core/models/models.dart';
import '../../../core/utils/localization.dart';

// ============================================================================
// FOOD DELIVERY SERVICE SCREEN
// ============================================================================

class FoodScreen extends StatefulWidget {
  const FoodScreen({super.key});

  @override
  State<FoodScreen> createState() => _FoodScreenState();
}

class _FoodScreenState extends State<FoodScreen> {
  List<Restaurant> restaurants = [];
  bool isLoading = true;
  String selectedCategory = 'ALL';

  @override
  void initState() {
    super.initState();
    _loadRestaurants();
  }

  Future<void> _loadRestaurants() async {
    setState(() => isLoading = true);
    await Future.delayed(const Duration(seconds: 1));
    setState(() {
      restaurants = _generateMockRestaurants();
      isLoading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(AppLocalization.get('food')),
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          PopupMenuButton<String>(
            onSelected: (value) => setState(() => selectedCategory = value),
            itemBuilder: (context) => [
              const PopupMenuItem(value: 'ALL', child: Text('All Restaurants')),
              const PopupMenuItem(value: 'FAST_FOOD', child: Text('Fast Food')),
              const PopupMenuItem(value: 'ARABIC', child: Text('Arabic')),
              const PopupMenuItem(value: 'ITALIAN', child: Text('Italian')),
              const PopupMenuItem(value: 'ASIAN', child: Text('Asian')),
            ],
          ),
        ],
      ),
      body: isLoading
          ? const Center(child: CircularProgressIndicator())
          : restaurants.isEmpty
          ? _buildEmptyState()
          : _buildRestaurantsList(),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.restaurant, size: 80, color: Colors.grey),
          const SizedBox(height: 16),
          Text(
            'No restaurants available',
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 8),
          Text(
            'Check back later for food delivery options',
            style: TextStyle(color: Colors.grey[600]),
          ),
        ],
      ),
    );
  }

  Widget _buildRestaurantsList() {
    final filteredRestaurants = selectedCategory == 'ALL'
        ? restaurants
        : restaurants
              .where((restaurant) => restaurant.category == selectedCategory)
              .toList();

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: filteredRestaurants.length,
      itemBuilder: (context, index) {
        return RestaurantCard(restaurant: filteredRestaurants[index]);
      },
    );
  }

  List<Restaurant> _generateMockRestaurants() {
    return [
      Restaurant(
        id: 'REST-001',
        name: 'Al Khalidi Restaurant',
        category: 'ARABIC',
        cuisine: 'Middle Eastern',
        rating: 4.7,
        deliveryTime: 25,
        deliveryFee: 5.0,
        minimumOrder: 25.0,
        image:
            'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=500',
        location: GeoLocation(
          latitude: 25.2854,
          longitude: 55.3571,
          address: 'Dubai Marina',
          city: 'Dubai',
          country: 'AE',
        ),
        isOpen: true,
        menuItems: [
          MenuItem(
            id: 'ITEM-001',
            name: 'Chicken Shawarma',
            description: 'Marinated chicken with garlic sauce',
            price: 35.0,
            image:
                'https://images.unsplash.com/photo-1551782450-17144efb5723?w=300',
            category: 'Main Course',
            isAvailable: true,
          ),
          MenuItem(
            id: 'ITEM-002',
            name: 'Falafel Wrap',
            description: 'Crispy falafel with tahini sauce',
            price: 28.0,
            image:
                'https://images.unsplash.com/photo-1593001874117-c99c800e3eb7?w=300',
            category: 'Wraps',
            isAvailable: true,
          ),
        ],
      ),
      Restaurant(
        id: 'REST-002',
        name: 'Pizza Palace',
        category: 'ITALIAN',
        cuisine: 'Italian',
        rating: 4.5,
        deliveryTime: 30,
        deliveryFee: 7.0,
        minimumOrder: 40.0,
        image:
            'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500',
        location: GeoLocation(
          latitude: 25.1972,
          longitude: 55.2744,
          address: 'Downtown Dubai',
          city: 'Dubai',
          country: 'AE',
        ),
        isOpen: true,
        menuItems: [
          MenuItem(
            id: 'ITEM-003',
            name: 'Margherita Pizza',
            description: 'Fresh mozzarella, tomato sauce, basil',
            price: 45.0,
            image:
                'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=300',
            category: 'Pizza',
            isAvailable: true,
          ),
        ],
      ),
      Restaurant(
        id: 'REST-003',
        name: 'Burger King',
        category: 'FAST_FOOD',
        cuisine: 'American',
        rating: 4.2,
        deliveryTime: 20,
        deliveryFee: 3.0,
        minimumOrder: 20.0,
        image:
            'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=500',
        location: GeoLocation(
          latitude: 25.0867,
          longitude: 55.1408,
          address: 'Mall of Emirates',
          city: 'Dubai',
          country: 'AE',
        ),
        isOpen: true,
        menuItems: [
          MenuItem(
            id: 'ITEM-004',
            name: 'Whopper Meal',
            description: 'Flame-grilled beef patty with cheese',
            price: 38.0,
            image:
                'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300',
            category: 'Burgers',
            isAvailable: true,
          ),
        ],
      ),
    ];
  }
}

class RestaurantCard extends StatefulWidget {
  final Restaurant restaurant;

  const RestaurantCard({super.key, required this.restaurant});

  @override
  State<RestaurantCard> createState() => _RestaurantCardState();
}

class _RestaurantCardState extends State<RestaurantCard> {
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
                    RestaurantDetailScreen(restaurant: widget.restaurant),
              ),
            );
          },
          borderRadius: BorderRadius.circular(15),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: Image.network(
                    widget.restaurant.image,
                    width: 80,
                    height: 80,
                    fit: BoxFit.cover,
                    errorBuilder: (context, error, stackTrace) {
                      return Container(
                        width: 80,
                        height: 80,
                        color: Colors.grey[800],
                        child: const Icon(
                          Icons.restaurant,
                          color: Color(0xFF6B7280),
                        ),
                      );
                    },
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        widget.restaurant.name,
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        widget.restaurant.cuisine,
                        style: TextStyle(fontSize: 14, color: Colors.grey[400]),
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          const Icon(Icons.star, color: Colors.amber, size: 16),
                          Text(
                            ' ${widget.restaurant.rating}',
                            style: const TextStyle(fontSize: 14),
                          ),
                          const SizedBox(width: 12),
                          const Icon(
                            Icons.access_time,
                            size: 16,
                            color: Colors.grey,
                          ),
                          Text(
                            ' ${widget.restaurant.deliveryTime} min',
                            style: const TextStyle(fontSize: 14),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Delivery: AED ${widget.restaurant.deliveryFee.toStringAsFixed(0)} • Min: AED ${widget.restaurant.minimumOrder.toStringAsFixed(0)}',
                        style: TextStyle(fontSize: 12, color: Colors.grey[500]),
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
                    color: widget.restaurant.isOpen
                        ? Colors.green.withValues(alpha: 0.2)
                        : Colors.red.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    widget.restaurant.isOpen ? 'Open' : 'Closed',
                    style: TextStyle(
                      color: widget.restaurant.isOpen
                          ? Colors.green
                          : Colors.red,
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class RestaurantDetailScreen extends StatelessWidget {
  final Restaurant restaurant;

  const RestaurantDetailScreen({super.key, required this.restaurant});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(restaurant.name),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Image.network(
              restaurant.image,
              height: 200,
              width: double.infinity,
              fit: BoxFit.cover,
              errorBuilder: (context, error, stackTrace) {
                return Container(
                  height: 200,
                  color: Colors.grey[800],
                  child: const Icon(
                    Icons.restaurant,
                    size: 80,
                    color: Color(0xFF6B7280),
                  ),
                );
              },
            ),
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              restaurant.name,
                              style: const TextStyle(
                                fontSize: 24,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            Text(
                              restaurant.cuisine,
                              style: TextStyle(
                                fontSize: 16,
                                color: Colors.grey[400],
                              ),
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
                          color: restaurant.isOpen
                              ? Colors.green.withValues(alpha: 0.2)
                              : Colors.red.withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          restaurant.isOpen ? 'Open' : 'Closed',
                          style: TextStyle(
                            color: restaurant.isOpen
                                ? Colors.green
                                : Colors.red,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      const Icon(Icons.star, color: Colors.amber),
                      Text(
                        ' ${restaurant.rating}',
                        style: const TextStyle(fontSize: 16),
                      ),
                      const SizedBox(width: 16),
                      const Icon(Icons.access_time, color: Colors.grey),
                      Text(
                        ' ${restaurant.deliveryTime} min delivery',
                        style: const TextStyle(fontSize: 16),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Delivery Fee: AED ${restaurant.deliveryFee.toStringAsFixed(0)} • Minimum Order: AED ${restaurant.minimumOrder.toStringAsFixed(0)}',
                    style: TextStyle(color: Colors.grey[400]),
                  ),
                  const SizedBox(height: 24),
                  const Text(
                    'Menu',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 16),
                  ...restaurant.menuItems.map(
                    (item) => MenuItemCard(item: item),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class MenuItemCard extends StatelessWidget {
  final MenuItem item;

  const MenuItemCard({super.key, required this.item});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFFFFFFF),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      child: Row(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: Image.network(
              item.image,
              width: 60,
              height: 60,
              fit: BoxFit.cover,
              errorBuilder: (context, error, stackTrace) {
                return Container(
                  width: 60,
                  height: 60,
                  color: Colors.grey[800],
                  child: const Icon(Icons.fastfood, color: Color(0xFF6B7280)),
                );
              },
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.name,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Text(
                  item.description,
                  style: TextStyle(fontSize: 12, color: Colors.grey[400]),
                ),
                const SizedBox(height: 4),
                Text(
                  'AED ${item.price.toStringAsFixed(0)}',
                  style: const TextStyle(
                    fontSize: 14,
                    color: Color(0xFF00E5FF),
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),
          ElevatedButton(
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('Added ${item.name} to cart'),
                  backgroundColor: const Color(0xFF00E5FF),
                ),
              );
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF00E5FF),
              foregroundColor: Colors.black,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            ),
            child: const Text('Add'),
          ),
        ],
      ),
    );
  }
}

