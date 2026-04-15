import 'package:flutter/material.dart';

class SmartInsights extends StatelessWidget {
  final int savedCount;
  final int viewingCount;
  final String journeyStage;
  final String smartInsight;
  const SmartInsights({super.key, required this.savedCount, required this.viewingCount, required this.journeyStage, required this.smartInsight});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 10, offset: const Offset(0, 4))],
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    _StatItem(label: 'Saved', value: savedCount.toString()),
                    const SizedBox(width: 18),
                    _StatItem(label: 'Viewings', value: viewingCount.toString()),
                    const SizedBox(width: 18),
                    _StatItem(label: 'Stage', value: journeyStage),
                  ],
                ),
                const SizedBox(height: 10),
                Text(
                  smartInsight,
                  style: const TextStyle(fontSize: 13, color: Color(0xFF1D4ED8), fontWeight: FontWeight.w600),
                ),
              ],
            ),
          ),
          const Icon(Icons.lightbulb_outline_rounded, color: Color(0xFFFEF08A), size: 32),
        ],
      ),
    );
  }
}

class _StatItem extends StatelessWidget {
  final String label;
  final String value;
  const _StatItem({required this.label, required this.value});
  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(value, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15, color: Color(0xFF0F172A))),
        Text(label, style: const TextStyle(fontSize: 11, color: Color(0xFF64748B), fontWeight: FontWeight.w500)),
      ],
    );
  }
}