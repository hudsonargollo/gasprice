import { initializeSchema } from './database';

describe('Database Configuration', () => {
  it('should have schema initialization function', () => {
    expect(typeof initializeSchema).toBe('function');
  });

  it('should export database configuration functions', () => {
    const { connectDatabase, getPool, closeDatabase } = require('./database');
    
    expect(typeof connectDatabase).toBe('function');
    expect(typeof getPool).toBe('function');
    expect(typeof closeDatabase).toBe('function');
  });
});