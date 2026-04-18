import 'package:flutter/material.dart';

/// Tenant-facing status: only `pending` / `assigned` / `in_progress` / `completed`
/// get the four fixed labels and colors; anything else stays readable + neutral.
class TenantRequestStatusUi {
  TenantRequestStatusUi._();

  static String _norm(String raw) => raw.trim().toLowerCase().replaceAll('-', '_');

  static String _prettyFallback(String raw) {
    if (raw.trim().isEmpty) return '—';
    return raw
        .replaceAll('_', ' ')
        .split(' ')
        .where((String w) => w.isNotEmpty)
        .map(
          (String w) =>
              '${w[0].toUpperCase()}${w.length > 1 ? w.substring(1).toLowerCase() : ''}',
        )
        .join(' ');
  }

  /// One-line lifecycle hint for detail screen; `null` when status is not a known four-step value.
  static String? progressionHint(String raw) {
    switch (_norm(raw)) {
      case 'pending':
        return 'Your request is being reviewed';
      case 'assigned':
        return 'A team has been assigned to your request';
      case 'in_progress':
        return 'Your request is currently being handled';
      case 'completed':
        return 'Your request has been completed';
      default:
        return null;
    }
  }

  static String label(String raw) {
    switch (_norm(raw)) {
      case 'pending':
        return 'Pending';
      case 'assigned':
        return 'Assigned';
      case 'in_progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      default:
        return _prettyFallback(raw);
    }
  }

  static Color _background(String raw) {
    switch (_norm(raw)) {
      case 'pending':
        return const Color(0xFFF1F5F9);
      case 'assigned':
        return const Color(0xFFDBEAFE);
      case 'in_progress':
        return const Color(0xFFFEF3C7);
      case 'completed':
        return const Color(0xFFD1FAE5);
      default:
        return const Color(0xFFF1F5F9);
    }
  }

  static Color _foreground(String raw) {
    switch (_norm(raw)) {
      case 'pending':
        return const Color(0xFF475569);
      case 'assigned':
        return const Color(0xFF1D4ED8);
      case 'in_progress':
        return const Color(0xFFB45309);
      case 'completed':
        return const Color(0xFF047857);
      default:
        return const Color(0xFF475569);
    }
  }

  /// Small pill for list/detail rows (no animation).
  static Widget chip(String raw) {
    final String text = label(raw);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: _background(raw),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        text,
        style: TextStyle(
          color: _foreground(raw),
          fontSize: 12,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}
