import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../config/constants.dart';
import '../../config/theme.dart';
import '../../services/api_service.dart';

class CreateListingScreen extends StatefulWidget {
  const CreateListingScreen({super.key});

  @override
  State<CreateListingScreen> createState() => _CreateListingScreenState();
}

class _CreateListingScreenState extends State<CreateListingScreen> {
  final _formKey  = GlobalKey<FormState>();
  final _qty      = TextEditingController();
  final _price    = TextEditingController();
  final _location = TextEditingController();
  String _crop    = 'maize';
  DateTime _availableFrom = DateTime.now();
  bool _loading   = false;
  String? _error;

  @override
  void dispose() {
    _qty.dispose(); _price.dispose(); _location.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() { _loading = true; _error = null; });
    try {
      await ApiService.createListing({
        'crop_type':      _crop,
        'quantity_kg':    double.parse(_qty.text),
        'price_per_kg':   double.parse(_price.text),
        'location':       _location.text.trim(),
        'available_from': _availableFrom.toIso8601String().split('T').first,
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Listing created!'), backgroundColor: AppColors.brand),
        );
        context.pop();
      }
    } catch (e) {
      setState(() { _error = 'Failed to create listing'; _loading = false; });
    }
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _availableFrom,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (picked != null) setState(() => _availableFrom = picked);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(title: const Text('New Listing'), backgroundColor: AppColors.brandDark),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Crop selector
              const Text('Crop Type', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8, runSpacing: 8,
                children: AppConstants.crops.map((c) => ChoiceChip(
                  label: Text('${AppConstants.cropIcons[c]} $c',
                    style: TextStyle(fontSize: 12, color: _crop == c ? Colors.white : AppColors.textSecond)),
                  selected: _crop == c,
                  selectedColor: AppColors.brand,
                  onSelected: (_) => setState(() => _crop = c),
                )).toList(),
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _qty,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                decoration: const InputDecoration(
                  labelText: 'Quantity (kg)',
                  prefixIcon: Icon(Icons.scale_outlined),
                ),
                validator: (v) {
                  final n = double.tryParse(v ?? '');
                  return (n != null && n > 0) ? null : 'Enter a valid quantity';
                },
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _price,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                decoration: const InputDecoration(
                  labelText: 'Price per kg (GH₵)',
                  prefixIcon: Icon(Icons.sell_outlined),
                ),
                validator: (v) {
                  final n = double.tryParse(v ?? '');
                  return (n != null && n > 0) ? null : 'Enter a valid price';
                },
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _location,
                decoration: const InputDecoration(
                  labelText: 'Location / Farm name',
                  prefixIcon: Icon(Icons.location_on_outlined),
                ),
                validator: (v) => (v?.trim().isNotEmpty ?? false) ? null : 'Required',
              ),
              const SizedBox(height: 12),
              // Date picker
              InkWell(
                onTap: _pickDate,
                borderRadius: BorderRadius.circular(12),
                child: InputDecorator(
                  decoration: const InputDecoration(
                    labelText: 'Available from',
                    prefixIcon: Icon(Icons.calendar_today_outlined),
                  ),
                  child: Text(
                    '${_availableFrom.day}/${_availableFrom.month}/${_availableFrom.year}',
                    style: const TextStyle(fontSize: 14),
                  ),
                ),
              ),
              if (_error != null)
                Padding(
                  padding: const EdgeInsets.only(top: 12),
                  child: Text(_error!, style: const TextStyle(color: AppColors.redText), textAlign: TextAlign.center),
                ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: _loading ? null : _submit,
                child: _loading
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : const Text('Create Listing'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
