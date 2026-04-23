# Vessel Modelling Service

Python service for vessel energy consumption analysis and ship matching. Part of the Port Digital Twin system.

## Overview

- **Port**: 5003
- **Purpose**: Vessel energy consumption, closest ship matching, energy graphs
- **Integration**: Backend proxies vessel API requests to this service

## Features

- Identify the closest ship based on energy profiles
- Analyze energy consumption over a time slice
- Generate energy consumption graphs

## Installation

```bash
cd vessel_modelling
pip install -r requirements.txt
```

## Usage

### API server (for integration with backend)

```bash
python api_server.py
```

Runs the API on port 5003.

### Standalone analysis

```bash
python main.py
```

Modify `main.py` to specify target ship, arrival and departure times.

## Scheduled Job (vessel-automation)

A daily cron job runs `vessel_automation.py` at 02:00 (configurable via `TZ`). Uses `Dockerfile.automation` in production.

## Directory Structure

```
vessel_modelling/
├── api_server.py         # API server
├── main.py               # Standalone analysis
├── vessel_automation.py   # Daily automation
├── vessel_functions/     # Core logic
├── Data/                 # Vessel data
├── logs/                 # Application logs
└── output/               # Output files
```

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `FLASK_ENV` | production | Flask environment |
| `PORT` | 5003 | Service port |
| `API_BASE_URL` | http://vessel-modelling:5003 | Used by vessel-automation |

## Root Project Setup

From project root: `npm run install-vessel-deps` installs Python dependencies.
