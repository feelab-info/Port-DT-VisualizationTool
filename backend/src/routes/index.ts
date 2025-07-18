import { Express } from 'express';
import { simulationRoutes } from './simulationRoutes';
import { vesselRoutes } from './vesselRoutes';
import { authRoutes } from './authRoutes';

/**
 * Set up all application routes
 * @param app Express application
 */
export function setupRoutes(app: Express): void {
  // Authentication routes (public)
  authRoutes(app);
  
  // Apply route modules to app
  simulationRoutes(app);
  vesselRoutes(app);
} 