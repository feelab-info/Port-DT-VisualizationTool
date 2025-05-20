import { Express } from 'express';
import { simulationRoutes } from './simulationRoutes';
import { vesselRoutes } from './vesselRoutes';

/**
 * Set up all application routes
 * @param app Express application
 */
export function setupRoutes(app: Express): void {
  // Apply route modules to app
  simulationRoutes(app);
  vesselRoutes(app);
} 