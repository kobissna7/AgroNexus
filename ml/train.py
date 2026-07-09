"""
AgroNexus ML Training Pipeline
================================
Trains two models for 7-day demand forecasting:
  1. GradientBoostingRegressor  — primary model (also used as fallback)
  2. MLPRegressor (neural net)  — secondary model saved as model.pkl

Features engineered from weekly price + demand time series:
  lag_7, lag_14, lag_30 demand; lag_7 price; rolling 4-week mean;
  month, week_of_year; crop_type (encoded); region (encoded);
  festival_flag; price_elasticity proxy.

Outputs saved to ml/models/:
  gbm_model.pkl      GradientBoostingRegressor
  mlp_model.pkl      MLPRegressor  (primary "neural" model)
  scaler_X.pkl       MinMaxScaler for features
  scaler_y.pkl       MinMaxScaler for target
  label_encoders.pkl crop_type + region label encoders
  metrics.json       MAPE and RMSE on held-out test set
"""

import json
import warnings
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import mean_absolute_percentage_error, root_mean_squared_error
from sklearn.neural_network import MLPRegressor
from sklearn.preprocessing import LabelEncoder, MinMaxScaler

warnings.filterwarnings('ignore')

DATA_DIR   = Path(__file__).parent / 'data'
MODELS_DIR = Path(__file__).parent / 'models'
MODELS_DIR.mkdir(exist_ok=True)

LAG_STEPS     = [7, 14, 30]   # demand lags (in days → weeks: 1, 2, 4)
ROLLING_WIN   = 4              # weeks rolling mean
TRAIN_CUTOFF  = '2023-01-01'  # chronological 80/20 split


# ─── 1. Load & merge ──────────────────────────────────────────────────────────

def load_data() -> pd.DataFrame:
    prices = pd.read_csv(DATA_DIR / 'wfp_ghana_prices.csv', parse_dates=['date'])
    demand = pd.read_csv(DATA_DIR / 'demand_volume.csv',   parse_dates=['date'])

    df = pd.merge(
        demand[['date', 'crop_type', 'region', 'demand_kg', 'festival_flag']],
        prices[['date', 'crop_type', 'region', 'price_per_kg']],
        on=['date', 'crop_type', 'region'],
        how='left',
    )

    # Real marketplace demand exported from the demand_weekly view
    # (backend: npm run export:demand). Platform rows win on overlap.
    platform_path = DATA_DIR / 'platform_demand.csv'
    if platform_path.exists():
        platform = pd.read_csv(platform_path, parse_dates=['date'])
        platform = platform[['date', 'crop_type', 'region', 'demand_kg', 'festival_flag', 'price_per_kg']]
        df = pd.concat([df, platform], ignore_index=True)
        df = df.drop_duplicates(subset=['date', 'crop_type', 'region'], keep='last')
        print(f"Blended {len(platform)} platform demand rows from {platform_path.name}")

    df = df.sort_values(['crop_type', 'region', 'date']).reset_index(drop=True)
    return df


# ─── 2. Feature engineering ───────────────────────────────────────────────────

def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    out = []
    for (crop, region), grp in df.groupby(['crop_type', 'region']):
        grp = grp.sort_values('date').copy()

        # Demand lags (weekly data: lag=1 ≡ 7 days, lag=2 ≡ 14 days, etc.)
        for lag in [1, 2, 4]:
            grp[f'demand_lag_{lag}w'] = grp['demand_kg'].shift(lag)

        # Price lags
        grp['price_lag_1w'] = grp['price_per_kg'].shift(1)
        grp['price_lag_2w'] = grp['price_per_kg'].shift(2)

        # Rolling stats
        grp['demand_roll_4w']  = grp['demand_kg'].shift(1).rolling(ROLLING_WIN).mean()
        grp['demand_roll_8w']  = grp['demand_kg'].shift(1).rolling(8).mean()
        grp['demand_roll_std'] = grp['demand_kg'].shift(1).rolling(ROLLING_WIN).std()
        grp['price_roll_4w']   = grp['price_per_kg'].shift(1).rolling(ROLLING_WIN).mean()

        # Price elasticity proxy: (price - avg_price) / avg_price
        grp['price_dev'] = (grp['price_per_kg'] - grp['price_roll_4w']) / (grp['price_roll_4w'] + 1e-9)

        # Calendar
        grp['month']        = grp['date'].dt.month
        grp['week_of_year'] = grp['date'].dt.isocalendar().week.astype(int)
        grp['year']         = grp['date'].dt.year

        out.append(grp)

    return pd.concat(out, ignore_index=True)


# ─── 3. Encode categoricals ───────────────────────────────────────────────────

FEATURE_COLS = [
    'demand_lag_1w', 'demand_lag_2w', 'demand_lag_4w',
    'price_lag_1w',  'price_lag_2w',
    'demand_roll_4w', 'demand_roll_8w', 'demand_roll_std',
    'price_roll_4w',  'price_dev',
    'month', 'week_of_year', 'year',
    'festival_flag',
    'crop_enc', 'region_enc',
]
TARGET_COL = 'demand_kg'


