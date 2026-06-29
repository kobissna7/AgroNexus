class Order {
  final String id;
  final String listingId;
  final String consumerId;
  final double quantityKg;
  final String status;
  final String createdAt;
  final String? cropType;
  final String? location;
  final double? pricePerKg;

  const Order({
    required this.id,
    required this.listingId,
    required this.consumerId,
    required this.quantityKg,
    required this.status,
    required this.createdAt,
    this.cropType,
    this.location,
    this.pricePerKg,
  });

  factory Order.fromJson(Map<String, dynamic> j) {
    final listing = j['produce_listings'] as Map<String, dynamic>?;
    return Order(
      id:          j['id'] as String,
      listingId:   j['listing_id'] as String,
      consumerId:  j['consumer_id'] as String,
      quantityKg:  (j['quantity_kg'] as num).toDouble(),
      status:      j['status'] as String,
      createdAt:   j['created_at'] as String,
      cropType:    listing?['crop_type'] as String?,
      location:    listing?['location'] as String?,
      pricePerKg:  listing != null ? (listing['price_per_kg'] as num?)?.toDouble() : null,
    );
  }

  double get total => quantityKg * (pricePerKg ?? 0);
}
