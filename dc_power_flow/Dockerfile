# DC Power Flow Service Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies including GDAL for geospatial packages
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    gdal-bin \
    libgdal-dev \
    libproj-dev \
    libgeos-dev \
    && rm -rf /var/lib/apt/lists/*

# Set GDAL environment variables
ENV GDAL_CONFIG=/usr/bin/gdal-config
ENV CPLUS_INCLUDE_PATH=/usr/include/gdal
ENV C_INCLUDE_PATH=/usr/include/gdal

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
RUN chown -R app:app /app
USER app

# Expose port
EXPOSE 5002

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5002/health || exit 1

# Start the application
CMD ["python", "api_server.py"] 