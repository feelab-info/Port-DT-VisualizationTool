import { Express } from 'express';
import { 
  login, 
  validateToken, 
  refreshToken, 
  startRegistration, 
  verifyEmail, 
  resendVerificationCode
} from '../controllers/authController';
import { authenticateToken } from '../middleware/authMiddleware';

/**
 * Configure authentication related routes
 * @param app Express application
 */
export function authRoutes(app: Express): void {
  // Public routes
  app.post('/api/auth/login', login);
  app.post('/api/auth/register', startRegistration);
  app.post('/api/auth/verify-email', verifyEmail);
  app.post('/api/auth/resend-code', resendVerificationCode);
  
  // Protected routes (require valid JWT token)
  app.get('/api/auth/validate', authenticateToken, validateToken);
  app.post('/api/auth/refresh', authenticateToken, refreshToken);
} 