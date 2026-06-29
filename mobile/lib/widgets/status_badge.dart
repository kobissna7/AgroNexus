import 'package:flutter/material.dart';
import '../config/theme.dart';

class StatusBadge extends StatelessWidget {
  final String status;
  const StatusBadge(this.status, {super.key});

  @override
  Widget build(BuildContext context) {
    final (bg, fg) = _colors(status);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(99)),
      child: Text(
        status.replaceAll('_', ' '),
        style: TextStyle(color: fg, fontSize: 11, fontWeight: FontWeight.w600),
      ),
    );
  }

  (Color, Color) _colors(String s) => switch (s) {
    'active' || 'confirmed' || 'delivered' => (AppColors.greenBg, AppColors.greenText),
    'pending' || 'sold' || 'accepted'      => (AppColors.amberBg, AppColors.amberText),
    'cancelled' || 'expired'               => (AppColors.redBg,   AppColors.redText),
    'in_transit'                            => (AppColors.blueBg,  AppColors.blueText),
    'open'                                  => (AppColors.redBg,   AppColors.redText),
    _                                       => (AppColors.brandLight, AppColors.brand),
  };
}
