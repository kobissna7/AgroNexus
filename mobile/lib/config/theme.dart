import 'package:flutter/material.dart';

/// AgroNexus 3-color design system — mirrors web/src/index.css.
/// Only three colors exist: #0B2E14 (brand green), #000000, #FFFFFF.
/// Every value below is one of those or a tint/alpha mix of them.
/// Never introduce another hue (no gold, no red, no blue, no gray-blue).
///
/// Light mode: white canvas, green + black content.
/// Dark mode: GREEN-dominant (canvas is brand green, black only in mixes) —
/// same as the web. Colors resolve from the device brightness at read time;
/// MaterialApp uses themeMode: ThemeMode.system with buildTheme(brightness).
class _Palette {
  final Color background, surface, surface2;
  final Color textPrimary, textSecond, textMuted, border;
  final Color brand, onBrand, brandMid, brandLight, brandPale;
  final Color statusDoneBg, statusDoneFg;   // solid pill = done
  final Color statusSoftBg, statusSoftFg;   // soft tint = waiting / in progress
  final Color statusDeadBg, statusDeadFg;   // inverted = cancelled / error
  const _Palette({
    required this.background, required this.surface, required this.surface2,
    required this.textPrimary, required this.textSecond, required this.textMuted, required this.border,
    required this.brand, required this.onBrand, required this.brandMid, required this.brandLight, required this.brandPale,
    required this.statusDoneBg, required this.statusDoneFg,
    required this.statusSoftBg, required this.statusSoftFg,
    required this.statusDeadBg, required this.statusDeadFg,
  });
}

const _light = _Palette(
  background:   Colors.white,
  surface:      Colors.white,
  surface2:     Color(0xFFF3F5F3), // green 5% on white
  textPrimary:  Color(0xEB000000), // black 92%
  textSecond:   Color(0x99000000), // black 60%
  textMuted:    Color(0x66000000), // black 40%
  border:       Color(0x1A000000), // black 10%
  brand:        AppColors.green,
  onBrand:      Colors.white,
  brandMid:     Color(0xFF48624F), // green 75% + white
  brandLight:   Color(0xFFDCE2DE), // green 14% on white
  brandPale:    Color(0xFFF3F5F3),
  statusDoneBg: AppColors.green,   statusDoneFg: Colors.white,
  statusSoftBg: Color(0x140B2E14), statusSoftFg: AppColors.green,
  statusDeadBg: Colors.black,      statusDeadFg: Colors.white,
);

const _dark = _Palette(
  background:   AppColors.green,   // green-dominant, not black
  surface:      Color(0xFF1F3F27), // white 8% on green
  surface2:     Color(0xFF304D37), // white 15% on green
  textPrimary:  Color(0xF0FFFFFF), // white 94%
  textSecond:   Color(0xADFFFFFF), // white 68%
  textMuted:    Color(0x6BFFFFFF), // white 42%
  border:       Color(0x24FFFFFF), // white 14%
  brand:        Colors.white,      // Karma-style: white CTAs on green
  onBrand:      AppColors.green,
  brandMid:     Color(0xFFA3C4B0), // green-white tint for secondary emphasis
  brandLight:   Color(0x1FFFFFFF), // white 12% — soft fills / dividers
  brandPale:    Color(0xFF1F3F27),
  statusDoneBg: Colors.white,      statusDoneFg: AppColors.green,
  statusSoftBg: Color(0x1FFFFFFF), statusSoftFg: Color(0xFFDCE2DE),
  statusDeadBg: Colors.white,      statusDeadFg: Colors.black,
);

class AppColors {
  /// Theme-invariant anchors — safe in const expressions.
  static const green     = Color(0xFF0B2E14);
  static const brandDark = green; // hero / app bars stay dark green in both modes

  static _Palette get _p =>
      WidgetsBinding.instance.platformDispatcher.platformBrightness == Brightness.dark
          ? _dark
          : _light;

  static Color get brand       => _p.brand;
  static Color get onBrand     => _p.onBrand;
  static Color get brandMid    => _p.brandMid;
  static Color get brandLight  => _p.brandLight;
  static Color get brandPale   => _p.brandPale;
  static Color get background  => _p.background;
  static Color get surface     => _p.surface;
  static Color get surface2    => _p.surface2;
  static Color get textPrimary => _p.textPrimary;
  static Color get textSecond  => _p.textSecond;
  static Color get textMuted   => _p.textMuted;
  static Color get border      => _p.border;

  // Status is structural, never hue-coded (legacy names kept for call sites):
  static Color get greenBg   => _p.statusDoneBg;
  static Color get greenText => _p.statusDoneFg;
  static Color get amberBg   => _p.statusSoftBg;
  static Color get amberText => _p.statusSoftFg;
  static Color get blueBg    => _p.statusSoftBg;
  static Color get blueText  => _p.statusSoftFg;
  static Color get redBg     => _p.statusDeadBg;
  static Color get redText   => _p.statusDeadFg;
}

ThemeData buildTheme(Brightness brightness) {
  final p = brightness == Brightness.dark ? _dark : _light;
  return ThemeData(
    useMaterial3: true,
    brightness: brightness,
    colorScheme: ColorScheme.fromSeed(
      seedColor: AppColors.green,
      brightness: brightness,
      primary: p.brand,
      onPrimary: p.onBrand,
      secondary: p.brandMid,
      surface: p.surface,
    ),
    scaffoldBackgroundColor: p.background,
    fontFamily: 'Mulish',
    appBarTheme: const AppBarTheme(
      backgroundColor: AppColors.brandDark,
      foregroundColor: Colors.white,
      elevation: 0,
      centerTitle: false,
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: p.brand,
        foregroundColor: p.onBrand,
        shape: const StadiumBorder(),
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
        textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15, fontFamily: 'Mulish'),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: p.surface,
      hintStyle: TextStyle(color: p.textMuted),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: p.border),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: p.border),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: p.brand, width: 2),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
    ),
    cardTheme: CardThemeData(
      color: p.surface,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: p.border),
      ),
    ),
  );
}
