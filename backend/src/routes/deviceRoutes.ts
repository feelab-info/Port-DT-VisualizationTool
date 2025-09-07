import { Express } from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import { getAllDevices, getDeviceById } from '../controllers/deviceController';

/**
 * Device routes for managing energy device data
 * @param app Express application
 */
export function deviceRoutes(app: Express): void {
  /**
   * @route GET /api/devices
   * @desc Get all available devices for historical queries
   * @access Protected
   */
  app.get('/api/devices', authenticateToken, getAllDevices);

  /**
   * @route GET /api/devices/:deviceId
   * @desc Get specific device by ID
   * @access Protected
   */
  app.get('/api/devices/:deviceId', authenticateToken, getDeviceById);
}
