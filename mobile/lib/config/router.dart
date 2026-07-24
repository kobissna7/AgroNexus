import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../providers/auth_provider.dart';
import '../widgets/app_shell.dart';
import '../screens/auth/login_screen.dart';
import '../screens/auth/register_screen.dart';
import '../screens/auth/forgot_password_screen.dart';
import '../screens/auth/reset_password_screen.dart';
import '../screens/farmer/farmer_dashboard.dart';
import '../screens/farmer/farmer_listings_screen.dart';
import '../screens/farmer/farmer_orders_screen.dart';
import '../screens/farmer/create_listing_screen.dart';
import '../models/listing.dart';
import '../screens/consumer/browse_screen.dart';
import '../screens/consumer/orders_screen.dart';
import '../screens/consumer/deliveries_screen.dart';
import '../screens/transporter/transport_feed.dart';
import '../screens/transporter/transporter_deliveries_screen.dart';
import '../screens/shared/market_screen.dart';
import '../screens/shared/forecasts_screen.dart';
import '../screens/admin/admin_overview_screen.dart';
import '../screens/admin/admin_users_screen.dart';
import '../screens/admin/admin_listings_screen.dart';
import '../screens/admin/admin_orders_screen.dart';
import '../screens/admin/admin_insights_screen.dart';
import '../screens/home_screen.dart';

const _buyerRoles = ['consumer', 'wholesaler', 'retailer', 'direct_consumer'];

final _farmerNavKey      = GlobalKey<NavigatorState>(debugLabel: 'farmerShell');
final _consumerNavKey    = GlobalKey<NavigatorState>(debugLabel: 'consumerShell');
final _transporterNavKey = GlobalKey<NavigatorState>(debugLabel: 'transporterShell');

const _farmerDestinations = [
  NavDestinationSpec(icon: Icons.home_outlined, selectedIcon: Icons.home, label: 'Dashboard'),
  NavDestinationSpec(icon: Icons.inventory_2_outlined, selectedIcon: Icons.inventory_2, label: 'Listings'),
  NavDestinationSpec(icon: Icons.receipt_long_outlined, selectedIcon: Icons.receipt_long, label: 'Orders'),
  NavDestinationSpec(icon: Icons.show_chart_outlined, selectedIcon: Icons.show_chart, label: 'Market'),
  NavDestinationSpec(icon: Icons.trending_up_outlined, selectedIcon: Icons.trending_up, label: 'Forecasts'),
];

const _consumerDestinations = [
  NavDestinationSpec(icon: Icons.storefront_outlined, selectedIcon: Icons.storefront, label: 'Market'),
  NavDestinationSpec(icon: Icons.receipt_long_outlined, selectedIcon: Icons.receipt_long, label: 'Orders'),
  NavDestinationSpec(icon: Icons.local_shipping_outlined, selectedIcon: Icons.local_shipping, label: 'Deliveries'),
  NavDestinationSpec(icon: Icons.show_chart_outlined, selectedIcon: Icons.show_chart, label: 'Prices'),
  NavDestinationSpec(icon: Icons.trending_up_outlined, selectedIcon: Icons.trending_up, label: 'Forecasts'),
];

const _transporterDestinations = [
  NavDestinationSpec(icon: Icons.local_shipping_outlined, selectedIcon: Icons.local_shipping, label: 'Feed'),
  NavDestinationSpec(icon: Icons.checklist_outlined, selectedIcon: Icons.checklist, label: 'Deliveries'),
];

