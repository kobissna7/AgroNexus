import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../config/theme.dart';
import '../../providers/auth_provider.dart';
import '../../services/location_service.dart';

const _roles = <(String, String, String)>[
  ('farmer', 'Farmer', 'List and sell produce'),
  ('wholesaler', 'Wholesaler', 'Buy in large volumes for distribution'),
  ('retailer', 'Retailer', 'Buy in bulk for resale'),
  ('direct_consumer', 'Direct Consumer', 'Buy produce for personal/household use'),
  ('transporter', 'Transporter', 'Accept and deliver orders'),
];

const _buyerRoles = ['wholesaler', 'retailer', 'direct_consumer'];

// Mirrors web/src/pages/Register.tsx as it renders at phone width (AuthShell's
// dark brand panel is hidden below the lg breakpoint) — plain canvas
// background, no logo, centered label-above-input form.
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
  String? _role;
  bool _loading   = false;
  bool _obscure   = true;

  Position? _position;
  bool _locating = true;

  @override
  void initState() {
    super.initState();
    _detectLocation();
  }

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
    if (_role == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: const Text('Please select a role'), backgroundColor: AppColors.redBg),
      );
      return;
    }
    setState(() => _loading = true);
    final auth    = context.read<AuthProvider>();
    final success = await auth.register(
      email:    _email.text.trim(),
      password: _password.text,
      fullName: _name.text.trim(),
      role:     _role!,
      phone:    _phone.text.isNotEmpty ? _phone.text.trim() : null,
      locationLat: _position?.latitude,
      locationLng: _position?.longitude,
    );
    if (!mounted) return;
    setState(() => _loading = false);
    if (success) {
      if (_role == 'farmer')                context.go('/farmer');
      else if (_buyerRoles.contains(_role)) context.go('/consumer');
      else                                  context.go('/transporter');
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
                    Text('Create your account', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: AppColors.textPrimary, letterSpacing: -0.5)),
                    const SizedBox(height: 4),
                    Text('Free to join — start in under a minute', style: TextStyle(color: AppColors.textSecond, fontSize: 13)),
                    const SizedBox(height: 20),

                    _label('I am a…'),
                    DropdownButtonFormField<String>(
                      initialValue: _role,
                      isExpanded: true,
                      hint: const Text('Select your role', style: TextStyle(fontSize: 13)),
                      items: _roles.map((r) => DropdownMenuItem(
                        value: r.$1,
                        child: Text('${r.$2} — ${r.$3}', style: const TextStyle(fontSize: 13), overflow: TextOverflow.ellipsis),
                      )).toList(),
                      onChanged: (v) => setState(() => _role = v),
                    ),
                    const SizedBox(height: 14),

                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              _label('Full name'),
                              TextFormField(
                                controller: _name,
                                decoration: const InputDecoration(hintText: 'Kwame Mensah'),
                                validator: (v) => (v?.trim().isNotEmpty ?? false) ? null : 'Required',
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              _label('Phone'),
                              TextFormField(
                                controller: _phone,
                                keyboardType: TextInputType.phone,
                                decoration: const InputDecoration(hintText: '024 000 0000'),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),

                    _label('Email address'),
                    TextFormField(
                      controller: _email,
                      keyboardType: TextInputType.emailAddress,
                      decoration: const InputDecoration(hintText: 'you@example.com'),
                      validator: (v) => (v?.contains('@') ?? false) ? null : 'Enter a valid email',
                    ),
                    const SizedBox(height: 14),

                    _label('Password'),
                    TextFormField(
                      controller: _password,
                      obscureText: _obscure,
                      decoration: InputDecoration(
                        hintText: 'At least 6 characters',
                        suffixIcon: IconButton(
                          icon: Icon(_obscure ? Icons.visibility_off_outlined : Icons.visibility_outlined, size: 20, color: AppColors.textMuted),
                          onPressed: () => setState(() => _obscure = !_obscure),
                        ),
                      ),
                      validator: (v) => (v?.length ?? 0) >= 6 ? null : 'Min 6 characters',
                    ),
                    const SizedBox(height: 14),

                    Row(
                      children: [
                        Text.rich(TextSpan(children: [
                          TextSpan(text: 'Location ', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textMuted)),
                          TextSpan(text: '— detected automatically', style: TextStyle(fontSize: 13, color: AppColors.textMuted)),
                        ])),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      decoration: BoxDecoration(
                        color: _position != null ? AppColors.brandSoft : AppColors.surface2,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: _position != null ? AppColors.brand : AppColors.edgeStrong, width: 1.5),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.location_on_outlined, size: 16, color: _position != null ? AppColors.brandInk : AppColors.textSecond),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              _position != null
                                  ? '${_position!.latitude.toStringAsFixed(5)}, ${_position!.longitude.toStringAsFixed(5)}'
                                  : _locating ? 'Detecting your location…' : 'Location not detected',
                              style: TextStyle(fontSize: 13, color: _position != null ? AppColors.brandInk : AppColors.textSecond, fontWeight: _position != null ? FontWeight.w600 : FontWeight.w400),
                            ),
                          ),
                          if (!_locating && _position == null)
                            TextButton(
                              onPressed: _detectLocation,
                              style: TextButton.styleFrom(padding: EdgeInsets.zero, minimumSize: const Size(0, 24)),
                              child: Text('Retry', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.brand)),
                            ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text('Your region is set automatically from your location to match you with nearby markets',
                        style: TextStyle(fontSize: 11, color: AppColors.textMuted)),

                    Consumer<AuthProvider>(
                      builder: (_, auth, __) => auth.error != null
                          ? Container(
                              margin: const EdgeInsets.only(top: 14),
                              width: double.infinity,
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                              decoration: BoxDecoration(color: AppColors.redBg, borderRadius: BorderRadius.circular(10)),
                              child: Text(auth.error!, style: TextStyle(color: AppColors.redText, fontSize: 13, fontWeight: FontWeight.w600)),
                            )
                          : const SizedBox.shrink(),
                    ),
                    const SizedBox(height: 18),
                    SizedBox(
                      height: 52,
                      child: ElevatedButton(
                        onPressed: _loading ? null : _submit,
                        child: _loading
                            ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                            : const Text('Create account', style: TextStyle(fontSize: 15)),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Center(
                      child: RichText(
                        text: TextSpan(
                          style: TextStyle(fontSize: 14, color: AppColors.textSecond),
                          children: [
                            const TextSpan(text: 'Already have an account? '),
                            WidgetSpan(
                              alignment: PlaceholderAlignment.middle,
                              child: GestureDetector(
                                onTap: () => context.pop(),
                                child: Text('Sign in', style: TextStyle(color: AppColors.brand, fontWeight: FontWeight.w700, fontSize: 14)),
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
