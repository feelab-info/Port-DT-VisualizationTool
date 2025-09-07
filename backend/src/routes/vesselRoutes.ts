import { Express } from 'express';
import {
  processRegisteredVessel,
  processCustomVessel,
  getAvailableVessels,
  getVesselSimulations,
  getVesselSimulationsByDate,
  getCurrentVesselSimulations
} from '../controllers/vesselController';
import { authenticateToken } from '../middleware/authMiddleware';

/**
 * Configure vessel related routes
 * @param app Express application
 */
export function vesselRoutes(app: Express): void {
  // Vessel API routes - all protected with authentication
  app.post('/api/vessel/registered', authenticateToken, processRegisteredVessel);
  app.post('/api/vessel/custom', authenticateToken, processCustomVessel);
  app.get('/api/vessel/available', authenticateToken, getAvailableVessels);
  app.get('/api/vessel/simulations', authenticateToken, getVesselSimulations);
  app.get('/api/vessel/simulations/:date', authenticateToken, getVesselSimulationsByDate);
  app.get('/api/vessel/current-simulations', authenticateToken, getCurrentVesselSimulations);
} 