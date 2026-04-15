import 'package:flutter/material.dart';

class CommandCenterRequestsScreen extends StatelessWidget {
  const CommandCenterRequestsScreen({super.key});

  final List<_MockRequest> _mockRequests = const [
    _MockRequest(
      tenantName: 'Ali Hassan',
      propertyName: 'Pearl Tower 2',
      requestType: 'Viewing',
      dateTime: '2026-04-12 10:00',
      status: 'Pending',
    ),
    _MockRequest(
      tenantName: 'Sara Al-Mansoori',
      propertyName: 'West Bay Residence',
      requestType: 'Move-in',
      dateTime: '2026-04-13 14:30',
      status: 'Scheduled',
    ),
    _MockRequest(
      tenantName: 'Mohamed Fathy',
      propertyName: 'Lusail Heights',
      requestType: 'Service',
      dateTime: '2026-04-14 09:00',
      status: 'Completed',
    ),
    _MockRequest(
      tenantName: 'Fatima Noor',
      propertyName: 'Al Sadd Gardens',
      requestType: 'Viewing',
      dateTime: '2026-04-15 16:00',
      status: 'Pending',
    ),
  ];

  Color _statusColor(String status) {
    switch (status) {
      case 'Pending':
        return Colors.orange.shade600;
      case 'Scheduled':
        return Colors.blue.shade700;
      case 'Completed':
        return Colors.green.shade700;
      default:
        return Colors.grey.shade400;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Requests Inbox'),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        elevation: 0.5,
      ),
      backgroundColor: const Color(0xFFF4F6F8),
      body: ListView.separated(
        padding: const EdgeInsets.all(20),
        itemCount: _mockRequests.length,
        separatorBuilder: (_, _) => const SizedBox(height: 16),
        itemBuilder: (context, index) {
          final req = _mockRequests[index];
          return Card(
            elevation: 2,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          req.propertyName,
                          style: const TextStyle(
                            fontWeight: FontWeight.w700,
                            fontSize: 18,
                            color: Color(0xFF0F172A),
                          ),
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: _statusColor(req.status).withOpacity(0.12),
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: Text(
                          req.status,
                          style: TextStyle(
                            color: _statusColor(req.status),
                            fontWeight: FontWeight.w700,
                            fontSize: 13,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      const Icon(Icons.person_outline, size: 18, color: Color(0xFF64748B)),
                      const SizedBox(width: 6),
                      Text(req.tenantName, style: const TextStyle(fontSize: 15, color: Color(0xFF334155))),
                      const SizedBox(width: 18),
                      const Icon(Icons.event_note, size: 18, color: Color(0xFF64748B)),
                      const SizedBox(width: 6),
                      Text(req.dateTime, style: const TextStyle(fontSize: 15, color: Color(0xFF334155))),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: Colors.blue.shade50,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          req.requestType,
                          style: const TextStyle(
                            color: Color(0xFF2563EB),
                            fontWeight: FontWeight.w600,
                            fontSize: 13,
                          ),
                        ),
                      ),
                      const Spacer(),
                      _ActionButton(label: 'Assign Coordinator', icon: Icons.assignment_ind, onTap: () {}),
                      const SizedBox(width: 8),
                      _ActionButton(label: 'Assign Vendor', icon: Icons.handshake, onTap: () {}),
                      const SizedBox(width: 8),
                      _ActionButton(label: 'Mark as Scheduled', icon: Icons.schedule, onTap: () {}),
                      const SizedBox(width: 8),
                      _ActionButton(label: 'Mark as Completed', icon: Icons.check_circle, onTap: () {}),
                    ],
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

class _ActionButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final VoidCallback onTap;
  const _ActionButton({required this.label, required this.icon, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return OutlinedButton.icon(
      style: OutlinedButton.styleFrom(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        minimumSize: const Size(0, 36),
        side: const BorderSide(color: Color(0xFFCBD5E1)),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        foregroundColor: const Color(0xFF2563EB),
        textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
      ),
      onPressed: () {
        onTap();
            },
      icon: Icon(icon, size: 17),
      label: Text(label),
    );
  }
}

class _MockRequest {
  final String tenantName;
  final String propertyName;
  final String requestType;
  final String dateTime;
  final String status;
  const _MockRequest({
    required this.tenantName,
    required this.propertyName,
    required this.requestType,
    required this.dateTime,
    required this.status,
  });
}
