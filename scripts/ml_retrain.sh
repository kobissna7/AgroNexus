#!/bin/bash
set -e

# Log file for the retrain loop
LOG_FILE="/tmp/agronexus_ml_retrain.log"

exec >> "$LOG_FILE" 2>&1

echo "========================================"
echo "[$(date -u)] Starting ML data export and retrain loop..."

# 1. Export real platform demand and interest data from Supabase
cd /home/ekko-7/AgroNexus/backend
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi
npm run export:all

# 2. Retrain the model using the synthetic + newly exported real data
cd /home/ekko-7/AgroNexus/ml
source venv/bin/activate
python train.py

# 3. Restart the ML service so it loads the newly trained models
echo "[$(date -u)] Restarting ML service to load new models..."
if systemctl --user is-active --quiet agronexus-ml 2>/dev/null; then
  systemctl --user restart agronexus-ml
else
  # Fallback if not running via systemd
  pkill -f "python app.py" || true
  nohup python app.py > /tmp/ml.log 2>&1 &
fi

echo "[$(date -u)] ML retrain loop complete."
echo "========================================"
