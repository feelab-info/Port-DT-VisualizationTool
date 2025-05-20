import { Express } from 'express';
import {
  processRegisteredVessel,
  processCustomVessel,
  getAvailableVessels,
  getVesselSimulations,
  getVesselSimulationsByDate,
  getCurrentVesselSimulations
} from '../controllers/vesselController';

/**
 * Configure vessel related routes
 * @param app Express application
 */
export function vesselRoutes(app: Express): void {
  // Vessel API routes
  app.post('/api/vessel/registered', processRegisteredVessel);
  app.post('/api/vessel/custom', processCustomVessel);
  app.get('/api/vessel/available', getAvailableVessels);
  app.get('/api/vessel/simulations', getVesselSimulations);
  app.get('/api/vessel/simulations/:date', getVesselSimulationsByDate);
  app.get('/api/vessel/current-simulations', getCurrentVesselSimulations);
} 