import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService';
import { UserSession } from '../types';
import { logger } from '../utils/logger';

// Extend Express Request interface to include user session
declare global {
  namespace Express {
    interface Request {
      user?: UserSession;
    }
  }
}

export class AuthMiddleware {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  /**
   * Middleware to authenticate JWT tokens
   * Validates the token and adds user session to request object
   */
  authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'No token provided' });
        return;
      }

      const token = authHeader.substring(7);
      const session = await this.authService.validateToken(token);
      
      // Add user session to request object
      req.user = session;
      
      logger.debug(`User authenticated: ${session.username} (${session.role})`);
      next();
    } catch (error) {
      logger.warn('Authentication failed:', error);
      
      if (error instanceof Error && (
        error.message === 'Invalid token' || 
        error.message === 'Token expired' ||
        error.message === 'User no longer exists'
      )) {
        res.status(401).json({ error: error.message });
        return;
      }
      
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * Middleware to authorize admin users only
   * Must be used after authenticate middleware
   */
  requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (req.user.role !== 'admin') {
      logger.warn(`Access denied for user ${req.user.username}: Admin role required`);
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    logger.debug(`Admin access granted to: ${req.user.username}`);
    next();
  };

  /**
   * Middleware to authorize client users (includes admin, owner, client)
   * Must be used after authenticate middleware
   */
  requireClient = (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!['admin', 'owner', 'client'].includes(req.user.role)) {
      logger.warn(`Access denied for user ${req.user.username}: Client role required`);
      res.status(403).json({ error: 'Client access required' });
      return;
    }

    logger.debug(`Client access granted to: ${req.user.username}`);
    next();
  };

  /**
   * Middleware to authorize owner users (includes admin)
   * Must be used after authenticate middleware
   */
  requireOwner = (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (req.user.role !== 'owner' && req.user.role !== 'admin') {
      logger.warn(`Access denied for user ${req.user.username}: Owner role required`);
      res.status(403).json({ error: 'Owner access required' });
      return;
    }

    logger.debug(`Owner access granted to: ${req.user.username}`);
    next();
  };

  /**
   * Middleware to authorize specific user or admin
   * Checks if the user is accessing their own resources or is an admin
   * Must be used after authenticate middleware
   */
  requireOwnershipOrAdmin = (userIdParam: string = 'userId') => {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const targetUserId = req.params[userIdParam];
      
      // Admin can access any resource
      if (req.user.role === 'admin') {
        logger.debug(`Admin access granted to: ${req.user.username}`);
        next();
        return;
      }

      // User can only access their own resources
      if (req.user.userId === targetUserId) {
        logger.debug(`Owner access granted to: ${req.user.username}`);
        next();
        return;
      }

      logger.warn(`Access denied for user ${req.user.username}: Not owner of resource ${targetUserId}`);
      res.status(403).json({ error: 'Access denied: You can only access your own resources' });
    };
  };

  /**
   * Middleware to check session expiration and provide refresh warning
   * Must be used after authenticate middleware
   */
  checkSessionExpiration = (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const now = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = req.user.exp - now;
    
    // Warn if token expires within 5 minutes (300 seconds)
    if (timeUntilExpiry < 300 && timeUntilExpiry > 0) {
      res.setHeader('X-Token-Refresh-Warning', 'Token expires soon');
      logger.info(`Token refresh warning for user: ${req.user.username}`);
    }

    next();
  };

  /**
   * Optional authentication middleware
   * Adds user session to request if token is valid, but doesn't require authentication
   */
  optionalAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        // No token provided, continue without authentication
        next();
        return;
      }

      const token = authHeader.substring(7);
      const session = await this.authService.validateToken(token);
      
      // Add user session to request object
      req.user = session;
      
      logger.debug(`Optional auth successful: ${session.username} (${session.role})`);
      next();
    } catch (error) {
      // Authentication failed, but continue without user session
      logger.debug('Optional authentication failed, continuing without user session');
      next();
    }
  };
}

// Create singleton instance
const authMiddleware = new AuthMiddleware();

// Export middleware functions
export const authenticate = authMiddleware.authenticate;
export const requireAdmin = authMiddleware.requireAdmin;
export const requireOwner = authMiddleware.requireOwner;
export const requireClient = authMiddleware.requireClient;
export const requireOwnershipOrAdmin = authMiddleware.requireOwnershipOrAdmin;
export const checkSessionExpiration = authMiddleware.checkSessionExpiration;
export const optionalAuth = authMiddleware.optionalAuth;