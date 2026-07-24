import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../config/theme.dart';
import '../../services/api_service.dart';

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final _email   = TextEditingController();
  bool _loading  = false;
  bool _sent     = false;

  @override
  void dispose() {
    _email.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _loading = true);
    try {
      await ApiService.forgotPassword(_email.text.trim());
    } catch (_) {
      // Backend always returns success to prevent email enumeration.
    }
    if (mounted) setState(() { _loading = false; _sent = true; });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.brandDark,
      appBar: AppBar(backgroundColor: Colors.transparent, elevation: 0, foregroundColor: Colors.white),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              const SizedBox(height: 24),
              Container(
                width: 64, height: 64,
                decoration: BoxDecoration(color: AppColors.brand, borderRadius: BorderRadius.circular(18)),
                child: const Icon(Icons.lock_reset, color: Colors.white, size: 32),
              ),
              const SizedBox(height: 16),
              const Text('Reset your password', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.white)),
              const SizedBox(height: 6),
              const Text('We\'ll email you a reset link', style: TextStyle(color: Color(0xFFA3C4B0), fontSize: 13)),
              const SizedBox(height: 32),
              Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(24)),
                child: _sent
                    ? Column(
                        children: [
                          Icon(Icons.mark_email_read_outlined, size: 40, color: AppColors.brand),
                          const SizedBox(height: 14),
                          Text('Check your email', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
                          const SizedBox(height: 6),
                          Text('If that email exists, a reset link has been sent.',
                              textAlign: TextAlign.center, style: TextStyle(color: AppColors.textSecond, fontSize: 13)),
                          const SizedBox(height: 20),
                          ElevatedButton(onPressed: () => context.pop(), child: const Text('Back to Sign In')),
                        ],
                      )
                    : Form(
                        key: _formKey,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            TextFormField(
                              controller: _email,
                              keyboardType: TextInputType.emailAddress,
                              decoration: const InputDecoration(labelText: 'Email', prefixIcon: Icon(Icons.email_outlined)),
                              validator: (v) => (v?.contains('@') ?? false) ? null : 'Enter a valid email',
                            ),
                            const SizedBox(height: 20),
                            ElevatedButton(
                              onPressed: _loading ? null : _submit,
                              child: _loading
                                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                                  : const Text('Send Reset Link'),
                            ),
                            const SizedBox(height: 12),
                            TextButton(onPressed: () => context.pop(), child: const Text('Back to Sign In')),
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
