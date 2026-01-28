import { Express } from 'express';
import { 
  getConverterNodesList, 
  getLatestConverterData, 
  getHistoricalConverterData,
  getConverterStats 
} from '../controllers/converterController';
import { authenticateToken } from '../middleware/authMiddleware';

/**
 * Set up converter data routes
 * @param app Express application
 */
export function converterRoutes(app: Express): void {
  // Get list of converter nodes (public for now, can be protected later)
  app.get('/api/converters/nodes', getConverterNodesList);
  
  // Get latest converter data for all nodes
  app.get('/api/converters/latest', authenticateToken, getLatestConverterData);
  
  // Get historical converter data with optional filters
  app.get('/api/converters/historical', authenticateToken, getHistoricalConverterData);
  
  // Get converter statistics
  app.get('/api/converters/stats', authenticateToken, getConverterStats);
}
