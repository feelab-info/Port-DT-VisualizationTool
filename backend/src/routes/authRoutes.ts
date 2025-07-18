import { Express } from 'express';
import { login, validateToken, refreshToken } from '../controllers/authController';
import { authenticateToken } from '../middleware/authMiddleware';

/**
 * Configure authentication related routes
 * @param app Express application
 */
export function authRoutes(app: Express): void {
  // Public routes
  app.post('/api/auth/login', login);
  
  // Protected routes (require valid JWT token)
  app.get('/api/auth/validate', authenticateToken, validateToken);
  app.post('/api/auth/refresh', authenticateToken, refreshToken);
} 