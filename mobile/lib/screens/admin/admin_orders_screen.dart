import 'package:flutter/material.dart';
import '../../config/theme.dart';
import '../../services/api_service.dart';
import '../../widgets/status_badge.dart';
import '../../widgets/crop_icon.dart';

class AdminOrdersScreen extends StatefulWidget {
  const AdminOrdersScreen({super.key});

  @override
  State<AdminOrdersScreen> createState() => _AdminOrdersScreenState();
}

class _AdminOrdersScreenState extends State<AdminOrdersScreen> {
  List<dynamic> _orders = [];
  bool _loading = true;
  String _filter = 'all';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      _orders = await ApiService.getAdminOrders();
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator());

    final statuses = ['pending', 'confirmed', 'in_transit', 'delivered', 'cancelled'];
    final filtered = _filter == 'all'
        ? _orders
        : _orders.where((o) => (o as Map<String, dynamic>)['status'] == _filter).toList();

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          SizedBox(
            height: 34,
            child: ListView(
              scrollDirection: Axis.horizontal,
              children: [
                _filterChip('all', 'All'),
                ...statuses.map((s) => _filterChip(s, s.replaceAll('_', ' '))),
              ],
            ),
          ),
          const SizedBox(height: 14),
          if (filtered.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 48),
              child: Center(child: Text('No orders found', style: TextStyle(color: AppColors.textMuted))),
            )
          else
            ...filtered.map((o) => _tile(o as Map<String, dynamic>)),
        ],
      ),
    );
  }

  Widget _filterChip(String value, String label) => Padding(
    padding: const EdgeInsets.only(right: 8),
    child: ChoiceChip(
      label: Text(label, style: TextStyle(fontSize: 11, color: _filter == value ? Colors.white : AppColors.textSecond)),
      selected: _filter == value,
      selectedColor: AppColors.brand,
      onSelected: (_) => setState(() => _filter = value),
    ),
  );

  Widget _tile(Map<String, dynamic> o) {
    final listing = o['produce_listings'] as Map<String, dynamic>?;
    final buyer    = o['users'] as Map<String, dynamic>?;
    final farmer   = listing?['users'] as Map<String, dynamic>?;
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(14), border: Border.all(color: AppColors.border)),
      child: Row(
        children: [
          CropIcon(listing?['crop_type'] ?? '', size: 22, color: AppColors.textSecond),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('${listing?['crop_type'] ?? 'Order'} — ${(o['quantity_kg'] as num).toInt()} kg', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                Text('${buyer?['full_name'] ?? '—'} ← ${farmer?['full_name'] ?? '—'}', style: TextStyle(color: AppColors.textMuted, fontSize: 11)),
              ],
            ),
          ),
          StatusBadge(o['status'] as String),
        ],
      ),
    );
  }
}
