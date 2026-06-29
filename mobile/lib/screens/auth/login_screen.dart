import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../config/theme.dart';
import '../../providers/auth_provider.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey  = GlobalKey<FormState>();
  final _email    = TextEditingController();
  final _password = TextEditingController();
  bool _loading   = false;
  bool _obscure   = true;

  @override
  void dispose() {
    _email.dispose(); _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _loading = true);
    final auth    = context.read<AuthProvider>();
    final success = await auth.login(_email.text.trim(), _password.text);
    if (!mounted) return;
    setState(() => _loading = false);
    if (success) {
      final role = auth.user!.role;
      if (role == 'farmer')      context.go('/farmer');
      else if (role == 'consumer') context.go('/consumer');
      else                          context.go('/transporter');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.brandDark,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              const SizedBox(height: 48),
              // Logo
              Container(
                width: 72, height: 72,
                decoration: BoxDecoration(
                  color: AppColors.brand,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: const Icon(Icons.eco, color: Colors.white, size: 36),
              ),
              const SizedBox(height: 16),
              const Text('AgroNexus', style: TextStyle(
                fontSize: 28, fontWeight: FontWeight.bold, color: Colors.white,
              )),
              const Text('Agricultural Marketplace', style: TextStyle(
                color: Color(0xFFA3C4B0), fontSize: 14,
              )),
              const SizedBox(height: 48),
              // Card
              Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(24),
                ),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const Text('Sign in', style: TextStyle(
                        fontSize: 22, fontWeight: FontWeight.bold, color: AppColors.textPrimary,
                      )),
                      const SizedBox(height: 4),
                      const Text('Enter your credentials to continue', style: TextStyle(
                        color: AppColors.textSecond, fontSize: 13,
                      )),
                      const SizedBox(height: 24),
                      TextFormField(
                        controller: _email,
                        keyboardType: TextInputType.emailAddress,
                        decoration: const InputDecoration(
                          labelText: 'Email', prefixIcon: Icon(Icons.email_outlined),
                        ),
                        validator: (v) => (v?.contains('@') ?? false) ? null : 'Enter a valid email',
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _password,
                        obscureText: _obscure,
                        decoration: InputDecoration(
                          labelText: 'Password',
                          prefixIcon: const Icon(Icons.lock_outline),
                          suffixIcon: IconButton(
                            icon: Icon(_obscure ? Icons.visibility_off : Icons.visibility),
                            onPressed: () => setState(() => _obscure = !_obscure),
                          ),
                        ),
                        validator: (v) => (v?.length ?? 0) >= 6 ? null : 'Min 6 characters',
                      ),
                      // Error
                      Consumer<AuthProvider>(
                        builder: (_, auth, __) => auth.error != null
                          ? Padding(
                              padding: const EdgeInsets.only(top: 12),
                              child: Text(auth.error!,
                                style: const TextStyle(color: AppColors.redText, fontSize: 13),
                                textAlign: TextAlign.center,
                              ),
                            )
                          : const SizedBox.shrink(),
                      ),
                      const SizedBox(height: 20),
                      ElevatedButton(
                        onPressed: _loading ? null : _submit,
                        child: _loading
                          ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                          : const Text('Sign in'),
                      ),
                      const SizedBox(height: 16),
                      TextButton(
                        onPressed: () => context.push('/register'),
                        child: const Text("Don't have an account? Register"),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
