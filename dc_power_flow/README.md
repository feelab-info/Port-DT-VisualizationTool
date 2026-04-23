# DC Power Flow Service

Python/Flask service for power flow simulations and load flow calculations. Part of the Port Digital Twin system.

## Overview

- **Port**: 5002
- **Framework**: Flask
- **Python**: 3.10
- **Purpose**: DC power flow simulations, load flow, worst-case sizing, KPIs

## Integration

The backend proxies simulation requests to this service and stores results in PostgreSQL. The simulation scheduler runs every minute to capture power flow data.

## Installation

```bash
cd dc_power_flow
python3.10 -m venv venv
source venv/bin/activate   # Linux/macOS
# .\venv\Scripts\activate   # Windows
pip install -r requirements.txt
```

## Usage

### API server (for integration with backend)

```bash
source venv/bin/activate
python api_server.py
```

Runs the Flask API on port 5002.

### Standalone simulation

```bash
source venv/bin/activate
python main.py
```

### Background simulation (with run script)

```bash
./run_simulation.sh
```

## Directory Structure

```
dc_power_flow/
├── api_server.py       # Flask API
├── main.py             # Main simulation entry
├── run_simulation.sh   # Simulation runner
├── utilities_*.py      # Load flow, sizing, KPIs
├── data/               # Input data files
├── output/             # Simulation outputs (JSON, Excel)
└── logs/               # Application logs
```

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `FLASK_ENV` | production | Flask environment |
| `PORT` | 5002 | Service port |

## Root Project Setup

From project root: `npm run setup-dc-venv` creates the venv and installs dependencies.
