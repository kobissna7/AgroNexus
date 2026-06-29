import 'package:flutter/foundation.dart';
import '../models/user.dart';
import '../services/api_service.dart';
import '../services/storage_service.dart';

enum AuthStatus { unknown, authenticated, unauthenticated }

class AuthProvider extends ChangeNotifier {
  AuthStatus _status = AuthStatus.unknown;
  AppUser?   _user;
  String?    _error;

  AuthStatus get status => _status;
  AppUser?   get user   => _user;
  String?    get error  => _error;
  bool get isAuthenticated => _status == AuthStatus.authenticated;

  Future<void> init() async {
    final token   = await StorageService.getToken();
    final userMap = await StorageService.getUser();
    if (token != null && userMap != null) {
      _user   = AppUser.fromJson(userMap);
      _status = AuthStatus.authenticated;
    } else {
      _status = AuthStatus.unauthenticated;
    }
    notifyListeners();
  }

  Future<bool> login(String email, String password) async {
    _error = null;
    try {
      final data  = await ApiService.login(email, password);
      final token = data['token'] as String;
      final user  = AppUser.fromJson(data['user'] as Map<String, dynamic>);
      await StorageService.saveToken(token);
      await StorageService.saveUser(user.toJson());
      _user   = user;
      _status = AuthStatus.authenticated;
      notifyListeners();
      return true;
    } on Exception catch (e) {
      _error = _parseError(e);
      notifyListeners();
      return false;
    }
  }

  Future<bool> register({
    required String email,
    required String password,
    required String fullName,
    required String role,
    required String region,
    String? phone,
  }) async {
    _error = null;
    try {
      await ApiService.register(
        email: email, password: password,
        fullName: fullName, role: role, region: region, phone: phone,
      );
      return login(email, password);
    } on Exception catch (e) {
      _error = _parseError(e);
      notifyListeners();
      return false;
    }
  }

  Future<void> logout() async {
    await StorageService.clearAll();
    _user   = null;
    _status = AuthStatus.unauthenticated;
    notifyListeners();
  }

  String _parseError(Exception e) {
    final msg = e.toString();
    if (msg.contains('401') || msg.contains('Invalid')) return 'Invalid email or password';
    if (msg.contains('409') || msg.contains('exists'))  return 'Email already registered';
    if (msg.contains('SocketException') || msg.contains('connect')) return 'Cannot reach server';
    return 'Something went wrong';
  }
}
