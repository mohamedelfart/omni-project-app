import 'package:flutter/material.dart';

import '../../../core/auth/tenant_api_tokens.dart';
import '../../entry/screens/app_entry_screen.dart';
import '../../properties/screens/property_list_screen.dart';

/// Root: signed-out → role entry; signed-in → main property browse (unchanged request entry point).
class SessionGate extends StatefulWidget {
  const SessionGate({super.key});

  @override
  State<SessionGate> createState() => _SessionGateState();
}

class _SessionGateState extends State<SessionGate> {
  @override
  void initState() {
    super.initState();
    TenantApiTokens.instance.addListener(_onTokens);
  }

  @override
  void dispose() {
    TenantApiTokens.instance.removeListener(_onTokens);
    super.dispose();
  }

  void _onTokens() {
    if (mounted) setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    if (!TenantApiTokens.instance.hasAccessToken) {
      return const AppEntryScreen();
    }
    return const PropertyListScreen();
  }
}
