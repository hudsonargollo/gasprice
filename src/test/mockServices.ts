// Mock services for route testing
export const mockStationService = {
  getStationsByUser: jest.fn(),
  getStationById: jest.fn(),
  createStation: jest.fn(),
  updateStation: jest.fn(),
  deleteStation: jest.fn(),
  getStationPanels: jest.fn(),
  createPanel: jest.fn(),
  updateAllStationPanelPrices: jest.fn(),
};

export const mockAuthService = {
  authenticate: jest.fn(),
  validateToken: jest.fn(),
  refreshToken: jest.fn(),
  createUser: jest.fn(),
};

// Mock the services modules
jest.mock('../services/StationService', () => ({
  StationService: jest.fn().mockImplementation(() => mockStationService)
}));

jest.mock('../services/AuthService', () => ({
  AuthService: jest.fn().mockImplementation(() => mockAuthService)
}));

jest.mock('../services/SessionService', () => ({
  sessionService: {
    registerSession: jest.fn(),
    removeSession: jest.fn(),
    getSessionStats: jest.fn(),
    revokeUserSessions: jest.fn(),
    getUserSessions: jest.fn(),
  }
}));

// Mock the auth middleware
jest.mock('../middleware/auth', () => ({
  authenticate: (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = authHeader.substring(7);
    if (token === 'invalid-token') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    // Mock valid token
    req.user = {
      userId: 'test-user-id',
      username: 'testuser',
      role: 'owner',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600
    };
    next();
  },
  requireAdmin: (req: any, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  },
  requireOwner: (req: any, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (req.user.role !== 'owner' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Owner access required' });
    }
    next();
  },
  requireOwnershipOrAdmin: () => (req: any, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    next();
  },
  checkSessionExpiration: (req: any, res: any, next: any) => {
    next();
  },
  optionalAuth: (req: any, res: any, next: any) => {
    next();
  }
}));