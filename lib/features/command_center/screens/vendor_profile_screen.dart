import 'package:flutter/material.dart';

class VendorProfileScreen extends StatelessWidget {
  final String vendorName;
  const VendorProfileScreen({super.key, required this.vendorName});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Vendor: $vendorName')),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.handshake, size: 80, color: Colors.orange),
            SizedBox(height: 20),
            Text('Vendor Profile', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
            SizedBox(height: 10),
            Text('Name: $vendorName', style: TextStyle(fontSize: 18)),
            SizedBox(height: 20),
            Text('Mock data: Performance, Requests, Feedback, etc.', style: TextStyle(color: Colors.grey)),
          ],
        ),
      ),
    );
  }
}
