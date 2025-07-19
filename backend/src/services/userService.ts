import { Collection } from 'mongodb';
import { connectToMongo } from './databaseService';
import emailService from './emailService';
import bcrypt from 'bcryptjs';

// User interface
export interface User {
  _id?: string;
  email: string;
  name: string;
  password: string; // Hashed password
  isVerified: boolean;
  createdAt: Date;
  lastLogin?: Date;
  verificationAttempts: number;
}

// Verification code interface
export interface VerificationCode {
  _id?: string;
  email: string;
  code: string;
  createdAt: Date;
  expiresAt: Date;
  attempts: number;
  maxAttempts: number;
  isUsed: boolean;
}

class UserService {
  private usersCollection: Collection<User> | null = null;
  private verificationCodesCollection: Collection<VerificationCode> | null = null;

  /**
   * Initialize collections
   */
  private async initCollections(): Promise<void> {
    if (!this.usersCollection || !this.verificationCodesCollection) {
      const db = await connectToMongo();
      this.usersCollection = db.collection<User>('users');
      this.verificationCodesCollection = db.collection<VerificationCode>('verificationCodes');
      
      // Create indexes for better performance
      await this.usersCollection.createIndex({ email: 1 }, { unique: true });
      await this.verificationCodesCollection.createIndex({ email: 1 });
      await this.verificationCodesCollection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    }
  }

  /**
   * Generate a 6-digit verification code
   */
  private generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Start user registration process
   * @param email User email
   * @param name User name
   * @param password User password (will be hashed)
   * @returns Success status and message
   */
  async startRegistration(email: string, name: string, password: string): Promise<{ success: boolean; message: string }> {
    try {
      await this.initCollections();

      // Check if user already exists
      const existingUser = await this.usersCollection!.findOne({ email });
      
      if (existingUser && existingUser.isVerified) {
        return {
          success: false,
          message: 'User already exists and is verified. Please login instead.'
        };
      }

      // Hash the password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // If user exists but is not verified, allow them to re-register
      if (existingUser && !existingUser.isVerified) {
        // Update user data including new password
        await this.usersCollection!.updateOne(
          { email },
          { 
            $set: { 
              name,
              password: hashedPassword,
              verificationAttempts: 0 
            } 
          }
        );
      } else {
        // Create new user
        const newUser: User = {
          email,
          name,
          password: hashedPassword,
          isVerified: false,
          createdAt: new Date(),
          verificationAttempts: 0
        };
        
        await this.usersCollection!.insertOne(newUser);
      }

      // Generate and send verification code
      const result = await this.sendVerificationCode(email, name);
      
      return result;
    } catch (error) {
      console.error('Error starting registration:', error);
      return {
        success: false,
        message: 'Failed to start registration process. Please try again.'
      };
    }
  }

  /**
   * Send verification code to email
   * @param email User email
   * @param name User name
   * @returns Success status and message
   */
  async sendVerificationCode(email: string, name: string): Promise<{ success: boolean; message: string }> {
    try {
      await this.initCollections();

      // Check for existing active verification codes
      const existingCode = await this.verificationCodesCollection!.findOne({
        email,
        expiresAt: { $gt: new Date() },
        isUsed: false
      });

      if (existingCode) {
        // Check if enough time has passed since last code (prevent spam)
        const timeSinceLastCode = Date.now() - existingCode.createdAt.getTime();
        const minTimeBetweenCodes = 60000; // 1 minute

        if (timeSinceLastCode < minTimeBetweenCodes) {
          const remainingTime = Math.ceil((minTimeBetweenCodes - timeSinceLastCode) / 1000);
          return {
            success: false,
            message: `Please wait ${remainingTime} seconds before requesting a new code.`
          };
        }
      }

      // Generate new verification code
      const verificationCode = this.generateVerificationCode();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      // Invalidate any existing codes
      await this.verificationCodesCollection!.updateMany(
        { email, isUsed: false },
        { $set: { isUsed: true } }
      );

      // Create new verification code
      const newVerificationCode: VerificationCode = {
        email,
        code: verificationCode,
        createdAt: new Date(),
        expiresAt,
        attempts: 0,
        maxAttempts: 5,
        isUsed: false
      };

      await this.verificationCodesCollection!.insertOne(newVerificationCode);

      // Send email
      const emailSent = await emailService.sendVerificationEmail(email, verificationCode, name);

      if (!emailSent) {
        return {
          success: false,
          message: 'Failed to send verification email. Please try again.'
        };
      }

      return {
        success: true,
        message: 'Verification code sent to your email. Please check your inbox.'
      };
    } catch (error) {
      console.error('Error sending verification code:', error);
      return {
        success: false,
        message: 'Failed to send verification code. Please try again.'
      };
    }
  }