GoRouter buildRouter(AuthProvider auth) {
  return GoRouter(
    initialLocation: '/',
    refreshListenable: auth,
    redirect: (context, state) {
      final loggedIn = auth.isAuthenticated;
      final loc = state.matchedLocation;
      final onPublic = loc == '/' || loc == '/login' || loc == '/register' ||
                        loc == '/forgot-password' || loc == '/reset-password';

      if (auth.status == AuthStatus.unknown) return null;

      if (!loggedIn) {
        return onPublic ? null : '/login';
      }

      final role = auth.user!.role;
      final home = role == 'farmer' ? '/farmer'
          : role == 'admin' ? '/admin'
          : role == 'transporter' ? '/transporter'
          : _buyerRoles.contains(role) ? '/consumer'
          : '/login';

      if (onPublic) return home;

      // Role guards — mirror web's ProtectedRoute allowedRoles.
      if (loc.startsWith('/farmer')      && role != 'farmer')      return home;
      if (loc.startsWith('/consumer')    && !_buyerRoles.contains(role)) return home;
      if (loc.startsWith('/transporter') && role != 'transporter') return home;
      if (loc.startsWith('/admin')       && role != 'admin')       return home;

      return null;
    },
    routes: [
      GoRoute(path: '/',                 builder: (_, __) => const HomeScreen()),
      GoRoute(path: '/login',            builder: (_, __) => const LoginScreen()),
      GoRoute(path: '/register',         builder: (_, __) => const RegisterScreen()),
      GoRoute(path: '/forgot-password',  builder: (_, __) => const ForgotPasswordScreen()),
      GoRoute(path: '/reset-password',   builder: (_, __) => const ResetPasswordScreen()),

      // Pushed full-screen routes — deliberately outside every shell so the
      // bottom nav / drawer doesn't show over a create/edit form.
      GoRoute(path: '/farmer/listing/new', builder: (_, __) => const CreateListingScreen()),
      GoRoute(
        path: '/farmer/listing/:id/edit',
        builder: (_, state) => CreateListingScreen(editing: state.extra as Listing?),
      ),

      // ── Farmer ──
      StatefulShellRoute.indexedStack(
        builder: (context, state, shell) => AppShell(navigationShell: shell, destinations: _farmerDestinations),
        branches: [
          StatefulShellBranch(navigatorKey: _farmerNavKey, routes: [
            GoRoute(path: '/farmer', builder: (_, __) => const FarmerDashboardScreen()),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(path: '/farmer/listings', builder: (_, __) => const FarmerListingsScreen()),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(path: '/farmer/orders', builder: (_, __) => const FarmerOrdersScreen()),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(path: '/farmer/market', builder: (_, __) => const MarketScreen()),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(path: '/farmer/forecasts', builder: (_, __) => const ForecastsScreen()),
          ]),
        ],
      ),

      // ── Consumer / buyer ──
      StatefulShellRoute.indexedStack(
        builder: (context, state, shell) => AppShell(navigationShell: shell, destinations: _consumerDestinations),
        branches: [
          StatefulShellBranch(navigatorKey: _consumerNavKey, routes: [
            GoRoute(path: '/consumer', builder: (_, __) => const ConsumerBrowseScreen()),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(path: '/consumer/orders', builder: (_, __) => const ConsumerOrdersScreen()),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(path: '/consumer/deliveries', builder: (_, __) => const ConsumerDeliveriesScreen()),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(path: '/consumer/market', builder: (_, __) => const MarketScreen()),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(path: '/consumer/forecasts', builder: (_, __) => const ForecastsScreen()),
          ]),
        ],
      ),

      // ── Transporter ──
      StatefulShellRoute.indexedStack(
        builder: (context, state, shell) => AppShell(navigationShell: shell, destinations: _transporterDestinations),
        branches: [
          StatefulShellBranch(navigatorKey: _transporterNavKey, routes: [
            GoRoute(path: '/transporter', builder: (_, __) => const TransportFeedScreen()),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(path: '/transporter/deliveries', builder: (_, __) => const TransporterDeliveriesScreen()),
          ]),
        ],
      ),

      // ── Admin — drawer shell, too many destinations for a bottom bar ──
      ShellRoute(
        builder: (context, state, child) => AdminShell(
          currentPath: state.matchedLocation,
          title: _adminTitle(state.matchedLocation),
          child: child,
        ),
        routes: [
          GoRoute(path: '/admin',           builder: (_, __) => const AdminOverviewScreen()),
          GoRoute(path: '/admin/users',     builder: (_, __) => const AdminUsersScreen()),
          GoRoute(path: '/admin/listings',  builder: (_, __) => const AdminListingsScreen()),
          GoRoute(path: '/admin/orders',    builder: (_, __) => const AdminOrdersScreen()),
          GoRoute(path: '/admin/market',    builder: (_, __) => const MarketScreen()),
          GoRoute(path: '/admin/forecasts', builder: (_, __) => const ForecastsScreen()),
          GoRoute(path: '/admin/insights',  builder: (_, __) => const AdminInsightsScreen()),
        ],
      ),
    ],
    errorBuilder: (context, state) => Scaffold(
      body: Center(child: Text('Page not found: ${state.uri}')),
    ),
  );
}

String _adminTitle(String path) => switch (path) {
  '/admin'           => 'Overview',
  '/admin/users'     => 'Users',
  '/admin/listings'  => 'Listings',
  '/admin/orders'    => 'Orders',
  '/admin/market'    => 'Market',
  '/admin/forecasts' => 'Forecasts',
  '/admin/insights'  => 'Insights',
  _                  => 'Admin',
};