def encode_and_split(df: pd.DataFrame):
    le_crop   = LabelEncoder().fit(df['crop_type'])
    le_region = LabelEncoder().fit(df['region'])
    df['crop_enc']   = le_crop.transform(df['crop_type'])
    df['region_enc'] = le_region.transform(df['region'])

    df = df.dropna(subset=FEATURE_COLS + [TARGET_COL]).copy()

    train = df[df['date'] < TRAIN_CUTOFF]
    test  = df[df['date'] >= TRAIN_CUTOFF]

    return train, test, le_crop, le_region


# ─── 4. Train ─────────────────────────────────────────────────────────────────

def train(df: pd.DataFrame):
    print('Engineering features…')
    df = engineer_features(df)

    print('Encoding + splitting…')
    train, test, le_crop, le_region = encode_and_split(df)

    X_train = train[FEATURE_COLS].values
    y_train = train[TARGET_COL].values
    X_test  = test[FEATURE_COLS].values
    y_test  = test[TARGET_COL].values

    print(f'Train: {len(X_train):,} | Test: {len(X_test):,}')

    # Scale
    scaler_X = MinMaxScaler().fit(X_train)
    scaler_y = MinMaxScaler().fit(y_train.reshape(-1, 1))

    X_train_s = scaler_X.transform(X_train)
    y_train_s = scaler_y.transform(y_train.reshape(-1, 1)).ravel()
    X_test_s  = scaler_X.transform(X_test)

    # ── GradientBoosting ──────────────────────────────────────────────────────
    print('Training GradientBoostingRegressor…')
    gbm = GradientBoostingRegressor(
        n_estimators=300, max_depth=5, learning_rate=0.05,
        subsample=0.8, min_samples_leaf=10, random_state=42,
    )
    gbm.fit(X_train_s, y_train_s)

    gbm_pred_s = gbm.predict(X_test_s)
    gbm_pred   = scaler_y.inverse_transform(gbm_pred_s.reshape(-1, 1)).ravel()
    gbm_mape   = mean_absolute_percentage_error(y_test, np.maximum(gbm_pred, 1)) * 100
    gbm_rmse   = root_mean_squared_error(y_test, gbm_pred)
    print(f'  GBM  — MAPE: {gbm_mape:.2f}%  RMSE: {gbm_rmse:.1f} kg')

    # ── MLPRegressor (neural network) ─────────────────────────────────────────
    print('Training MLPRegressor (neural net)…')
    mlp = MLPRegressor(
        hidden_layer_sizes=(256, 128, 64),
        activation='relu',
        solver='adam',
        learning_rate_init=0.001,
        max_iter=300,
        early_stopping=True,
        validation_fraction=0.1,
        n_iter_no_change=20,
        random_state=42,
        batch_size=64,
    )
    mlp.fit(X_train_s, y_train_s)

    mlp_pred_s = mlp.predict(X_test_s)
    mlp_pred   = scaler_y.inverse_transform(mlp_pred_s.reshape(-1, 1)).ravel()
    mlp_mape   = mean_absolute_percentage_error(y_test, np.maximum(mlp_pred, 1)) * 100
    mlp_rmse   = root_mean_squared_error(y_test, mlp_pred)
    print(f'  MLP  — MAPE: {mlp_mape:.2f}%  RMSE: {mlp_rmse:.1f} kg')

    # ── Save ──────────────────────────────────────────────────────────────────
    joblib.dump(gbm,    MODELS_DIR / 'gbm_model.pkl')
    joblib.dump(mlp,    MODELS_DIR / 'mlp_model.pkl')
    joblib.dump(scaler_X, MODELS_DIR / 'scaler_X.pkl')
    joblib.dump(scaler_y, MODELS_DIR / 'scaler_y.pkl')
    joblib.dump({'crop': le_crop, 'region': le_region}, MODELS_DIR / 'label_encoders.pkl')
    joblib.dump(FEATURE_COLS, MODELS_DIR / 'feature_cols.pkl')

    metrics = {
        'gbm':  {'mape': round(gbm_mape, 2), 'rmse': round(gbm_rmse, 2)},
        'mlp':  {'mape': round(mlp_mape, 2), 'rmse': round(mlp_rmse, 2)},
        'primary_model': 'mlp' if mlp_mape < gbm_mape else 'gbm',
        'train_rows': len(X_train),
        'test_rows':  len(X_test),
        'train_cutoff': TRAIN_CUTOFF,
        'target_mape_pct': 25.0,
        'achieved': mlp_mape <= 25.0 or gbm_mape <= 25.0,
    }
    (MODELS_DIR / 'metrics.json').write_text(json.dumps(metrics, indent=2))
    print(f'\n✓ Models saved to {MODELS_DIR}')
    print(f'  Primary model: {metrics["primary_model"]}')
    print(f'  Target MAPE ≤ 25%: {"✓ ACHIEVED" if metrics["achieved"] else "✗ MISSED"}')
    return metrics


if __name__ == '__main__':
    print('Loading dataset…')
    df = load_data()
    print(f'  {len(df):,} rows | crops: {df.crop_type.nunique()} | regions: {df.region.nunique()}')
    train(df)
