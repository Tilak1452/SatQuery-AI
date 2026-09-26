# Production Dockerfile for SatQuery AI Backend
# Fully compatible with Hugging Face Spaces (Port 7860, UID 1000) and Render/Cloud Run (${PORT:-7860})

FROM python:3.11-slim

# Avoid interactive prompts during apt installs
ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# Install system dependencies for OpenCV and raster handling
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Hugging Face Spaces security: create user 1000
RUN useradd -m -u 1000 appuser

WORKDIR /app

# Install Python dependencies first for optimal Docker layer caching
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application source code
COPY . /app

# Ensure runtime writable directories exist with proper permissions
RUN mkdir -p /app/input_images /app/downloads /app/secrets && \
    chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Hugging Face Spaces listens on port 7860 by default; Render provides $PORT
EXPOSE 7860

# Launch FastAPI with uvicorn supporting both Hugging Face ($PORT=7860) and cloud hosts
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-7860}"]
