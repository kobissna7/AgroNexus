import 'package:flutter/material.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:provider/provider.dart';
import 'config/router.dart';
import 'config/theme.dart';
import 'providers/auth_provider.dart';
import 'providers/connectivity_provider.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Hive.initFlutter();
  runApp(const AgroNexusApp());
}

class AgroNexusApp extends StatefulWidget {
  const AgroNexusApp({super.key});

  @override
  State<AgroNexusApp> createState() => _AgroNexusAppState();
}

class _AgroNexusAppState extends State<AgroNexusApp> {
  final _auth         = AuthProvider();
  final _connectivity = ConnectivityProvider();
  bool _ready = false;

  @override
  void initState() {
    super.initState();
    _init();
  }

  Future<void> _init() async {
    await Future.wait([
      _auth.init(),
      _connectivity.init(),
    ]);
    if (mounted) setState(() => _ready = true);
  }

  @override
  Widget build(BuildContext context) {
    if (!_ready) {
      return MaterialApp(
        debugShowCheckedModeBanner: false,
        home: Scaffold(
          backgroundColor: AppColors.brandDark,
          body: Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Image.asset(
                  'assets/images/logo_icon.png',
                  width: 80, height: 80,
                ),
                const SizedBox(height: 20),
                const Text('AgroNexus', style: TextStyle(
                  color: Colors.white, fontSize: 28, fontWeight: FontWeight.bold,
                )),
                const SizedBox(height: 32),
                const CircularProgressIndicator(color: Colors.white),
              ],
            ),
          ),
        ),
      );
    }

    return MultiProvider(
      providers: [
        ChangeNotifierProvider.value(value: _auth),
        ChangeNotifierProvider.value(value: _connectivity),
      ],
      builder: (context, _) {
        final auth   = context.watch<AuthProvider>();
        final router = buildRouter(auth);
        return MaterialApp.router(
          title: 'AgroNexus',
          debugShowCheckedModeBanner: false,
          theme: buildTheme(Brightness.light),
          darkTheme: buildTheme(Brightness.dark),
          themeMode: ThemeMode.system,
          routerConfig: router,
        );
      },
    );
  }

  @override
  void dispose() {
    _auth.dispose();
    _connectivity.dispose();
    super.dispose();
  }
}
