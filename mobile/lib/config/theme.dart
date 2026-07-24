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
  final Color canvas, canvasSoft, surface, surface2;
  final Color ink, inkStrong, inkMuted, inkFaint;
  final Color edge, edgeStrong, overlay;
  final Color brand, onBrand, brandSoft, brandInk, brandMid;
  final Color statusDoneBg, statusDoneFg;   // solid pill = done
  final Color statusSoftBg, statusSoftFg;   // soft tint = waiting / in progress
  final Color statusDeadBg, statusDeadFg;   // inverted = cancelled / error / attention
  const _Palette({
    required this.canvas, required this.canvasSoft, required this.surface, required this.surface2,
    required this.ink, required this.inkStrong, required this.inkMuted, required this.inkFaint,
    required this.edge, required this.edgeStrong, required this.overlay,
    required this.brand, required this.onBrand, required this.brandSoft, required this.brandInk, required this.brandMid,
    required this.statusDoneBg, required this.statusDoneFg,
    required this.statusSoftBg, required this.statusSoftFg,
    required this.statusDeadBg, required this.statusDeadFg,
  });
}

// Values below are computed 1:1 from web/src/index.css's :root / dark-mode
// blocks (color-mix() percentages resolved to concrete ARGB hex) — not
// approximations. Cross-check against index.css before changing any value.
const _light = _Palette(
  canvas:       Colors.white,
  canvasSoft:   Color(0xFFF8F9F8), // green 3% on white
  surface:      Colors.white,
  surface2:     Color(0xFFF0F2F1), // green 6% on white
  ink:          Color(0xEB000000), // black 92%
  inkStrong:    Color(0xFF000000), // pure black — headings/values
  inkMuted:     Color(0x99000000), // black 60%
  inkFaint:     Color(0x66000000), // black 40%
  edge:         Color(0x1A000000), // black 10% — cards, dividers
  edgeStrong:   Color(0x38000000), // black 22% — input borders
  overlay:      Color(0x73000000), // black 45% — modal scrim
  brand:        AppColors.green,
  onBrand:      Colors.white,
  brandSoft:    Color(0x140B2E14), // green @ 8% alpha — icon fills, soft state
  brandInk:     AppColors.green,
  brandMid:     Color(0xFF48624F), // green 75% + white
  statusDoneBg: AppColors.green,   statusDoneFg: Colors.white,
  statusSoftBg: Color(0x140B2E14), statusSoftFg: AppColors.green,
  statusDeadBg: Colors.black,      statusDeadFg: Colors.white,
);

