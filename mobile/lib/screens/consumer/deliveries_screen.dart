import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/constants.dart';
import '../../config/theme.dart';
import '../../models/order.dart';
import '../../providers/connectivity_provider.dart';
import '../../services/api_service.dart';
import '../../services/storage_service.dart';
import '../../widgets/offline_banner.dart';
import '../../widgets/metric_card.dart';
import '../../widgets/status_badge.dart';
import '../../widgets/delivery_tracker.dart';
import '../../widgets/crop_icon.dart';

class ConsumerDeliveriesScreen extends StatefulWidget {
  const ConsumerDeliveriesScreen({super.key});

  @override
  State<ConsumerDeliveriesScreen> createState() => _ConsumerDeliveriesScreenState();
}

class _ConsumerDeliveriesScreenState extends State<ConsumerDeliveriesScreen> {
  List<Order> _orders  = [];
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
    final deliveries = _orders.where((o) => o.delivery != null).toList();
    final open      = deliveries.where((o) => o.delivery!.status == 'open').length;
    final active    = deliveries.where((o) => ['accepted', 'in_transit'].contains(o.delivery!.status)).length;
    final delivered = deliveries.where((o) => o.delivery!.status == 'delivered').length;

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
                const Text('My Deliveries', style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold)),
                const Text('Live status straight from the transporter', style: TextStyle(color: Color(0xFFA3C4B0), fontSize: 13)),
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
                          Expanded(child: MetricCard(label: 'Awaiting', value: '$open', sub: 'not yet claimed', icon: Icons.inbox_outlined)),
                          const SizedBox(width: 12),
                          Expanded(child: MetricCard(label: 'En Route', value: '$active', sub: 'accepted / transit', icon: Icons.local_shipping_outlined)),
                          const SizedBox(width: 12),
                          Expanded(child: MetricCard(label: 'Delivered', value: '$delivered', sub: 'all time', icon: Icons.check_circle_outline, iconColor: AppColors.brand)),
                        ]),
                        const SizedBox(height: 20),
                        if (deliveries.isEmpty)
                          Padding(
                            padding: const EdgeInsets.symmetric(vertical: 48),
                            child: Center(child: Text('No deliveries yet', style: TextStyle(color: AppColors.textMuted))),
                          )
                        else
                          ...deliveries.map(_deliveryCard),
                      ],
                    ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _deliveryCard(Order o) {
    final d = o.delivery!;
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CropIcon(o.cropType ?? '', size: 22.0, color: AppColors.textSecond),
              const SizedBox(width: 10),
              Expanded(
                child: Text(o.cropType ?? 'Order', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
              ),
              StatusBadge(d.status),
            ],
          ),
          const SizedBox(height: 10),
          Row(children: [
            Icon(Icons.circle, size: 6, color: AppColors.textMuted),
            const SizedBox(width: 6),
            Expanded(child: Text('From: ${d.pickupLocation}', style: TextStyle(color: AppColors.textSecond, fontSize: 12))),
          ]),
          const SizedBox(height: 3),
          Row(children: [
            Icon(Icons.circle, size: 6, color: AppColors.textMuted),
            const SizedBox(width: 6),
            Expanded(child: Text('To: ${d.deliveryLocation}', style: TextStyle(color: AppColors.textSecond, fontSize: 12))),
          ]),
          if (d.transporterName != null) ...[
            const SizedBox(height: 6),
            Row(children: [
              Icon(Icons.person_outline, size: 14, color: AppColors.brand),
              const SizedBox(width: 6),
              Text(
                d.transporterPhone != null ? '${d.transporterName} · ${d.transporterPhone}' : d.transporterName!,
                style: TextStyle(color: AppColors.textPrimary, fontSize: 12, fontWeight: FontWeight.w600),
              ),
            ]),
          ],
          const SizedBox(height: 16),
          DeliveryTracker(status: d.status),
        ],
      ),
    );
  }
}
