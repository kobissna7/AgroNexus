class TransportRequest {
  final String id;
  final String orderId;
  final String? transporterId;
  final String pickupLocation;
  final String deliveryLocation;
  final String cropType;
  final double quantityKg;
  final String status;
  final String createdAt;

  const TransportRequest({
    required this.id,
    required this.orderId,
    this.transporterId,
    required this.pickupLocation,
    required this.deliveryLocation,
    required this.cropType,
    required this.quantityKg,
    required this.status,
    required this.createdAt,
  });

  factory TransportRequest.fromJson(Map<String, dynamic> j) => TransportRequest(
    id:               j['id'] as String,
    orderId:          j['order_id'] as String,
    transporterId:    j['transporter_id'] as String?,
    pickupLocation:   j['pickup_location'] as String,
    deliveryLocation: j['delivery_location'] as String,
    cropType:         j['crop_type'] as String,
    quantityKg:       (j['quantity_kg'] as num).toDouble(),
    status:           j['status'] as String,
    createdAt:        j['created_at'] as String,
  );

  bool get isOpen      => status == 'open';
  bool get isAccepted  => status == 'accepted';
  bool get isInTransit => status == 'in_transit';
  bool get isDelivered => status == 'delivered';
}
