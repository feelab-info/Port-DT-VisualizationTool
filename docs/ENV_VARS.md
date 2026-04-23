# Environment Variables Reference

Copy `.env.example` to `.env` (development) or `.env.production` (production) and fill in the values.

## Backend

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | 5001 | Backend server port |
| `NODE_ENV` | No | development | Environment mode |
| `MONGODB_URI` | **Yes** | mongodb://localhost:27017 | MongoDB connection string (users, device data) |
| `JWT_SECRET` | **Yes** | - | Secret for JWT signing (min 32 chars in production) |
| `FRONTEND_URL` | No | http://localhost:3000 | Allowed CORS origin for frontend |
| `DC_POWER_FLOW_API` | No | http://localhost:5002 | DC Power Flow service URL |
| `VESSEL_API` / `VESSEL_API_URL` | No | http://localhost:5003 | Vessel Modelling service URL |
| `PV_MODEL_API` | No | http://localhost:5004 | PV Model service URL |
| `POSTGRES_HOST` | No | localhost | PostgreSQL host |
| `POSTGRES_PORT` | No | 5432 | PostgreSQL port |
| `POSTGRES_DB` | No | port_digital_twin | PostgreSQL database name |
| `POSTGRES_USER` | No | portadmin | PostgreSQL user |
| `POSTGRES_PASSWORD` | No | portpass123 | PostgreSQL password |
| `SMTP_HOST` | No | smtp.gmail.com | SMTP server for email (verification) |
| `SMTP_PORT` | No | 587 | SMTP port |
| `SMTP_USER` | No | - | SMTP username |
| `SMTP_PASS` | No | - | SMTP password |

## Frontend

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_BACKEND_URL` | **Yes** | http://localhost:5001 | Backend API URL (used at build time) |
| `NEXT_PUBLIC_VESSEL_URL` | No | http://localhost:5003 | Direct Vessel API (if needed) |
| `NEXT_PUBLIC_DC_POWER_FLOW_URL` | No | http://localhost:5002 | Direct DC Power Flow URL (if needed) |

## Python Services

| Service | Variable | Default | Description |
|--------|----------|---------|-------------|
| DC Power Flow | `FLASK_ENV` | production | Flask environment |
| DC Power Flow | `PORT` | 5002 | Service port |
| Vessel Modelling | `FLASK_ENV` | production | Flask environment |
| Vessel Modelling | `PORT` | 5003 | Service port |
| Vessel Automation | `API_BASE_URL` | http://vessel-modelling:5003 | Vessel API for cron job |
| Vessel Automation | `TZ` | UTC | Timezone for schedule |
| PV Model | `FLASK_ENV` | production | Environment |
| PV Model | `PORT` | 5004 | Service port |

## Production / Deployment

| Variable | Required | Description |
|----------|----------|-------------|
| `DOMAIN_NAME` | Yes | Domain for SSL (e.g. portdt.prsma.com) |
| `CERTBOT_EMAIL` | Yes | Email for Let's Encrypt certificates |
| `SSL_EMAIL` | Yes | Same as CERTBOT_EMAIL (used by setup-ssl.sh) |

## Docker Compose URLs (Production)

When running in Docker, services use internal hostnames:

- `DC_POWER_FLOW_API`: http://dc-power-flow:5002
- `VESSEL_API`: http://vessel-modelling:5003
- `PV_MODEL_API`: http://pv-model:5004
- `NEXT_PUBLIC_BACKEND_URL`: https://your-domain.com (or your backend URL)
- `FRONTEND_URL`: https://your-domain.com
