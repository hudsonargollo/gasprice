import request from 'supertest';
import '../test/mockServices'; // Import mocks before the app
import { app } from '../index';

describe('Authentication Routes', () => {
  describe('POST /api/auth/login', () => {
    it('should return 400 for invalid request body', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should return 401 for invalid credentials when database is not available', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'testpass'
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
    });
  });

  describe('POST /api/auth/validate', () => {
    it('should return 401 for missing token', async () => {
      const response = await request(app)
        .post('/api/auth/validate');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('No token provided');
    });

    it('should return 401 for invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/validate')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid token');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should return 401 for missing token', async () => {
      const response = await request(app)
        .post('/api/auth/logout');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('No token provided');
    });
  });

  describe('POST /api/auth/register', () => {
    it('should return 401 for missing authentication', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'newuser',
          password: 'password123',
          role: 'owner'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('No token provided');
    });
  });
});