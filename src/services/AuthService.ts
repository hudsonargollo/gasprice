import jwt, { SignOptions } from 'jsonwebtoken';
import { UserModel } from '../models/User';
import { LoginCredentials, AuthToken, UserSession } from '../types';
import { logger } from '../utils/logger';

export class AuthService {
  private userModel: UserModel | null = null;
  private jwtSecret: string;
  private jwtExpiresIn: string;

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key-change-in-production';
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '24h';
    
    if (!process.env.JWT_SECRET) {
      logger.warn('JWT_SECRET not set in environment variables, using fallback');
    }
  }

  private getUserModel(): UserModel {
    if (!this.userModel) {
      this.userModel = new UserModel();
    }
    return this.userModel;
  }

  async authenticate(credentials: LoginCredentials): Promise<AuthToken> {
    try {
      const { username, password } = credentials;

      // Find user by username
      const userModel = this.getUserModel();
      const user = await userModel.findByUsername(username);
      if (!user) {
        logger.warn(`Authentication failed: User not found - ${username}`);
        throw new Error('Invalid credentials');
      }

      // Verify password
      const isPasswordValid = await userModel.verifyPassword(password, user.passwordHash);
      if (!isPasswordValid) {
        logger.warn(`Authentication failed: Invalid password - ${username}`);
        throw new Error('Invalid credentials');
      }

      // Update last login timestamp
      await userModel.updateLastLogin(user.id);

      // Generate JWT token
      const payload = {
        userId: user.id,
        username: user.username,
        role: user.role
      };

      const options: SignOptions = { expiresIn: this.jwtExpiresIn as any };
      const token = jwt.sign(payload as object, this.jwtSecret as jwt.Secret, options);

      logger.info(`User authenticated successfully: ${username}`);

      return {
        token,
        expiresIn: this.jwtExpiresIn,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          createdAt: user.createdAt,
          lastLogin: new Date(),
          updatedAt: user.updatedAt
        }
      };
    } catch (error) {
      logger.error('Authentication error:', error);
      throw error;
    }
  }

  async validateToken(token: string): Promise<UserSession> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret as jwt.Secret) as UserSession;
      
      // Verify user still exists
      const userModel = this.getUserModel();
      const user = await userModel.findById(decoded.userId);
      if (!user) {
        throw new Error('User no longer exists');
      }

      return decoded;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        logger.warn('Invalid JWT token:', error.message);
        throw new Error('Invalid token');
      }
      if (error instanceof jwt.TokenExpiredError) {
        logger.warn('JWT token expired');
        throw new Error('Token expired');
      }
      logger.error('Token validation error:', error);
      throw error;
    }
  }

  async refreshToken(token: string): Promise<AuthToken> {
    try {
      // Validate current token (even if expired, we can still decode it)
      let decoded: UserSession;
      try {
        decoded = jwt.verify(token, this.jwtSecret as jwt.Secret) as UserSession;
      } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
          // Allow refresh of expired tokens within a grace period (e.g., 7 days)
          decoded = jwt.decode(token) as UserSession;
          const gracePeriod = 7 * 24 * 60 * 60; // 7 days in seconds
          const now = Math.floor(Date.now() / 1000);
          
          if (now - decoded.exp > gracePeriod) {
            throw new Error('Token too old to refresh');
          }
        } else {
          throw error;
        }
      }

      // Verify user still exists
      const userModel = this.getUserModel();
      const user = await userModel.findById(decoded.userId);
      if (!user) {
        throw new Error('User no longer exists');
      }

      // Generate new token
      const newPayload = {
        userId: user.id,
        username: user.username,
        role: user.role
      };

      const options: SignOptions = { expiresIn: this.jwtExpiresIn as any };
      const newToken = jwt.sign(newPayload as object, this.jwtSecret as jwt.Secret, options);

      logger.info(`Token refreshed for user: ${user.username}`);

      return {
        token: newToken,
        expiresIn: this.jwtExpiresIn,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin,
          updatedAt: user.updatedAt
        }
      };
    } catch (error) {
      logger.error('Token refresh error:', error);
      throw error;
    }
  }

  private parseExpirationTime(expiresIn: string): number {
    // Parse expiration time string (e.g., '24h', '7d', '60m')
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) {
      throw new Error('Invalid expiration time format');
    }

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 60 * 60;
      case 'd': return value * 24 * 60 * 60;
      default: throw new Error('Invalid time unit');
    }
  }

  async createUser(username: string, password: string, role: 'admin' | 'owner'): Promise<Omit<AuthToken['user'], 'lastLogin'>> {
    try {
      const userModel = this.getUserModel();
      const user = await userModel.createUser(username, password, role);
      
      return {
        id: user.id,
        username: user.username,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };
    } catch (error) {
      logger.error('User creation error:', error);
      throw error;
    }
  }
}