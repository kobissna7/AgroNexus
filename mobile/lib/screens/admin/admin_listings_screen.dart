import 'package:flutter/material.dart';
import '../../config/theme.dart';
import '../../services/api_service.dart';
import '../../widgets/status_badge.dart';
import '../../widgets/crop_icon.dart';

const _statuses = ['active', 'sold', 'expired'];

class AdminListingsScreen extends StatefulWidget {
  const AdminListingsScreen({super.key});

  @override
  State<AdminListingsScreen> createState() => _AdminListingsScreenState();
}

class _AdminListingsScreenState extends State<AdminListingsScreen> {
  List<dynamic> _listings = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      _listings = await ApiService.getAdminListings();
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _changeStatus(Map<String, dynamic> l, String status) async {
    try {
      await ApiService.updateListingStatus(l['id'] as String, status);
      await _load();
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: const Text('Could not update status'), backgroundColor: AppColors.redBg),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator());
    if (_listings.isEmpty) {
      return Center(child: Text('No listings yet', style: TextStyle(color: AppColors.textMuted)));
    }
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: _listings.map((e) => _tile(e as Map<String, dynamic>)).toList(),
      ),
    );
  }

  Widget _tile(Map<String, dynamic> l) {
    final farmer = l['users'] as Map<String, dynamic>?;
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(14), border: Border.all(color: AppColors.border)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CropIcon(l['crop_type'] ?? '', size: 22, color: AppColors.textSecond),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('${l['crop_type']} — ${(l['quantity_kg'] as num).toInt()} kg', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                    Text('${farmer?['full_name'] ?? 'Unknown'} · ${l['location']}', style: TextStyle(color: AppColors.textMuted, fontSize: 11)),
                  ],
                ),
              ),
              StatusBadge(l['status'] as String),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: _statuses.map((s) {
              final active = l['status'] == s;
              return Padding(
                padding: const EdgeInsets.only(right: 8),
                child: ChoiceChip(
                  label: Text(s, style: TextStyle(fontSize: 11, color: active ? Colors.white : AppColors.textSecond)),
                  selected: active,
                  selectedColor: AppColors.brand,
                  onSelected: (_) { if (!active) _changeStatus(l, s); },
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }
}
