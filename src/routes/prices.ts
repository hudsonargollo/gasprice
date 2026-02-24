import { Router } from 'express';
import { PriceUpdateService } from '../services/PriceUpdateService';
import { StationService } from '../services/StationService';
import { authenticate } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

// Lazy-load services to avoid database access during module loading
let priceUpdateService: PriceUpdateService | null = null;
function getPriceUpdateService(): PriceUpdateService {
  if (!priceUpdateService) {
    priceUpdateService = new PriceUpdateService();
  }
  return priceUpdateService;
}

let stationService: StationService | null = null;
function getStationService(): StationService {
  if (!stationService) {
    stationService = new StationService();
  }
  return stationService;
}

// Apply authentication middleware to all price routes
router.use(authenticate);

/**
 * Update prices for a station
 * POST /api/prices/update
 * Body: { stationId: string, prices: FuelPrices }
 */
router.post('/update', async (req, res): Promise<void> => {
  try {
    const { stationId, prices } = req.body;
    const userId = req.user?.userId;
    const userSession = req.user;

    if (!stationId || !prices || !userId || !userSession) {
      res.status(400).json({
        success: false,
        message: 'Missing required fields: stationId, prices, or user authentication'
      });
      return;
    }

    // First validate that the user has access to this station
    const hasAccess = await getStationService().validateStationAccess(stationId, userSession);
    
    if (!hasAccess) {
      res.status(403).json({
        success: false,
        message: 'Access denied: You do not have permission to update prices for this station'
      });
      return;
    }

    logger.info('Price update request received', { stationId, userId });

    const result = await getPriceUpdateService().updatePrices(stationId, prices, userId);

    if (result.success) {
      res.json({
        success: true,
        message: `Successfully updated ${result.panelsUpdated} panel(s)`,
        panelsUpdated: result.panelsUpdated,
        errors: result.errors.length > 0 ? result.errors : undefined
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Price update failed',
        errors: result.errors
      });
    }
  } catch (error) {
    logger.error('Price update endpoint error', { error });
    res.status(500).json({
      success: false,
      message: 'Internal server error during price update'
    });
  }
});

/**
 * Validate price data without updating
 * POST /api/prices/validate
 * Body: { prices: FuelPrices }
 */
router.post('/validate', async (req, res): Promise<void> => {
  try {
    const { prices } = req.body;

    if (!prices) {
      res.status(400).json({
        success: false,
        message: 'Missing prices data'
      });
      return;
    }

    // Sanitize and validate prices
    const sanitizedPrices = getPriceUpdateService().sanitizePriceData(prices);
    const validation = getPriceUpdateService().validatePriceData(sanitizedPrices);

    res.json({
      success: validation.isValid,
      sanitizedPrices,
      validation: {
        isValid: validation.isValid,
        errors: validation.errors
      }
    });
  } catch (error) {
    logger.error('Price validation endpoint error', { error });
    res.status(500).json({
      success: false,
      message: 'Internal server error during price validation'
    });
  }
});

export { router as priceRoutes };