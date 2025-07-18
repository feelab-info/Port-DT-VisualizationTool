import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'port-digital-twin-secret-key';

export interface UserPayload {
  email: string;
  name: string;
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      res.status(403).json({ error: 'Invalid or expired token' });
      return;
    }
    
    // Add user data to request object
    (req as any).user = user as UserPayload;
    next();
  });
};

export const validatePortEmail = (email: string): boolean => {
  // Allow specific exception email
  if (email === 'diogo.paulino10@gmail.com') {
    return true;
  }
  
  // Allow emails ending with @apram.pt
  return email.endsWith('@apram.pt');
};

export const generateToken = (email: string, name: string): string => {
  return jwt.sign(
    { email, name },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}; 