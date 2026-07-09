import 'package:geolocator/geolocator.dart';

/// Fetches the device's GPS position so the backend can derive the user's
/// region automatically. All failures (services off, permission denied,
/// timeout) resolve to null — location is never a hard requirement.
class LocationService {
  static Future<Position?> getPosition() async {
    try {
      if (!await Geolocator.isLocationServiceEnabled()) return null;

      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        return null;
      }

      return await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.medium,
        timeLimit: const Duration(seconds: 10),
      );
    } catch (_) {
      return null;
    }
  }
}
