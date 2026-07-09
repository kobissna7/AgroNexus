import 'package:flutter_test/flutter_test.dart';
import 'package:agronexus/models/listing.dart';

void main() {
  group('Listing.fromJson', () {
    test('parses the anonymized buyer feed (no farmer_id, no users join)', () {
      final listing = Listing.fromJson({
        'id': 'abc-123',
        'crop_type': 'maize',
        'quantity_kg': 250,
        'price_per_kg': 2.5,
        'location': 'Tarkwa',
        'available_from': '2026-07-10',
        'status': 'active',
      });

      expect(listing.farmerId, isNull);
      expect(listing.cropType, 'maize');
      expect(listing.quantityKg, 250.0);
      expect(listing.pricePerKg, 2.5);
    });

    test('parses a farmer-owned listing that includes farmer_id', () {
      final listing = Listing.fromJson({
        'id': 'abc-123',
        'farmer_id': 'farmer-9',
        'crop_type': 'tomatoes',
        'quantity_kg': 80.5,
        'price_per_kg': 4,
        'location': 'Bogoso',
        'available_from': '2026-07-12',
        'status': 'active',
      });

      expect(listing.farmerId, 'farmer-9');
      expect(listing.pricePerKg, 4.0);
    });
  });
}
