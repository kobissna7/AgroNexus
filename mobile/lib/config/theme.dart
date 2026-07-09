import 'package:flutter/material.dart';

class AppColors {
  static const brandDark    = Color(0xFF0D2B1F);
  static const brand        = Color(0xFF1A5C38);
  static const brandMid     = Color(0xFF2E7D52);
  static const brandLight   = Color(0xFFD6EFE1);
  static const brandPale    = Color(0xFFF0FAF4);
  static const accentGold   = Color(0xFFC9A84C);
  static const background   = Color(0xFFF9FAFB);
  static const surface      = Colors.white;
  static const textPrimary  = Color(0xFF111827);
  static const textSecond   = Color(0xFF6B7280);
  static const textMuted    = Color(0xFF9CA3AF);
  static const border       = Color(0xFFE5E7EB);

  // Status
  static const greenBg   = Color(0xFFD1FAE5);
  static const greenText = Color(0xFF065F46);
  static const amberBg   = Color(0xFFFEF3C7);
  static const amberText = Color(0xFF92400E);
  static const redBg     = Color(0xFFFEE2E2);
  static const redText   = Color(0xFF991B1B);
  static const blueBg    = Color(0xFFDBEAFE);
  static const blueText  = Color(0xFF1E40AF);
}

ThemeData buildTheme() {
  return ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(
      seedColor: AppColors.brand,
      primary: AppColors.brand,
      secondary: AppColors.accentGold,
      surface: AppColors.surface,
    ),
    scaffoldBackgroundColor: AppColors.background,
    fontFamily: 'Inter',
    appBarTheme: const AppBarTheme(
      backgroundColor: AppColors.brandDark,
      foregroundColor: Colors.white,
      elevation: 0,
      centerTitle: false,
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: AppColors.brand,
        foregroundColor: Colors.white,
        shape: const StadiumBorder(),
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
        textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: AppColors.background,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.border),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.border),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.brand, width: 2),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
    ),
    cardTheme: CardThemeData(
      color: AppColors.surface,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: AppColors.border),
      ),
    ),
  );
}
