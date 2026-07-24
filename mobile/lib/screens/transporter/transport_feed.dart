import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../config/constants.dart';
import '../../config/theme.dart';
import '../../models/transport_request.dart';
import '../../providers/auth_provider.dart';
import '../../providers/connectivity_provider.dart';
import '../../services/api_service.dart';
import '../../services/storage_service.dart';
import '../../widgets/offline_banner.dart';
import '../../widgets/metric_card.dart';
import '../../widgets/status_badge.dart';
import '../../widgets/crop_icon.dart';

class TransportFeedScreen extends StatefulWidget {
  const TransportFeedScreen({super.key});

  @override
  State<TransportFeedScreen> createState() => _TransportFeedScreenState();
}

class _TransportFeedScreenState extends State<TransportFeedScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabs = TabController(length: 2, vsync: this);
  List<TransportRequest> _requests = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final online = context.read<ConnectivityProvider>().isOnline;
    try {
      if (online) {
        final raw = await ApiService.getTransportRequests();
        await StorageService.cacheList(AppConstants.transportBox, raw);
        _requests = raw.map((e) => TransportRequest.fromJson(e as Map<String, dynamic>)).toList();
      } else {
        final raw = await StorageService.getCachedList(AppConstants.transportBox);
        if (raw != null) {
          _requests = raw.map((e) => TransportRequest.fromJson(e as Map<String, dynamic>)).toList();
        }
      }
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _accept(TransportRequest req) async {
    try {
      await ApiService.acceptRequest(req.id);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Request accepted!'), backgroundColor: AppColors.brand),
      );
      await _load();
    } catch (_) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to accept'), backgroundColor: AppColors.redBg),
      );
    }
  }

  Future<void> _updateStatus(TransportRequest req, String status) async {
    try {
      await ApiService.updateTransportStatus(req.id, status);
      final label = status == 'in_transit' ? 'Marked in transit' : 'Marked delivered ✓';
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(label), backgroundColor: AppColors.brand),
      );
      await _load();
    } catch (_) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Update failed'), backgroundColor: AppColors.redBg),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final user     = context.watch<AuthProvider>().user!;
    final open     = _requests.where((r) => r.isOpen).toList();
    final active   = _requests.where((r) => r.isAccepted || r.isInTransit).toList();
    final done     = _requests.where((r) => r.isDelivered).toList();

    return Scaffold(
      backgroundColor: AppColors.background,
      body: Column(
        children: [
          // Header
          Container(
            color: AppColors.brandDark,
            padding: EdgeInsets.only(
              top: MediaQuery.of(context).padding.top + 16,
              left: 20, right: 20, bottom: 0,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Hello, ${user.fullName.split(' ').first}',
                            style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
                          const Text('Transporter · Western Region', style: TextStyle(color: Color(0xFFA3C4B0), fontSize: 12)),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.logout, color: Colors.white70),
                      onPressed: () async {
                        await context.read<AuthProvider>().logout();
                        if (mounted) context.go('/login');
                      },
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                TabBar(
                  controller: _tabs,
                  labelColor: Colors.white,
                  unselectedLabelColor: const Color(0xFF4A7C5E),
                  indicatorColor: Colors.white,
                  tabs: [
                    Tab(text: 'Open (${open.length})'),
                    Tab(text: 'Active (${active.length})'),
                  ],
                ),
              ],
            ),
          ),
          const OfflineBanner(),
          // Metrics
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
            child: Row(children: [
              Expanded(child: MetricCard(
                label: 'Available', value: '${open.length}',
                sub: 'open requests', icon: Icons.local_shipping_outlined,
              )),
              const SizedBox(width: 12),
              Expanded(child: MetricCard(
                label: 'Completed', value: '${done.length}',
                sub: 'deliveries', icon: Icons.check_circle_outline,
                iconColor: AppColors.brand,
              )),
            ]),
          ),
          const SizedBox(height: 8),
          Expanded(
            child: TabBarView(
              controller: _tabs,
              children: [
                _requestList(open, isOpen: true),
                _requestList(active, isOpen: false),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _requestList(List<TransportRequest> items, {required bool isOpen}) {
    if (_loading) return const Center(child: CircularProgressIndicator());
    if (items.isEmpty) {
      return Center(child: Text(
        isOpen ? 'No open requests right now' : 'No active deliveries',
        style: TextStyle(color: AppColors.textMuted),
      ));
    }
    return RefreshIndicator(
      onRefresh: () async { setState(() => _loading = true); await _load(); },
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: items.length,
        itemBuilder: (_, i) => _requestCard(items[i], isOpen: isOpen),
      ),
    );
  }

  Widget _requestCard(TransportRequest req, {required bool isOpen}) {
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
              CropIcon(req.cropType, size: 22.0, color: AppColors.textSecond),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('${req.cropType} — ${req.quantityKg.toInt()} kg',
                      style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                    Text('From: ${req.pickupLocation}', style: TextStyle(color: AppColors.textSecond, fontSize: 12)),
                    Text('To: ${req.deliveryLocation}', style: TextStyle(color: AppColors.textMuted, fontSize: 12)),
                  ],
                ),
              ),
              StatusBadge(req.status),
            ],
          ),
          const SizedBox(height: 12),
          if (isOpen)
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () => _accept(req),
                child: const Text('Accept Delivery'),
              ),
            )
          else
            Row(children: [
              if (req.isAccepted)
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => _updateStatus(req, 'in_transit'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.brand,
                      side: BorderSide(color: AppColors.brand),
                      shape: const StadiumBorder(),
                    ),
                    child: const Text('Mark In Transit'),
                  ),
                ),
              if (req.isInTransit) ...[
                Expanded(
                  child: ElevatedButton(
                    onPressed: () => _updateStatus(req, 'delivered'),
                    style: ElevatedButton.styleFrom(backgroundColor: AppColors.brand),
                    child: const Text('Mark Delivered'),
                  ),
                ),
              ],
            ]),
        ],
      ),
    );
  }
}
