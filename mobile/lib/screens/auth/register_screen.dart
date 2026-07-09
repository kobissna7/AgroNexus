import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../config/theme.dart';
import '../../providers/auth_provider.dart';
import '../../services/location_service.dart';

const _roleLabels = <String, String>{
  'farmer':          'Farmer',
  'wholesaler':      'Wholesaler',
  'retailer':        'Retailer',
  'direct_consumer': 'Consumer',
  'transporter':     'Transporter',
};

const _buyerRoles = ['wholesaler', 'retailer', 'direct_consumer'];

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
  bool _loading   = false;

  Position? _position;
  bool _locating = true;

  @override
  void initState() {
    super.initState();
    _detectLocation();
  }

  // Location is captured automatically — the backend derives the user's
  // region from it, so there is no manual region input.
  Future<void> _detectLocation() async {
    setState(() => _locating = true);
    final pos = await LocationService.getPosition();
    if (!mounted) return;
    setState(() { _position = pos; _locating = false; });
  }

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
      phone:    _phone.text.isNotEmpty ? _phone.text.trim() : null,
      locationLat: _position?.latitude,
      locationLng: _position?.longitude,
    );
    if (!mounted) return;
    setState(() => _loading = false);
    if (success) {
      if (_role == 'farmer')                     context.go('/farmer');
      else if (_buyerRoles.contains(_role))      context.go('/consumer');
      else                                       context.go('/transporter');
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
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: _roleLabels.entries.map((e) => ChoiceChip(
                  label: Text(e.value, style: TextStyle(fontSize: 12, color: _role == e.key ? Colors.white : AppColors.textSecond)),
                  selected: _role == e.key,
                  selectedColor: AppColors.brand,
                  onSelected: (_) => setState(() => _role = e.key),
                )).toList(),
              ),
              const SizedBox(height: 16),
              // Location — detected automatically; region is derived server-side
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                decoration: BoxDecoration(
                  color: _position != null ? AppColors.brandLight : AppColors.surface,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: _position != null ? AppColors.brand : AppColors.border),
                ),
                child: Row(
                  children: [
                    Icon(Icons.location_on_outlined, size: 18,
                      color: _position != null ? AppColors.brand : AppColors.textMuted),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        _locating
                          ? 'Detecting your location…'
                          : _position != null
                            ? 'Location detected — your region is set automatically'
                            : 'Location unavailable — you can still register',
                        style: TextStyle(
                          fontSize: 12,
                          color: _position != null ? AppColors.brand : AppColors.textSecond,
                        ),
                      ),
                    ),
                    if (!_locating && _position == null)
                      TextButton(
                        onPressed: _detectLocation,
                        child: const Text('Retry', style: TextStyle(fontSize: 12)),
                      ),
                  ],
                ),
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
