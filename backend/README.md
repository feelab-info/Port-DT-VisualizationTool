# Port Digital Twin - Backend

Express.js API gateway for the Port Digital Twin. Handles authentication, proxies requests to Python microservices, and manages real-time data via Socket.IO.

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express
- **Real-time**: Socket.IO
- **Auth**: JWT
- **Databases**: MongoDB (users, device data), PostgreSQL (power flow simulations)

## Project Structure

```
backend/src/
├── app.ts              # Express app, Socket.IO setup
├── server.ts           # Server entry point
├── routes/             # Route definitions
│   ├── authRoutes.ts
│   ├── simulationRoutes.ts
│   ├── vesselRoutes.ts
│   ├── converterRoutes.ts
│   ├── pvModelRoutes.ts
│   └── powerFlowRoutes.ts
├── controllers/        # Request handlers
├── services/           # Business logic
│   ├── databaseService.ts    # MongoDB
│   ├── socketService.ts      # Socket.IO
│   ├── simulationSchedulerService.ts
│   └── dataMonitorService.ts
├── middleware/         # authMiddleware (JWT)
└── database/           # PostgreSQL config, init.sql
```

## Environment Variables

See [docs/ENV_VARS.md](../docs/ENV_VARS.md) for full reference. Key variables:

- `MONGODB_URI` - MongoDB connection
- `JWT_SECRET` - JWT signing secret
- `POSTGRES_*` - PostgreSQL for power flow storage
- `DC_POWER_FLOW_API`, `VESSEL_API`, `PV_MODEL_API` - Python service URLs

## Running Locally

```bash
cd backend
npm install
npm run dev
```

Backend runs on http://localhost:5001. Requires MongoDB and PostgreSQL to be running.

## API Documentation

- **Swagger UI**: http://localhost:5001/api-docs — Interactive API docs (explore & try endpoints)
- **OpenAPI spec**: http://localhost:5001/api-docs.json — Raw OpenAPI 3.0 JSON
- [docs/API_REFERENCE.md](../docs/API_REFERENCE.md) - All endpoints (markdown)
- [DATABASE.md](./DATABASE.md) - PostgreSQL schema, power flow API

## Health Check

```bash
curl http://localhost:5001/health
# Expected: {"status":"OK"}
```