const _dark = _Palette(
  canvas:       AppColors.green,   // green-dominant, not black
  canvasSoft:   Color(0xFF08220F), // black 26% on green
  surface:      Color(0xFF1F3F27), // white 8% on green
  surface2:     Color(0xFF304D37), // white 15% on green
  ink:          Color(0xF0FFFFFF), // white 94%
  inkStrong:    Color(0xFFFFFFFF), // pure white — headings/values
  inkMuted:     Color(0xADFFFFFF), // white 68%
  inkFaint:     Color(0x6BFFFFFF), // white 42%
  edge:         Color(0x24FFFFFF), // white 14%
  edgeStrong:   Color(0x4DFFFFFF), // white 30%
  overlay:      Color(0xA6000000), // black 65%
  brand:        Colors.white,      // Karma-style: white CTAs on green
  onBrand:      AppColors.green,
  brandSoft:    Color(0x1FFFFFFF), // white @ 12% alpha
  brandInk:     Color(0xFFCED5D0), // green 20% + white
  brandMid:     Color(0xFFA3C4B0), // green-white tint for secondary emphasis
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
  static Color get brandSoft   => _p.brandSoft;
  static Color get brandInk    => _p.brandInk;
  static Color get brandMid    => _p.brandMid;
  // Legacy aliases — both mapped to the correct translucent brand-soft tint
  // (they were previously two different, incorrect opaque-gray values).
  static Color get brandLight  => _p.brandSoft;
  static Color get brandPale   => _p.brandSoft;
  static Color get background  => _p.canvas;
  static Color get canvasSoft  => _p.canvasSoft;
  static Color get surface     => _p.surface;
  static Color get surface2    => _p.surface2;
  // Legacy names kept for call sites — textPrimary reads as "ink" (92/94%
  // body text), not "ink-strong" (pure black/white headings). Use
  // inkStrong explicitly for headings/large values to match web.
  static Color get textPrimary => _p.ink;
  static Color get inkStrong   => _p.inkStrong;
  static Color get textSecond  => _p.inkMuted;
  static Color get textMuted   => _p.inkFaint;
  static Color get border      => _p.edge;
  static Color get edgeStrong  => _p.edgeStrong;
  static Color get overlay     => _p.overlay;

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
    // Explicit ColorScheme — NOT ColorScheme.fromSeed(). fromSeed algorithmically
    // derives secondary/tertiary/error/outline/etc. from the green seed, and
    // Material 3's algorithm always produces a red-family error tone regardless
    // of seed — a hue this app's 3-color system (#0b2e14 / #000 / #fff, see
    // web/src/index.css and CLAUDE.md) explicitly forbids. Every role below is
    // pinned to a real design token so no unstyled widget (dialog, chip,
    // dropdown, snackbar, FAB, form error state) can leak an off-palette color.
    colorScheme: ColorScheme(
      brightness: brightness,
      primary: p.brand, onPrimary: p.onBrand,
      primaryContainer: p.brandSoft, onPrimaryContainer: p.inkStrong,
      secondary: p.brandMid, onSecondary: p.onBrand,
      secondaryContainer: p.brandSoft, onSecondaryContainer: p.inkStrong,
      tertiary: p.brand, onTertiary: p.onBrand,
      // "Error" is expressed structurally (invert black/white), never as red.
      error: p.statusDeadBg, onError: p.statusDeadFg,
      errorContainer: p.statusDeadBg, onErrorContainer: p.statusDeadFg,
      surface: p.surface, onSurface: p.ink,
      surfaceContainerHighest: p.surface2, onSurfaceVariant: p.inkMuted,
      outline: p.edge, outlineVariant: p.edge,
      inverseSurface: p.statusDeadBg, onInverseSurface: p.statusDeadFg,
      inversePrimary: p.onBrand,
      shadow: Colors.black, scrim: Colors.black54,
    ),
    scaffoldBackgroundColor: p.canvas,
    fontFamily: 'Mulish',
    dividerColor: p.edge,
    iconTheme: IconThemeData(color: p.inkMuted),
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
        disabledBackgroundColor: p.edge,
        disabledForegroundColor: p.inkFaint,
        shape: const StadiumBorder(),
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
        textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15, fontFamily: 'Mulish'),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: p.brand,
        side: BorderSide(color: p.brand),
        shape: const StadiumBorder(),
        padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 12),
        textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14, fontFamily: 'Mulish'),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: p.brand,
        textStyle: const TextStyle(fontWeight: FontWeight.w600, fontFamily: 'Mulish'),
      ),
    ),
    iconButtonTheme: IconButtonThemeData(
      style: IconButton.styleFrom(foregroundColor: p.inkMuted),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: p.surface,
      hintStyle: TextStyle(color: p.inkFaint),   // matches web's .input-field::placeholder (ink-faint)
      labelStyle: TextStyle(color: p.inkMuted),  // matches web's <label> color (ink-muted)
      prefixIconColor: p.inkFaint,
      suffixIconColor: p.inkFaint,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: p.edgeStrong), // web's .input-field border is edge-strong, not edge
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: p.edgeStrong),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: p.brand, width: 2),
      ),
      // Field-level validation stays in the ink palette, not red — the app
      // expresses errors structurally (see StatusBadge / status colors),
      // never with a hue outside brand green / black / white.
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: p.inkStrong, width: 1.5),
      ),
      focusedErrorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: p.inkStrong, width: 2),
      ),
      errorStyle: TextStyle(color: p.inkStrong, fontSize: 12, fontWeight: FontWeight.w600),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
    ),
    cardTheme: CardThemeData(
      color: p.surface,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: p.edge),
      ),
    ),
    chipTheme: ChipThemeData(
      backgroundColor: p.surface2,
      selectedColor: p.brand,
      disabledColor: p.surface2,
      labelStyle: TextStyle(color: p.inkMuted, fontSize: 12, fontWeight: FontWeight.w600),
      secondaryLabelStyle: TextStyle(color: p.onBrand, fontSize: 12, fontWeight: FontWeight.w600),
      side: BorderSide(color: p.edge),
      shape: const StadiumBorder(),
      padding: const EdgeInsets.symmetric(horizontal: 4),
    ),
    dialogTheme: DialogThemeData(
      backgroundColor: p.surface,
      surfaceTintColor: Colors.transparent,
      titleTextStyle: TextStyle(color: p.inkStrong, fontSize: 17, fontWeight: FontWeight.w700, fontFamily: 'Mulish'),
      contentTextStyle: TextStyle(color: p.inkMuted, fontSize: 14, fontFamily: 'Mulish'),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
    ),
    snackBarTheme: SnackBarThemeData(
      backgroundColor: p.statusDeadBg,
      contentTextStyle: TextStyle(color: p.statusDeadFg, fontFamily: 'Mulish'),
      actionTextColor: p.statusDeadFg,
      behavior: SnackBarBehavior.floating,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
    ),
    dropdownMenuTheme: DropdownMenuThemeData(
      menuStyle: MenuStyle(
        backgroundColor: WidgetStatePropertyAll(p.surface),
        surfaceTintColor: const WidgetStatePropertyAll(Colors.transparent),
        shape: WidgetStatePropertyAll(RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: BorderSide(color: p.edge))),
      ),
    ),
    popupMenuTheme: PopupMenuThemeData(
      color: p.surface,
      surfaceTintColor: Colors.transparent,
      textStyle: TextStyle(color: p.ink, fontFamily: 'Mulish'),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: BorderSide(color: p.edge)),
    ),
    floatingActionButtonTheme: FloatingActionButtonThemeData(
      backgroundColor: p.brand,
      foregroundColor: p.onBrand,
      extendedTextStyle: const TextStyle(fontWeight: FontWeight.w700, fontFamily: 'Mulish'),
    ),
    progressIndicatorTheme: ProgressIndicatorThemeData(color: p.brand),
    listTileTheme: ListTileThemeData(
      selectedColor: p.brand,
      selectedTileColor: p.brandSoft,
      iconColor: p.inkMuted,
      textColor: p.ink,
    ),
    drawerTheme: DrawerThemeData(backgroundColor: p.surface, surfaceTintColor: Colors.transparent),
    dividerTheme: DividerThemeData(color: p.edge, space: 1),
    switchTheme: SwitchThemeData(
      thumbColor: WidgetStateProperty.resolveWith((s) => s.contains(WidgetState.selected) ? p.brand : p.surface),
      trackColor: WidgetStateProperty.resolveWith((s) => s.contains(WidgetState.selected) ? p.brandSoft : p.surface2),
    ),
    checkboxTheme: CheckboxThemeData(
      fillColor: WidgetStateProperty.resolveWith((s) => s.contains(WidgetState.selected) ? p.brand : Colors.transparent),
      side: BorderSide(color: p.edge, width: 1.5),
    ),
  );
}
