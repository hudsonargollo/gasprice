import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { logger } from './utils/logger';
import { connectDatabase } from './config/database';
import { errorHandler } from './middleware/errorHandler';
import { authRoutes } from './routes/auth';
import { stationRoutes } from './routes/stations';
import { priceRoutes } from './routes/prices';
import { clientRoutes } from './routes/clients';
import { deviceRoutes } from './routes/devices';
import { huiduDeviceRoutes } from './routes/huidu-devices';
import { factoryProvisioningRoutes } from './routes/factory-provisioning';
import { VPNMonitorService } from './services/VPNMonitorService';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3000;

// VPN monitoring service instance (initialized later)
let vpnMonitorService: VPNMonitorService;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Root endpoint - API information
app.get('/', (req, res) => {
  res.status(200).json({
    service: 'FuelPrice Pro API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      stations: '/api/stations',
      prices: '/api/prices',
      clients: '/api/clients',
      mikrotikDevices: '/api/devices',
      huiduDevices: '/api/huidu-devices',
      factoryProvisioning: '/api/factory'
    },
    documentation: 'This is a REST API for fuel station management with factory provisioning. All endpoints except /health require JWT authentication.'
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'FuelPrice Pro Backend'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/stations', stationRoutes);
app.use('/api/prices', priceRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/huidu-devices', huiduDeviceRoutes);
app.use('/api/factory', factoryProvisioningRoutes);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

async function startServer(): Promise<void> {
  try {
    // Initialize database connection (skip in test environment)
    if (process.env.NODE_ENV !== 'test') {
      await connectDatabase();
      logger.info('Database connected successfully');

      // Initialize and start VPN monitoring service
      vpnMonitorService = new VPNMonitorService();
      await vpnMonitorService.startMonitoring();
      logger.info('VPN monitoring service started');
    }

    // Start server
    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    }
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  if (vpnMonitorService) {
    vpnMonitorService.stopAllMonitoring();
  }
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  if (vpnMonitorService) {
    vpnMonitorService.stopAllMonitoring();
  }
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

// Start server only if not in test environment
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

// Function to get VPN monitor service instance
export function getVPNMonitorService(): VPNMonitorService | undefined {
  return vpnMonitorService;
}

export { app, server };