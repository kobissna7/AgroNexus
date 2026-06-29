import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/connectivity_provider.dart';
import '../config/theme.dart';

class OfflineBanner extends StatelessWidget {
  const OfflineBanner({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<ConnectivityProvider>(
      builder: (_, conn, __) {
        if (conn.isOnline) return const SizedBox.shrink();
        return Container(
          width: double.infinity,
          color: AppColors.amberBg,
          padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
          child: Row(
            children: [
              const Icon(Icons.wifi_off, size: 16, color: AppColors.amberText),
              const SizedBox(width: 8),
              const Expanded(
                child: Text(
                  'You\'re offline — showing cached data',
                  style: TextStyle(
                    fontSize: 12,
                    color: AppColors.amberText,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
