import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../config/constants.dart';
import '../config/theme.dart';
import '../models/listing.dart';
import '../services/api_service.dart';
import '../widgets/crop_icon.dart';

// Mirrors web/src/pages/Home.tsx — a guest-browsable live marketplace, not a
// marketing landing page. Authenticated users never see this: router.dart's
// redirect sends them straight to their role home the moment they're logged in.
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final _search = TextEditingController();
  List<Listing> _listings = [];
  bool _loading = true;
  String _crop = '';
  String _region = '';

  @override
  void initState() {
    super.initState();
    _fetch();
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  Future<void> _fetch({String? cropType}) async {
    setState(() => _loading = true);
    try {
      final raw = await ApiService.getMarketplace(cropType: cropType ?? _crop, region: _region);
      _listings = raw.map((e) => Listing.fromJson(e as Map<String, dynamic>)).toList();
    } catch (_) {
      _listings = [];
    }
    if (mounted) setState(() => _loading = false);
  }

  void _buy(Listing l) => context.push('/login');

  @override
  Widget build(BuildContext context) {
    final totalKg = _listings.fold(0.0, (s, l) => s + l.quantityKg);
    final cropsLive = _listings.map((l) => l.cropType.toLowerCase()).toSet().length;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: CustomScrollView(
          slivers: [
            // ── Header ──
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                child: Row(
                  children: [
                    Image.asset('assets/images/logo_icon.png', width: 30, height: 30),
                    const SizedBox(width: 8),
                    Text('AgroNexus', style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w800, fontSize: 16)),
                    const Spacer(),
                    TextButton(
                      onPressed: () => context.push('/login'),
                      child: Text('Sign in', style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w600, fontSize: 13)),
                    ),
                    ElevatedButton(
                      onPressed: () => context.push('/register'),
                      style: ElevatedButton.styleFrom(minimumSize: const Size(0, 36), padding: const EdgeInsets.symmetric(horizontal: 16)),
                      child: const Text('Get started', style: TextStyle(fontSize: 13)),
                    ),
                  ],
                ),
              ),
            ),

            // ── Hero + search ──
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 20, 20, 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('WESTERN REGION, GHANA · LIVE MARKET',
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1, color: AppColors.textMuted)),
                    const SizedBox(height: 10),
                    Text('Fresh produce,\nstraight from the farm.',
                        style: TextStyle(fontSize: 30, fontWeight: FontWeight.w800, height: 1.08, letterSpacing: -0.8, color: AppColors.textPrimary)),
                    const SizedBox(height: 12),
                    Text(
                      'Browse what farmers in Tarkwa, Bogoso, and Prestea are selling right now. '
                      'Order in a few taps — delivery is matched automatically.',
                      style: TextStyle(color: AppColors.textSecond, fontSize: 14, height: 1.6),
                    ),
                    const SizedBox(height: 20),
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _search,
                            decoration: const InputDecoration(hintText: 'Search produce — maize, tomatoes…', isDense: true),
                            onSubmitted: (v) { setState(() => _crop = ''); _fetch(cropType: v); },
                          ),
                        ),
                        const SizedBox(width: 8),
                        ElevatedButton(
                          onPressed: () { setState(() => _crop = ''); _fetch(cropType: _search.text); },
                          style: ElevatedButton.styleFrom(minimumSize: const Size(0, 46)),
                          child: const Text('Search'),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),
                    Wrap(
                      spacing: 20, runSpacing: 8,
                      children: [
                        _statChip('${_listings.length}', 'live listings'),
                        _statChip('${totalKg.toInt()} kg', 'on the market'),
                        _statChip('$cropsLive', 'crops available'),
                        Row(mainAxisSize: MainAxisSize.min, children: [
                          Container(width: 6, height: 6, decoration: BoxDecoration(color: AppColors.brand, shape: BoxShape.circle)),
                          const SizedBox(width: 6),
                          Text('updating live', style: TextStyle(fontSize: 12, color: AppColors.textMuted)),
                        ]),
                      ],
                    ),
                  ],
                ),
              ),
            ),

            // ── Sticky filter bar ──
            SliverPersistentHeader(
              pinned: true,
              delegate: _FilterBarDelegate(
                crop: _crop,
                region: _region,
                onCropTap: (c) { setState(() { _crop = _crop == c ? '' : c; _search.clear(); }); _fetch(); },
                onRegionChanged: (r) { setState(() => _region = r); _fetch(); },
              ),
            ),

            // ── Listings grid (green band) ──
            SliverToBoxAdapter(
              child: Container(
                color: AppColors.green,
                padding: const EdgeInsets.fromLTRB(16, 20, 16, 32),
                child: _loading
                    ? GridView.count(
                        crossAxisCount: 2, shrinkWrap: true, physics: const NeverScrollableScrollPhysics(),
                        mainAxisSpacing: 12, crossAxisSpacing: 12, childAspectRatio: 0.85,
                        children: List.generate(4, (_) => Container(decoration: BoxDecoration(color: Colors.white.withOpacity(0.08), borderRadius: BorderRadius.circular(16)))),
                      )
                    : _listings.isEmpty
                        ? Padding(
                            padding: const EdgeInsets.symmetric(vertical: 48),
                            child: Column(children: [
                              Text('Nothing on the market for that filter yet', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 15)),
                              const SizedBox(height: 6),
                              const Text('Try another crop — new produce is listed daily.', style: TextStyle(color: Color(0xFFA3C4B0), fontSize: 13)),
                            ]),
                          )
                        : GridView.count(
                            crossAxisCount: 2, shrinkWrap: true, physics: const NeverScrollableScrollPhysics(),
                            mainAxisSpacing: 12, crossAxisSpacing: 12, childAspectRatio: 0.8,
                            children: _listings.map(_listingCard).toList(),
                          ),
              ),
            ),

            // ── Value strip (white) ──
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 32, 20, 32),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _valueBlock('Sell as a farmer', 'List your harvest in minutes and reach wholesalers, retailers, and households across the region.'),
                    const SizedBox(height: 28),
                    _valueBlock('Deliver as a transporter', 'Pick up delivery jobs near you the moment orders are placed. Update status on the go.'),
                    const SizedBox(height: 28),
                    _valueBlock('Smarter prices for everyone', 'AI demand forecasts built on Ministry of Agriculture data keep prices fair and food where it is needed.'),
                  ],
                ),
              ),
            ),

            // ── Footer ──
            SliverToBoxAdapter(
              child: Container(
                color: AppColors.green,
                padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 20),
                child: Column(children: [
                  Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                    Image.asset('assets/images/logo_icon.png', width: 22, height: 22),
                    const SizedBox(width: 8),
                    const Text('AgroNexus', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 15)),
                  ]),
                  const SizedBox(height: 8),
                  Text('Intelligent Agricultural Distribution · Western Region, Ghana · © ${DateTime.now().year}',
                      textAlign: TextAlign.center, style: const TextStyle(color: Color(0xFFA3C4B0), fontSize: 12)),
                ]),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _statChip(String value, String label) => Row(mainAxisSize: MainAxisSize.min, children: [
    Text(value, style: TextStyle(fontSize: 19, fontWeight: FontWeight.w800, color: AppColors.textPrimary, letterSpacing: -0.4)),
    const SizedBox(width: 6),
    Text(label, style: TextStyle(fontSize: 12, color: AppColors.textMuted)),
  ]);

  Widget _valueBlock(String title, String desc) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(title, style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: AppColors.textPrimary, letterSpacing: -0.2)),
      const SizedBox(height: 8),
      Text(desc, style: TextStyle(fontSize: 13, color: AppColors.textSecond, height: 1.6)),
      const SizedBox(height: 12),
      OutlinedButton(
        onPressed: () => context.push('/register'),
        style: OutlinedButton.styleFrom(foregroundColor: AppColors.brand, side: BorderSide(color: AppColors.border), padding: const EdgeInsets.symmetric(horizontal: 16)),
        child: const Text('Get started →', style: TextStyle(fontSize: 13)),
      ),
    ],
  );

  Widget _listingCard(Listing l) {
    final available = DateTime.tryParse(l.availableFrom)?.isBefore(DateTime.now().add(const Duration(days: 1))) ?? true;
    return GestureDetector(
      onTap: () => _buy(l),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), boxShadow: const [BoxShadow(color: Color(0x1F000000), blurRadius: 8, offset: Offset(0, 3))]),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 38, height: 38,
                  decoration: BoxDecoration(color: AppColors.brandPale, borderRadius: BorderRadius.circular(11)),
                  child: Center(child: CropIcon(l.cropType, size: 18.0, color: AppColors.textSecond)),
                ),
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(color: const Color(0xFFF3F5F3), borderRadius: BorderRadius.circular(999)),
                  child: Text(available ? 'Available' : 'Soon', style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: Colors.black87)),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Text(l.cropType, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: Colors.black, letterSpacing: -0.2), maxLines: 1, overflow: TextOverflow.ellipsis),
            const SizedBox(height: 2),
            Text('${l.location} · ${l.quantityKg.toInt()} kg', style: const TextStyle(fontSize: 11, color: Colors.black54), maxLines: 1, overflow: TextOverflow.ellipsis),
            const Spacer(),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('GH₵${l.pricePerKg.toStringAsFixed(2)}', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: Colors.black)),
                Icon(Icons.arrow_forward_rounded, size: 16, color: AppColors.brand),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _FilterBarDelegate extends SliverPersistentHeaderDelegate {
  final String crop;
  final String region;
  final void Function(String) onCropTap;
  final void Function(String) onRegionChanged;
  _FilterBarDelegate({required this.crop, required this.region, required this.onCropTap, required this.onRegionChanged});

  @override
  double get minExtent => 52;
  @override
  double get maxExtent => 52;

  @override
  Widget build(BuildContext context, double shrinkOffset, bool overlapsContent) {
    return Container(
      color: AppColors.green,
      alignment: Alignment.center,
      child: Row(
        children: [
          Expanded(
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              children: [
                _chip('All', null, crop.isEmpty, () => onCropTap('')),
                ...AppConstants.crops.map((c) => _chip(c, c, crop == c, () => onCropTap(c))),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.only(right: 16),
            child: DropdownButtonHideUnderline(
              child: DropdownButton<String>(
                value: region.isEmpty ? null : region,
                hint: const Text('All regions', style: TextStyle(color: Colors.white, fontSize: 12)),
                icon: const Icon(Icons.keyboard_arrow_down, color: Colors.white, size: 18),
                dropdownColor: AppColors.green,
                style: const TextStyle(color: Colors.white, fontSize: 12),
                items: [
                  const DropdownMenuItem(value: '', child: Text('All regions')),
                  ...AppConstants.regions.map((r) => DropdownMenuItem(value: r, child: Text(r))),
                ],
                onChanged: (v) => onRegionChanged(v ?? ''),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _chip(String label, String? cropType, bool active, VoidCallback onTap) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
    child: GestureDetector(
      onTap: onTap,
      child: Container(
        alignment: Alignment.center,
        padding: const EdgeInsets.symmetric(horizontal: 14),
        decoration: BoxDecoration(
          color: active ? Colors.white : Colors.transparent,
          border: Border.all(color: active ? Colors.white : Colors.white24),
          borderRadius: BorderRadius.circular(999),
        ),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          if (cropType != null) ...[
            CropIcon(cropType, size: 14, color: active ? AppColors.green : Colors.white),
            const SizedBox(width: 5),
          ],
          Text(label, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: active ? AppColors.green : Colors.white)),
        ]),
      ),
    ),
  );

  @override
  bool shouldRebuild(covariant _FilterBarDelegate oldDelegate) => oldDelegate.crop != crop || oldDelegate.region != region;
}
