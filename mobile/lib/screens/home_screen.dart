import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../config/theme.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with TickerProviderStateMixin {
  late final AnimationController _heroCtrl;
  late final Animation<double> _heroFade;
  late final Animation<Offset> _heroSlide;

  final List<_CropTicker> _crops = const [
    _CropTicker('🌽', 'Maize', '+4.2%', true),
    _CropTicker('🍅', 'Tomatoes', '+7.1%', true),
    _CropTicker('🍌', 'Plantain', '-1.3%', false),
    _CropTicker('🥔', 'Cassava', '+2.8%', true),
    _CropTicker('🌶️', 'Pepper', '+5.4%', true),
    _CropTicker('🌾', 'Rice', '+0.9%', true),
  ];
  int _tickerIdx = 0;

  @override
  void initState() {
    super.initState();
    _heroCtrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 700));
    _heroFade = CurvedAnimation(parent: _heroCtrl, curve: Curves.easeOut);
    _heroSlide = Tween<Offset>(begin: const Offset(0, 0.12), end: Offset.zero)
        .animate(CurvedAnimation(parent: _heroCtrl, curve: Curves.easeOut));
    _heroCtrl.forward();

    Future.doWhile(() async {
      await Future.delayed(const Duration(milliseconds: 2200));
      if (!mounted) return false;
      setState(() => _tickerIdx = (_tickerIdx + 1) % _crops.length);
      return true;
    });
  }

  @override
  void dispose() {
    _heroCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: CustomScrollView(
        slivers: [
          // ── APP BAR ──
          SliverAppBar(
            pinned: true,
            expandedHeight: 0,
            backgroundColor: AppColors.brandDark,
            elevation: 0,
            title: Row(
              children: [
                Image.asset('assets/images/logo_icon.png', width: 32, height: 32),
                const SizedBox(width: 10),
                const Text('AgroNexus',
                    style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 18)),
              ],
            ),
            actions: [
              TextButton(
                onPressed: () => context.go('/login'),
                child: const Text('Sign In', style: TextStyle(color: AppColors.accentGold, fontWeight: FontWeight.w600)),
              ),
            ],
          ),

          SliverToBoxAdapter(
            child: FadeTransition(
              opacity: _heroFade,
              child: SlideTransition(
                position: _heroSlide,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // ── HERO ──
                    _HeroSection(crops: _crops, tickerIdx: _tickerIdx),

                    // ── STATS ──
                    _StatsRow(),

                    // ── ROLES ──
                    _SectionHeader(tag: 'WHO IT\'S FOR', title: 'One platform,\nthree roles'),
                    _RolesSection(),

                    // ── FEATURES ──
                    _SectionHeader(tag: 'PLATFORM FEATURES', title: 'Built for Ghana\'s\nsupply chain'),
                    _FeaturesGrid(),

                    // ── CROPS ──
                    _CropsStrip(crops: _crops),

                    // ── CTA ──
                    _CtaSection(),

                    // ── FOOTER ──
                    _Footer(),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ── DATA ──────────────────────────────────────────────────────────────────────

class _CropTicker {
  final String icon, name, trend;
  final bool positive;
  const _CropTicker(this.icon, this.name, this.trend, this.positive);
}

// ── HERO ──────────────────────────────────────────────────────────────────────

class _HeroSection extends StatelessWidget {
  final List<_CropTicker> crops;
  final int tickerIdx;
  const _HeroSection({required this.crops, required this.tickerIdx});

  @override
  Widget build(BuildContext context) {
    final crop = crops[tickerIdx];
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft, end: Alignment.bottomRight,
          colors: [AppColors.brandDark, Color(0xFF1A3D2B), AppColors.brandDark],
        ),
      ),
      padding: const EdgeInsets.fromLTRB(24, 28, 24, 36),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // live ticker chip
          AnimatedSwitcher(
            duration: const Duration(milliseconds: 400),
            child: Container(
              key: ValueKey(tickerIdx),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
              decoration: BoxDecoration(
                color: AppColors.accentGold.withOpacity(0.15),
                border: Border.all(color: AppColors.accentGold.withOpacity(0.4)),
                borderRadius: BorderRadius.circular(999),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 7, height: 7,
                    decoration: const BoxDecoration(color: AppColors.accentGold, shape: BoxShape.circle),
                  ),
                  const SizedBox(width: 8),
                  Text('Live · ${crop.icon} ${crop.name} ${crop.trend} today',
                      style: const TextStyle(color: AppColors.accentGold, fontSize: 12, fontWeight: FontWeight.w600)),
                ],
              ),
            ),
          ),
          const SizedBox(height: 20),
          const Text("Ghana's Intelligent\nAgricultural",
              style: TextStyle(color: Colors.white, fontSize: 30, fontWeight: FontWeight.w800,
                  height: 1.15, letterSpacing: -0.5)),
          const Text('Marketplace',
              style: TextStyle(color: AppColors.accentGold, fontSize: 30, fontWeight: FontWeight.w800,
                  letterSpacing: -0.5)),
          const SizedBox(height: 14),
          const Text(
            'Connect farmers, consumers, and transporters across the Western Region. '
            'AI-powered demand forecasts. Real-time order tracking.',
            style: TextStyle(color: Color(0xFFA3C4B0), fontSize: 14, height: 1.6),
          ),
          const SizedBox(height: 28),
          Builder(builder: (ctx) => Row(
            children: [
              Expanded(
                child: ElevatedButton(
                  onPressed: () => ctx.go('/register'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.brandMid,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 15),
                    shape: const StadiumBorder(),
                    elevation: 0,
                  ),
                  child: const Text('Get Started →', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                ),
              ),
              const SizedBox(width: 12),
              OutlinedButton(
                onPressed: () => ctx.go('/login'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.white,
                  side: const BorderSide(color: Colors.white24),
                  padding: const EdgeInsets.symmetric(vertical: 15, horizontal: 20),
                  shape: const StadiumBorder(),
                ),
                child: const Text('Sign In', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
              ),
            ],
          )),
        ],
      ),
    );
  }
}

