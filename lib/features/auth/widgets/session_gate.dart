import 'package:flutter/material.dart';

import '../../../core/auth/tenant_api_tokens.dart';
import '../../properties/screens/property_list_screen.dart';

/// Root gate: allow tenant navigation only when an access token exists.

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
      return const Scaffold(
        body: Center(
          child: CircularProgressIndicator(),
        ),
      );
    }
    return const PropertyListScreen();
  }
}
