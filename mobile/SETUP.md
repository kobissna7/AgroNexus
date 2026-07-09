# AgroNexus Mobile — Setup Guide

## Prerequisites
- Flutter 3.19+ installed
- Android emulator or physical device (Android 8+)
- Backend running on `localhost:3001`
- ML Flask service running on `localhost:5000`

## 1. Install dependencies
```bash
cd mobile
flutter pub get
```

## 2. Android permissions
Add to `android/app/src/main/AndroidManifest.xml` (inside `<manifest>`):
```xml
<uses-permission android:name="android.permission.INTERNET"/>
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE"/>
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION"/>
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>
```
Location is used at signup/login to derive the user's region automatically
(no manual region input). The app works without it — region just stays unset.

For iOS, add to `ios/Runner/Info.plist`:
```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>Your location sets your market region automatically.</string>
```

## 3. Run on emulator
```bash
flutter run
```
The app uses `10.0.2.2:3001` as the API base URL (Android emulator maps this to localhost).

## 4. Run on physical device
Change `baseUrl` in `lib/config/constants.dart`:
```dart
static const String baseUrl = 'http://<your-machine-ip>:3001';
```
Make sure the backend `CORS_ORIGIN` allows your device IP.

## 5. Build APK
```bash
flutter build apk --release
# Output: build/app/outputs/flutter-apk/app-release.apk
```

## Screens
| Role         | Screens                                          |
|--------------|--------------------------------------------------|
| Farmer       | Dashboard (metrics + forecast strip + listings)  |
|              | Create Listing (crop, qty, price, date)          |
| Consumer     | Browse (filter by crop, place order)             |
|              | My Orders (history + spend summary)              |
| Transporter  | Feed (open requests → accept)                    |
|              | Active tab (mark in transit → delivered)         |

## Offline Mode
- All list data is cached in Hive with a 1-hour TTL
- Offline banner shows automatically when connectivity is lost
- Write operations (create listing, place order, accept) require network
