// Jest setup file for test configuration
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test timeout
jest.setTimeout(10000);

// Mock console methods in tests to reduce noise
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Initialize test database before all tests
beforeAll(async () => {
  const { connectTestDatabase } = require('../config/testDatabase');
  await connectTestDatabase();
});

// Reset mock database before each test for isolation
beforeEach(() => {
  const { resetMockDatabase } = require('./mockDatabase');
  resetMockDatabase();
});

// Mock the database module to use test database
jest.mock('../config/database', () => {
  const testDb = require('../config/testDatabase');
  return {
    connectDatabase: testDb.connectTestDatabase,
    getPool: testDb.getTestPool,
    closeDatabase: testDb.closeTestDatabase,
    initializeSchema: jest.fn().mockResolvedValue(undefined),
  };
});