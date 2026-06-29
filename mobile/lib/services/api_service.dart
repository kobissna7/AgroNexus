import 'package:dio/dio.dart';
import '../config/constants.dart';
import 'storage_service.dart';

class ApiService {
  static final Dio _dio = Dio(BaseOptions(
    baseUrl:        AppConstants.baseUrl,
    connectTimeout: const Duration(seconds: 10),
    receiveTimeout: const Duration(seconds: 15),
    headers: {'Content-Type': 'application/json'},
  ))..interceptors.add(_AuthInterceptor());

  static Dio get dio => _dio;

  // ── Auth ───────────────────────────────────────────────────────────────────
  static Future<Map<String, dynamic>> login(String email, String password) async {
    final r = await _dio.post('/api/v1/auth/login', data: {
      'email': email, 'password': password,
    });
    return r.data as Map<String, dynamic>;
  }

  static Future<Map<String, dynamic>> register({
    required String email,
    required String password,
    required String fullName,
    required String role,
    required String region,
    String? phone,
  }) async {
    final r = await _dio.post('/api/v1/auth/register', data: {
      'email': email, 'password': password,
      'full_name': fullName, 'role': role, 'region': region,
      if (phone != null) 'phone': phone,
    });
    return r.data as Map<String, dynamic>;
  }

  // ── Listings ───────────────────────────────────────────────────────────────
  static Future<List<dynamic>> getListings({String? cropType, String? region}) async {
    final r = await _dio.get('/api/v1/listings', queryParameters: {
      if (cropType != null) 'crop_type': cropType,
      if (region   != null) 'region':    region,
    });
    return r.data as List<dynamic>;
  }

  static Future<List<dynamic>> getMyListings() async {
    final r = await _dio.get('/api/v1/listings/mine');
    return r.data as List<dynamic>;
  }

  static Future<void> createListing(Map<String, dynamic> data) async {
    await _dio.post('/api/v1/listings', data: data);
  }

  static Future<void> deleteListing(String id) async {
    await _dio.delete('/api/v1/listings/$id');
  }

  // ── Orders ─────────────────────────────────────────────────────────────────
  static Future<List<dynamic>> getMyOrders() async {
    final r = await _dio.get('/api/v1/orders/mine');
    return r.data as List<dynamic>;
  }

  static Future<void> placeOrder(String listingId, double quantityKg) async {
    await _dio.post('/api/v1/orders', data: {
      'listing_id': listingId, 'quantity_kg': quantityKg,
    });
  }

  // ── Transport ──────────────────────────────────────────────────────────────
  static Future<List<dynamic>> getTransportRequests() async {
    final r = await _dio.get('/api/v1/transport');
    return r.data as List<dynamic>;
  }

  static Future<void> acceptRequest(String id) async {
    await _dio.put('/api/v1/transport/$id/accept');
  }

  static Future<void> updateTransportStatus(String id, String status) async {
    await _dio.put('/api/v1/transport/$id/status', data: {'status': status});
  }

  // ── Dashboard / Forecasts ──────────────────────────────────────────────────
  static Future<List<dynamic>> getDashboardPrices() async {
    final r = await _dio.get('/api/v1/dashboard/prices');
    return r.data as List<dynamic>;
  }

  static Future<List<dynamic>> getForecastSummary() async {
    final r = await _dio.get('/api/v1/forecasts/summary');
    return r.data as List<dynamic>;
  }

  static Future<Map<String, dynamic>> getForecast(String cropType, String region) async {
    final r = await _dio.post('/api/v1/forecasts/predict', data: {
      'crop_type': cropType, 'region': region,
    });
    return r.data as Map<String, dynamic>;
  }
}

class _AuthInterceptor extends Interceptor {
  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) async {
    final token = await StorageService.getToken();
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    if (err.response?.statusCode == 401) {
      StorageService.clearAll();
    }
    handler.next(err);
  }
}
