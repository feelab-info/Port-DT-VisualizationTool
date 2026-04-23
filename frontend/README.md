# Port Digital Twin - Frontend

Next.js frontend for the Port Digital Twin visualization application. Provides real-time maps, power flow diagrams, vessel energy analysis, and PV modelling interfaces.

## Tech Stack

- **Framework**: Next.js (App Router)
- **UI**: React, Tailwind CSS
- **Maps**: react-map-gl, deck.gl
- **Charts**: Recharts
- **Real-time**: Socket.IO client
- **State**: React Context (Auth, Theme, Language)

## Project Structure

```
frontend/src/
├── app/                    # App Router pages
│   ├── page.tsx            # Home
│   ├── map/                # Port map with vessels
│   ├── simulation/         # Power flow simulation
│   ├── converters/         # Converter monitoring
│   ├── vessel/[id]/       # Vessel detail
│   ├── pv-model/          # PV system config
│   ├── real-time/         # Real-time device data
│   └── shift2dc/          # DC shift analysis
├── components/             # Reusable components
│   ├── Map/               # Map, vessels, sensors
│   ├── auth/              # Login, registration
│   ├── converters/        # Power flow diagram
│   └── UI/                # Shared UI components
├── services/               # API and Socket.IO services
│   ├── AuthService.ts
│   ├── SimulationService.tsx
│   ├── ConverterDataService.tsx
│   └── PVModelService.ts
├── contexts/               # React contexts
└── translations/           # i18n strings
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_BACKEND_URL` | Backend API URL (e.g. http://localhost:5001). Required at build time. |

## Running Locally

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000

**Note**: Backend must be running for API calls and Socket.IO. See root [README](../README.md) for full stack setup.

## Key Integrations

- **Backend API**: All requests go through `NEXT_PUBLIC_BACKEND_URL`
- **Socket.IO**: Real-time device data, converter data, energy charts - connects to backend
- **Auth**: JWT stored in memory/localStorage; protected routes require valid token

## Build for Production

```bash
npm run build
npm start
```

Ensure `NEXT_PUBLIC_BACKEND_URL` is set to production backend URL before building.
