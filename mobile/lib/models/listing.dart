class Listing {
  final String id;
  // Null on the buyer-facing browse feed — farmer identity is never exposed
  // to buyers; only the farmer's own listings include it.
  final String? farmerId;
  final String cropType;
  final double quantityKg;
  final double pricePerKg;
  final String location;
  final String availableFrom;
  final String status;

  const Listing({
    required this.id,
    this.farmerId,
    required this.cropType,
    required this.quantityKg,
    required this.pricePerKg,
    required this.location,
    required this.availableFrom,
    required this.status,
  });

  factory Listing.fromJson(Map<String, dynamic> j) => Listing(
    id:            j['id'] as String,
    farmerId:      j['farmer_id'] as String?,
    cropType:      j['crop_type'] as String,
    quantityKg:    (j['quantity_kg'] as num).toDouble(),
    pricePerKg:    (j['price_per_kg'] as num).toDouble(),
    location:      j['location'] as String,
    availableFrom: j['available_from'] as String,
    status:        j['status'] as String,
  );

  Map<String, dynamic> toJson() => {
    'id': id, 'farmer_id': farmerId, 'crop_type': cropType,
    'quantity_kg': quantityKg, 'price_per_kg': pricePerKg,
    'location': location, 'available_from': availableFrom, 'status': status,
  };
}
