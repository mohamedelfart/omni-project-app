import 'package:flutter/material.dart';

import '../models/unified_operational_item.dart';

class CommandCenterViewingScreen extends StatelessWidget {
  final UnifiedOperationalItem item;
  const CommandCenterViewingScreen({super.key, required this.item});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Command Center Viewing: ${item.serviceType}')),
      body: Center(child: Text('Status: ${item.status}')),
    );
  }
}
