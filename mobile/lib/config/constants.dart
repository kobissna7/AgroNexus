class AppConstants {
  // Physical device: dev machine's LAN IP. For the emulator use http://10.0.2.2:3001
  static const String baseUrl = 'http://172.20.10.7:3001';

  static const Map<String, String> cropIcons = {
    'maize':    '🌽',
    'tomatoes': '🍅',
    'plantain': '🍌',
    'cassava':  '🥔',
    'pepper':   '🌶️',
    'rice':     '🌾',
  };

  static const List<String> crops = [
    'maize', 'tomatoes', 'plantain', 'cassava', 'pepper', 'rice',
  ];

  static const List<String> regions = ['Tarkwa', 'Bogoso', 'Prestea'];

  // Hive box names
  static const String tokenBox       = 'auth';
  static const String userBox        = 'user';
  static const String listingsBox    = 'listings';
  static const String ordersBox      = 'orders';
  static const String transportBox   = 'transport';
  static const String forecastsBox   = 'forecasts';
}
