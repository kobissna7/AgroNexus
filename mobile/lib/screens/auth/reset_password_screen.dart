import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../config/theme.dart';
import '../../services/api_service.dart';

class ResetPasswordScreen extends StatefulWidget {
  const ResetPasswordScreen({super.key});

  @override
  State<ResetPasswordScreen> createState() => _ResetPasswordScreenState();
}

class _ResetPasswordScreenState extends State<ResetPasswordScreen> {
  final _formKey   = GlobalKey<FormState>();
  final _token     = TextEditingController();
  final _password  = TextEditingController();
  bool _loading    = false;
  bool _done       = false;
  bool _obscure    = true;
  String? _error;

  @override
  void dispose() {
    _token.dispose(); _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() { _loading = true; _error = null; });
    try {
      await ApiService.resetPassword(_token.text.trim(), _password.text);
      if (mounted) setState(() { _loading = false; _done = true; });
    } catch (_) {
      if (mounted) setState(() { _loading = false; _error = 'Invalid or expired reset link'; });
    }
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
                child: const Icon(Icons.password_outlined, color: Colors.white, size: 32),
              ),
              const SizedBox(height: 16),
              const Text('Set a new password', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.white)),
              const SizedBox(height: 6),
              const Text('Paste the code from your reset email', style: TextStyle(color: Color(0xFFA3C4B0), fontSize: 13), textAlign: TextAlign.center),
              const SizedBox(height: 32),
              Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(24)),
                child: _done
                    ? Column(
                        children: [
                          Icon(Icons.check_circle_outline, size: 40, color: AppColors.brand),
                          const SizedBox(height: 14),
                          Text('Password updated', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
                          const SizedBox(height: 6),
                          Text('You can now sign in with your new password.',
                              textAlign: TextAlign.center, style: TextStyle(color: AppColors.textSecond, fontSize: 13)),
                          const SizedBox(height: 20),
                          ElevatedButton(onPressed: () => context.go('/login'), child: const Text('Sign In')),
                        ],
                      )
                    : Form(
                        key: _formKey,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            TextFormField(
                              controller: _token,
                              decoration: const InputDecoration(labelText: 'Reset code', prefixIcon: Icon(Icons.vpn_key_outlined)),
                              validator: (v) => (v?.trim().isNotEmpty ?? false) ? null : 'Required',
                            ),
                            const SizedBox(height: 12),
                            TextFormField(
                              controller: _password,
                              obscureText: _obscure,
                              decoration: InputDecoration(
                                labelText: 'New password',
                                prefixIcon: const Icon(Icons.lock_outline),
                                suffixIcon: IconButton(
                                  icon: Icon(_obscure ? Icons.visibility_off : Icons.visibility),
                                  onPressed: () => setState(() => _obscure = !_obscure),
                                ),
                              ),
                              validator: (v) => (v?.length ?? 0) >= 6 ? null : 'Min 6 characters',
                            ),
                            if (_error != null)
                              Padding(
                                padding: const EdgeInsets.only(top: 12),
                                child: Text(_error!, style: TextStyle(color: AppColors.redText, fontSize: 13), textAlign: TextAlign.center),
                              ),
                            const SizedBox(height: 20),
                            ElevatedButton(
                              onPressed: _loading ? null : _submit,
                              child: _loading
                                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                                  : const Text('Update Password'),
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