  /**
   * Verify email with verification code
   * @param email User email
   * @param code Verification code
   * @returns Success status and message
   */
  async verifyEmail(email: string, code: string): Promise<{ success: boolean; message: string }> {
    try {
      await this.initCollections();

      // Find the verification code
      const verificationRecord = await this.verificationCodesCollection!.findOne({
        email,
        code,
        isUsed: false,
        expiresAt: { $gt: new Date() }
      });

      if (!verificationRecord) {
        // Check if code exists but is expired or used
        const expiredCode = await this.verificationCodesCollection!.findOne({
          email,
          code
        });

        if (expiredCode) {
          if (expiredCode.isUsed) {
            return {
              success: false,
              message: 'This verification code has already been used. Please request a new one.'
            };
          } else {
            return {
              success: false,
              message: 'Verification code has expired. Please request a new one.'
            };
          }
        }

        // Increment failed attempts for user
        await this.usersCollection!.updateOne(
          { email },
          { $inc: { verificationAttempts: 1 } }
        );

        return {
          success: false,
          message: 'Invalid verification code. Please check and try again.'
        };
      }

      // Mark code as used
      await this.verificationCodesCollection!.updateOne(
        { _id: verificationRecord._id },
        { $set: { isUsed: true } }
      );

      // Mark user as verified
      await this.usersCollection!.updateOne(
        { email },
        { 
          $set: { 
            isVerified: true,
            verificationAttempts: 0
          } 
        }
      );

      return {
        success: true,
        message: 'Email verified successfully! You can now login.'
      };
    } catch (error) {
      console.error('Error verifying email:', error);
      return {
        success: false,
        message: 'Failed to verify email. Please try again.'
      };
    }
  }

  /**
   * Verify user login credentials
   * @param email User email
   * @param password User password
   * @returns User object if credentials are valid, null otherwise
   */
  async verifyUserCredentials(email: string, password: string): Promise<User | null> {
    try {
      await this.initCollections();

      // Find user by email
      const user = await this.usersCollection!.findOne({ email });
      
      if (!user) {
        return null; // User not found
      }

      if (!user.isVerified) {
        return null; // User not verified
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      
      if (!isPasswordValid) {
        return null; // Invalid password
      }

      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword as User;
    } catch (error) {
      console.error('Error verifying user credentials:', error);
      return null;
    }
  }

  /**
   * Get user by email (regardless of verification status)
   * @param email User email
   * @returns User object if exists, null otherwise
   */
  async getUserByEmail(email: string): Promise<User | null> {
    try {
      await this.initCollections();
      
      const user = await this.usersCollection!.findOne({ email });
      
      if (!user) {
        return null;
      }
      
      // Return user without password for security
      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword as User;
    } catch (error) {
      console.error('Error getting user by email:', error);
      return null;
    }
  }

  /**
   * Get verified user by email (without password verification - for legacy compatibility)
   * @deprecated Use verifyUserCredentials instead
   * @param email User email
   * @returns User object if exists and verified, null otherwise
   */
  async getVerifiedUser(email: string): Promise<User | null> {
    try {
      await this.initCollections();
      
      const user = await this.usersCollection!.findOne({ 
        email, 
        isVerified: true 
      });

      return user || null;
    } catch (error) {
      console.error('Error getting verified user:', error);
      return null;
    }
  }

  /**
   * Update user last login time
   * @param email User email
   */
  async updateLastLogin(email: string): Promise<void> {
    try {
      await this.initCollections();
      
      await this.usersCollection!.updateOne(
        { email },
        { $set: { lastLogin: new Date() } }
      );
    } catch (error) {
      console.error('Error updating last login:', error);
    }
  }

  /**
   * Get unverified user for resending codes
   * @param email User email
   * @returns User data if exists but unverified, null otherwise
   */
  async getUnverifiedUser(email: string): Promise<User | null> {
    try {
      await this.initCollections();
      
      const user = await this.usersCollection!.findOne({ 
        email, 
        isVerified: false 
      });

      return user || null;
    } catch (error) {
      console.error('Error getting unverified user:', error);
      return null;
    }
  }
}

// Create singleton instance
const userService = new UserService();
export default userService; 