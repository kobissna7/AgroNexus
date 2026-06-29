import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../config/constants.dart';
import '../../config/theme.dart';
import '../../providers/auth_provider.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _formKey  = GlobalKey<FormState>();
  final _name     = TextEditingController();
  final _email    = TextEditingController();
  final _password = TextEditingController();
  final _phone    = TextEditingController();
  String _role    = 'farmer';
  String _region  = 'Tarkwa';
  bool _loading   = false;

  @override
  void dispose() {
    _name.dispose(); _email.dispose(); _password.dispose(); _phone.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _loading = true);
    final auth    = context.read<AuthProvider>();
    final success = await auth.register(
      email:    _email.text.trim(),
      password: _password.text,
      fullName: _name.text.trim(),
      role:     _role,
      region:   _region,
      phone:    _phone.text.isNotEmpty ? _phone.text.trim() : null,
    );
    if (!mounted) return;
    setState(() => _loading = false);
    if (success) {
      if (_role == 'farmer')      context.go('/farmer');
      else if (_role == 'consumer') context.go('/consumer');
      else                          context.go('/transporter');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Create Account'),
        backgroundColor: AppColors.brandDark,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              TextFormField(
                controller: _name,
                decoration: const InputDecoration(labelText: 'Full Name', prefixIcon: Icon(Icons.person_outline)),
                validator: (v) => (v?.trim().isNotEmpty ?? false) ? null : 'Required',
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _email,
                keyboardType: TextInputType.emailAddress,
                decoration: const InputDecoration(labelText: 'Email', prefixIcon: Icon(Icons.email_outlined)),
                validator: (v) => (v?.contains('@') ?? false) ? null : 'Enter a valid email',
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _password,
                obscureText: true,
                decoration: const InputDecoration(labelText: 'Password', prefixIcon: Icon(Icons.lock_outline)),
                validator: (v) => (v?.length ?? 0) >= 6 ? null : 'Min 6 characters',
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _phone,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(labelText: 'Phone (optional)', prefixIcon: Icon(Icons.phone_outlined)),
              ),
              const SizedBox(height: 16),
              // Role
              const Text('I am a', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
              const SizedBox(height: 8),
              Row(children: ['farmer', 'consumer', 'transporter'].map((r) => Expanded(
                child: Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ChoiceChip(
                    label: Text(r, style: TextStyle(fontSize: 12, color: _role == r ? Colors.white : AppColors.textSecond)),
                    selected: _role == r,
                    selectedColor: AppColors.brand,
                    onSelected: (_) => setState(() => _role = r),
                  ),
                ),
              )).toList()),
              const SizedBox(height: 16),
              // Region
              DropdownButtonFormField<String>(
                value: _region,
                decoration: const InputDecoration(labelText: 'Region', prefixIcon: Icon(Icons.location_on_outlined)),
                items: AppConstants.regions.map((r) => DropdownMenuItem(value: r, child: Text(r))).toList(),
                onChanged: (v) => setState(() => _region = v!),
              ),
              // Error
              Consumer<AuthProvider>(
                builder: (_, auth, __) => auth.error != null
                  ? Padding(
                      padding: const EdgeInsets.only(top: 12),
                      child: Text(auth.error!, style: const TextStyle(color: AppColors.redText, fontSize: 13), textAlign: TextAlign.center),
                    )
                  : const SizedBox.shrink(),
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: _loading ? null : _submit,
                child: _loading
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : const Text('Create Account'),
              ),
              const SizedBox(height: 12),
              TextButton(
                onPressed: () => context.pop(),
                child: const Text('Already have an account? Sign in'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
