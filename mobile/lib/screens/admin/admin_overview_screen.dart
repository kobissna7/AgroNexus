import 'package:flutter/material.dart';
import '../../config/theme.dart';
import '../../services/api_service.dart';
import '../../widgets/metric_card.dart';

class AdminOverviewScreen extends StatefulWidget {
  const AdminOverviewScreen({super.key});

  @override
  State<AdminOverviewScreen> createState() => _AdminOverviewScreenState();
}

class _AdminOverviewScreenState extends State<AdminOverviewScreen> {
  Map<String, dynamic>? _stats;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      _stats = await ApiService.getAdminStats();
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator());
    final s = _stats;
    if (s == null) return Center(child: Text('Failed to load stats', style: TextStyle(color: AppColors.textMuted)));

    final users     = s['users'] as Map<String, dynamic>;
    final listings  = s['listings'] as Map<String, dynamic>;
    final orders    = s['orders'] as Map<String, dynamic>;
    final transport = s['transport'] as Map<String, dynamic>;
    final revenue   = (s['revenue_ghs'] as num).toDouble();

    return RefreshIndicator(
      onRefresh: () async { setState(() => _loading = true); await _load(); },
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: const LinearGradient(colors: [AppColors.brandDark, Color(0xFF1A3D2B)]),
              borderRadius: BorderRadius.circular(18),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('TOTAL PLATFORM REVENUE', style: TextStyle(color: Color(0xFFA3C4B0), fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 0.6)),
                const SizedBox(height: 6),
                Text('GH₵ ${revenue.toStringAsFixed(2)}', style: const TextStyle(color: Color(0xFF86EFAC), fontSize: 28, fontWeight: FontWeight.w800)),
                const Text('confirmed + in-transit + delivered orders', style: TextStyle(color: Color(0xFF7A9986), fontSize: 11)),
              ],
            ),
          ),
          const SizedBox(height: 20),
          _section('Users'),
          _grid([
            _stat('Total', users['total'], Icons.people_outline),
            _stat('Farmers', users['farmers'], Icons.agriculture_outlined),
            _stat('Buyers', users['consumers'], Icons.storefront_outlined),
            _stat('Transporters', users['transporters'], Icons.local_shipping_outlined),
            _stat('Admins', users['admins'], Icons.shield_outlined),
          ]),
          const SizedBox(height: 20),
          _section('Listings'),
          _grid([
            _stat('Total', listings['total'], Icons.inventory_2_outlined),
            _stat('Active', listings['active'], Icons.check_circle_outline),
            _stat('Sold', listings['sold'], Icons.sell_outlined),
            _stat('Expired', listings['expired'], Icons.block_outlined),
          ]),
          const SizedBox(height: 20),
          _section('Orders'),
          _grid([
            _stat('Total', orders['total'], Icons.receipt_long_outlined),
            _stat('Pending', orders['pending'], Icons.hourglass_empty),
            _stat('Confirmed', orders['confirmed'], Icons.thumb_up_outlined),
            _stat('In Transit', orders['in_transit'], Icons.local_shipping_outlined),
            _stat('Delivered', orders['delivered'], Icons.check_circle_outline),
            _stat('Cancelled', orders['cancelled'], Icons.cancel_outlined),
          ]),
          const SizedBox(height: 20),
          _section('Transport'),
          _grid([
            _stat('Total', transport['total'], Icons.local_shipping_outlined),
            _stat('Open', transport['open'], Icons.hourglass_empty),
            _stat('In Transit', transport['in_transit'], Icons.route_outlined),
            _stat('Delivered', transport['delivered'], Icons.check_circle_outline),
          ]),
        ],
      ),
    );
  }

  Widget _section(String title) => Padding(
    padding: const EdgeInsets.only(bottom: 10),
    child: Text(title.toUpperCase(), style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.textMuted, letterSpacing: 0.8)),
  );

  ({String label, dynamic value, IconData icon}) _stat(String label, dynamic value, IconData icon) => (label: label, value: value, icon: icon);

  Widget _grid(List<({String label, dynamic value, IconData icon})> items) => GridView.count(
    crossAxisCount: 2,
    shrinkWrap: true,
    physics: const NeverScrollableScrollPhysics(),
    mainAxisSpacing: 10,
    crossAxisSpacing: 10,
    childAspectRatio: 1.9,
    children: items.map((i) => MetricCard(label: i.label, value: '${i.value}', icon: i.icon)).toList(),
  );
}
