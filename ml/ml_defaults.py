"""Shared constants mirroring generate_dataset.py — used as fallback defaults.

REGIONS are real farming/market towns in Ghana's Western Region known for
mixed food crop production: cassava, plantain, maize, rice, tomatoes, pepper.
Sources: MOFA Western Region district reports.
"""

MOFA_BASE_DEMAND = {
    'maize':    320,
    'tomatoes': 180,
    'plantain': 420,
    'cassava':  560,
    'pepper':    90,
    'rice':     210,
}

BASE_PRICE_2018 = {
    'maize':    1.60,
    'tomatoes': 3.20,
    'plantain': 1.80,
    'cassava':  1.10,
    'pepper':   7.00,
    'rice':     2.80,
}

CROPS = ['maize', 'tomatoes', 'plantain', 'cassava', 'pepper', 'rice']

# Real Ghana Western Region farming areas (MOFA district-level markets)
# Aowin        — major plantain & pepper belt; Asuom–Enchi corridor
# Bibiani       — cassava + maize hub; Bibiani-Anhwiaso-Bekwai district
# Juaboso       — cassava/plantain surplus area; weekly market Juaboso
# Sefwi Wiawso  — rice growing valley + tomato/veg cultivation
# Wasa Amenfi   — maize & cassava; Wasa Amenfi East & West districts
REGIONS = ['Aowin', 'Bibiani', 'Juaboso', 'Sefwi Wiawso', 'Wasa Amenfi']

# Region-specific demand multipliers (higher = larger/busier market)
REGION_DEMAND_SCALE = {
    'Aowin':        0.90,   # smaller market, strong plantain surplus
    'Bibiani':      1.10,   # larger town, higher throughput
    'Juaboso':      0.85,   # rural, lower absolute volume
    'Sefwi Wiawso': 1.05,   # district capital, good road access
    'Wasa Amenfi':  1.00,   # baseline
}
