import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:hive_flutter/hive_flutter.dart';
import '../config/constants.dart';

class StorageService {
  static final _secure = FlutterSecureStorage(
    aOptions: const AndroidOptions(encryptedSharedPreferences: true),
  );

  // ── JWT token ──────────────────────────────────────────────────────────────
  static Future<void> saveToken(String token) =>
      _secure.write(key: 'jwt', value: token);

  static Future<String?> getToken() => _secure.read(key: 'jwt');

  static Future<void> deleteToken() => _secure.delete(key: 'jwt');

  // ── User profile ───────────────────────────────────────────────────────────
  static Future<void> saveUser(Map<String, dynamic> user) async {
    final box = await Hive.openBox(AppConstants.userBox);
    await box.put('current', jsonEncode(user));
  }

  static Future<Map<String, dynamic>?> getUser() async {
    final box  = await Hive.openBox(AppConstants.userBox);
    final raw  = box.get('current') as String?;
    if (raw == null) return null;
    return jsonDecode(raw) as Map<String, dynamic>;
  }

  static Future<void> clearUser() async {
    final box = await Hive.openBox(AppConstants.userBox);
    await box.delete('current');
  }

  // ── Generic list cache ─────────────────────────────────────────────────────
  static Future<void> cacheList(String boxName, List<dynamic> items) async {
    final box = await Hive.openBox(boxName);
    await box.put('data', jsonEncode(items));
    await box.put('ts', DateTime.now().millisecondsSinceEpoch);
  }

  static Future<List<dynamic>?> getCachedList(String boxName, {int maxAgeMinutes = 60}) async {
    final box = await Hive.openBox(boxName);
    final ts  = box.get('ts') as int?;
    if (ts == null) return null;
    final age = DateTime.now().millisecondsSinceEpoch - ts;
    if (age > maxAgeMinutes * 60 * 1000) return null;
    final raw = box.get('data') as String?;
    if (raw == null) return null;
    return jsonDecode(raw) as List<dynamic>;
  }

  // ── Clear all (logout) ─────────────────────────────────────────────────────
  static Future<void> clearAll() async {
    await deleteToken();
    await clearUser();
    for (final name in [
      AppConstants.listingsBox, AppConstants.ordersBox,
      AppConstants.transportBox, AppConstants.forecastsBox,
    ]) {
      final box = await Hive.openBox(name);
      await box.clear();
    }
  }
}
