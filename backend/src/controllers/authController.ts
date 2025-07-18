import { Request, Response } from 'express';
import { validatePortEmail, generateToken } from '../middleware/authMiddleware';
import userService from '../services/userService';

export interface LoginRequest {
  email: string;
  name: string;
}

export interface RegistrationRequest {
  email: string;
  name: string;
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
    const { email, name }: RegistrationRequest = req.body;

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

    // Start registration process
    const result = await userService.startRegistration(email, name);

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
 * Login - now requires verified email
 */
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

    // Check if user exists and is verified
    const user = await userService.getVerifiedUser(email);
    
    if (!user) {
      res.status(401).json({ 
        error: 'Email not verified. Please register and verify your email first.',
        nextStep: 'registration',
        requiresVerification: true
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

/**
 * Debug endpoint to test email service directly
 */
export async function debugEmailService(req: Request, res: Response): Promise<void> {
  try {
    const { email, name } = req.body;
    
    if (!email || !name) {
      res.status(400).json({ 
        error: 'Email and name are required for debug test' 
      });
      return;
    }

    console.log('[DEBUG] Testing email service directly...');
    
    // Import email service here to avoid circular import issues
    const emailService = (await import('../services/emailService')).default;
    
    // Test sending a verification email
    const testCode = '123456';
    const result = await emailService.sendVerificationEmail(email, testCode, name);
    
    console.log(`[DEBUG] Email service returned: ${result}`);
    
    res.json({
      success: true,
      emailResult: result,
      message: 'Debug test completed. Check console for logs.'
    });

  } catch (error) {
    console.error('[DEBUG] Email service error:', error);
    res.status(500).json({ 
      error: 'Debug test failed',
      details: (error as Error).message 
    });
  }
} 