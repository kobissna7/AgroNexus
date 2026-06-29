class AppUser {
  final String id;
  final String email;
  final String fullName;
  final String role;
  final String region;
  final String? phone;

  const AppUser({
    required this.id,
    required this.email,
    required this.fullName,
    required this.role,
    required this.region,
    this.phone,
  });

  factory AppUser.fromJson(Map<String, dynamic> j) => AppUser(
    id:       j['id'] as String,
    email:    j['email'] as String,
    fullName: j['full_name'] as String,
    role:     j['role'] as String,
    region:   j['region'] as String? ?? '',
    phone:    j['phone'] as String?,
  );

  Map<String, dynamic> toJson() => {
    'id': id, 'email': email, 'full_name': fullName,
    'role': role, 'region': region, 'phone': phone,
  };
}
