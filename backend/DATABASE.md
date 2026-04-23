# PostgreSQL Database Documentation

## Overview

The Port Digital Twin system uses PostgreSQL to store power flow simulation results. The database automatically captures simulation data every minute and stores it for analysis and historical reference.

## Database Schema

### Tables

#### `power_flow_simulations`
Stores metadata about each simulation run.

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL PRIMARY KEY | Auto-incrementing unique identifier |
| `simulation_time` | TIMESTAMP | When the simulation was executed |
| `scenario` | INTEGER | Scenario number (default: 2) |
| `created_at` | TIMESTAMP | Record creation timestamp |
| `status` | VARCHAR(50) | Simulation status (e.g., 'completed') |
| `metadata` | JSONB | Additional metadata (client count, data points, etc.) |

#### `simulation_timesteps`
Stores detailed timestep data for each simulation.

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL PRIMARY KEY | Auto-incrementing unique identifier |
| `simulation_id` | INTEGER | Foreign key to power_flow_simulations |
| `timestep` | INTEGER | Timestep number |
| `bus_id` | INTEGER | Bus/node identifier |
| `voltage` | DOUBLE PRECISION | Voltage value (p.u.) |
| `power` | DOUBLE PRECISION | Power value (MW) |
| `load` | DOUBLE PRECISION | Load value (MW) |
| `converter_power` | DOUBLE PRECISION | Converter power (MW) |
| `converter_loading` | DOUBLE PRECISION | Converter loading percentage |
| `additional_data` | JSONB | Additional line data and future fields |
| `created_at` | TIMESTAMP | Record creation timestamp |

### Views

#### `simulation_summary`
Provides a quick overview of all simulations with aggregated data.

```sql
SELECT * FROM simulation_summary;
```

Returns:
- Simulation metadata
- Count of timesteps per simulation
- Count of unique buses per simulation

## API Endpoints

All endpoints are prefixed with `/api/powerflow`

### Get All Simulations
```
GET /api/powerflow/simulations?limit=100&offset=0
```
Returns a list of simulations with summary data.

**Response:**
```json
{
  "success": true,
  "count": 10,
  "data": [
    {
      "id": 1,
      "simulation_time": "2024-01-01T12:00:00Z",
      "scenario": 2,
      "status": "completed",
      "timestep_count": 100,
      "bus_count": 15
    }
  ]
}
```

### Get Latest Simulation
```
GET /api/powerflow/simulations/latest
```
Returns the most recent simulation with all timestep data.

**Response:**
```json
{
  "success": true,
  "data": {
    "simulation": {
      "id": 1,
      "simulation_time": "2024-01-01T12:00:00Z",
      "scenario": 2,
      "status": "completed",
      "metadata": {...}
    },
    "timesteps": [
      {
        "id": 1,
        "simulation_id": 1,
        "timestep": 1,
        "bus_id": 0,
        "voltage": 1.0,
        "power": 5.2,
        "load": 3.1,
        "converter_power": 2.1,
        "converter_loading": 45.5,
        "additional_data": {...}
      }
    ]
  }
}
```

### Get Simulation by ID
```
GET /api/powerflow/simulations/:id
```
Returns a specific simulation with all timestep data.

### Get Simulations by Time Range
```
GET /api/powerflow/simulations/timerange?start=2024-01-01T00:00:00Z&end=2024-01-02T00:00:00Z
```
Returns all simulations within the specified time range.

### Get Timesteps for Specific Bus
```
GET /api/powerflow/bus/:busId/timesteps?limit=100
```
Returns all timesteps for a specific bus across all simulations.

### Get Database Statistics
```
GET /api/powerflow/statistics
```
Returns statistics about stored simulations.

**Response:**
```json
{
  "success": true,
  "data": {
    "total_simulations": 1440,
    "unique_days": 1,
    "first_simulation": "2024-01-01T00:00:00Z",
    "last_simulation": "2024-01-02T00:00:00Z",
    "total_timesteps": 144000
  }
}
```

### Delete Old Simulations
```
DELETE /api/powerflow/simulations/cleanup?days=30
```
Deletes simulations older than the specified number of days (default: 30).

## Environment Variables

Required environment variables for PostgreSQL connection:

```bash
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=port_digital_twin
POSTGRES_USER=portadmin
POSTGRES_PASSWORD=portpass123
```

## Docker Setup

The PostgreSQL database is automatically set up in Docker Compose:

```yaml
postgres:
  image: postgres:16-alpine
  container_name: port-postgres
  environment:
    POSTGRES_DB: port_digital_twin
    POSTGRES_USER: portadmin
    POSTGRES_PASSWORD: portpass123
  volumes:
    - postgres-data:/var/lib/postgresql/data
    - ./backend/src/database/init.sql:/docker-entrypoint-initdb.d/init.sql
```

## Usage

### Starting the System

1. Start all services with Docker Compose:
```bash
docker-compose up -d
```

2. The backend will automatically:
   - Connect to PostgreSQL
   - Initialize the database schema (on first run)
   - Start the simulation scheduler
   - Store simulation results every minute

### Querying Stored Data

```bash
# Get latest simulation
curl http://localhost:5001/api/powerflow/simulations/latest

# Get all simulations
curl http://localhost:5001/api/powerflow/simulations?limit=10

# Get statistics
curl http://localhost:5001/api/powerflow/statistics

# Get timesteps for bus 5
curl http://localhost:5001/api/powerflow/bus/5/timesteps?limit=50
```

### Data Retention

To clean up old data and maintain database size:

```bash
# Delete simulations older than 30 days
curl -X DELETE "http://localhost:5001/api/powerflow/simulations/cleanup?days=30"
```

## Indexes

The database includes indexes for optimized query performance:

- `idx_simulations_time` - Fast lookups by simulation time
- `idx_simulations_created_at` - Fast lookups by creation time
- `idx_timesteps_simulation_id` - Fast joins with simulations
- `idx_timesteps_bus_id` - Fast filtering by bus ID
- `idx_timesteps_timestep` - Fast filtering by timestep number

## Backup and Restore

### Create Backup
```bash
docker exec port-postgres pg_dump -U portadmin port_digital_twin > backup.sql
```

### Restore Backup
```bash
docker exec -i port-postgres psql -U portadmin port_digital_twin < backup.sql
```

## Monitoring

Check database health:
```bash
docker exec port-postgres pg_isready -U portadmin
```

View logs:
```bash
docker logs port-postgres
```

Connect to database shell:
```bash
docker exec -it port-postgres psql -U portadmin -d port_digital_twin
```

## Future Enhancements

The database is designed to be extensible for future features:

- Vessel tracking data
- Energy consumption analytics
- Port operations data
- Weather and environmental data
- User activity logs
- System configuration history

All future data can be added to the same PostgreSQL instance by adding new tables and relationships.


