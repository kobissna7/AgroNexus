import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/theme.dart';
import '../../models/transport_request.dart';
import '../../providers/connectivity_provider.dart';
import '../../services/api_service.dart';
import '../../widgets/offline_banner.dart';
import '../../widgets/metric_card.dart';
import '../../widgets/status_badge.dart';
import '../../widgets/delivery_tracker.dart';
import '../../widgets/crop_icon.dart';

class TransporterDeliveriesScreen extends StatefulWidget {
  const TransporterDeliveriesScreen({super.key});

  @override
  State<TransporterDeliveriesScreen> createState() => _TransporterDeliveriesScreenState();
}

class _TransporterDeliveriesScreenState extends State<TransporterDeliveriesScreen> {
  List<TransportRequest> _deliveries = [];
  bool _loading = true;
  String? _updating;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final online = context.read<ConnectivityProvider>().isOnline;
    if (!online) { if (mounted) setState(() => _loading = false); return; }
    try {
      final raw = await ApiService.getMyDeliveries();
      _deliveries = raw.map((e) => TransportRequest.fromJson(e as Map<String, dynamic>)).toList();
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _updateStatus(TransportRequest r, String status) async {
    setState(() => _updating = r.id);
    try {
      await ApiService.updateTransportStatus(r.id, status);
      await _load();
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: const Text('Update failed'), backgroundColor: AppColors.redBg),
        );
      }
    }
    if (mounted) setState(() => _updating = null);
  }

  @override
  Widget build(BuildContext context) {
    final active    = _deliveries.where((r) => ['accepted', 'in_transit'].contains(r.status)).toList();
    final delivered = _deliveries.where((r) => r.status == 'delivered').toList();

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
                const Text('Jobs you\'ve accepted', style: TextStyle(color: Color(0xFFA3C4B0), fontSize: 13)),
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
                          Expanded(child: MetricCard(label: 'Active', value: '${active.length}', sub: 'accepted / in transit', icon: Icons.local_shipping_outlined)),
                          const SizedBox(width: 12),
                          Expanded(child: MetricCard(label: 'Completed', value: '${delivered.length}', sub: 'all time', icon: Icons.check_circle_outline, iconColor: AppColors.brand)),
                        ]),
                        const SizedBox(height: 20),
                        if (_deliveries.isEmpty)
                          Padding(
                            padding: const EdgeInsets.symmetric(vertical: 48),
                            child: Center(child: Text('No deliveries yet — accept a job from the Feed', style: TextStyle(color: AppColors.textMuted))),
                          )
                        else ...[
                          if (active.isNotEmpty) ...[
                            const Text('Active', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                            const SizedBox(height: 8),
                            ...active.map(_card),
                            const SizedBox(height: 16),
                          ],
                          if (delivered.isNotEmpty) ...[
                            const Text('Completed', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                            const SizedBox(height: 8),
                            ...delivered.map(_card),
                          ],
                        ],
                      ],
                    ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _card(TransportRequest r) => Container(
    margin: const EdgeInsets.only(bottom: 12),
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppColors.border)),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            CropIcon(r.cropType, size: 22.0, color: AppColors.textSecond),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('${r.cropType} — ${r.quantityKg.toInt()} kg', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                  Text('${r.pickupLocation} → ${r.deliveryLocation}', style: TextStyle(color: AppColors.textSecond, fontSize: 12)),
                ],
              ),
            ),
            StatusBadge(r.status),
          ],
        ),
        const SizedBox(height: 14),
        DeliveryTracker(status: r.status),
        if (r.status == 'accepted' || r.status == 'in_transit') ...[
          const SizedBox(height: 14),
          SizedBox(
            width: double.infinity,
            child: r.status == 'accepted'
                ? OutlinedButton(
                    onPressed: _updating == r.id ? null : () => _updateStatus(r, 'in_transit'),
                    style: OutlinedButton.styleFrom(foregroundColor: AppColors.brand, side: BorderSide(color: AppColors.brand), shape: const StadiumBorder()),
                    child: Text(_updating == r.id ? 'Updating…' : 'Mark In Transit'),
                  )
                : ElevatedButton(
                    onPressed: _updating == r.id ? null : () => _updateStatus(r, 'delivered'),
                    child: Text(_updating == r.id ? 'Updating…' : 'Mark Delivered'),
                  ),
          ),
        ],
      ],
    ),
  );
}
