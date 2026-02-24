import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { MikroTikDeviceModel } from '../models/MikroTikDevice';
import { ClientModel } from '../models/Client';
import { authenticate, requireAdmin } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

// Lazy-load models
let deviceModel: MikroTikDeviceModel | null = null;
let clientModel: ClientModel | null = null;

function getDeviceModel(): MikroTikDeviceModel {
  if (!deviceModel) {
    deviceModel = new MikroTikDeviceModel();
  }
  return deviceModel;
}

function getClientModel(): ClientModel {
  if (!clientModel) {
    clientModel = new ClientModel();
  }
  return clientModel;
}

// Validation schemas
const createDeviceSchema = Joi.object({
  serialNumber: Joi.string().min(1).max(255).required(),
  model: Joi.string().max(100).default('hAP-ac2'),
  macAddress: Joi.string().pattern(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/).required(),
  clientId: Joi.string().uuid().optional(),
  deviceName: Joi.string().max(255).optional(),
  vpnIpAddress: Joi.string().ip().optional(),
  vpnUsername: Joi.string().max(100).optional(),
  vpnPassword: Joi.string().max(255).optional(),
  adminPassword: Joi.string().max(255).optional(),
  wifiSsid: Joi.string().max(100).optional(),
  wifiPassword: Joi.string().max(255).optional(),
  status: Joi.string().valid('configured', 'shipped', 'deployed', 'online', 'offline', 'maintenance').default('configured'),
  locationAddress: Joi.string().max(1000).optional(),
  notes: Joi.string().max(2000).optional()
});

const updateDeviceSchema = Joi.object({
  serialNumber: Joi.string().min(1).max(255).optional(),
  model: Joi.string().max(100).optional(),
  macAddress: Joi.string().pattern(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/).optional(),
  clientId: Joi.string().uuid().allow(null).optional(),
  deviceName: Joi.string().max(255).optional(),
  vpnIpAddress: Joi.string().ip().allow(null).optional(),
  vpnUsername: Joi.string().max(100).optional(),
  vpnPassword: Joi.string().max(255).optional(),
  adminPassword: Joi.string().max(255).optional(),
  wifiSsid: Joi.string().max(100).optional(),
  wifiPassword: Joi.string().max(255).optional(),
  status: Joi.string().valid('configured', 'shipped', 'deployed', 'online', 'offline', 'maintenance').optional(),
  locationAddress: Joi.string().max(1000).optional(),
  notes: Joi.string().max(2000).optional()
});

// Apply authentication to all routes
router.use(authenticate);

/**
 * Get all devices (admin only)
 */
router.get('/', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const devices = await getDeviceModel().getAllDevices();
    
    res.status(200).json({
      message: 'Devices retrieved successfully',
      data: devices
    });
  } catch (error) {
    logger.error('Error getting devices:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get device by ID
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const device = await getDeviceModel().findById(id);
    if (!device) {
      res.status(404).json({ error: 'Device not found' });
      return;
    }
    
    res.status(200).json({
      message: 'Device retrieved successfully',
      data: device
    });
  } catch (error) {
    logger.error('Error getting device:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Create new device (admin only)
 */
router.post('/', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { error, value } = createDeviceSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      });
      return;
    }

    // Verify client exists if clientId is provided
    if (value.clientId) {
      const client = await getClientModel().findById(value.clientId);
      if (!client) {
        res.status(400).json({ error: 'Client not found' });
        return;
      }
    }

    // Check for duplicate serial number
    const existingDevice = await getDeviceModel().findBySerialNumber(value.serialNumber);
    if (existingDevice) {
      res.status(400).json({ error: 'Device with this serial number already exists' });
      return;
    }

    const device = await getDeviceModel().createDevice(value);
    
    logger.info(`MikroTik device created: ${device.serialNumber} by user: ${req.user?.username}`);
    
    res.status(201).json({
      message: 'Device created successfully',
      data: device
    });
  } catch (error) {
    logger.error('Error creating device:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Update device
 */
router.put('/:id', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const { error, value } = updateDeviceSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      });
      return;
    }

    // Verify client exists if clientId is provided
    if (value.clientId) {
      const client = await getClientModel().findById(value.clientId);
      if (!client) {
        res.status(400).json({ error: 'Client not found' });
        return;
      }
    }

    const device = await getDeviceModel().updateDevice(id, value);
    if (!device) {
      res.status(404).json({ error: 'Device not found' });
      return;
    }
    
    logger.info(`MikroTik device updated: ${id} by user: ${req.user?.username}`);
    
    res.status(200).json({
      message: 'Device updated successfully',
      data: device
    });
  } catch (error) {
    logger.error('Error updating device:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Delete device (admin only)
 */
router.delete('/:id', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const success = await getDeviceModel().deleteDevice(id);
    if (!success) {
      res.status(404).json({ error: 'Device not found' });
      return;
    }
    
    logger.info(`MikroTik device deleted: ${id} by user: ${req.user?.username}`);
    
    res.status(200).json({
      message: 'Device deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting device:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Generate device configuration
 */
router.get('/:id/config', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const config = await getDeviceModel().generateDeviceConfig(id);
    
    res.status(200).json({
      message: 'Device configuration generated successfully',
      data: {
        config,
        filename: `mikrotik-config-${id}.rsc`
      }
    });
  } catch (error) {
    logger.error('Error generating device config:', error);
    if (error instanceof Error && error.message === 'Device not found') {
      res.status(404).json({ error: 'Device not found' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

/**
 * Download device configuration as file
 */
router.get('/:id/config/download', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const device = await getDeviceModel().findById(id);
    if (!device) {
      res.status(404).json({ error: 'Device not found' });
      return;
    }

    const config = await getDeviceModel().generateDeviceConfig(id);
    const filename = `mikrotik-${device.serialNumber}-config.rsc`;
    
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(config);
  } catch (error) {
    logger.error('Error downloading device config:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Bulk create devices (admin only)
 */
router.post('/bulk', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { devices } = req.body;
    
    if (!Array.isArray(devices) || devices.length === 0) {
      res.status(400).json({ error: 'Devices array is required' });
      return;
    }

    const results = [];
    const errors = [];

    for (let i = 0; i < devices.length; i++) {
      try {
        const { error, value } = createDeviceSchema.validate(devices[i]);
        if (error) {
          errors.push({
            index: i,
            serialNumber: devices[i].serialNumber,
            error: error.details.map(d => d.message).join(', ')
          });
          continue;
        }

        // Check for duplicate serial number
        const existingDevice = await getDeviceModel().findBySerialNumber(value.serialNumber);
        if (existingDevice) {
          errors.push({
            index: i,
            serialNumber: value.serialNumber,
            error: 'Device with this serial number already exists'
          });
          continue;
        }

        const device = await getDeviceModel().createDevice(value);
        results.push(device);
      } catch (error) {
        errors.push({
          index: i,
          serialNumber: devices[i].serialNumber,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    logger.info(`Bulk device creation: ${results.length} created, ${errors.length} failed by user: ${req.user?.username}`);
    
    res.status(200).json({
      message: 'Bulk device creation completed',
      data: {
        created: results,
        errors: errors,
        summary: {
          total: devices.length,
          created: results.length,
          failed: errors.length
        }
      }
    });
  } catch (error) {
    logger.error('Error in bulk device creation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as deviceRoutes };