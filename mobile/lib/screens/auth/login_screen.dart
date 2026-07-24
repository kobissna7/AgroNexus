import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../config/theme.dart';
import '../../providers/auth_provider.dart';

// Mirrors web/src/components/AuthShell.tsx's form panel as it renders at
// phone width — the dark brand panel is `hidden lg:flex` on web, so on a
// real phone visitors only ever see this: canvas background, no logo, a
// centered label-above-input form.
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
      const buyerRoles = ['consumer', 'wholesaler', 'retailer', 'direct_consumer'];
      if (role == 'farmer')                context.go('/farmer');
      else if (role == 'admin')            context.go('/admin');
      else if (buyerRoles.contains(role))  context.go('/consumer');
      else                                 context.go('/transporter');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text('Sign in', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: AppColors.textPrimary, letterSpacing: -0.5)),
                    const SizedBox(height: 6),
                    Text('Good to see you again', style: TextStyle(color: AppColors.textSecond, fontSize: 14)),
                    const SizedBox(height: 28),
                    _label('Email address'),
                    TextFormField(
                      controller: _email,
                      keyboardType: TextInputType.emailAddress,
                      decoration: const InputDecoration(hintText: 'you@example.com'),
                      validator: (v) => (v?.contains('@') ?? false) ? null : 'Enter a valid email',
                    ),
                    const SizedBox(height: 16),
                    _label('Password'),
                    TextFormField(
                      controller: _password,
                      obscureText: _obscure,
                      decoration: InputDecoration(
                        hintText: '••••••••',
                        suffixIcon: IconButton(
                          icon: Icon(_obscure ? Icons.visibility_off_outlined : Icons.visibility_outlined, size: 20, color: AppColors.textMuted),
                          onPressed: () => setState(() => _obscure = !_obscure),
                        ),
                      ),
                      validator: (v) => (v?.length ?? 0) >= 6 ? null : 'Min 6 characters',
                    ),
                    Align(
                      alignment: Alignment.centerRight,
                      child: TextButton(
                        onPressed: () => context.push('/forgot-password'),
                        style: TextButton.styleFrom(padding: EdgeInsets.zero, minimumSize: const Size(0, 32)),
                        child: Text('Forgot password?', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.brand)),
                      ),
                    ),
                    Consumer<AuthProvider>(
                      builder: (_, auth, __) => auth.error != null
                          ? Container(
                              margin: const EdgeInsets.only(bottom: 4),
                              width: double.infinity,
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                              decoration: BoxDecoration(color: AppColors.redBg, borderRadius: BorderRadius.circular(10)),
                              child: Text(auth.error!, style: TextStyle(color: AppColors.redText, fontSize: 13, fontWeight: FontWeight.w600)),
                            )
                          : const SizedBox.shrink(),
                    ),
                    const SizedBox(height: 12),
                    SizedBox(
                      height: 52,
                      child: ElevatedButton(
                        onPressed: _loading ? null : _submit,
                        child: _loading
                            ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                            : const Text('Sign in', style: TextStyle(fontSize: 15)),
                      ),
                    ),
                    const SizedBox(height: 20),
                    Center(
                      child: RichText(
                        text: TextSpan(
                          style: TextStyle(fontSize: 14, color: AppColors.textSecond),
                          children: [
                            const TextSpan(text: "Don't have an account? "),
                            WidgetSpan(
                              alignment: PlaceholderAlignment.middle,
                              child: GestureDetector(
                                onTap: () => context.push('/register'),
                                child: Text('Create one', style: TextStyle(color: AppColors.brand, fontWeight: FontWeight.w700, fontSize: 14)),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _label(String text) => Padding(
    padding: const EdgeInsets.only(bottom: 6),
    child: Text(text, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textSecond)),
  );
}
