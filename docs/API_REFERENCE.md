# API Reference

Base URL: `http://localhost:5001` (or your backend URL)

**Interactive docs (Swagger UI)**: `http://localhost:5001/api-docs` — Explore and test all endpoints in the browser. Use "Authorize" to add your JWT for protected routes.

**OpenAPI spec (JSON)**: `http://localhost:5001/api-docs.json` — Raw OpenAPI 3.0 specification.

All protected routes require a valid JWT in the `Authorization` header: `Bearer <token>`

---

## Authentication (`/api/auth`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | No | Login with email/password |
| POST | `/api/auth/register` | No | Start registration |
| POST | `/api/auth/verify-email` | No | Verify email with code |
| POST | `/api/auth/resend-code` | No | Resend verification code |
| GET | `/api/auth/validate` | Yes | Validate current token |
| POST | `/api/auth/refresh` | Yes | Refresh token |

---

## Simulation (`/api/simulation`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/simulation` | Yes | Run power flow simulation |
| GET | `/api/simulation/timesteps-results` | Yes | Get timestep results |
| POST | `/api/simulation/start-service` | Yes | Start simulation service |
| POST | `/api/simulation/update-device-data` | Yes | Update device data |
| GET | `/api/simulation/devices` | No | Get all devices |

---

## Vessel (`/api/vessel`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/vessel/registered` | Yes | Process registered vessel |
| POST | `/api/vessel/custom` | Yes | Process custom vessel |
| GET | `/api/vessel/available` | Yes | Get available vessels |
| GET | `/api/vessel/simulations` | Yes | Get vessel simulations |
| GET | `/api/vessel/simulations/:date` | Yes | Get simulations by date |
| GET | `/api/vessel/current-simulations` | Yes | Get current simulations |

---

## Converters (`/api/converters`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/converters/nodes` | No | Get list of converter nodes |
| GET | `/api/converters/latest` | Yes | Get latest converter data |
| GET | `/api/converters/historical` | Yes | Get historical converter data |
| GET | `/api/converters/stats` | Yes | Get converter statistics |

---

## PV Model (`/api/pv-model`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/pv-model/configure` | Yes | Configure PV system |
| GET | `/api/pv-model/status` | Yes | Get PV system status |
| POST | `/api/pv-model/power-series` | Yes | Calculate power series |
| GET | `/api/pv-model/health` | Yes | PV model service health |

---

## Power Flow Storage (`/api/powerflow`)

See `backend/DATABASE.md` for full schema and examples.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/powerflow/simulations` | No | List simulations (limit, offset) |
| GET | `/api/powerflow/simulations/latest` | No | Get latest simulation |
| GET | `/api/powerflow/simulations/:id` | No | Get simulation by ID |
| GET | `/api/powerflow/simulations/timerange` | No | Get by time range |
| GET | `/api/powerflow/bus/:busId/timesteps` | No | Get timesteps for a bus |
| GET | `/api/powerflow/statistics` | No | Database statistics |
| DELETE | `/api/powerflow/simulations/cleanup` | No | Delete old simulations (?days=30) |

---

## Health

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/health` | No | Backend health check |
