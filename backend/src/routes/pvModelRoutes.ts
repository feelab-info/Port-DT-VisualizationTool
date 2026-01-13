import { Express } from 'express';
import {
  configurePVSystem,
  getPVSystemStatus,
  calculatePowerSeries,
  getPVModelHealth
} from '../controllers/pvModelController';
import { authenticateToken } from '../middleware/authMiddleware';

/**
 * Configure PV Model related routes
 * @param app Express application
 */
export function pvModelRoutes(app: Express): void {
  // PV Model API routes - all protected with authentication
  app.post('/api/pv-model/configure', authenticateToken, configurePVSystem);
  app.get('/api/pv-model/status', authenticateToken, getPVSystemStatus);
  app.post('/api/pv-model/power-series', authenticateToken, calculatePowerSeries);
  app.get('/api/pv-model/health', authenticateToken, getPVModelHealth);
}

