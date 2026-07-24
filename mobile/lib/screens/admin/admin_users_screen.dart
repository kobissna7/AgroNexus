import 'package:flutter/material.dart';
import '../../config/theme.dart';
import '../../services/api_service.dart';

const _roles = ['farmer', 'wholesaler', 'retailer', 'direct_consumer', 'transporter', 'admin'];

class AdminUsersScreen extends StatefulWidget {
  const AdminUsersScreen({super.key});

  @override
  State<AdminUsersScreen> createState() => _AdminUsersScreenState();
}

class _AdminUsersScreenState extends State<AdminUsersScreen> {
  List<dynamic> _users = [];
  bool _loading = true;
  String _query = '';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      _users = await ApiService.getAdminUsers();
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _changeRole(Map<String, dynamic> u, String role) async {
    try {
      await ApiService.updateUserRole(u['id'] as String, role);
      await _load();
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: const Text('Could not change role'), backgroundColor: AppColors.redBg),
        );
      }
    }
  }

  Future<void> _delete(Map<String, dynamic> u) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Delete user?'),
        content: Text('${u['full_name']} will be permanently removed.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          TextButton(onPressed: () => Navigator.pop(context, true), child: Text('Delete', style: TextStyle(color: AppColors.redText))),
        ],
      ),
    );
    if (confirmed != true) return;
    try {
      await ApiService.deleteUser(u['id'] as String);
      await _load();
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: const Text('Could not delete user'), backgroundColor: AppColors.redBg),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _users.where((u) {
      if (_query.isEmpty) return true;
      final m = u as Map<String, dynamic>;
      final q = _query.toLowerCase();
      return (m['full_name'] as String? ?? '').toLowerCase().contains(q) ||
             (m['email'] as String? ?? '').toLowerCase().contains(q);
    }).toList();

    if (_loading) return const Center(child: CircularProgressIndicator());

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          TextField(
            decoration: InputDecoration(
              hintText: 'Search users…',
              prefixIcon: const Icon(Icons.search, size: 18),
              isDense: true,
            ),
            onChanged: (v) => setState(() => _query = v),
          ),
          const SizedBox(height: 14),
          if (filtered.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 48),
              child: Center(child: Text('No users found', style: TextStyle(color: AppColors.textMuted))),
            )
          else
            ...filtered.map((u) => _tile(u as Map<String, dynamic>)),
        ],
      ),
    );
  }

  Widget _tile(Map<String, dynamic> u) => Container(
    margin: const EdgeInsets.only(bottom: 10),
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(14), border: Border.all(color: AppColors.border)),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            CircleAvatar(
              radius: 18,
              backgroundColor: AppColors.brandPale,
              child: Text(
                (u['full_name'] as String? ?? '?').substring(0, 1).toUpperCase(),
                style: TextStyle(color: AppColors.brand, fontWeight: FontWeight.w700),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(u['full_name'] as String? ?? '—', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                  Text(u['email'] as String? ?? '', style: TextStyle(color: AppColors.textMuted, fontSize: 11)),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        Row(children: [
          Expanded(
            child: DropdownButtonFormField<String>(
              initialValue: _roles.contains(u['role']) ? u['role'] as String : null,
              isDense: true,
              decoration: const InputDecoration(isDense: true, contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 8)),
              items: _roles.map((r) => DropdownMenuItem(value: r, child: Text(r.replaceAll('_', ' '), style: const TextStyle(fontSize: 12)))).toList(),
              onChanged: (v) { if (v != null) _changeRole(u, v); },
            ),
          ),
          const SizedBox(width: 10),
          IconButton(
            onPressed: () => _delete(u),
            icon: Icon(Icons.delete_outline, color: AppColors.redText, size: 20),
          ),
        ]),
      ],
    ),
  );
}
