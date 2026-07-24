import 'package:flutter/material.dart';
import '../config/theme.dart';

const _steps = ['Placed', 'Assigned', 'In Transit', 'Delivered'];

int _completedSteps(String status) => switch (status) {
  'delivered'  => 4,
  'in_transit' => 3,
  'accepted'   => 2,
  _            => 1, // open
};

/// 4-stage delivery progress, driven entirely by the transporter's own
/// actions (accept → assigned, status update → in_transit/delivered).
/// Mirrors web/src/pages/consumer/Deliveries.tsx's DeliveryTracker.
class DeliveryTracker extends StatelessWidget {
  final String status;
  const DeliveryTracker({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    final done = _completedSteps(status);
    return Row(
      children: List.generate(_steps.length * 2 - 1, (i) {
        if (i.isOdd) {
          final segDone = (i ~/ 2) < done - 1;
          return Expanded(child: Container(height: 2, color: segDone ? AppColors.brand : AppColors.border));
        }
        final idx = i ~/ 2;
        final isDone = idx < done;
        final isCurrent = idx == done - 1;
        return Column(
          children: [
            Container(
              width: 20, height: 20,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: isDone ? AppColors.brand : AppColors.surface,
                border: Border.all(color: isDone || isCurrent ? AppColors.brand : AppColors.border, width: 2),
                boxShadow: isCurrent && !isDone
                    ? [BoxShadow(color: AppColors.brand.withOpacity(0.25), blurRadius: 0, spreadRadius: 3)]
                    : null,
              ),
              child: isDone
                  ? Icon(Icons.check, size: 12, color: AppColors.onBrand)
                  : null,
            ),
            const SizedBox(height: 4),
            SizedBox(
              width: 58,
              child: Text(
                _steps[idx],
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 9.5,
                  fontWeight: isDone || isCurrent ? FontWeight.w700 : FontWeight.w500,
                  color: isDone || isCurrent ? AppColors.textPrimary : AppColors.textMuted,
                ),
              ),
            ),
          ],
        );
      }),
    );
  }
}
