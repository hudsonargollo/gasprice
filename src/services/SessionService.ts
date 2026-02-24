import { UserSession } from '../types';
import { logger } from '../utils/logger';

export class SessionService {
  private activeSessions: Map<string, UserSession>;
  private sessionTimeouts: Map<string, NodeJS.Timeout>;
  private readonly SESSION_CLEANUP_INTERVAL = 60000; // 1 minute
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    this.activeSessions = new Map();
    this.sessionTimeouts = new Map();
    
    // Start periodic cleanup of expired sessions
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions();
    }, this.SESSION_CLEANUP_INTERVAL);
  }

  /**
   * Register a new active session
   */
  registerSession(session: UserSession): void {
    const sessionKey = `${session.userId}:${session.iat}`;
    
    // Store the session
    this.activeSessions.set(sessionKey, session);
    
    // Set up automatic cleanup when session expires
    const expirationTime = (session.exp * 1000) - Date.now();
    if (expirationTime > 0) {
      const timeout = setTimeout(() => {
        this.removeSession(sessionKey);
        logger.info(`Session expired for user: ${session.username}`);
      }, expirationTime);
      
      this.sessionTimeouts.set(sessionKey, timeout);
    }
    
    logger.debug(`Session registered for user: ${session.username}`);
  }

  /**
   * Remove a session (logout)
   */
  removeSession(sessionKey: string): void {
    const session = this.activeSessions.get(sessionKey);
    if (session) {
      logger.info(`Session removed for user: ${session.username}`);
    }
    
    this.activeSessions.delete(sessionKey);
    
    // Clear the timeout
    const timeout = this.sessionTimeouts.get(sessionKey);
    if (timeout) {
      clearTimeout(timeout);
      this.sessionTimeouts.delete(sessionKey);
    }
  }

  /**
   * Check if a session is active and valid
   */
  isSessionActive(session: UserSession): boolean {
    const sessionKey = `${session.userId}:${session.iat}`;
    const storedSession = this.activeSessions.get(sessionKey);
    
    if (!storedSession) {
      return false;
    }
    
    // Check if session has expired
    const now = Math.floor(Date.now() / 1000);
    if (now >= session.exp) {
      this.removeSession(sessionKey);
      return false;
    }
    
    return true;
  }

  /**
   * Get all active sessions for a user
   */
  getUserSessions(userId: string): UserSession[] {
    const userSessions: UserSession[] = [];
    
    for (const [sessionKey, session] of this.activeSessions.entries()) {
      if (session.userId === userId) {
        userSessions.push(session);
      }
    }
    
    return userSessions;
  }

  /**
   * Revoke all sessions for a user (useful for security incidents)
   */
  revokeUserSessions(userId: string): number {
    let revokedCount = 0;
    
    for (const [sessionKey, session] of this.activeSessions.entries()) {
      if (session.userId === userId) {
        this.removeSession(sessionKey);
        revokedCount++;
      }
    }
    
    logger.info(`Revoked ${revokedCount} sessions for user: ${userId}`);
    return revokedCount;
  }

  /**
   * Get session statistics
   */
  getSessionStats(): {
    totalActiveSessions: number;
    sessionsByRole: Record<string, number>;
    oldestSession: Date | null;
  } {
    const stats = {
      totalActiveSessions: this.activeSessions.size,
      sessionsByRole: {} as Record<string, number>,
      oldestSession: null as Date | null
    };

    let oldestTimestamp = Infinity;

    for (const session of this.activeSessions.values()) {
      // Count by role
      stats.sessionsByRole[session.role] = (stats.sessionsByRole[session.role] || 0) + 1;
      
      // Track oldest session
      if (session.iat < oldestTimestamp) {
        oldestTimestamp = session.iat;
        stats.oldestSession = new Date(session.iat * 1000);
      }
    }

    return stats;
  }

  /**
   * Clean up expired sessions
   */
  private cleanupExpiredSessions(): void {
    const now = Math.floor(Date.now() / 1000);
    let cleanedCount = 0;

    for (const [sessionKey, session] of this.activeSessions.entries()) {
      if (now >= session.exp) {
        this.removeSession(sessionKey);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.debug(`Cleaned up ${cleanedCount} expired sessions`);
    }
  }

  /**
   * Shutdown the session service
   */
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    // Clear all timeouts
    for (const timeout of this.sessionTimeouts.values()) {
      clearTimeout(timeout);
    }
    
    this.activeSessions.clear();
    this.sessionTimeouts.clear();
    
    logger.info('Session service shutdown complete');
  }
}

// Create singleton instance
export const sessionService = new SessionService();