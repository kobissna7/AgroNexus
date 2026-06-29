class ForecastDay {
  final int day;
  final String date;
  final double demandKg;
  final bool festival;
  final String dayOfWeek;

  const ForecastDay({
    required this.day,
    required this.date,
    required this.demandKg,
    required this.festival,
    required this.dayOfWeek,
  });

  factory ForecastDay.fromJson(Map<String, dynamic> j) => ForecastDay(
    day:        j['day'] as int,
    date:       j['date'] as String,
    demandKg:   (j['demand_kg'] as num).toDouble(),
    festival:   j['festival'] as bool? ?? false,
    dayOfWeek:  j['day_of_week'] as String,
  );
}

class CropForecast {
  final String cropType;
  final String region;
  final List<ForecastDay> forecast;
  final double weeklyPredW1;
  final double weeklyPredW2;
  final double mapePct;

  const CropForecast({
    required this.cropType,
    required this.region,
    required this.forecast,
    required this.weeklyPredW1,
    required this.weeklyPredW2,
    required this.mapePct,
  });

  factory CropForecast.fromJson(Map<String, dynamic> j) => CropForecast(
    cropType:     j['crop_type'] as String,
    region:       j['region'] as String,
    forecast:     (j['forecast'] as List<dynamic>)
        .map((d) => ForecastDay.fromJson(d as Map<String, dynamic>))
        .toList(),
    weeklyPredW1: (j['weekly_pred_w1'] as num?)?.toDouble() ?? 0,
    weeklyPredW2: (j['weekly_pred_w2'] as num?)?.toDouble() ?? 0,
    mapePct:      (j['mape_pct'] as num?)?.toDouble() ?? 0,
  );

  String get trend {
    if (weeklyPredW2 > weeklyPredW1 * 1.03) return 'up';
    if (weeklyPredW2 < weeklyPredW1 * 0.97) return 'down';
    return 'stable';
  }
}
