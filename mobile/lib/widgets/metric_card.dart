import 'package:flutter/material.dart';
import '../config/theme.dart';

class MetricCard extends StatelessWidget {
  final String label;
  final String value;
  final String? sub;
  final IconData? icon;
  final Color iconColor;

  const MetricCard({
    super.key,
    required this.label,
    required this.value,
    this.sub,
    this.icon,
    this.iconColor = AppColors.brand,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          if (icon != null) ...[
            Container(
              width: 40, height: 40,
              decoration: BoxDecoration(
                color: AppColors.brandPale,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: iconColor, size: 20),
            ),
            const SizedBox(width: 12),
          ],
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: const TextStyle(fontSize: 12, color: AppColors.textSecond)),
                const SizedBox(height: 2),
                Text(value, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                if (sub != null)
                  Text(sub!, style: const TextStyle(fontSize: 11, color: AppColors.textMuted)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
