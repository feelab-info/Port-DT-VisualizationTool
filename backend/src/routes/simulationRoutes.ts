import { Express } from 'express';
import { 
  runSimulation, 
  getTimestepsResults,
  startSimulationService,
  updateDeviceData,
  getAllDevices
} from '../controllers/simulationController';
import { authenticateToken } from '../middleware/authMiddleware';

export function simulationRoutes(app: Express): void {
  app.post('/api/simulation', authenticateToken, runSimulation);
  app.get('/api/simulation/timesteps-results', authenticateToken, getTimestepsResults);
  app.post('/api/simulation/start-service', authenticateToken, startSimulationService);
  app.post('/api/simulation/update-device-data', authenticateToken, updateDeviceData);
  app.get('/api/simulation/devices', getAllDevices);
} 