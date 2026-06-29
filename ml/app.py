"""
AgroNexus ML Forecast Service
==============================
POST /predict  — 7-day demand forecast for a crop/region pair
GET  /health   — model status + metrics
GET  /crops    — supported crops + regions

Loads trained GBM + MLP models from ml/models/.
Primary model (lowest MAPE on test set) is used; GBM is the fallback.

Prediction strategy:
  - Fetch recent price+demand history from the caller (or use defaults)
  - Build the same feature vector used at training time
  - Autoregressively predict day+7 (one step per day is not needed —
    we have weekly data, so we produce 7 daily slots by interpolating
    the single weekly prediction with a small trend decay)
"""

import os
import json
import warnings
from pathlib import Path
from datetime import datetime, timedelta

import joblib
import numpy as np
from flask import Flask, request, jsonify
from dotenv import load_dotenv

warnings.filterwarnings('ignore')

load_dotenv()
app = Flask(__name__)

# ─── Load artefacts ───────────────────────────────────────────────────────────
MODELS_DIR = Path(__file__).parent / 'models'


def _load():
    gbm        = joblib.load(MODELS_DIR / 'gbm_model.pkl')
    mlp        = joblib.load(MODELS_DIR / 'mlp_model.pkl')
    scaler_X   = joblib.load(MODELS_DIR / 'scaler_X.pkl')
    scaler_y   = joblib.load(MODELS_DIR / 'scaler_y.pkl')
    encoders   = joblib.load(MODELS_DIR / 'label_encoders.pkl')
    feat_cols  = joblib.load(MODELS_DIR / 'feature_cols.pkl')
    metrics    = json.loads((MODELS_DIR / 'metrics.json').read_text())
    return gbm, mlp, scaler_X, scaler_y, encoders, feat_cols, metrics


try:
    GBM, MLP, SCALER_X, SCALER_Y, ENCODERS, FEATURE_COLS, METRICS = _load()
    PRIMARY = METRICS.get('primary_model', 'mlp')
    MODEL_READY = True
except Exception as e:
    MODEL_READY = False
    LOAD_ERROR = str(e)


# ─── Feature builder ──────────────────────────────────────────────────────────

# Seasonal helpers (mirror train.py)
_MAJOR_HARVEST = {10, 11, 12}
_MINOR_HARVEST = {3, 4, 5}
_FESTIVALS = [
    (12, 20, 31),   # Christmas
    (4,  1,  14),   # Easter
    (8,  1,  31),   # Homowo
]


def _festival_flag(dt: datetime) -> int:
    for m, d0, d1 in _FESTIVALS:
        if dt.month == m and d0 <= dt.day <= d1:
            return 1
    return 0


def _seasonal_demand_factor(dt: datetime) -> float:
    if _festival_flag(dt):
        return 1.30
    if dt.month in _MAJOR_HARVEST:
        return 0.90
    if dt.month in _MINOR_HARVEST:
        return 0.95
    return 1.0


def _build_feature_row(
    crop_type: str,
    region: str,
    ref_date: datetime,
    demand_history: list[float],   # most-recent first, len >= 4
    price_history:  list[float],   # most-recent first, len >= 2
) -> np.ndarray:
    """
    Construct a single feature vector matching FEATURE_COLS.
    demand_history[0] = most recent week, [1] = 2 weeks ago, etc.
    """
    d = demand_history
    p = price_history

    # Lags
    demand_lag_1w = d[0] if len(d) > 0 else 0.0
    demand_lag_2w = d[1] if len(d) > 1 else demand_lag_1w
    demand_lag_4w = d[3] if len(d) > 3 else demand_lag_2w
    price_lag_1w  = p[0] if len(p) > 0 else 0.0
    price_lag_2w  = p[1] if len(p) > 1 else price_lag_1w

    # Rolling stats (over up to 4 / 8 weeks)
    w4 = d[:4]
    w8 = d[:8]
    demand_roll_4w  = float(np.mean(w4)) if w4 else demand_lag_1w
    demand_roll_8w  = float(np.mean(w8)) if w8 else demand_lag_1w
    demand_roll_std = float(np.std(w4))  if len(w4) > 1 else 0.0
    price_roll_4w   = float(np.mean(p[:4])) if p else price_lag_1w

    # Price deviation (elasticity proxy)
    price_dev = (price_lag_1w - price_roll_4w) / (price_roll_4w + 1e-9)

    # Calendar
    month        = ref_date.month
    week_of_year = ref_date.isocalendar()[1]
    year         = ref_date.year

    # Festival
    festival_flag = _festival_flag(ref_date)

    # Categorical encodings
    le_crop   = ENCODERS['crop']
    le_region = ENCODERS['region']

    known_crops   = list(le_crop.classes_)
    known_regions = list(le_region.classes_)

    crop_enc   = int(le_crop.transform([crop_type])[0])   if crop_type in known_crops   else 0
    region_enc = int(le_region.transform([region])[0])    if region in known_regions    else 0

    row = [
        demand_lag_1w, demand_lag_2w, demand_lag_4w,
        price_lag_1w,  price_lag_2w,
        demand_roll_4w, demand_roll_8w, demand_roll_std,
        price_roll_4w,  price_dev,
        month, week_of_year, year,
        festival_flag,
        crop_enc, region_enc,
    ]
    return np.array(row, dtype=float)


