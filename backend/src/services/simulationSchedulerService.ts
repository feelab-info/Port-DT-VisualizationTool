import { Server, Socket } from 'socket.io';
import axios from 'axios';
import { powerFlowStorageService } from './powerFlowStorageService';

const DC_POWER_FLOW_API = process.env.DC_POWER_FLOW_API || 'http://localhost:5002';
const SIMULATION_INTERVAL = 60000; // 1 minute in milliseconds

let schedulerInterval: NodeJS.Timeout | null = null;
let latestSimulationData: any = null; // Variable to store the latest simulation data

export async function startSimulationScheduler(io: Server): Promise<void> {
  console.log('Starting simulation scheduler - will run every 1 minute');

  // Handle new client connections
  io.on('connection', (socket: Socket) => {
    console.log(`New client connected: ${socket.id}`);
    if (latestSimulationData) {
      console.log(`Sending latest simulation data to client ${socket.id}`);
      socket.emit('simulation_timestep_update', latestSimulationData);
    }
  });

  // Run immediately on start
  await runSimulationCycle(io);

  // Then run every minute
  schedulerInterval = setInterval(async () => {
    await runSimulationCycle(io);
  }, SIMULATION_INTERVAL);
}

async function runSimulationCycle(io: Server): Promise<void> {
  try {
    console.log('[Simulation Scheduler] Running DC power flow simulation...');

    // Step 1: Run the simulation
    const simulationResponse = await axios.post(`${DC_POWER_FLOW_API}/run-simulation`, {
      scenario: 2
    }, {
      timeout: 300000 // 5 minute timeout
    });

    if (!simulationResponse.data) {
      console.error('[Simulation Scheduler] No data returned from simulation');
      return;
    }

    // Step 2: Fetch the timestep results
    const timestepResponse = await axios.get(`${DC_POWER_FLOW_API}/get-timesteps-results`);
    const timestepData = timestepResponse.data;

    if (!timestepData || timestepData.length === 0) {
      console.warn('[Simulation Scheduler] No timestep data available');
      return;
    }

    // Step 3: Store simulation data in PostgreSQL database
    try {
      const simulationId = await powerFlowStorageService.storeSimulation(
        timestepData,
        2, // scenario
        {
          clientCount: io.engine.clientsCount,
          dataPoints: timestepData.length
        }
      );
      console.log(`[Simulation Scheduler] Stored simulation in database with ID: ${simulationId}`);
    } catch (dbError: any) {
      console.error('[Simulation Scheduler] Failed to store simulation in database:', dbError.message);
      // Continue even if database storage fails - don't break the broadcast
    }

    // Step 4: Broadcast to all connected clients
    const updatePayload = {
      timestamp: new Date().toISOString(),
      data: timestepData,
      simulationTime: new Date().toLocaleString('pt-PT', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    };

    // Store the latest data
    latestSimulationData = updatePayload;

    io.emit('simulation_timestep_update', updatePayload);
    console.log(`[Simulation Scheduler] Broadcasted timestep data to ${io.engine.clientsCount} connected clients`);

  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
      console.error('[Simulation Scheduler] DC Power Flow API is not available at', DC_POWER_FLOW_API);
    } else if (error.response) {
      console.error('[Simulation Scheduler] Simulation error:', error.response.data);
    } else {
      console.error('[Simulation Scheduler] Error running simulation cycle:', error.message);
    }
  }
}

export function stopSimulationScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('Simulation scheduler stopped');
  }
}

