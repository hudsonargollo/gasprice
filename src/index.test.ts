import request from 'supertest';
import './test/mockServices'; // Import mocks before the app
import { app } from './index';

describe('Server Setup', () => {
  it('should respond to health check', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body).toHaveProperty('status', 'OK');
    expect(response.body).toHaveProperty('service', 'FuelPrice Pro Backend');
    expect(response.body).toHaveProperty('timestamp');
  });

  it('should return 404 for unknown routes', async () => {
    const response = await request(app)
      .get('/unknown-route')
      .expect(404);

    expect(response.body).toHaveProperty('error', 'Route not found');
  });
});