def _predict_one(feature_row: np.ndarray) -> float:
    x_s = SCALER_X.transform(feature_row.reshape(1, -1))
    model = MLP if PRIMARY == 'mlp' else GBM
    y_s   = model.predict(x_s)
    y     = SCALER_Y.inverse_transform(y_s.reshape(-1, 1)).ravel()[0]
    return max(float(y), 0.0)


# ─── Routes ───────────────────────────────────────────────────────────────────

@app.route('/health', methods=['GET'])
def health():
    if not MODEL_READY:
        return jsonify({'status': 'error', 'error': LOAD_ERROR}), 503
    return jsonify({
        'status':        'ok',
        'primary_model': PRIMARY,
        'mape_pct':      METRICS[PRIMARY]['mape'],
        'rmse_kg':       METRICS[PRIMARY]['rmse'],
        'train_rows':    METRICS['train_rows'],
        'test_rows':     METRICS['test_rows'],
    })


@app.route('/crops', methods=['GET'])
def crops():
    if not MODEL_READY:
        return jsonify({'error': 'model not loaded'}), 503
    return jsonify({
        'crops':   list(ENCODERS['crop'].classes_),
        'regions': list(ENCODERS['region'].classes_),
    })


@app.route('/predict', methods=['POST'])
def predict():
    if not MODEL_READY:
        return jsonify({'error': 'model not loaded'}), 503

    body = request.get_json(silent=True) or {}
    crop_type = body.get('crop_type', '')
    region    = body.get('region', '')

    if not crop_type or not region:
        return jsonify({'error': 'crop_type and region are required'}), 400

    # Caller may supply recent history; if absent use sensible defaults
    demand_history = body.get('demand_history', [])   # most-recent first
    price_history  = body.get('price_history', [])

    # Pad with crop baseline if caller sends nothing
    from ml_defaults import MOFA_BASE_DEMAND, BASE_PRICE_2018
    base_d = MOFA_BASE_DEMAND.get(crop_type, 300)
    base_p = BASE_PRICE_2018.get(crop_type, 2.50)

    while len(demand_history) < 8:
        demand_history.append(base_d)
    while len(price_history) < 4:
        price_history.append(base_p)

    # Produce a 7-day forecast.
    # Our model predicts weekly demand (the training granularity).
    # We generate 2 weekly predictions (week+1 and week+2) and
    # interpolate to get daily values for days 1–7.
    ref_today = datetime.utcnow()

    # Week-1 prediction
    ref_w1  = ref_today + timedelta(weeks=1)
    feat_w1 = _build_feature_row(crop_type, region, ref_w1, demand_history, price_history)
    pred_w1 = _predict_one(feat_w1)

    # Week-2 prediction (roll history forward)
    demand_history_w2 = [pred_w1] + demand_history
    price_history_w2  = price_history   # price unchanged for forward projection
    ref_w2  = ref_today + timedelta(weeks=2)
    feat_w2 = _build_feature_row(crop_type, region, ref_w2, demand_history_w2, price_history_w2)
    pred_w2 = _predict_one(feat_w2)

    # Distribute weekly demand across 7 daily slots
    # Apply a small seasonal day-of-week ramp (markets busier mid-week in Ghana)
    dow_weights = np.array([0.12, 0.15, 0.16, 0.17, 0.15, 0.14, 0.11])

    forecast = []
    for i in range(7):
        day_date  = ref_today + timedelta(days=i + 1)
        # Blend w1 and w2 predictions linearly across the 7-day window
        alpha     = i / 6.0
        weekly_kg = pred_w1 * (1 - alpha) + pred_w2 * alpha
        daily_kg  = round(weekly_kg * dow_weights[i], 1)

        forecast.append({
            'day':          i + 1,
            'date':         day_date.strftime('%Y-%m-%d'),
            'demand_kg':    daily_kg,
            'festival':     bool(_festival_flag(day_date)),
            'day_of_week':  day_date.strftime('%A'),
        })

    return jsonify({
        'crop_type':     crop_type,
        'region':        region,
        'forecast':      forecast,
        'model_used':    PRIMARY,
        'mape_pct':      METRICS[PRIMARY]['mape'],
        'weekly_pred_w1': round(pred_w1, 1),
        'weekly_pred_w2': round(pred_w2, 1),
        'generated_at':  ref_today.strftime('%Y-%m-%dT%H:%M:%SZ'),
    })


if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_ENV') == 'development'
    app.run(host='0.0.0.0', port=port, debug=debug)
