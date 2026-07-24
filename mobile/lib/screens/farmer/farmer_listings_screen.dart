import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../config/constants.dart';
import '../../config/theme.dart';
import '../../models/listing.dart';
import '../../providers/connectivity_provider.dart';
import '../../services/api_service.dart';
import '../../services/storage_service.dart';
import '../../widgets/offline_banner.dart';
import '../../widgets/status_badge.dart';
import '../../widgets/crop_icon.dart';

class FarmerListingsScreen extends StatefulWidget {
  const FarmerListingsScreen({super.key});

  @override
  State<FarmerListingsScreen> createState() => _FarmerListingsScreenState();
}

class _FarmerListingsScreenState extends State<FarmerListingsScreen> {
  List<Listing> _listings = [];
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
        final raw = await ApiService.getMyListings();
        await StorageService.cacheList(AppConstants.listingsBox, raw);
        _listings = raw.map((e) => Listing.fromJson(e as Map<String, dynamic>)).toList();
      } else {
        final raw = await StorageService.getCachedList(AppConstants.listingsBox);
        if (raw != null) _listings = raw.map((e) => Listing.fromJson(e as Map<String, dynamic>)).toList();
      }
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _delete(Listing l) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Remove listing?'),
        content: Text('${l.cropType} · ${l.quantityKg.toInt()} kg will be marked expired.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          TextButton(onPressed: () => Navigator.pop(context, true), child: Text('Remove', style: TextStyle(color: AppColors.redText))),
        ],
      ),
    );
    if (confirmed != true) return;
    try {
      await ApiService.deleteListing(l.id);
      await _load();
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: const Text('Failed to remove listing'), backgroundColor: AppColors.redBg),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () async {
          await context.push('/farmer/listing/new');
          if (mounted) _load();
        },
        backgroundColor: AppColors.brand,
        foregroundColor: AppColors.onBrand,
        icon: const Icon(Icons.add),
        label: const Text('Add Listing'),
      ),
      body: Column(
        children: [
          Container(
            color: AppColors.brandDark,
            padding: EdgeInsets.only(top: MediaQuery.of(context).padding.top + 16, left: 20, right: 20, bottom: 20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('My Listings', style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold)),
                Text('${_listings.length} total · ${_listings.where((l) => l.status == 'active').length} active',
                    style: const TextStyle(color: Color(0xFFA3C4B0), fontSize: 13)),
              ],
            ),
          ),
          const OfflineBanner(),
          Expanded(
            child: RefreshIndicator(
              onRefresh: () async { setState(() => _loading = true); await _load(); },
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : _listings.isEmpty
                      ? Center(child: Text('No listings yet — tap Add Listing to create one', style: TextStyle(color: AppColors.textMuted)))
                      : ListView(
                          padding: const EdgeInsets.fromLTRB(16, 16, 16, 88),
                          children: _listings.map(_tile).toList(),
                        ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _tile(Listing l) => Container(
    margin: const EdgeInsets.only(bottom: 10),
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(14), border: Border.all(color: AppColors.border)),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            CropIcon(l.cropType, size: 24.0, color: AppColors.textSecond),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(l.cropType, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                  Text('${l.quantityKg.toInt()} kg · GH₵ ${l.pricePerKg.toStringAsFixed(2)}/kg', style: TextStyle(color: AppColors.textSecond, fontSize: 12)),
                  Text(l.location, style: TextStyle(color: AppColors.textMuted, fontSize: 11)),
                ],
              ),
            ),
            StatusBadge(l.status),
          ],
        ),
        const SizedBox(height: 10),
        Row(children: [
          Expanded(
            child: OutlinedButton.icon(
              onPressed: () async {
                await context.push('/farmer/listing/${l.id}/edit', extra: l);
                if (mounted) _load();
              },
              icon: const Icon(Icons.edit_outlined, size: 15),
              label: const Text('Edit'),
              style: OutlinedButton.styleFrom(foregroundColor: AppColors.brand, side: BorderSide(color: AppColors.brand), padding: const EdgeInsets.symmetric(vertical: 8)),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: OutlinedButton.icon(
              onPressed: () => _delete(l),
              icon: Icon(Icons.delete_outline, size: 15, color: AppColors.redText),
              label: Text('Remove', style: TextStyle(color: AppColors.redText)),
              style: OutlinedButton.styleFrom(side: BorderSide(color: AppColors.redText.withOpacity(0.4)), padding: const EdgeInsets.symmetric(vertical: 8)),
            ),
          ),
        ]),
      ],
    ),
  );
}
