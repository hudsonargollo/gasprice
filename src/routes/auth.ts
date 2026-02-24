import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { AuthService } from '../services/AuthService';
import { sessionService } from '../services/SessionService';
import { LoginCredentials } from '../types';
import { logger } from '../utils/logger';
import { authenticate, requireAdmin, checkSessionExpiration } from '../middleware/auth';

const router = Router();

// Lazy-load AuthService to avoid database access during module loading
let authService: AuthService | null = null;
function getAuthService(): AuthService {
  if (!authService) {
    authService = new AuthService();
  }
  return authService;
}

// Validation schemas
const loginSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  password: Joi.string().min(6).max(128).required()
});

const registerSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  password: Joi.string().min(6).max(128).required(),
  role: Joi.string().valid('admin', 'owner').required()
});

const refreshTokenSchema = Joi.object({
  token: Joi.string().required()
});

// Login endpoint
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request body
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      });
      return;
    }

    const credentials: LoginCredentials = value;
    const authResult = await getAuthService().authenticate(credentials);

    // Register the session for tracking
    const session = await getAuthService().validateToken(authResult.token);
    sessionService.registerSession(session);

    logger.info(`User logged in: ${credentials.username}`);
    
    res.status(200).json({
      message: 'Authentication successful',
      data: authResult
    });
  } catch (error) {
    logger.error('Login error:', error);
    
    if (error instanceof Error && error.message === 'Invalid credentials') {
      res.status(401).json({ error: 'Invalid username or password' });
      return;
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Register endpoint (admin only)
router.post('/register', authenticate, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request body
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      });
      return;
    }

    const { username, password, role } = value;
    const user = await getAuthService().createUser(username, password, role);

    logger.info(`User registered: ${username} with role: ${role}`);
    
    res.status(201).json({
      message: 'User created successfully',
      data: { user }
    });
  } catch (error) {
    logger.error('Registration error:', error);
    
    if (error instanceof Error && error.message.includes('duplicate key')) {
      res.status(409).json({ error: 'Username already exists' });
      return;
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Token refresh endpoint
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request body
    const { error, value } = refreshTokenSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      });
      return;
    }

    const { token } = value;
    const authResult = await getAuthService().refreshToken(token);

    logger.info(`Token refreshed for user: ${authResult.user.username}`);
    
    res.status(200).json({
      message: 'Token refreshed successfully',
      data: authResult
    });
  } catch (error) {
    logger.error('Token refresh error:', error);
    
    if (error instanceof Error && (
      error.message === 'Invalid token' || 
      error.message === 'Token expired' ||
      error.message === 'Token too old to refresh' ||
      error.message === 'User no longer exists'
    )) {
      res.status(401).json({ error: error.message });
      return;
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout endpoint
router.post('/logout', authenticate, (req: Request, res: Response): void => {
  if (req.user) {
    const sessionKey = `${req.user.userId}:${req.user.iat}`;
    sessionService.removeSession(sessionKey);
    logger.info(`User logged out: ${req.user.username}`);
  }
  
  res.status(200).json({ message: 'Logout successful' });
});

// Validate token endpoint
router.post('/validate', authenticate, checkSessionExpiration, (req: Request, res: Response): void => {
  // If we reach here, the token is valid (middleware handled validation)
  res.status(200).json({
    message: 'Token is valid',
    data: { session: req.user }
  });
});

export { router as authRoutes };
// Admin endpoints for session management
router.get('/sessions', authenticate, requireAdmin, (req: Request, res: Response): void => {
  const stats = sessionService.getSessionStats();
  res.status(200).json({
    message: 'Session statistics retrieved',
    data: stats
  });
});

router.delete('/sessions/:userId', authenticate, requireAdmin, (req: Request, res: Response): void => {
  const { userId } = req.params;
  const revokedCount = sessionService.revokeUserSessions(userId);
  
  res.status(200).json({
    message: `Revoked ${revokedCount} sessions for user`,
    data: { userId, revokedCount }
  });
});

router.get('/sessions/:userId', authenticate, requireAdmin, (req: Request, res: Response): void => {
  const { userId } = req.params;
  const userSessions = sessionService.getUserSessions(userId);
  
  res.status(200).json({
    message: 'User sessions retrieved',
    data: { userId, sessions: userSessions }
  });
});