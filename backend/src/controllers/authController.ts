import { Request, Response } from 'express';
import { validatePortEmail, generateToken } from '../middleware/authMiddleware';
import userService from '../services/userService';

export interface LoginRequest {
  email: string;
  name: string;
  password: string;
}

export interface RegistrationRequest {
  email: string;
  name: string;
  password: string;
}

export interface VerificationRequest {
  email: string;
  code: string;
}

/**
 * Start user registration with email verification
 */
export async function startRegistration(req: Request, res: Response): Promise<void> {
  try {
    const { email, name, password }: RegistrationRequest = req.body;

    if (!email || !name || !password) {
      res.status(400).json({ 
        error: 'Email, name, and password are required' 
      });
      return;
    }

    // Validate password strength
    if (password.length < 8) {
      res.status(400).json({ 
        error: 'Password must be at least 8 characters long' 
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

    // Start registration process with password
    const result = await userService.startRegistration(email, name, password);

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        nextStep: 'verification',
        email: email
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.message
      });
    }

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      error: 'Internal server error during registration',
      details: (error as Error).message 
    });
  }
}

/**
 * Verify email with verification code
 */
export async function verifyEmail(req: Request, res: Response): Promise<void> {
  try {
    const { email, code }: VerificationRequest = req.body;

    if (!email || !code) {
      res.status(400).json({ 
        error: 'Email and verification code are required' 
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

    // Validate code format (6 digits)
    if (!/^\d{6}$/.test(code)) {
      res.status(400).json({ 
        error: 'Verification code must be 6 digits' 
      });
      return;
    }

    // Verify email with code
    const result = await userService.verifyEmail(email, code);

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        nextStep: 'login'
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.message
      });
    }

  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ 
      error: 'Internal server error during email verification',
      details: (error as Error).message 
    });
  }
}

/**
 * Resend verification code
 */
export async function resendVerificationCode(req: Request, res: Response): Promise<void> {
  try {
    const { email }: { email: string } = req.body;

    if (!email) {
      res.status(400).json({ 
        error: 'Email is required' 
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

    // Check if user is already verified
    const verifiedUser = await userService.getVerifiedUser(email);
    if (verifiedUser) {
      res.status(400).json({
        success: false,
        error: 'User is already verified. Please login instead.'
      });
      return;
    }

    // Get unverified user to get the name
    const unverifiedUser = await userService.getUnverifiedUser(email);
    if (!unverifiedUser) {
      res.status(404).json({
        success: false,
        error: 'User not found. Please register first.'
      });
      return;
    }

    // Send verification code
    const result = await userService.sendVerificationCode(email, unverifiedUser.name);

    if (result.success) {
      res.json({
        success: true,
        message: result.message
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.message
      });
    }

  } catch (error) {
    console.error('Resend verification code error:', error);
    res.status(500).json({ 
      error: 'Internal server error during code resend',
      details: (error as Error).message 
    });
  }
}

/**
 * Login - now requires verified email and correct password
 */
export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, name, password }: LoginRequest = req.body;

    if (!email || !name || !password) {
      res.status(400).json({ 
        error: 'Email, name, and password are required' 
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

    // Verify user credentials (email, password, and verification status)
    const user = await userService.verifyUserCredentials(email, password);
    
    if (!user) {
      // Check if user exists but is not verified
      const unverifiedUser = await userService.getVerifiedUser(email);
      if (unverifiedUser === null) {
        const existingUser = await userService.getUserByEmail(email);
        if (existingUser && !existingUser.isVerified) {
          res.status(401).json({ 
            error: 'Email not verified. Please register and verify your email first.',
            nextStep: 'registration',
            requiresVerification: true
          });
          return;
        }
      }
      
      // Invalid credentials (user not found, wrong password, or not verified)
      res.status(401).json({ 
        error: 'Invalid email or password',
      });
      return;
    }

    // Update last login time
    await userService.updateLastLogin(email);

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
    // Token refresh functionality would go here
    // For now, just return success (implement later if needed)
    res.json({ success: true, message: 'Token refresh not yet implemented' });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ 
      error: 'Internal server error during token refresh' 
    });
  }
} 