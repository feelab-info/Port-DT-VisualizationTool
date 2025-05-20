import { Express } from 'express';
import { 
  runSimulation, 
  getSimulationResults, 
  getLatestResults,
  getSizingResults,
  getTimestepsResults,
  startSimulationService,
  updateDeviceData,
  getExcelDeviceData
} from '../controllers/simulationController';

/**
 * Configure simulation related routes
 * @param app Express application
 */
export function simulationRoutes(app: Express): void {
  // Simulation API routes
  app.post('/api/simulation', runSimulation);
  app.get('/api/simulation/:scenarioId', getSimulationResults);
  app.get('/api/simulation/latest-results', getLatestResults);
  app.get('/api/simulation/sizing-results', getSizingResults);
  app.get('/api/simulation/timesteps-results', getTimestepsResults);
  app.post('/api/simulation/start-service', startSimulationService);
  
  // Device data update routes
  app.post('/api/simulation/update-device-data', updateDeviceData);
  app.get('/api/simulation/excel-device-data', getExcelDeviceData);
} 