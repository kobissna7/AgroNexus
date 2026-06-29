"""Shared constants mirroring generate_dataset.py — used as fallback defaults."""

MOFA_BASE_DEMAND = {
    'maize': 320, 'tomatoes': 180, 'plantain': 420,
    'cassava': 560, 'pepper': 90, 'rice': 210,
}

BASE_PRICE_2018 = {
    'maize': 1.60, 'tomatoes': 3.20, 'plantain': 1.80,
    'cassava': 1.10, 'pepper': 7.00, 'rice': 2.80,
}

CROPS   = ['maize', 'tomatoes', 'plantain', 'cassava', 'pepper', 'rice']
REGIONS = ['Tarkwa', 'Bogoso', 'Prestea']
