# PV Model Service

A FastAPI-based service for photovoltaic (PV) system modeling and power series calculations using pvlib.

## Overview

This service provides endpoints for:
- Configuring PV systems
- Calculating power series
- Checking PV system status

## Architecture

- **Framework**: FastAPI with uvicorn
- **Port**: 5004
- **Python Version**: 3.11
- **Key Dependencies**: pvlib, pandas, numpy, scipy

## Docker Setup

The service is containerized and integrated into the docker-compose stack.

### Building the Docker Image

```bash
docker-compose build pv-model
```

### Running the Service

```bash
# Start all services
docker-compose up -d

# Start only pv-model
docker-compose up -d pv-model

# View logs
docker-compose logs -f pv-model
```

## API Endpoints

### Health Check
- **GET** `/health` - Health check endpoint

### PV System Operations
- **POST** `/pv_model/configure` - Configure a PV system
- **GET** `/pv_model/status` - Get PV system status
- **POST** `/pv_model/power-series` - Calculate power series

## Environment Variables

- `FLASK_ENV`: Environment mode (default: `production`)
- `PORT`: Service port (default: `5004`)

## Integration

The service is accessible within the Docker network at:
- Internal: `http://pv-model:5004`
- External: `http://localhost:5004` (when running locally)

## Development

### Local Development

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Run the development server:
```bash
python main.py
```

The service will be available at `http://localhost:5004`

### File Structure

```
pv_model/
├── main.py              # Application entry point
├── routes.py            # API route definitions
├── pvlib_service.py     # PV system service logic
├── schemas.py           # Pydantic data models
├── config.py            # Logging configuration
├── requirements.txt     # Python dependencies
├── Dockerfile          # Docker image definition
└── logs/               # Application logs directory
```

## Logging

Logs are stored in the `logs/` directory and mounted as a Docker volume for persistence.

## Health Checks

The Docker container includes automatic health checks every 30 seconds:
- Endpoint: `http://localhost:5004/health`
- Timeout: 3 seconds
- Retries: 3 attempts
- Start period: 5 seconds

