export const MOA_DATA = {
  source: 'Ghana Ministry of Agriculture',
  lastUpdated: '2025-11-04',
  crops: {
    maize: {
      national_avg: 7.22,
      trend_pct: -28.2,
      by_region: {
        'Central': 4.78, 'Greater Accra': 9.73, 'Western North': 7.48,
        'Bono': 5.31, 'Bono East': 4.54, 'Ashanti': 9.09, 'Ahafo': 6.23,
        'Upper West': 8.16, 'Upper East': 3.10, 'North East': 3.33,
        'Oti': 6.11, 'Savannah': 6.03,
      },
      monthly: [
        { month: '2025-07', avg: 8.58 }, { month: '2025-08', avg: 7.49 },
        { month: '2025-09', avg: 6.64 }, { month: '2025-10', avg: 6.16 },
      ],
    },
    tomatoes: {
      national_avg: 18.31,
      trend_pct: -2.3,
      by_region: {
        'Central': 24.13, 'Greater Accra': 36.04, 'Western North': 36.50,
        'Bono': 23.75, 'Bono East': 24.59, 'Ashanti': 26.10, 'Ahafo': 12.98,
        'Eastern': 12.88, 'Upper West': 9.49, 'Oti': 13.51,
        'Savannah': 8.14, 'North East': 11.44,
      },
      monthly: [
        { month: '2025-07', avg: 20.44 }, { month: '2025-08', avg: 17.69 },
        { month: '2025-09', avg: 15.14 }, { month: '2025-10', avg: 19.96 },
      ],
    },
    plantain: {
      national_avg: 19.93,
      trend_pct: -42.8,
      by_region: {
        'Central': 10.63, 'Greater Accra': 38.49, 'Western North': 12.20,
        'Bono': 10.99, 'Ashanti': 12.53, 'Ahafo': 8.47,
        'Eastern': 13.59, 'Bono East': 11.76, 'Oti': 8.28,
      },
      monthly: [
        { month: '2025-07', avg: 24.67 }, { month: '2025-08', avg: 21.73 },
        { month: '2025-09', avg: 19.22 }, { month: '2025-10', avg: 14.11 },
      ],
    },
    cassava: {
      national_avg: 5.15,
      trend_pct: -13.0,
      by_region: {
        'Central': 6.87, 'Western North': 4.38, 'Bono': 4.09,
        'Ashanti': 3.54, 'Eastern': 5.27, 'Bono East': 3.97, 'Oti': 4.28,
      },
      monthly: [
        { month: '2025-07', avg: 5.32 }, { month: '2025-08', avg: 5.81 },
        { month: '2025-09', avg: 4.83 }, { month: '2025-10', avg: 4.63 },
      ],
    },
    pepper: {
      national_avg: 44.53,
      trend_pct: -8.6,
      by_region: {
        'Central': 61.01, 'Greater Accra': 47.22, 'Western North': 23.86,
        'Bono': 74.27, 'Bono East': 61.72, 'Ashanti': 68.95, 'Ahafo': 30.42,
        'Eastern': 11.23, 'Upper West': 45.27, 'North East': 28.81,
        'Oti': 45.31, 'Upper East': 44.00, 'Savannah': 11.56,
      },
      monthly: [
        { month: '2025-07', avg: 46.62 }, { month: '2025-08', avg: 44.51 },
        { month: '2025-09', avg: 44.40 }, { month: '2025-10', avg: 42.59 },
      ],
    },
    rice: {
      national_avg: 15.83,
      trend_pct: -4.1,
      by_region: {
        'Central': 18.79, 'Greater Accra': 25.64, 'Western North': 19.12,
        'Bono': 13.43, 'Bono East': 13.73, 'Ashanti': 13.81, 'Ahafo': 13.49,
        'Upper West': 17.13, 'Upper East': 8.04, 'Eastern': 16.14,
        'Oti': 13.98, 'Savannah': 16.14, 'North East': 12.67,
      },
      monthly: [
        { month: '2025-07', avg: 16.21 }, { month: '2025-08', avg: 15.38 },
        { month: '2025-09', avg: 16.19 }, { month: '2025-10', avg: 15.55 },
      ],
    },
  } as Record<string, {
    national_avg: number
    trend_pct: number
    by_region: Record<string, number>
    monthly: { month: string; avg: number }[]
  }>,
}
