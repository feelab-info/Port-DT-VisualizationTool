import { Server } from 'socket.io';
import axios from 'axios';

interface SimulationResult {
  timestamp: string;
  bus_id?: number;
  voltage?: number;
  power?: number;
  load?: number;
  converter_1_power?: number;
  converter_1_loading?: number;
  converter_2_power?: number;
  converter_2_loading?: number;
  converter_3_power?: number;
  converter_3_loading?: number;
  [key: string]: string | number | boolean | undefined;
}

interface SimulationData {
  results: SimulationResult[];
  lastUpdated: string;
  simulationStatus: 'running' | 'completed' | 'error';
}

/**
 * Monitor DC power flow simulation results and broadcast updates via websockets
 * @param io Socket.IO server instance
 */
export function startSimulationMonitoring(io: Server): void {
  let lastResults: SimulationResult[] = [];
  let lastUpdateTime = new Date();

  console.log('Starting simulation monitoring service...');

  // Function to fetch simulation results from DC power flow service
  async function fetchSimulationResults(): Promise<SimulationResult[] | null> {
    try {
      const DC_POWER_FLOW_API = process.env.DC_POWER_FLOW_API || 'http://dc-power-flow:5002';
      const response = await axios.get(`${DC_POWER_FLOW_API}/get-timesteps-results`, {
        timeout: 5000 // 5 second timeout
      });

      if (response.status === 200 && response.data && Array.isArray(response.data)) {
        return response.data as SimulationResult[];
      }

      return null;
    } catch (error) {
      console.error('Error fetching simulation results:', error instanceof Error ? error.message : String(error));
      return null;
    }
  }

  // Function to broadcast simulation updates to all connected clients
  function broadcastSimulationUpdate(data: SimulationData): void {
    // Send to all connected clients
    io.sockets.sockets.forEach((socket) => {
      // Check if client has paused simulation updates
      if (socket.data.pauseSimulationUpdates) {
        console.log(`Skipping simulation update for client ${socket.id} (updates paused)`);
        return;
      }

      socket.emit('simulation_update', data);
    });

    console.log(`Broadcasted simulation update to ${io.sockets.sockets.size} clients: ${data.results.length} results`);
  }

  // Main monitoring loop - check for updates every 30 seconds
  setInterval(async () => {
    try {
      const currentResults = await fetchSimulationResults();

      if (currentResults && currentResults.length > 0) {
        // Check if results have changed
        const hasChanged = JSON.stringify(currentResults) !== JSON.stringify(lastResults);

        if (hasChanged) {
          lastResults = currentResults;
          lastUpdateTime = new Date();

          const simulationData: SimulationData = {
            results: currentResults,
            lastUpdated: lastUpdateTime.toISOString(),
            simulationStatus: 'completed'
          };

          broadcastSimulationUpdate(simulationData);
        }
      } else {
        // If we can't fetch results but had previous results, send error status
        if (lastResults.length > 0) {
          const errorData: SimulationData = {
            results: lastResults,
            lastUpdated: lastUpdateTime.toISOString(),
            simulationStatus: 'error'
          };

          broadcastSimulationUpdate(errorData);
        }
      }
    } catch (error) {
      console.error('Simulation monitoring error:', error);
    }
  }, 60000); // Check every 60 seconds

  console.log('Simulation monitoring service started - checking for updates every 60 seconds');
}

/**
 * Get the latest simulation results (for non-websocket requests)
 */
export async function getLatestSimulationResults(): Promise<SimulationData | null> {
  try {
    const DC_POWER_FLOW_API = process.env.DC_POWER_FLOW_API || 'http://dc-power-flow:5002';
    const response = await axios.get(`${DC_POWER_FLOW_API}/get-timesteps-results`, {
      timeout: 5000
    });

    if (response.status === 200 && response.data && Array.isArray(response.data)) {
      return {
        results: response.data as SimulationResult[],
        lastUpdated: new Date().toISOString(),
        simulationStatus: 'completed'
      };
    }

    return null;
  } catch (error) {
    console.error('Error fetching latest simulation results:', error instanceof Error ? error.message : String(error));
    return null;
  }
}