// ── STATS ─────────────────────────────────────────────────────────────────────

class _StatsRow extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    const items = [
      ('6', 'Crop Types'),
      ('3', 'Regions'),
      ('98%', 'Delivery\nSuccess'),
      ('7-Day', 'Forecasts'),
    ];
    return Container(
      color: Colors.white,
      child: Row(
        children: items.asMap().entries.map((e) {
          final isLast = e.key == items.length - 1;
          return Expanded(
            child: Container(
              padding: const EdgeInsets.symmetric(vertical: 18, horizontal: 4),
              decoration: BoxDecoration(
                border: Border(right: isLast ? BorderSide.none : const BorderSide(color: Color(0xFFE5E7EB))),
              ),
              child: Column(children: [
                Text(e.value.$1, style: const TextStyle(
                    fontSize: 20, fontWeight: FontWeight.w800, color: AppColors.brand, letterSpacing: -0.5)),
                const SizedBox(height: 2),
                Text(e.value.$2, textAlign: TextAlign.center,
                    style: const TextStyle(fontSize: 10, color: Color(0xFF6B7280), fontWeight: FontWeight.w500)),
              ]),
            ),
          );
        }).toList(),
      ),
    );
  }
}

// ── SECTION HEADER ────────────────────────────────────────────────────────────

class _SectionHeader extends StatelessWidget {
  final String tag, title;
  const _SectionHeader({required this.tag, required this.title});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 40, 24, 20),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(tag, style: const TextStyle(
            color: AppColors.brandMid, fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1.2)),
        const SizedBox(height: 6),
        Text(title, style: const TextStyle(
            fontSize: 24, fontWeight: FontWeight.w800, color: Color(0xFF111827), letterSpacing: -0.5, height: 1.15)),
      ]),
    );
  }
}

// ── ROLES ─────────────────────────────────────────────────────────────────────

class _RolesSection extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    const roles = [
      _RoleData('👨‍🌾', 'Farmer', AppColors.brand, AppColors.brandLight,
          ['Post produce listings', 'Track orders in real time', 'View AI demand forecasts'], '/register'),
      _RoleData('🛒', 'Consumer', AppColors.accentGold, Color(0xFFFEF9EC),
          ['Browse fresh produce by region', 'Place orders with one tap', 'Track delivery status live'], '/register'),
      _RoleData('🚚', 'Transporter', AppColors.brandMid, AppColors.brandLight,
          ['See open delivery requests', 'Accept & manage runs', 'Update status on the go'], '/register'),
    ];

    return SizedBox(
      height: 220,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 24),
        separatorBuilder: (_, __) => const SizedBox(width: 14),
        itemCount: roles.length,
        itemBuilder: (ctx, i) => _RoleCard(data: roles[i]),
      ),
    );
  }
}

class _RoleData {
  final String emoji, role, path;
  final Color color, bg;
  final List<String> points;
  const _RoleData(this.emoji, this.role, this.color, this.bg, this.points, this.path);
}

class _RoleCard extends StatelessWidget {
  final _RoleData data;
  const _RoleCard({required this.data});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 230,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE5E7EB)),
        boxShadow: const [BoxShadow(color: Color(0x08000000), blurRadius: 8, offset: Offset(0, 2))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 48, height: 48,
            decoration: BoxDecoration(color: data.bg, borderRadius: BorderRadius.circular(14)),
            child: Center(child: Text(data.emoji, style: const TextStyle(fontSize: 22))),
          ),
          const SizedBox(height: 12),
          Text(data.role, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Color(0xFF111827))),
          const SizedBox(height: 8),
          ...data.points.map((p) => Padding(
            padding: const EdgeInsets.only(bottom: 4),
            child: Row(children: [
              Icon(Icons.check_circle_rounded, size: 13, color: data.color),
              const SizedBox(width: 6),
              Expanded(child: Text(p, style: const TextStyle(fontSize: 11, color: Color(0xFF4B5563)))),
            ]),
          )),
        ],
      ),
    );
  }
}

