import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/constants.dart';
import '../../config/theme.dart';
import '../../models/order.dart';
import '../../providers/connectivity_provider.dart';
import '../../services/api_service.dart';
import '../../services/storage_service.dart';
import '../../widgets/offline_banner.dart';
import '../../widgets/status_badge.dart';

class ConsumerOrdersScreen extends StatefulWidget {
  const ConsumerOrdersScreen({super.key});

  @override
  State<ConsumerOrdersScreen> createState() => _ConsumerOrdersScreenState();
}

class _ConsumerOrdersScreenState extends State<ConsumerOrdersScreen> {
  List<Order> _orders = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final online = context.read<ConnectivityProvider>().isOnline;
    try {
      if (online) {
        final raw = await ApiService.getMyOrders();
        await StorageService.cacheList(AppConstants.ordersBox, raw);
        _orders = raw.map((e) => Order.fromJson(e as Map<String, dynamic>)).toList();
      } else {
        final raw = await StorageService.getCachedList(AppConstants.ordersBox);
        if (raw != null) _orders = raw.map((e) => Order.fromJson(e as Map<String, dynamic>)).toList();
      }
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    final totalSpend = _orders.fold(0.0, (s, o) => s + o.total);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(title: const Text('My Orders'), backgroundColor: AppColors.brandDark),
      body: Column(
        children: [
          const OfflineBanner(),
          // Summary bar
          Container(
            margin: const EdgeInsets.all(16),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.brandPale,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.brandLight),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _stat('${_orders.length}', 'Orders'),
                Container(width: 1, height: 32, color: AppColors.brandLight),
                _stat('${_orders.where((o) => o.status == 'delivered').length}', 'Delivered'),
                Container(width: 1, height: 32, color: AppColors.brandLight),
                _stat('GH₵ ${totalSpend.toStringAsFixed(0)}', 'Total Spent'),
              ],
            ),
          ),
          Expanded(
            child: _loading
              ? const Center(child: CircularProgressIndicator())
              : _orders.isEmpty
                ? Center(child: Text('No orders yet', style: TextStyle(color: AppColors.textMuted)))
                : RefreshIndicator(
                    onRefresh: () async { setState(() => _loading = true); await _load(); },
                    child: ListView.builder(
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                      itemCount: _orders.length,
                      itemBuilder: (_, i) => _orderCard(_orders[i]),
                    ),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _stat(String value, String label) => Column(
    children: [
      Text(value, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.brand)),
      Text(label, style: TextStyle(color: AppColors.textSecond, fontSize: 11)),
    ],
  );

  Widget _orderCard(Order o) => Container(
    margin: const EdgeInsets.only(bottom: 12),
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(
      color: AppColors.surface,
      borderRadius: BorderRadius.circular(14),
      border: Border.all(color: AppColors.border),
    ),
    child: Row(
      children: [
        Text(AppConstants.cropIcons[o.cropType ?? ''] ?? '📦', style: const TextStyle(fontSize: 24)),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('${o.cropType ?? 'Order'} — ${o.quantityKg.toInt()} kg',
                style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
              Text('GH₵ ${o.total.toStringAsFixed(2)} · ${o.location ?? ''}',
                style: TextStyle(color: AppColors.textSecond, fontSize: 12)),
              Text(o.createdAt.split('T').first, style: TextStyle(color: AppColors.textMuted, fontSize: 11)),
            ],
          ),
        ),
        StatusBadge(o.status),
      ],
    ),
  );
}
