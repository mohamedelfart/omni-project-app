import 'package:flutter/material.dart';

import '../../../core/models/models.dart';
import '../../../shared/widgets/loading_action_button.dart';
import '../../payments/screens/payments_screen.dart';

class PropertyViewingFlowScreen extends StatefulWidget {
  final List<Property> selectedProperties;

  const PropertyViewingFlowScreen({
    super.key,
    required this.selectedProperties,
  });

  @override
  State<PropertyViewingFlowScreen> createState() => _PropertyViewingFlowScreenState();
}

class _PropertyViewingFlowScreenState extends State<PropertyViewingFlowScreen> {
  final List<String> _steps = const [
    'Ticket created',
    'Sent to Core',
    'Routed to Command Center',
    'Driver assigned',
  ];

  int _activeStep = -1;
  bool _pipelineComplete = false;
  String? _confirmingPropertyId;

  @override
  void initState() {
    super.initState();
    _runPipeline();
  }

  Future<void> _runPipeline() async {
    for (int index = 0; index < _steps.length; index++) {
      await Future.delayed(const Duration(milliseconds: 700));
      if (!mounted) {
        return;
      }
      setState(() => _activeStep = index);
    }
    await Future.delayed(const Duration(milliseconds: 300));
    if (!mounted) {
      return;
    }
    setState(() => _pipelineComplete = true);
  }

  Future<void> _confirmProperty(Property property) async {
    setState(() => _confirmingPropertyId = property.id);
    await Future.delayed(const Duration(milliseconds: 1000));
    if (!mounted) {
      return;
    }
    setState(() => _confirmingPropertyId = null);
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(
        builder: (_) => PaymentsScreen(confirmedProperty: property),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Viewing Request'),
        backgroundColor: const Color(0xFFF8FAFC),
        elevation: 0,
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(28),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Viewing pipeline',
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF0F172A),
                  ),
                ),
                const SizedBox(height: 10),
                const Text(
                  'Ticket to Core to Command Center plus driver assignment. Continue to confirmation after the viewing is complete.',
                  style: TextStyle(
                    color: Color(0xFF64748B),
                    height: 1.5,
                  ),
                ),
                const SizedBox(height: 24),
                ...List.generate(_steps.length, (index) {
                  final bool done = _activeStep > index;
                  final bool active = _activeStep == index && !_pipelineComplete;
                  final bool finished = _pipelineComplete && index == _steps.length - 1;

                  return Padding(
                    padding: const EdgeInsets.only(bottom: 16),
                    child: Row(
                      children: [
                        AnimatedContainer(
                          duration: const Duration(milliseconds: 180),
                          width: 24,
                          height: 24,
                          decoration: BoxDecoration(
                            color: done || finished
                                ? const Color(0xFF0F766E)
                                : active
                                    ? const Color(0xFFF97316)
                                    : const Color(0xFFE2E8F0),
                            shape: BoxShape.circle,
                          ),
                          child: done || finished
                              ? const Icon(Icons.check, size: 14, color: Colors.white)
                              : active
                                  ? const Padding(
                                      padding: EdgeInsets.all(4),
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                        valueColor: AlwaysStoppedAnimation<Color>(
                                          Colors.white,
                                        ),
                                      ),
                                    )
                                  : null,
                        ),
                        const SizedBox(width: 12),
                        Text(
                          _steps[index],
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFF0F172A),
                          ),
                        ),
                      ],
                    ),
                  );
                }),
              ],
            ),
          ),
          const SizedBox(height: 20),
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(28),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'After viewing',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF0F172A),
                  ),
                ),
                const SizedBox(height: 10),
                Text(
                  _pipelineComplete
                      ? 'Confirm one property to continue directly to payment.'
                      : 'Confirmation becomes available once driver assignment is complete.',
                  style: const TextStyle(
                    color: Color(0xFF64748B),
                    height: 1.5,
                  ),
                ),
                const SizedBox(height: 20),
                ...widget.selectedProperties.map((property) {
                  final bool loading = _confirmingPropertyId == property.id;

                  return Container(
                    margin: const EdgeInsets.only(bottom: 16),
                    padding: const EdgeInsets.all(18),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          property.title,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w800,
                            color: Color(0xFF0F172A),
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          '${property.location.city ?? 'Location pending'} • ${property.price.toStringAsFixed(0)} ${property.currency}',
                          style: const TextStyle(color: Color(0xFF64748B)),
                        ),
                        const SizedBox(height: 16),
                        LoadingActionButton(
                          label: 'Confirm property and go to payment',
                          isLoading: loading,
                          onPressed: _pipelineComplete
                              ? () => _confirmProperty(property)
                              : null,
                          icon: Icons.payments_outlined,
                        ),
                      ],
                    ),
                  );
                }),
              ],
            ),
          ),
        ],
      ),
    );
  }
}