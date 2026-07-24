import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../config/theme.dart';
import '../providers/auth_provider.dart';

class NavDestinationSpec {
  final IconData icon;
  final IconData selectedIcon;
  final String label;
  const NavDestinationSpec({required this.icon, required this.selectedIcon, required this.label});
}

/// Bottom-nav shell for role dashboards with <=5 destinations (farmer,
/// buyer, transporter) — the mobile equivalent of the web sidebar
/// (web/src/components/Layout.tsx navByRole). Each branch keeps its own
/// navigation stack via StatefulShellRoute.indexedStack.
class AppShell extends StatelessWidget {
  final StatefulNavigationShell navigationShell;
  final List<NavDestinationSpec> destinations;
  const AppShell({super.key, required this.navigationShell, required this.destinations});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: navigationShell,
      bottomNavigationBar: NavigationBarTheme(
        data: NavigationBarThemeData(
          backgroundColor: AppColors.surface,
          indicatorColor: AppColors.brandPale,
          labelTextStyle: WidgetStateProperty.resolveWith((states) => TextStyle(
            fontSize: 11, fontWeight: FontWeight.w600,
            color: states.contains(WidgetState.selected) ? AppColors.brand : AppColors.textMuted,
          )),
        ),
        child: NavigationBar(
          selectedIndex: navigationShell.currentIndex,
          onDestinationSelected: (i) => navigationShell.goBranch(
            i,
            initialLocation: i == navigationShell.currentIndex,
          ),
          height: 62,
          destinations: destinations.map((d) => NavigationDestination(
            icon: Icon(d.icon, color: AppColors.textMuted),
            selectedIcon: Icon(d.selectedIcon, color: AppColors.brand),
            label: d.label,
          )).toList(),
        ),
      ),
    );
  }
}

class DrawerDestinationSpec {
  final IconData icon;
  final String label;
  final String path;
  const DrawerDestinationSpec({required this.icon, required this.label, required this.path});
}

/// Drawer-based shell for Admin — 7 destinations don't fit a bottom bar
/// cleanly, and a side list is the natural mobile translation of the web
/// admin sidebar's density.
class AdminShell extends StatelessWidget {
  final Widget child;
  final String currentPath;
  final String title;
  const AdminShell({super.key, required this.child, required this.currentPath, required this.title});

  static const destinations = [
    DrawerDestinationSpec(icon: Icons.dashboard_outlined, label: 'Overview', path: '/admin'),
    DrawerDestinationSpec(icon: Icons.people_outline,     label: 'Users',    path: '/admin/users'),
    DrawerDestinationSpec(icon: Icons.inventory_2_outlined, label: 'Listings', path: '/admin/listings'),
    DrawerDestinationSpec(icon: Icons.receipt_long_outlined, label: 'Orders', path: '/admin/orders'),
    DrawerDestinationSpec(icon: Icons.show_chart_outlined, label: 'Market',   path: '/admin/market'),
    DrawerDestinationSpec(icon: Icons.trending_up_outlined, label: 'Forecasts', path: '/admin/forecasts'),
    DrawerDestinationSpec(icon: Icons.auto_graph_outlined, label: 'Insights', path: '/admin/insights'),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text(title, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
      ),
      drawer: Drawer(
        backgroundColor: AppColors.surface,
        child: SafeArea(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 20, 20, 12),
                child: Row(children: [
                  Image.asset('assets/images/logo_icon.png', width: 32, height: 32),
                  const SizedBox(width: 10),
                  const Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('AgroNexus', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
                      Text('ADMIN', style: TextStyle(fontSize: 10, letterSpacing: 1, color: Colors.grey)),
                    ],
                  ),
                ]),
              ),
              const Divider(height: 1),
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  children: destinations.map((d) {
                    final selected = currentPath == d.path;
                    return ListTile(
                      leading: Icon(d.icon, color: selected ? AppColors.brand : AppColors.textMuted),
                      title: Text(d.label, style: TextStyle(
                        fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                        color: selected ? AppColors.brand : AppColors.textPrimary,
                      )),
                      selected: selected,
                      selectedTileColor: AppColors.brandPale,
                      onTap: () {
                        Navigator.pop(context);
                        if (!selected) context.go(d.path);
                      },
                    );
                  }).toList(),
                ),
              ),
              const Divider(height: 1),
              ListTile(
                leading: const Icon(Icons.logout, color: Colors.redAccent),
                title: const Text('Sign out'),
                onTap: () async {
                  Navigator.pop(context);
                  await context.read<AuthProvider>().logout();
                  if (context.mounted) context.go('/login');
                },
              ),
              const SizedBox(height: 8),
            ],
          ),
        ),
      ),
      body: child,
    );
  }
}
