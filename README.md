# Port Digital Twin

## Overview

Application for studying DC technology benefits using a digital twin system. Combines real-time data, power flow simulations, vessel energy analysis, and photovoltaic modelling into a monitoring interface.

## Documentation

| Document | Description |
|----------|-------------|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System architecture, services, data flow |
| [docs/ENV_VARS.md](docs/ENV_VARS.md) | Environment variables reference |
| [docs/API_REFERENCE.md](docs/API_REFERENCE.md) | Backend API reference |
| [docs/runbooks/](docs/runbooks/) | Deployment, incident response, database maintenance |
| [backend/DATABASE.md](backend/DATABASE.md) | PostgreSQL schema and power flow API |
| [docs/HANDOVER_CHECKLIST.md](docs/HANDOVER_CHECKLIST.md) | Handover checklist for maintainers |
| [PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md) | Production deployment guide |

## Prerequisites

- [Node.js](https://nodejs.org/) v16+
- Python 3.10+ (for dc_power_flow, vessel_modelling)
- MongoDB (users, device data)
- PostgreSQL (power flow simulations)
- Git

## Quick Start

### 1. Clone and install dependencies

```bash
git clone <repository-url>
cd port-digital-twin
npm run install-all
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your MongoDB, PostgreSQL, and other values
```

### 3. Start all services (recommended)

Starts backend, frontend, DC power flow, vessel modelling, and simulation:

```bash
npm run dev
```

- **Frontend**: http://localhost:3000  
- **Backend**: http://localhost:5001  

### Alternative: Start services individually

**Python services (required for full functionality):**

```bash
# DC Power Flow - create venv first
cd dc_power_flow && python -m venv venv && source venv/bin/activate && pip install -r requirements.txt
npm run setup-dc-venv
# Then: cd dc_power_flow && source venv/bin/activate && python api_server.py

# Vessel Modelling
cd vessel_modelling && pip install -r requirements.txt && python api_server.py
```

**Backend and Frontend:**

```bash
cd backend && npm run dev
cd frontend && npm run dev
```

## Project Structure

```
port-digital-twin/
├── frontend/          # Next.js app (port 3000)
├── backend/           # Express API gateway (port 5001)
├── dc_power_flow/     # Power flow simulations (port 5002)
├── vessel_modelling/  # Vessel energy analysis (port 5003)
├── pv_model/          # PV system modelling (port 5004)
├── nginx/             # Reverse proxy config
└── docs/              # Documentation
```

## Troubleshooting

- **Backend won't start**: Check `MONGODB_URI` and `POSTGRES_*` env vars. Ensure MongoDB and PostgreSQL are running.
- **Frontend API errors**: Ensure `NEXT_PUBLIC_BACKEND_URL` in `.env` matches backend URL. Rebuild frontend if changed.
- **Python service issues**: See `dc_power_flow/README.md`, `vessel_modelling/README.md`, `pv_model/README.md`.

For more: [docs/runbooks/INCIDENT_RESPONSE.md](docs/runbooks/INCIDENT_RESPONSE.md)

