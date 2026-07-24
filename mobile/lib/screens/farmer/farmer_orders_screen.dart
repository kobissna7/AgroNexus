import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/theme.dart';
import '../../models/order.dart';
import '../../providers/connectivity_provider.dart';
import '../../services/api_service.dart';
import '../../widgets/offline_banner.dart';
import '../../widgets/metric_card.dart';
import '../../widgets/status_badge.dart';
import '../../widgets/crop_icon.dart';

class FarmerOrdersScreen extends StatefulWidget {
  const FarmerOrdersScreen({super.key});

  @override
  State<FarmerOrdersScreen> createState() => _FarmerOrdersScreenState();
}

class _FarmerOrdersScreenState extends State<FarmerOrdersScreen> {
  List<Order> _orders = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final online = context.read<ConnectivityProvider>().isOnline;
    if (!online) { if (mounted) setState(() => _loading = false); return; }
    try {
      final raw = await ApiService.getFarmerOrders();
      _orders = raw.map((e) => Order.fromJson(e as Map<String, dynamic>)).toList();
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    final pending = _orders.where((o) => o.status == 'pending').length;
    final active  = _orders.where((o) => ['confirmed', 'in_transit'].contains(o.status)).length;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: Column(
        children: [
          Container(
            color: AppColors.brandDark,
            padding: EdgeInsets.only(top: MediaQuery.of(context).padding.top + 16, left: 20, right: 20, bottom: 20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Orders', style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold)),
                const Text('Orders placed on your listings', style: TextStyle(color: Color(0xFFA3C4B0), fontSize: 13)),
              ],
            ),
          ),
          const OfflineBanner(),
          Expanded(
            child: RefreshIndicator(
              onRefresh: () async { setState(() => _loading = true); await _load(); },
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : ListView(
                      padding: const EdgeInsets.all(16),
                      children: [
                        Row(children: [
                          Expanded(child: MetricCard(label: 'Pending', value: '$pending', sub: 'awaiting fulfillment', icon: Icons.hourglass_empty)),
                          const SizedBox(width: 12),
                          Expanded(child: MetricCard(label: 'Active', value: '$active', sub: 'confirmed / in transit', icon: Icons.local_shipping_outlined, iconColor: AppColors.brand)),
                        ]),
                        const SizedBox(height: 20),
                        if (_orders.isEmpty)
                          Padding(
                            padding: const EdgeInsets.symmetric(vertical: 48),
                            child: Center(child: Text('No orders yet', style: TextStyle(color: AppColors.textMuted))),
                          )
                        else
                          ..._orders.map(_tile),
                      ],
                    ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _tile(Order o) => Container(
    margin: const EdgeInsets.only(bottom: 10),
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(14), border: Border.all(color: AppColors.border)),
    child: Row(
      children: [
        CropIcon(o.cropType ?? '', size: 24.0, color: AppColors.textSecond),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('${o.cropType ?? 'Order'} — ${o.quantityKg.toInt()} kg', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
              Text(o.location ?? '', style: TextStyle(color: AppColors.textMuted, fontSize: 11)),
            ],
          ),
        ),
        StatusBadge(o.status),
      ],
    ),
  );
}
