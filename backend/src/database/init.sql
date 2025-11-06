-- Initialize the database schema for port digital twin

-- Create power_flow_simulations table to store simulation runs
CREATE TABLE IF NOT EXISTS power_flow_simulations (
    id SERIAL PRIMARY KEY,
    simulation_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    scenario INTEGER NOT NULL DEFAULT 2,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'completed',
    metadata JSONB,
    CONSTRAINT unique_simulation_time UNIQUE (simulation_time)
);

-- Create simulation_timesteps table to store detailed timestep data
CREATE TABLE IF NOT EXISTS simulation_timesteps (
    id SERIAL PRIMARY KEY,
    simulation_id INTEGER NOT NULL REFERENCES power_flow_simulations(id) ON DELETE CASCADE,
    timestep INTEGER NOT NULL,
    bus_id INTEGER NOT NULL,
    voltage DOUBLE PRECISION,
    power DOUBLE PRECISION,
    load DOUBLE PRECISION,
    converter_power DOUBLE PRECISION,
    converter_loading DOUBLE PRECISION,
    additional_data JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_timestep_bus UNIQUE (simulation_id, timestep, bus_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_simulations_time ON power_flow_simulations(simulation_time DESC);
CREATE INDEX IF NOT EXISTS idx_simulations_created_at ON power_flow_simulations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_timesteps_simulation_id ON simulation_timesteps(simulation_id);
CREATE INDEX IF NOT EXISTS idx_timesteps_bus_id ON simulation_timesteps(bus_id);
CREATE INDEX IF NOT EXISTS idx_timesteps_timestep ON simulation_timesteps(timestep);

-- Create a view for easy querying of latest simulations with timestep counts
CREATE OR REPLACE VIEW simulation_summary AS
SELECT 
    s.id,
    s.simulation_time,
    s.scenario,
    s.status,
    s.created_at,
    COUNT(t.id) as timestep_count,
    COUNT(DISTINCT t.bus_id) as bus_count
FROM power_flow_simulations s
LEFT JOIN simulation_timesteps t ON s.id = t.simulation_id
GROUP BY s.id, s.simulation_time, s.scenario, s.status, s.created_at
ORDER BY s.created_at DESC;

-- Grant permissions (for Docker container setup)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO portadmin;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO portadmin;

-- Add comments for documentation
COMMENT ON TABLE power_flow_simulations IS 'Stores each power flow simulation run with metadata';
COMMENT ON TABLE simulation_timesteps IS 'Stores detailed timestep data for each simulation including bus voltages, power, and loads';
COMMENT ON COLUMN power_flow_simulations.simulation_time IS 'The timestamp when the simulation was run';
COMMENT ON COLUMN simulation_timesteps.additional_data IS 'JSON field to store any additional line data or future fields';


