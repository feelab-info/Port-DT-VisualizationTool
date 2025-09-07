import { Express } from 'express';
import {
  runSimulation,
  getSimulationResults,
  getLatestResults,
  getSizingResults,
  getTimestepsResults,
  startSimulationService,
  updateDeviceData,
  getExcelDeviceData,
  triggerSimulation
} from '../controllers/simulationController';
import { authenticateToken } from '../middleware/authMiddleware';

/**
 * Configure simulation related routes
 * @param app Express application
 */
export function simulationRoutes(app: Express): void {
  // Simulation API routes - all protected with authentication
  app.post('/api/simulation', authenticateToken, runSimulation);
  app.get('/api/simulation/:scenarioId', authenticateToken, getSimulationResults);
  app.get('/api/simulation/latest-results', authenticateToken, getLatestResults);
  app.get('/api/simulation/sizing-results', authenticateToken, getSizingResults);
  app.get('/api/simulation/timesteps-results', authenticateToken, getTimestepsResults);
  app.post('/api/simulation/start-service', authenticateToken, startSimulationService);
  app.post('/api/simulation/trigger', authenticateToken, triggerSimulation);
  
  // Device data update routes - also protected
  app.post('/api/simulation/update-device-data', authenticateToken, updateDeviceData);
  app.get('/api/simulation/excel-device-data', authenticateToken, getExcelDeviceData);
} 