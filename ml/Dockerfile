FROM python:3.12-slim

# curl is needed for the Docker healthcheck (CMD curl -f ...)
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5000

# --preload: loads models once in the master process then forks workers
# (avoids each worker re-loading ~2 GB of pkl files separately)
CMD ["gunicorn", "--workers=4", "--preload", "--bind=0.0.0.0:5000", "app:app"]
