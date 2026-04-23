# Port Digital Twin - System Architecture

## Overview

The Port Digital Twin is an application for studying DC technology benefits using a digital twin system. It combines real-time data, power flow simulations, vessel energy analysis, and photovoltaic modelling into an immersive monitoring and decision-making interface.

## Services

| Service | Port | Stack | Purpose |
|---------|------|-------|---------|
| **Frontend** | 3000 | Next.js, React, Deck.gl | UI, maps, real-time visualization |
| **Backend** | 5001 | Express, Socket.IO | API gateway, auth, orchestrates Python services |
| **DC Power Flow** | 5002 | Flask, Python 3.10 | Power flow simulations, load flow calculations |
| **Vessel Modelling** | 5003 | Python | Vessel energy consumption, ship matching |
| **PV Model** | 5004 | FastAPI | Photovoltaic system modelling, pvlib |
| **Nginx** | 80/443 | Nginx | Reverse proxy, SSL termination |

## Data Flow

1. **Authentication**: Users register/login via Backend → MongoDB (users collection)
2. **Power Flow**: Backend triggers DC Power Flow → stores results in PostgreSQL (power_flow_simulations, simulation_timesteps)
3. **Real-time**: Backend uses Socket.IO to push device/converter data from MongoDB to Frontend
4. **Vessels**: Backend proxies vessel requests to Vessel Modelling service
5. **PV**: Backend proxies PV config/calculations to PV Model service

## Backend as API Gateway

The backend does not duplicate business logic from the Python services. It:

- Authenticates requests (JWT)
- Proxies to the correct microservice based on route
- Aggregates data from MongoDB and PostgreSQL
- Manages Socket.IO for real-time updates

## Scheduled Jobs

- **Power Flow**: Simulation scheduler runs every minute, captures results to PostgreSQL
- **Vessel Automation**: Cron at 02:00 daily runs `vessel_automation.py` for vessel data processing

## Real-Time Communication

- **Socket.IO**: Used for device data health monitoring, converter data, and energy data streaming
- **Connection**: Frontend connects to Backend's Socket.IO server using `NEXT_PUBLIC_BACKEND_URL`

## Database Roles

- **MongoDB**: Users, device data, converter data, vessel simulations
- **PostgreSQL**: Power flow simulation results (timesteps, bus data, KPIs)
