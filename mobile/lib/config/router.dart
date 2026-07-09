import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../screens/auth/login_screen.dart';
import '../screens/auth/register_screen.dart';
import '../screens/farmer/farmer_dashboard.dart';
import '../screens/farmer/create_listing_screen.dart';
import '../screens/consumer/browse_screen.dart';
import '../screens/consumer/orders_screen.dart';
import '../screens/transporter/transport_feed.dart';
import '../screens/home_screen.dart';

GoRouter buildRouter(AuthProvider auth) {
  return GoRouter(
    initialLocation: '/',
    refreshListenable: auth,
    redirect: (context, state) {
      final loggedIn = auth.isAuthenticated;
      final onPublic = state.matchedLocation == '/' ||
                       state.matchedLocation == '/login' ||
                       state.matchedLocation == '/register';

      if (auth.status == AuthStatus.unknown) return null;
      if (loggedIn && onPublic) {
        final role = auth.user!.role;
        const buyerRoles = ['consumer', 'wholesaler', 'retailer', 'direct_consumer'];
        if (role == 'farmer')           return '/farmer';
        if (buyerRoles.contains(role))  return '/consumer';
        return '/transporter';
      }
      return null;
    },
    routes: [
      GoRoute(path: '/',         builder: (_, __) => const HomeScreen()),
      GoRoute(path: '/login',    builder: (_, __) => const LoginScreen()),
      GoRoute(path: '/register', builder: (_, __) => const RegisterScreen()),

      // Farmer
      GoRoute(path: '/farmer', builder: (_, __) => const FarmerDashboardScreen(),
        routes: [
          GoRoute(path: 'listing/new', builder: (_, __) => const CreateListingScreen()),
        ],
      ),

      // Consumer
      GoRoute(path: '/consumer', builder: (_, __) => const ConsumerBrowseScreen(),
        routes: [
          GoRoute(path: 'orders', builder: (_, __) => const ConsumerOrdersScreen()),
        ],
      ),

      // Transporter
      GoRoute(path: '/transporter', builder: (_, __) => const TransportFeedScreen()),
    ],
    errorBuilder: (context, state) => Scaffold(
      body: Center(child: Text('Page not found: ${state.uri}')),
    ),
  );
}
