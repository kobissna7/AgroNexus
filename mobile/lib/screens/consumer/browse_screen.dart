import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../config/constants.dart';
import '../../config/theme.dart';
import '../../models/listing.dart';
import '../../providers/auth_provider.dart';
import '../../providers/connectivity_provider.dart';
import '../../services/api_service.dart';
import '../../services/storage_service.dart';
import '../../widgets/offline_banner.dart';

class ConsumerBrowseScreen extends StatefulWidget {
  const ConsumerBrowseScreen({super.key});

  @override
  State<ConsumerBrowseScreen> createState() => _ConsumerBrowseScreenState();
}

class _ConsumerBrowseScreenState extends State<ConsumerBrowseScreen> {
  List<Listing> _listings = [];
  String? _filterCrop;
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
        final raw = await ApiService.getListings(cropType: _filterCrop);
        await StorageService.cacheList(AppConstants.listingsBox, raw);
        _listings = raw.map((e) => Listing.fromJson(e as Map<String, dynamic>)).toList();
      } else {
        final raw = await StorageService.getCachedList(AppConstants.listingsBox);
        if (raw != null) {
          _listings = raw.map((e) => Listing.fromJson(e as Map<String, dynamic>)).toList();
          if (_filterCrop != null) _listings = _listings.where((l) => l.cropType == _filterCrop).toList();
        }
      }
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _placeOrder(Listing listing) async {
    final role = context.read<AuthProvider>().user!.role;
    final isBulkBuyer = role == 'wholesaler' || role == 'retailer';
    final minQty = isBulkBuyer ? 50.0 : 1.0;

    double? qty;
    await showDialog(
      context: context,
      builder: (ctx) {
        final ctrl = TextEditingController();
        return AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: Text('Order ${listing.cropType}'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('Available: ${listing.quantityKg.toInt()} kg · GH₵ ${listing.pricePerKg.toStringAsFixed(2)}/kg',
                style: const TextStyle(color: AppColors.textSecond, fontSize: 13)),
              const SizedBox(height: 12),
              TextField(
                controller: ctrl,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                decoration: InputDecoration(
                  labelText: 'Quantity (kg)',
                  prefixIcon: const Icon(Icons.scale_outlined),
                  helperText: isBulkBuyer ? 'Bulk buyers: minimum ${minQty.toInt()} kg' : null,
                ),
                onChanged: (v) => qty = double.tryParse(v),
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
            ElevatedButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Confirm'),
            ),
          ],
        );
      },
    );

    if (qty != null && qty! > 0 && qty! < minQty) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Bulk buyers must order at least ${minQty.toInt()} kg'), backgroundColor: AppColors.redText),
        );
      }
      return;
    }

    if (qty != null && qty! > 0) {
      try {
        await ApiService.placeOrder(listing.id, qty!);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Order placed!'), backgroundColor: AppColors.brand),
          );
        }
      } catch (_) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Order failed'), backgroundColor: AppColors.redText),
          );
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user!;
    return Scaffold(
      backgroundColor: AppColors.background,
      body: Column(
        children: [
          Container(
            color: AppColors.brandDark,
            padding: EdgeInsets.only(
              top: MediaQuery.of(context).padding.top + 16,
              left: 20, right: 20, bottom: 16,
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Hello, ${user.fullName.split(' ').first}',
                        style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
                      const Text('Browse available produce', style: TextStyle(color: Color(0xFFA3C4B0), fontSize: 12)),
                    ],
                  ),
                ),
                Row(children: [
                  IconButton(
                    icon: const Icon(Icons.receipt_long_outlined, color: Colors.white70),
                    onPressed: () => context.push('/consumer/orders'),
                    tooltip: 'My Orders',
                  ),
                  IconButton(
                    icon: const Icon(Icons.logout, color: Colors.white70),
                    onPressed: () async {
                      await context.read<AuthProvider>().logout();
                      if (mounted) context.go('/login');
                    },
                  ),
                ]),
              ],
            ),
          ),
          const OfflineBanner(),
          // Filter chips
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: FilterChip(
                      label: const Text('All'),
                      selected: _filterCrop == null,
                      onSelected: (_) { setState(() { _filterCrop = null; _loading = true; }); _load(); },
                      selectedColor: AppColors.brand,
                      labelStyle: TextStyle(color: _filterCrop == null ? Colors.white : AppColors.textSecond, fontSize: 12),
                    ),
                  ),
                  ...AppConstants.crops.map((c) => Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: FilterChip(
                      label: Text('${AppConstants.cropIcons[c]} $c'),
                      selected: _filterCrop == c,
                      onSelected: (_) { setState(() { _filterCrop = c; _loading = true; }); _load(); },
                      selectedColor: AppColors.brand,
                      labelStyle: TextStyle(color: _filterCrop == c ? Colors.white : AppColors.textSecond, fontSize: 12),
                    ),
                  )),
                ],
              ),
            ),
          ),
          const SizedBox(height: 8),
          Expanded(
            child: _loading
              ? const Center(child: CircularProgressIndicator())
              : _listings.isEmpty
                ? const Center(child: Text('No listings available', style: TextStyle(color: AppColors.textMuted)))
                : RefreshIndicator(
                    onRefresh: () async { setState(() => _loading = true); await _load(); },
                    child: ListView.builder(
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                      itemCount: _listings.length,
                      itemBuilder: (_, i) => _listingCard(_listings[i]),
                    ),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _listingCard(Listing l) => Container(
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
            Text(AppConstants.cropIcons[l.cropType] ?? '🌱', style: const TextStyle(fontSize: 28)),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(l.cropType, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                  Text(l.location, style: const TextStyle(color: AppColors.textSecond, fontSize: 12)),
                ],
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text('GH₵ ${l.pricePerKg.toStringAsFixed(2)}',
                  style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.brand, fontSize: 15)),
                Text('per kg', style: const TextStyle(color: AppColors.textMuted, fontSize: 11)),
              ],
            ),
          ],
        ),
        const SizedBox(height: 10),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('${l.quantityKg.toInt()} kg available',
              style: const TextStyle(color: AppColors.textSecond, fontSize: 13)),
            ElevatedButton(
              onPressed: () => _placeOrder(l),
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                textStyle: const TextStyle(fontSize: 13),
              ),
              child: const Text('Order Now'),
            ),
          ],
        ),
      ],
    ),
  );
}