// ── FEATURES ──────────────────────────────────────────────────────────────────

class _FeaturesGrid extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    const items = [
      ('📈', 'AI Forecasting', 'LSTM model predicts demand 7 days ahead for all 6 crops.'),
      ('🗺️', 'Live Market Data', 'Real-time price charts for Tarkwa, Bogoso & Prestea.'),
      ('📦', 'Instant Orders', 'Orders auto-create transport requests for nearby transporters.'),
      ('🔔', 'Live Notifications', 'Supabase Realtime pushes status updates instantly.'),
      ('📵', 'Offline Mode', 'Hive cache keeps the app usable on slow 3G networks.'),
      ('🔐', 'Role Security', 'Row-level security per role — farmer, consumer, transporter.'),
    ];

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: GridView.count(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        crossAxisCount: 2,
        mainAxisSpacing: 14,
        crossAxisSpacing: 14,
        childAspectRatio: 1.0,
        children: items.map((item) => Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.background,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFE5E7EB)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(item.$1, style: const TextStyle(fontSize: 26)),
              const SizedBox(height: 8),
              Text(item.$2, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFF111827))),
              const SizedBox(height: 6),
              Text(item.$3, style: const TextStyle(fontSize: 11, color: Color(0xFF6B7280), height: 1.5)),
            ],
          ),
        )).toList(),
      ),
    );
  }
}

// ── CROPS STRIP ───────────────────────────────────────────────────────────────

class _CropsStrip extends StatelessWidget {
  final List<_CropTicker> crops;
  const _CropsStrip({required this.crops});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(top: 32),
      padding: const EdgeInsets.symmetric(vertical: 28, horizontal: 24),
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [AppColors.brandDark, Color(0xFF1A3D2B)],
        ),
      ),
      child: Column(children: [
        const Text('TRACKED CROPS · WESTERN REGION',
            style: TextStyle(color: Color(0xFFA3C4B0), fontSize: 11, fontWeight: FontWeight.w600, letterSpacing: 1.2)),
        const SizedBox(height: 16),
        Wrap(
          spacing: 10, runSpacing: 10,
          alignment: WrapAlignment.center,
          children: crops.map((c) => Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.07),
              border: Border.all(color: Colors.white.withOpacity(0.12)),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              Text(c.icon, style: const TextStyle(fontSize: 22)),
              const SizedBox(height: 2),
              Text(c.name, style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600)),
              Text(c.trend,
                  style: TextStyle(
                      color: c.positive ? const Color(0xFF86EFAC) : const Color(0xFFFCA5A5),
                      fontSize: 11, fontWeight: FontWeight.w700)),
            ]),
          )).toList(),
        ),
      ]),
    );
  }
}

// ── CTA ───────────────────────────────────────────────────────────────────────

class _CtaSection extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Container(
        padding: const EdgeInsets.all(28),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            begin: Alignment.topLeft, end: Alignment.bottomRight,
            colors: [AppColors.brandMid, AppColors.brand],
          ),
          borderRadius: BorderRadius.circular(24),
        ),
        child: Column(children: [
          const Text('🌱', style: TextStyle(fontSize: 36)),
          const SizedBox(height: 12),
          const Text('Ready to grow smarter?',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w800, letterSpacing: -0.3)),
          const SizedBox(height: 10),
          const Text(
            'Join farmers, consumers, and transporters across Tarkwa, Bogoso, and Prestea.',
            textAlign: TextAlign.center,
            style: TextStyle(color: Color(0xFFD6EFE1), fontSize: 13, height: 1.6),
          ),
          const SizedBox(height: 22),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () => context.go('/register'),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.white,
                foregroundColor: AppColors.brand,
                padding: const EdgeInsets.symmetric(vertical: 15),
                shape: const StadiumBorder(),
                elevation: 0,
              ),
              child: const Text('Create Free Account', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
            ),
          ),
          const SizedBox(height: 10),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton(
              onPressed: () => context.go('/login'),
              style: OutlinedButton.styleFrom(
                foregroundColor: Colors.white,
                side: const BorderSide(color: Colors.white30),
                padding: const EdgeInsets.symmetric(vertical: 15),
                shape: const StadiumBorder(),
              ),
              child: const Text('Sign In', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
            ),
          ),
        ]),
      ),
    );
  }
}

// ── FOOTER ────────────────────────────────────────────────────────────────────

class _Footer extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      color: AppColors.brandDark,
      padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 24),
      child: Column(children: [
        Row(mainAxisAlignment: MainAxisAlignment.center, children: [
          Image.asset('assets/images/logo_icon.png', width: 24, height: 24),
          const SizedBox(width: 8),
          const Text('AgroNexus', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 16)),
        ]),
        const SizedBox(height: 6),
        const Text('Intelligent Agricultural Distribution\nWestern Region, Ghana',
            textAlign: TextAlign.center,
            style: TextStyle(color: Color(0xFFA3C4B0), fontSize: 12, height: 1.6)),
      ]),
    );
  }
}
