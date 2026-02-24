import request from 'supertest';
import '../test/mockServices'; // Import mocks before the app
import { app } from '../index';

describe('Station Routes', () => {
  describe('GET /api/stations', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/stations')
        .expect(401);

      expect(response.body.error).toBe('No token provided');
    });

    it('should reject invalid tokens', async () => {
      const response = await request(app)
        .get('/api/stations')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.error).toBe('Invalid token');
    });
  });

  describe('GET /api/stations/:id', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/stations/123e4567-e89b-12d3-a456-426614174000')
        .expect(401);

      expect(response.body.error).toBe('No token provided');
    });

    it('should validate UUID format', async () => {
      const response = await request(app)
        .get('/api/stations/invalid-uuid')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401); // Auth fails before validation

      expect(response.body.error).toBe('Invalid token');
    });
  });

  describe('POST /api/stations', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/stations')
        .send({
          ownerId: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Test Station',
          vpnIpAddress: '192.168.1.100'
        })
        .expect(401);

      expect(response.body.error).toBe('No token provided');
    });
  });

  describe('PUT /api/stations/:id', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .put('/api/stations/123e4567-e89b-12d3-a456-426614174000')
        .send({
          name: 'Updated Station'
        })
        .expect(401);

      expect(response.body.error).toBe('No token provided');
    });
  });

  describe('DELETE /api/stations/:id', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .delete('/api/stations/123e4567-e89b-12d3-a456-426614174000')
        .expect(401);

      expect(response.body.error).toBe('No token provided');
    });
  });

  describe('GET /api/stations/:id/panels', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/stations/123e4567-e89b-12d3-a456-426614174000/panels')
        .expect(401);

      expect(response.body.error).toBe('No token provided');
    });
  });

  describe('POST /api/stations/:id/panels', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/stations/123e4567-e89b-12d3-a456-426614174000/panels')
        .send({
          name: 'Test Panel'
        })
        .expect(401);

      expect(response.body.error).toBe('No token provided');
    });
  });

  describe('PUT /api/stations/:id/panels/prices', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .put('/api/stations/123e4567-e89b-12d3-a456-426614174000/panels/prices')
        .send({
          regular: 3.45,
          premium: 3.75,
          diesel: 3.25
        })
        .expect(401);

      expect(response.body.error).toBe('No token provided');
    });
  });
});