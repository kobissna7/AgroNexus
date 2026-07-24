import 'package:flutter/material.dart';
import '../../config/theme.dart';
import '../../models/forecast.dart';
import '../../services/api_service.dart';
import '../../widgets/metric_card.dart';
import '../../widgets/crop_icon.dart';

class AdminInsightsScreen extends StatefulWidget {
  const AdminInsightsScreen({super.key});

  @override
  State<AdminInsightsScreen> createState() => _AdminInsightsScreenState();
}

class _AdminInsightsScreenState extends State<AdminInsightsScreen> {
  List<CropForecast> _forecasts = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final raw = await ApiService.getForecastSummary();
      _forecasts = raw.where((e) => (e as Map)['error'] == null)
          .map((e) => CropForecast.fromJson(e as Map<String, dynamic>)).toList();
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator());
    if (_forecasts.isEmpty) {
      return Center(child: Text('No forecast data — check the ML service', style: TextStyle(color: AppColors.textMuted)));
    }

    final totalW1 = _forecasts.fold(0.0, (s, f) => s + f.weeklyPredW1);
    final totalW2 = _forecasts.fold(0.0, (s, f) => s + f.weeklyPredW2);
    final avgMape = _forecasts.fold(0.0, (s, f) => s + f.mapePct) / _forecasts.length;
    final rising  = _forecasts.where((f) => f.trend == 'up').length;

    final byRegion = <String, List<CropForecast>>{};
    for (final f in _forecasts) {
      byRegion.putIfAbsent(f.region, () => []).add(f);
    }

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 10,
            crossAxisSpacing: 10,
            childAspectRatio: 1.7,
            children: [
              MetricCard(label: 'Week 1 Demand', value: '${totalW1.toInt()} kg', icon: Icons.calendar_today_outlined),
              MetricCard(label: 'Week 2 Demand', value: '${totalW2.toInt()} kg', icon: Icons.calendar_month_outlined),
              MetricCard(label: 'Avg MAPE', value: '${avgMape.toStringAsFixed(1)}%', icon: Icons.speed_outlined),
              MetricCard(label: 'Rising Trends', value: '$rising / ${_forecasts.length}', icon: Icons.trending_up, iconColor: AppColors.brand),
            ],
          ),
          const SizedBox(height: 24),
          ...byRegion.entries.map((entry) => Padding(
            padding: const EdgeInsets.only(bottom: 20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(entry.key, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                const SizedBox(height: 8),
                ...entry.value.map(_cropTile),
              ],
            ),
          )),
        ],
      ),
    );
  }

  Widget _cropTile(CropForecast f) => Container(
    margin: const EdgeInsets.only(bottom: 8),
    padding: const EdgeInsets.all(12),
    decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border)),
    child: Row(
      children: [
        CropIcon(f.cropType, size: 18.0, color: AppColors.textSecond),
        const SizedBox(width: 10),
        Expanded(child: Text(f.cropType, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13))),
        Text('${f.weeklyPredW1.toInt()} kg/wk', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
        const SizedBox(width: 8),
        Icon(
          f.trend == 'up' ? Icons.trending_up : f.trend == 'down' ? Icons.trending_down : Icons.trending_flat,
          size: 15,
          color: f.trend == 'up' ? AppColors.greenText : f.trend == 'down' ? AppColors.redText : AppColors.textMuted,
        ),
        const SizedBox(width: 10),
        Text('${f.mapePct.toStringAsFixed(1)}%', style: TextStyle(fontSize: 11, color: AppColors.textMuted)),
      ],
    ),
  );
}
