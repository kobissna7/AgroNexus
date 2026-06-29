"""
AgroNexus — Synthetic WFP-style Ghana food price + demand dataset generator.

Produces two CSVs in ml/data/:
  wfp_ghana_prices.csv   — weekly market prices per crop/region (WFP format)
  demand_volume.csv      — weekly demand estimates with seasonal / festival signals

Parameters follow MOFA (Ministry of Food and Agriculture) Ghana production estimates
and WFP GIEWS price bulletin patterns for Western Region markets.
"""

import pandas as pd
import numpy as np
from pathlib import Path

RNG = np.random.default_rng(42)

CROPS = ['maize', 'tomatoes', 'plantain', 'cassava', 'pepper', 'rice']
REGIONS = ['Tarkwa', 'Bogoso', 'Prestea']
MARKETS = {
    'Tarkwa':  'Tarkwa Central Market',
    'Bogoso':  'Bogoso Junction Market',
    'Prestea': 'Prestea Main Market',
}

# WFP base prices (GH₵/kg) — 2018 baseline, escalated ~8%/yr for inflation
BASE_PRICE_2018 = {
    'maize': 1.60, 'tomatoes': 3.20, 'plantain': 1.80,
    'cassava': 1.10, 'pepper': 7.00, 'rice': 2.80,
}
ANNUAL_INFLATION = 0.08

# MOFA production base (tonnes/week, Western Region)
MOFA_BASE_DEMAND = {
    'maize': 320, 'tomatoes': 180, 'plantain': 420,
    'cassava': 560, 'pepper': 90, 'rice': 210,
}

# Ghana harvest calendar (major = Oct–Dec, minor = Mar–May)
MAJOR_HARVEST_MONTHS = {10, 11, 12}
MINOR_HARVEST_MONTHS = {3, 4, 5}

# Festival week ranges (month, day_start, day_end)
FESTIVALS = [
    ('christmas', 12, 20, 31),
    ('easter',    4,  1, 14),   # approximate — varies; April window covers most years
    ('homowo',    8,  1, 31),   # Ga Homowo harvest festival
]


def is_festival_week(dt: pd.Timestamp) -> int:
    for _, m, d_start, d_end in FESTIVALS:
        if dt.month == m and d_start <= dt.day <= d_end:
            return 1
    return 0


def seasonal_price_factor(dt: pd.Timestamp) -> float:
    """Prices fall at harvest (supply glut), rise at lean season."""
    if dt.month in MAJOR_HARVEST_MONTHS:
        return 0.85
    if dt.month in MINOR_HARVEST_MONTHS:
        return 0.92
    if dt.month in {7, 8}:       # lean season before minor harvest
        return 1.12
    if dt.month in {1, 2}:       # post-major, early lean
        return 1.08
    return 1.0


def seasonal_demand_factor(dt: pd.Timestamp) -> float:
    """Demand rises at festivals, dips slightly at peak harvest."""
    if is_festival_week(dt):
        return 1.30
    if dt.month in MAJOR_HARVEST_MONTHS:
        return 0.90
    if dt.month in MINOR_HARVEST_MONTHS:
        return 0.95
    return 1.0


def build_price_series() -> pd.DataFrame:
    dates = pd.date_range('2018-01-01', '2024-12-31', freq='W-MON')
    rows = []

    for crop in CROPS:
        base = BASE_PRICE_2018[crop]
        for region in REGIONS:
            region_factor = RNG.uniform(0.93, 1.07)    # inter-market spread

            for dt in dates:
                years_since_2018 = (dt.year - 2018) + dt.month / 12
                inflation = (1 + ANNUAL_INFLATION) ** years_since_2018
                seasonal  = seasonal_price_factor(dt)
                noise     = RNG.normal(1.0, 0.04)      # ±4% weekly noise

                price = round(base * inflation * seasonal * region_factor * noise, 2)
                rows.append({
                    'date':         dt.strftime('%Y-%m-%d'),
                    'crop_type':    crop,
                    'region':       region,
                    'market_name':  MARKETS[region],
                    'price_per_kg': max(price, 0.20),
                    'currency':     'GHS',
                    'source':       'WFP-GIEWS-Ghana',
                })

    return pd.DataFrame(rows)


def build_demand_series(prices_df: pd.DataFrame) -> pd.DataFrame:
    dates = pd.date_range('2018-01-01', '2024-12-31', freq='W-MON')
    rows = []

    price_lookup = prices_df.set_index(['date', 'crop_type', 'region'])['price_per_kg'].to_dict()

    for crop in CROPS:
        base_demand = MOFA_BASE_DEMAND[crop]
        for region in REGIONS:
            # Simple trend: +2% annual demand growth
            for dt in dates:
                years   = (dt.year - 2018) + dt.month / 12
                trend   = (1 + 0.02) ** years
                season  = seasonal_demand_factor(dt)
                festival = is_festival_week(dt)
                noise   = RNG.normal(1.0, 0.06)

                # Price-demand inverse: if price is 20% above base, demand drops ~15%
                date_str = dt.strftime('%Y-%m-%d')
                price = price_lookup.get((date_str, crop, region), BASE_PRICE_2018[crop])
                base_price_now = BASE_PRICE_2018[crop] * ((1 + ANNUAL_INFLATION) ** years)
                price_ratio = price / max(base_price_now, 0.01)
                price_effect = 1 / (price_ratio ** 0.75)   # price elasticity ~-0.75

                demand_kg = round(
                    base_demand * trend * season * price_effect * noise * (1.0 + 0.15 * festival),
                    1
                )
                rows.append({
                    'date':          date_str,
                    'crop_type':     crop,
                    'region':        region,
                    'demand_kg':     max(demand_kg, 10),
                    'price_per_kg':  price,
                    'festival_flag': festival,
                    'month':         dt.month,
                    'week_of_year':  dt.isocalendar()[1],
                })

    return pd.DataFrame(rows)


if __name__ == '__main__':
    out = Path(__file__).parent
    print('Generating WFP-style price series…')
    prices = build_price_series()
    prices.to_csv(out / 'wfp_ghana_prices.csv', index=False)
    print(f'  ✓ wfp_ghana_prices.csv — {len(prices):,} rows')

    print('Generating demand volume series…')
    demand = build_demand_series(prices)
    demand.to_csv(out / 'demand_volume.csv', index=False)
    print(f'  ✓ demand_volume.csv    — {len(demand):,} rows')
