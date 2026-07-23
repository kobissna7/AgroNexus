import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../config/constants.dart';
import '../../config/theme.dart';
import '../../models/listing.dart';
import '../../models/order.dart';
import '../../models/forecast.dart';
import '../../providers/auth_provider.dart';
import '../../providers/connectivity_provider.dart';
import '../../services/api_service.dart';
import '../../services/storage_service.dart';
import '../../widgets/offline_banner.dart';
import '../../widgets/metric_card.dart';
import '../../widgets/status_badge.dart';
import 'create_listing_screen.dart';

class FarmerDashboardScreen extends StatefulWidget {
  const FarmerDashboardScreen({super.key});

  @override
  State<FarmerDashboardScreen> createState() => _FarmerDashboardScreenState();
}

class _FarmerDashboardScreenState extends State<FarmerDashboardScreen> {
  List<Listing>      _listings  = [];
  List<Order>        _orders    = [];
  List<CropForecast> _forecasts = [];
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
        final [lRaw, oRaw, fRaw] = await Future.wait([
          ApiService.getMyListings(),
          ApiService.getMyOrders(),
          ApiService.getForecastSummary(),
        ]);
        _listings  = lRaw.map((e) => Listing.fromJson(e as Map<String, dynamic>)).toList();
        _orders    = oRaw.map((e) => Order.fromJson(e as Map<String, dynamic>)).toList();
        _forecasts = (fRaw as List).where((e) => (e as Map)['error'] == null)
            .map((e) => CropForecast.fromJson(e as Map<String, dynamic>)).toList();
        await StorageService.cacheList(AppConstants.listingsBox, lRaw);
        await StorageService.cacheList(AppConstants.ordersBox, oRaw);
        await StorageService.cacheList(AppConstants.forecastsBox, fRaw as List);
      } else {
        final lRaw = await StorageService.getCachedList(AppConstants.listingsBox);
        final oRaw = await StorageService.getCachedList(AppConstants.ordersBox);
        final fRaw = await StorageService.getCachedList(AppConstants.forecastsBox);
        if (lRaw != null) _listings  = lRaw.map((e) => Listing.fromJson(e as Map<String, dynamic>)).toList();
        if (oRaw != null) _orders    = oRaw.map((e) => Order.fromJson(e as Map<String, dynamic>)).toList();
        if (fRaw != null) _forecasts = fRaw.where((e) => (e as Map)['error'] == null)
            .map((e) => CropForecast.fromJson(e as Map<String, dynamic>)).toList();
      }
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    final user      = context.watch<AuthProvider>().user!;
    final activeKg  = _listings.where((l) => l.status == 'active').fold(0.0, (s, l) => s + l.quantityKg);
    final pendingOrders = _orders.where((o) => o.status == 'pending').length;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: Column(
        children: [
          // Dark header
          Container(
            color: AppColors.brandDark,
            padding: EdgeInsets.only(
              top: MediaQuery.of(context).padding.top + 16,
              left: 20, right: 20, bottom: 20,
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Hello, ${user.fullName.split(' ').first}',
                        style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold)),
                      const Text('Farmer Dashboard', style: TextStyle(color: Color(0xFFA3C4B0), fontSize: 13)),
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
          ),
          const OfflineBanner(),
          Expanded(
            child: RefreshIndicator(
              onRefresh: () async { setState(() { _loading = true; }); await _load(); },
              child: _loading
                ? const Center(child: CircularProgressIndicator())
                : ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      // Metrics
                      Row(children: [
                        Expanded(child: MetricCard(
                          label: 'Active Listings', value: '${_listings.where((l) => l.status == 'active').length}',
                          sub: '${activeKg.toInt()} kg available', icon: Icons.inventory_2_outlined,
                        )),
                        const SizedBox(width: 12),
                        Expanded(child: MetricCard(
                          label: 'Pending Orders', value: '$pendingOrders',
                          sub: '${_orders.length} total', icon: Icons.receipt_long_outlined,
                          iconColor: AppColors.brand,
                        )),
                      ]),
                      const SizedBox(height: 20),
                      // Forecast strip
                      if (_forecasts.isNotEmpty) ...[
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('7-Day Demand Forecast', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                            Text('${_forecasts.first.mapePct.toStringAsFixed(1)}% MAPE',
                              style: TextStyle(color: AppColors.textMuted, fontSize: 12)),
                          ],
                        ),
                        const SizedBox(height: 10),
                        SizedBox(
                          height: 110,
                          child: ListView.separated(
                            scrollDirection: Axis.horizontal,
                            itemCount: _forecasts.take(6).length,
                            separatorBuilder: (_, __) => const SizedBox(width: 10),
                            itemBuilder: (_, i) {
                              final fc = _forecasts[i];
                              final trend = fc.trend;
                              final (tIcon, tColor) = trend == 'up'
                                ? (Icons.trending_up, AppColors.greenText)
                                : trend == 'down'
                                ? (Icons.trending_down, AppColors.redText)
                                : (Icons.trending_flat, AppColors.amberText);
                              return Container(
                                width: 100,
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: AppColors.surface,
                                  borderRadius: BorderRadius.circular(14),
                                  border: Border.all(color: AppColors.border),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(AppConstants.cropIcons[fc.cropType] ?? '🌱', style: const TextStyle(fontSize: 20)),
                                    const SizedBox(height: 4),
                                    Text(fc.cropType, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600), maxLines: 1, overflow: TextOverflow.ellipsis),
                                    Text('${fc.weeklyPredW1.toInt()} kg/wk', style: TextStyle(fontSize: 10, color: AppColors.textSecond)),
                                    const Spacer(),
                                    Icon(tIcon, color: tColor, size: 18),
                                  ],
                                ),
                              );
                            },
                          ),
                        ),
                        const SizedBox(height: 20),
                      ],
                      // Listings
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('My Listings', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                          TextButton.icon(
                            onPressed: () => context.push('/farmer/listing/new'),
                            icon: const Icon(Icons.add, size: 16),
                            label: const Text('Add'),
                            style: TextButton.styleFrom(foregroundColor: AppColors.brand),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      if (_listings.isEmpty)
                        _empty('No listings yet — tap Add to create one')
                      else
                        ..._listings.take(5).map((l) => _listingTile(l)),
                      const SizedBox(height: 20),
                      // Recent orders
                      const Text('Recent Orders', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                      const SizedBox(height: 8),
                      if (_orders.isEmpty)
                        _empty('No orders yet')
                      else
                        ..._orders.take(5).map((o) => _orderTile(o)),
                    ],
                  ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _listingTile(Listing l) => Container(
    margin: const EdgeInsets.only(bottom: 10),
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(
      color: AppColors.surface,
      borderRadius: BorderRadius.circular(14),
      border: Border.all(color: AppColors.border),
    ),
    child: Row(
      children: [
        Text(AppConstants.cropIcons[l.cropType] ?? '🌱', style: const TextStyle(fontSize: 24)),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(l.cropType, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
              Text('${l.quantityKg.toInt()} kg · GH₵ ${l.pricePerKg.toStringAsFixed(2)}/kg',
                style: TextStyle(color: AppColors.textSecond, fontSize: 12)),
              Text(l.location, style: TextStyle(color: AppColors.textMuted, fontSize: 11)),
            ],
          ),
        ),
        StatusBadge(l.status),
      ],
    ),
  );

  Widget _orderTile(Order o) => Container(
    margin: const EdgeInsets.only(bottom: 10),
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
              Text('GH₵ ${o.total.toStringAsFixed(2)}',
                style: TextStyle(color: AppColors.textSecond, fontSize: 12)),
            ],
          ),
        ),
        StatusBadge(o.status),
      ],
    ),
  );

  Widget _empty(String msg) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 24),
    child: Center(child: Text(msg, style: TextStyle(color: AppColors.textMuted, fontSize: 13))),
  );
}
