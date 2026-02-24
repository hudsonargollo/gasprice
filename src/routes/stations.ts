import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { StationService } from '../services/StationService';
import { authenticate, requireAdmin, requireOwner } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

// Lazy-load StationService to avoid database access during module loading
let stationService: StationService | null = null;
function getStationService(): StationService {
  if (!stationService) {
    stationService = new StationService();
  }
  return stationService;
}

// Validation schemas
const createStationSchema = Joi.object({
  ownerId: Joi.string().uuid().required(),
  name: Joi.string().min(1).max(255).required(),
  vpnIpAddress: Joi.string().ip().required(),
  location: Joi.object({
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required(),
    address: Joi.string().max(500).required()
  }).optional()
});

const updateStationSchema = Joi.object({
  name: Joi.string().min(1).max(255).optional(),
  vpnIpAddress: Joi.string().ip().optional(),
  location: Joi.object({
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required(),
    address: Joi.string().max(500).required()
  }).optional()
}).min(1);

const createPanelSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  initialPrices: Joi.object({
    regular: Joi.number().min(0.01).max(999.99).precision(2).optional(),
    premium: Joi.number().min(0.01).max(999.99).precision(2).optional(),
    diesel: Joi.number().min(0.01).max(999.99).precision(2).optional()
  }).optional()
});

const updatePricesSchema = Joi.object({
  regular: Joi.number().min(0.01).max(999.99).precision(2).required(),
  premium: Joi.number().min(0.01).max(999.99).precision(2).required(),
  diesel: Joi.number().min(0.01).max(999.99).precision(2).required()
});

// Get all stations (filtered by user role and ownership)
router.get('/', authenticate, requireOwner, async (req: Request, res: Response): Promise<void> => {
  try {
    const stations = await getStationService().getStationsByUser(req.user!);
    
    logger.info(`Stations retrieved for user: ${req.user!.username} (${stations.length} stations)`);
    
    res.status(200).json({
      message: 'Stations retrieved successfully',
      data: { stations }
    });
  } catch (error) {
    logger.error('Error getting stations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get station by ID (with authorization check)
router.get('/:id', authenticate, requireOwner, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Validate UUID format
    if (!Joi.string().uuid().validate(id).error) {
      const station = await getStationService().getStationById(id, req.user!);
      
      if (!station) {
        res.status(404).json({ error: 'Station not found or access denied' });
        return;
      }
      
      logger.info(`Station details retrieved: ${id} by ${req.user!.username}`);
      
      res.status(200).json({
        message: 'Station retrieved successfully',
        data: { station }
      });
    } else {
      res.status(400).json({ error: 'Invalid station ID format' });
    }
  } catch (error) {
    logger.error('Error getting station by ID:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new station (admin only)
router.post('/', authenticate, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request body
    const { error, value } = createStationSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      });
      return;
    }

    const { ownerId, name, vpnIpAddress, location } = value;
    const station = await getStationService().createStation(ownerId, name, vpnIpAddress, location, req.user!);

    logger.info(`Station created: ${name} by ${req.user!.username}`);
    
    res.status(201).json({
      message: 'Station created successfully',
      data: { station }
    });
  } catch (error) {
    logger.error('Error creating station:', error);
    
    if (error instanceof Error && error.message.includes('Only administrators')) {
      res.status(403).json({ error: error.message });
      return;
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update station (with authorization check)
router.put('/:id', authenticate, requireOwner, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Validate UUID format
    if (Joi.string().uuid().validate(id).error) {
      res.status(400).json({ error: 'Invalid station ID format' });
      return;
    }

    // Validate request body
    const { error, value } = updateStationSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      });
      return;
    }

    const updatedStation = await getStationService().updateStation(id, value, req.user!);
    
    if (!updatedStation) {
      res.status(404).json({ error: 'Station not found or access denied' });
      return;
    }

    logger.info(`Station updated: ${id} by ${req.user!.username}`);
    
    res.status(200).json({
      message: 'Station updated successfully',
      data: { station: updatedStation }
    });
  } catch (error) {
    logger.error('Error updating station:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete station (admin only)
router.delete('/:id', authenticate, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Validate UUID format
    if (Joi.string().uuid().validate(id).error) {
      res.status(400).json({ error: 'Invalid station ID format' });
      return;
    }

    const success = await getStationService().deleteStation(id, req.user!);
    
    if (!success) {
      res.status(404).json({ error: 'Station not found' });
      return;
    }

    logger.info(`Station deleted: ${id} by ${req.user!.username}`);
    
    res.status(200).json({
      message: 'Station deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting station:', error);
    
    if (error instanceof Error && error.message.includes('Only administrators')) {
      res.status(403).json({ error: error.message });
      return;
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get LED panels for a station (with authorization check)
router.get('/:id/panels', authenticate, requireOwner, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Validate UUID format
    if (Joi.string().uuid().validate(id).error) {
      res.status(400).json({ error: 'Invalid station ID format' });
      return;
    }

    const panels = await getStationService().getStationPanels(id, req.user!);
    
    logger.info(`Station panels retrieved: ${id} by ${req.user!.username}`);
    
    res.status(200).json({
      message: 'Station panels retrieved successfully',
      data: { panels }
    });
  } catch (error) {
    logger.error('Error getting station panels:', error);
    
    if (error instanceof Error && error.message.includes('access denied')) {
      res.status(404).json({ error: 'Station not found or access denied' });
      return;
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create LED panel for a station (with authorization check)
router.post('/:id/panels', authenticate, requireOwner, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Validate UUID format
    if (Joi.string().uuid().validate(id).error) {
      res.status(400).json({ error: 'Invalid station ID format' });
      return;
    }

    // Validate request body
    const { error, value } = createPanelSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      });
      return;
    }

    const { name, initialPrices } = value;
    const panel = await getStationService().createPanel(id, name, initialPrices, req.user!);

    logger.info(`LED Panel created: ${name} for station ${id} by ${req.user!.username}`);
    
    res.status(201).json({
      message: 'LED Panel created successfully',
      data: { panel }
    });
  } catch (error) {
    logger.error('Error creating LED panel:', error);
    
    if (error instanceof Error && error.message.includes('access denied')) {
      res.status(404).json({ error: 'Station not found or access denied' });
      return;
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update all panel prices for a station (Sync All functionality)
router.put('/:id/panels/prices', authenticate, requireOwner, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Validate UUID format
    if (Joi.string().uuid().validate(id).error) {
      res.status(400).json({ error: 'Invalid station ID format' });
      return;
    }

    // Validate request body
    const { error, value } = updatePricesSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      });
      return;
    }

    const updatedPanels = await getStationService().updateAllStationPanelPrices(id, value, req.user!);

    logger.info(`All panels updated for station ${id} by ${req.user!.username}`);
    
    res.status(200).json({
      message: 'All station panel prices updated successfully',
      data: { panels: updatedPanels }
    });
  } catch (error) {
    logger.error('Error updating all station panel prices:', error);
    
    if (error instanceof Error && error.message.includes('access denied')) {
      res.status(404).json({ error: 'Station not found or access denied' });
      return;
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as stationRoutes };