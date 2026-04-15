import 'package:flutter/material.dart';
class TenantProfileScreen extends StatelessWidget {
  final String tenantName;
  const TenantProfileScreen({super.key, required this.tenantName});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Tenant: $tenantName')),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.person, size: 80, color: Colors.blue),
            SizedBox(height: 20),
            Text('Tenant Profile', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
            SizedBox(height: 10),
            Text('Name: $tenantName', style: TextStyle(fontSize: 18)),
            SizedBox(height: 20),
            Text('Mock data: Contact, Lease, Requests, etc.', style: TextStyle(color: Colors.grey)),
          ],
        ),
      ),
    );
  }
}
