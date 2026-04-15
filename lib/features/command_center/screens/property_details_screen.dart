import 'package:flutter/material.dart';

class PropertyDetailsScreen extends StatelessWidget {
  final String propertyName;
  const PropertyDetailsScreen({super.key, required this.propertyName});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Property: $propertyName')),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.home_work, size: 80, color: Colors.green),
            SizedBox(height: 20),
            Text('Property DNA', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
            SizedBox(height: 10),
            Text('Name: $propertyName', style: TextStyle(fontSize: 18)),
            SizedBox(height: 20),
            Text('Mock data: Requests, Bookings, Maintenance, etc.', style: TextStyle(color: Colors.grey)),
          ],
        ),
      ),
    );
  }
}
