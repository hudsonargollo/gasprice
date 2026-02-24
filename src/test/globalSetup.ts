// Global setup for Jest tests
import dotenv from 'dotenv';

export default async function globalSetup() {
  // Load test environment variables
  dotenv.config({ path: '.env.test' });
  
  // Set NODE_ENV to test
  process.env.NODE_ENV = 'test';
  
  console.log('Global test setup completed');
}