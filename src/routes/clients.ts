import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { ClientModel } from '../models/Client';
import { MikroTikDeviceModel } from '../models/MikroTikDevice';
import { authenticate, requireAdmin } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

// Lazy-load models
let clientModel: ClientModel | null = null;
let deviceModel: MikroTikDeviceModel | null = null;

function getClientModel(): ClientModel {
  if (!clientModel) {
    clientModel = new ClientModel();
  }
  return clientModel;
}

function getDeviceModel(): MikroTikDeviceModel {
  if (!deviceModel) {
    deviceModel = new MikroTikDeviceModel();
  }
  return deviceModel;
}

// Validation schemas
const createClientSchema = Joi.object({
  companyName: Joi.string().min(1).max(255).required(),
  contactName: Joi.string().max(255).optional(),
  email: Joi.string().email().max(255).optional(),
  phone: Joi.string().max(50).optional(),
  address: Joi.string().max(1000).optional(),
  itemsPurchased: Joi.number().integer().min(0).default(0),
  status: Joi.string().valid('active', 'inactive', 'suspended').default('active'),
  notes: Joi.string().max(2000).optional()
});

const updateClientSchema = Joi.object({
  companyName: Joi.string().min(1).max(255).optional(),
  contactName: Joi.string().max(255).optional(),
  email: Joi.string().email().max(255).optional(),
  phone: Joi.string().max(50).optional(),
  address: Joi.string().max(1000).optional(),
  itemsPurchased: Joi.number().integer().min(0).optional(),
  status: Joi.string().valid('active', 'inactive', 'suspended').optional(),
  notes: Joi.string().max(2000).optional()
});

// Apply authentication to all routes
router.use(authenticate);

/**
 * Get all clients (admin only)
 */
router.get('/', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const clients = await getClientModel().getAllClients();
    
    res.status(200).json({
      message: 'Clients retrieved successfully',
      data: clients
    });
  } catch (error) {
    logger.error('Error getting clients:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get client by ID
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const client = await getClientModel().findById(id);
    if (!client) {
      res.status(404).json({ error: 'Client not found' });
      return;
    }

    // Get client statistics
    const stats = await getClientModel().getClientStats(id);
    
    res.status(200).json({
      message: 'Client retrieved successfully',
      data: {
        ...client,
        stats
      }
    });
  } catch (error) {
    logger.error('Error getting client:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Create new client (admin only)
 */
router.post('/', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { error, value } = createClientSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      });
      return;
    }

    const client = await getClientModel().createClient(value);
    
    logger.info(`Client created: ${client.companyName} by user: ${req.user?.username}`);
    
    res.status(201).json({
      message: 'Client created successfully',
      data: client
    });
  } catch (error) {
    logger.error('Error creating client:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Update client
 */
router.put('/:id', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const { error, value } = updateClientSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      });
      return;
    }

    const client = await getClientModel().updateClient(id, value);
    if (!client) {
      res.status(404).json({ error: 'Client not found' });
      return;
    }
    
    logger.info(`Client updated: ${id} by user: ${req.user?.username}`);
    
    res.status(200).json({
      message: 'Client updated successfully',
      data: client
    });
  } catch (error) {
    logger.error('Error updating client:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Delete client (admin only)
 */
router.delete('/:id', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const success = await getClientModel().deleteClient(id);
    if (!success) {
      res.status(404).json({ error: 'Client not found' });
      return;
    }
    
    logger.info(`Client deleted: ${id} by user: ${req.user?.username}`);
    
    res.status(200).json({
      message: 'Client deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting client:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get client's devices
 */
router.get('/:id/devices', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Verify client exists
    const client = await getClientModel().findById(id);
    if (!client) {
      res.status(404).json({ error: 'Client not found' });
      return;
    }

    const devices = await getDeviceModel().findByClientId(id);
    
    res.status(200).json({
      message: 'Client devices retrieved successfully',
      data: devices
    });
  } catch (error) {
    logger.error('Error getting client devices:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as clientRoutes };