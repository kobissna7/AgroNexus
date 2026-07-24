import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:provider/provider.dart';
import '../../config/constants.dart';
import '../../config/theme.dart';
import '../../models/forecast.dart';
import '../../providers/connectivity_provider.dart';
import '../../services/api_service.dart';
import '../../widgets/crop_icon.dart';

class ForecastsScreen extends StatefulWidget {
  const ForecastsScreen({super.key});

  @override
  State<ForecastsScreen> createState() => _ForecastsScreenState();
}

class _ForecastsScreenState extends State<ForecastsScreen> {
  List<CropForecast> _forecasts = [];
  bool _loading = true;
  String _crop = 'maize';
  String _region = 'Tarkwa';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final online = context.read<ConnectivityProvider>().isOnline;
    if (!online) { if (mounted) setState(() => _loading = false); return; }
    try {
      final raw = await ApiService.getForecastSummary();
      _forecasts = raw.where((e) => (e as Map)['error'] == null)
          .map((e) => CropForecast.fromJson(e as Map<String, dynamic>)).toList();
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  CropForecast? get _selected {
    for (final f in _forecasts) {
      if (f.cropType == _crop && f.region == _region) return f;
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final sel = _selected;
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
                const Text('Demand Forecast', style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold)),
                const Text('7-day projections · MLP neural network', style: TextStyle(color: Color(0xFFA3C4B0), fontSize: 13)),
                if (sel != null) ...[
                  const SizedBox(height: 12),
                  Text('${sel.mapePct.toStringAsFixed(1)}% MAPE',
                      style: const TextStyle(color: Color(0xFF86EFAC), fontSize: 18, fontWeight: FontWeight.w800)),
                ],
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
            child: Column(
              children: [
                SizedBox(
                  height: 36,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    itemCount: AppConstants.crops.length,
                    separatorBuilder: (_, __) => const SizedBox(width: 8),
                    itemBuilder: (_, i) {
                      final c = AppConstants.crops[i];
                      final sel = c == _crop;
                      return ChoiceChip(
                        label: Row(mainAxisSize: MainAxisSize.min, children: [
                          CropIcon(c, size: 13, color: sel ? Colors.white : AppColors.textSecond),
                          const SizedBox(width: 5),
                          Text(c, style: TextStyle(fontSize: 12, color: sel ? Colors.white : AppColors.textSecond)),
                        ]),
                        selected: sel,
                        selectedColor: AppColors.brand,
                        onSelected: (_) => setState(() => _crop = c),
                      );
                    },
                  ),
                ),
                const SizedBox(height: 8),
                SizedBox(
                  height: 36,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    itemCount: AppConstants.regions.length,
                    separatorBuilder: (_, __) => const SizedBox(width: 8),
                    itemBuilder: (_, i) {
                      final r = AppConstants.regions[i];
                      final sel = r == _region;
                      return ChoiceChip(
                        label: Text(r, style: TextStyle(fontSize: 12, color: sel ? Colors.white : AppColors.textSecond)),
                        selected: sel,
                        selectedColor: AppColors.brand,
                        onSelected: (_) => setState(() => _region = r),
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: RefreshIndicator(
              onRefresh: () async { setState(() => _loading = true); await _load(); },
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : ListView(
                      padding: const EdgeInsets.all(16),
                      children: [
                        if (sel == null)
                          Padding(
                            padding: const EdgeInsets.symmetric(vertical: 48),
                            child: Center(child: Text('No forecast for this selection', style: TextStyle(color: AppColors.textMuted))),
                          )
                        else ...[
                          Row(children: [
                            Expanded(child: _statCard('Week 1', '${sel.weeklyPredW1.toInt()} kg')),
                            const SizedBox(width: 12),
                            Expanded(child: _statCard('Week 2', '${sel.weeklyPredW2.toInt()} kg', trend: sel.trend)),
                          ]),
                          const SizedBox(height: 20),
                          const Text('Daily Demand · Next 7 Days', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                          const SizedBox(height: 12),
                          SizedBox(height: 180, child: _barChart(sel)),
                          const SizedBox(height: 20),
                        ],
                        const Text('All Crops · This Region', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                        const SizedBox(height: 8),
                        ...AppConstants.crops.map((c) {
                          CropForecast? fc;
                          for (final f in _forecasts) {
                            if (f.cropType == c && f.region == _region) { fc = f; break; }
                          }
                          return _cropRow(c, fc);
                        }),
                      ],
                    ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _statCard(String label, String value, {String? trend}) => Container(
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(14), border: Border.all(color: AppColors.border)),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label.toUpperCase(), style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: AppColors.textMuted, letterSpacing: 0.6)),
        const SizedBox(height: 6),
        Text(value, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
        if (trend != null) ...[
          const SizedBox(height: 4),
          Text(
            trend == 'up' ? '↑ Rising' : trend == 'down' ? '↓ Falling' : '→ Stable',
            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: trend == 'up' ? AppColors.greenText : AppColors.textMuted),
          ),
        ],
      ],
    ),
  );

  Widget _barChart(CropForecast fc) {
    final maxY = fc.forecast.fold(0.0, (m, d) => d.demandKg > m ? d.demandKg : m) * 1.2;
    return BarChart(
      BarChartData(
        maxY: maxY == 0 ? 10 : maxY,
        gridData: const FlGridData(show: false),
        borderData: FlBorderData(show: false),
        titlesData: FlTitlesData(
          leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          bottomTitles: AxisTitles(sideTitles: SideTitles(
            showTitles: true, reservedSize: 24,
            getTitlesWidget: (v, meta) {
              final i = v.toInt();
              if (i < 0 || i >= fc.forecast.length) return const SizedBox.shrink();
              return Padding(
                padding: const EdgeInsets.only(top: 6),
                child: Text(fc.forecast[i].dayOfWeek.substring(0, 3), style: TextStyle(fontSize: 10, color: AppColors.textMuted)),
              );
            },
          )),
        ),
        barGroups: fc.forecast.asMap().entries.map((e) => BarChartGroupData(
          x: e.key,
          barRods: [BarChartRodData(
            toY: e.value.demandKg,
            color: e.value.festival ? const Color(0xFFDCA83C) : AppColors.brand,
            width: 18,
            borderRadius: BorderRadius.circular(4),
          )],
        )).toList(),
      ),
    );
  }

  Widget _cropRow(String crop, CropForecast? fc) => Container(
    margin: const EdgeInsets.only(bottom: 10),
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(14), border: Border.all(color: AppColors.border)),
    child: Row(
      children: [
        CropIcon(crop, size: 22.0, color: AppColors.textSecond),
        const SizedBox(width: 12),
        Expanded(child: Text(crop, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14))),
        if (fc == null)
          Text('—', style: TextStyle(color: AppColors.textMuted))
        else ...[
          Text('${fc.weeklyPredW1.toInt()} kg/wk', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
          const SizedBox(width: 8),
          Icon(
            fc.trend == 'up' ? Icons.trending_up : fc.trend == 'down' ? Icons.trending_down : Icons.trending_flat,
            size: 16,
            color: fc.trend == 'up' ? AppColors.greenText : fc.trend == 'down' ? AppColors.redText : AppColors.textMuted,
          ),
        ],
      ],
    ),
  );
}
