export { errorHandler } from './errorHandler';
export { 
  authenticate, 
  requireAdmin, 
  requireOwner, 
  requireOwnershipOrAdmin, 
  checkSessionExpiration, 
  optionalAuth,
  AuthMiddleware 
} from './auth';