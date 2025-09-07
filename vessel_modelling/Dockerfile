# Vessel Modelling Service Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p data logs

# Create non-root user
RUN useradd --create-home --shell /bin/bash app
# Create log files with proper ownership
RUN touch /app/logs/vessel_api.log && chown app:app /app/logs/vessel_api.log
# Ensure log files are writable
RUN mkdir -p /app/logs && chown -R app:app /app/logs
RUN chown -R app:app /app
USER app

# Expose port
EXPOSE 5003

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5003/health || exit 1

# Start the application
CMD ["python", "api_server.py"] 