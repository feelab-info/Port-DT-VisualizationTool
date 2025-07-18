import { Request, Response } from 'express';
import { validatePortEmail, generateToken } from '../middleware/authMiddleware';

export interface LoginRequest {
  email: string;
  name: string;
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, name }: LoginRequest = req.body;

    if (!email || !name) {
      res.status(400).json({ 
        error: 'Email and name are required' 
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ 
        error: 'Invalid email format' 
      });
      return;
    }

    // Validate if email belongs to port staff
    if (!validatePortEmail(email)) {
      res.status(403).json({ 
        error: 'Access restricted to Port of Funchal staff (@apram.pt emails only)' 
      });
      return;
    }

    // Generate JWT token
    const token = generateToken(email, name);

    res.json({
      success: true,
      token,
      user: {
        email,
        name
      },
      message: 'Login successful'
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      error: 'Internal server error during login',
      details: (error as Error).message 
    });
  }
}

export async function validateToken(req: Request, res: Response): Promise<void> {
  try {
    // If we reach here, the token is valid (checked by middleware)
    const user = (req as any).user;
    
    res.json({
      success: true,
      user: {
        email: user.email,
        name: user.name
      },
      message: 'Token is valid'
    });
  } catch (error) {
    console.error('Token validation error:', error);
    res.status(500).json({ 
      error: 'Internal server error during token validation' 
    });
  }
}

export async function refreshToken(req: Request, res: Response): Promise<void> {
  try {
    const user = (req as any).user;
    
    // Generate new token with same user data
    const newToken = generateToken(user.email, user.name);
    
    res.json({
      success: true,
      token: newToken,
      user: {
        email: user.email,
        name: user.name
      },
      message: 'Token refreshed successfully'
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ 
      error: 'Internal server error during token refresh' 
    });
  }
} 