import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { HuiduDeviceModel } from '../models/HuiduDevice';
import { ClientModel } from '../models/Client';
import { authenticate, requireAdmin } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

// Lazy-load models
let deviceModel: HuiduDeviceModel | null = null;
let clientModel: ClientModel | null = null;

function getDeviceModel(): HuiduDeviceModel {
  if (!deviceModel) {
    deviceModel = new HuiduDeviceModel();
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
  model: Joi.string().max(100).default('HD-W60'),
  macAddress: Joi.string().pattern(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/).required(),
  clientId: Joi.string().uuid().optional(),
  deviceName: Joi.string().max(255).optional(),
  ipAddress: Joi.string().ip().optional(),
  adminPassword: Joi.string().max(255).optional(),
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
  ipAddress: Joi.string().ip().allow(null).optional(),
  adminPassword: Joi.string().max(255).optional(),
  status: Joi.string().valid('configured', 'shipped', 'deployed', 'online', 'offline', 'maintenance').optional(),
  locationAddress: Joi.string().max(1000).optional(),
  notes: Joi.string().max(2000).optional()
});

// Apply authentication to all routes
router.use(authenticate);

/**
 * Get all Huidu devices (admin only)
 */
router.get('/', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const devices = await getDeviceModel().getAllDevices();
    
    res.status(200).json({
      message: 'Huidu devices retrieved successfully',
      data: devices
    });
  } catch (error) {
    logger.error('Error getting Huidu devices:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get Huidu device by ID
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const device = await getDeviceModel().findById(id);
    if (!device) {
      res.status(404).json({ error: 'Huidu device not found' });
      return;
    }
    
    res.status(200).json({
      message: 'Huidu device retrieved successfully',
      data: device
    });
  } catch (error) {
    logger.error('Error getting Huidu device:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Create new Huidu device (admin only)
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
      res.status(400).json({ error: 'Huidu device with this serial number already exists' });
      return;
    }

    const device = await getDeviceModel().createDevice(value);
    
    logger.info(`Huidu device created: ${device.serialNumber} by user: ${req.user?.username}`);
    
    res.status(201).json({
      message: 'Huidu device created successfully',
      data: device
    });
  } catch (error) {
    logger.error('Error creating Huidu device:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Update Huidu device
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
      res.status(404).json({ error: 'Huidu device not found' });
      return;
    }
    
    logger.info(`Huidu device updated: ${id} by user: ${req.user?.username}`);
    
    res.status(200).json({
      message: 'Huidu device updated successfully',
      data: device
    });
  } catch (error) {
    logger.error('Error updating Huidu device:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Delete Huidu device (admin only)
 */
router.delete('/:id', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const success = await getDeviceModel().deleteDevice(id);
    if (!success) {
      res.status(404).json({ error: 'Huidu device not found' });
      return;
    }
    
    logger.info(`Huidu device deleted: ${id} by user: ${req.user?.username}`);
    
    res.status(200).json({
      message: 'Huidu device deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting Huidu device:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as huiduDeviceRoutes };