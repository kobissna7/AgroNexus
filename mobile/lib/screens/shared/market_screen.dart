import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/theme.dart';
import '../../providers/connectivity_provider.dart';
import '../../services/api_service.dart';
import '../../widgets/offline_banner.dart';
import '../../widgets/metric_card.dart';
import '../../widgets/status_badge.dart';
import '../../widgets/crop_icon.dart';

class _PriceRow {
  final String cropType, region;
  final double currentPrice;
  final double? previousPrice;
  _PriceRow({required this.cropType, required this.region, required this.currentPrice, this.previousPrice});
}

class MarketScreen extends StatefulWidget {
  const MarketScreen({super.key});

  @override
  State<MarketScreen> createState() => _MarketScreenState();
}

class _MarketScreenState extends State<MarketScreen> {
  List<_PriceRow> _prices = [];
  Map<String, double> _supply = {};
  List<dynamic> _activity = [];
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
      final results = await Future.wait([
        ApiService.getDashboardPrices(),
        ApiService.getDashboardSupply(),
        ApiService.getDashboardActivity(),
      ]);
      final pRaw = results[0];
      final sRaw = results[1];
      _activity = results[2];
      _prices = pRaw.map((e) {
        final m = e as Map<String, dynamic>;
        final history = (m['history'] as List<dynamic>?) ?? [];
        final prev = history.length > 1 ? (history.first['price_per_kg'] as num?)?.toDouble() : null;
        return _PriceRow(
          cropType: m['crop_type'] as String,
          region: m['region'] as String? ?? '',
          currentPrice: (m['current_price'] as num).toDouble(),
          previousPrice: prev,
        );
      }).toList();
      _supply = {
        for (final e in sRaw)
          (e as Map<String, dynamic>)['crop_type'] as String: (e['total_kg'] as num).toDouble(),
      };
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    final totalSupply = _supply.values.fold(0.0, (a, b) => a + b);

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
                Row(children: [
                  const Expanded(
                    child: Text('Market Dashboard', style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold)),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(color: Colors.white.withOpacity(0.12), borderRadius: BorderRadius.circular(999)),
                    child: const Row(mainAxisSize: MainAxisSize.min, children: [
                      Icon(Icons.circle, size: 6, color: Color(0xFF86EFAC)),
                      SizedBox(width: 5),
                      Text('LIVE', style: TextStyle(color: Color(0xFF86EFAC), fontSize: 10, fontWeight: FontWeight.w700)),
                    ]),
                  ),
                ]),
                const Text('Real-time prices and regional supply', style: TextStyle(color: Color(0xFFA3C4B0), fontSize: 13)),
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
                          Expanded(child: MetricCard(label: 'Crops Tracked', value: '${_prices.length}', sub: 'Western Region', icon: Icons.eco_outlined)),
                          const SizedBox(width: 12),
                          Expanded(child: MetricCard(label: 'Active Supply', value: '${totalSupply.toInt()}kg', sub: 'across listings', icon: Icons.inventory_2_outlined)),
                        ]),
                        const SizedBox(height: 20),
                        const Text('Prices · GH₵ per kg', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                        const SizedBox(height: 8),
                        if (_prices.isEmpty)
                          _empty('No price data yet')
                        else
                          ..._prices.map(_priceTile),
                        const SizedBox(height: 20),
                        const Text('Recent Activity', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                        const SizedBox(height: 8),
                        if (_activity.isEmpty)
                          _empty('No recent orders')
                        else
                          ..._activity.take(8).map((a) => _activityTile(a as Map<String, dynamic>)),
                      ],
                    ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _priceTile(_PriceRow p) {
    final trend = p.previousPrice == null ? 0.0 : p.currentPrice - p.previousPrice!;
    final (icon, color) = trend > 0
        ? (Icons.trending_up, AppColors.greenText)
        : trend < 0
            ? (Icons.trending_down, AppColors.redText)
            : (Icons.trending_flat, AppColors.textMuted);
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(14), border: Border.all(color: AppColors.border)),
      child: Row(
        children: [
          CropIcon(p.cropType, size: 22.0, color: AppColors.textSecond),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(p.cropType, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                Text(p.region, style: TextStyle(color: AppColors.textMuted, fontSize: 11)),
              ],
            ),
          ),
          Text('GH₵ ${p.currentPrice.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
          const SizedBox(width: 8),
          Icon(icon, color: color, size: 18),
        ],
      ),
    );
  }

  Widget _activityTile(Map<String, dynamic> a) {
    final listing = a['produce_listings'] as Map<String, dynamic>?;
    final crop = listing?['crop_type'] as String? ?? 'produce';
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(14), border: Border.all(color: AppColors.border)),
      child: Row(
        children: [
          CropIcon(crop, size: 22.0, color: AppColors.textSecond),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('${a['quantity_kg']} kg $crop', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                Text(listing?['location'] as String? ?? '', style: TextStyle(color: AppColors.textMuted, fontSize: 11)),
              ],
            ),
          ),
          StatusBadge(a['status'] as String),
        ],
      ),
    );
  }

  Widget _empty(String msg) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 24),
    child: Center(child: Text(msg, style: TextStyle(color: AppColors.textMuted, fontSize: 13))),
  );
}
