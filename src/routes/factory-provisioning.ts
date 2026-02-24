import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { FactoryProvisioningService, ProvisioningOrder } from '../services/FactoryProvisioningService';
import { authenticate, requireAdmin } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

// Lazy-load service
let provisioningService: FactoryProvisioningService | null = null;
function getProvisioningService(): FactoryProvisioningService {
  if (!provisioningService) {
    provisioningService = new FactoryProvisioningService();
  }
  return provisioningService;
}

// Validation schemas
const provisioningOrderSchema = Joi.object({
  clientInfo: Joi.object({
    companyName: Joi.string().min(1).max(255).required(),
    contactName: Joi.string().max(255).optional(),
    email: Joi.string().email().max(255).optional(),
    phone: Joi.string().max(50).optional(),
    address: Joi.string().max(1000).optional(),
    itemsPurchased: Joi.number().integer().min(1).required()
  }).required(),
  locations: Joi.array().items(
    Joi.object({
      stationInfo: Joi.object({
        name: Joi.string().min(1).max(255).required(),
        location: Joi.object({
          latitude: Joi.number().min(-90).max(90).required(),
          longitude: Joi.number().min(-180).max(180).required(),
          address: Joi.string().max(500).required()
        }).optional()
      }).required(),
      devices: Joi.object({
        mikrotik: Joi.object({
          serialNumber: Joi.string().min(1).max(255).required(),
          macAddress: Joi.string().pattern(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/).required(),
          model: Joi.string().max(100).default('hAP-ac2')
        }).required(),
        huidu: Joi.object({
          serialNumber: Joi.string().min(1).max(255).required(),
          macAddress: Joi.string().pattern(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/).required(),
          model: Joi.string().max(100).default('HD-W60')
        }).required()
      }).required(),
      ledPanels: Joi.array().items(
        Joi.object({
          name: Joi.string().min(1).max(255).required()
        })
      ).min(1).required()
    })
  ).min(1).required()
});

const deviceTestSchema = Joi.object({
  mikrotikSerial: Joi.string().min(1).max(255).required(),
  huiduSerial: Joi.string().min(1).max(255).required()
});

const multiDeviceTestSchema = Joi.object({
  devicePairs: Joi.array().items(
    Joi.object({
      mikrotikSerial: Joi.string().min(1).max(255).required(),
      huiduSerial: Joi.string().min(1).max(255).required(),
      locationName: Joi.string().min(1).max(255).required()
    })
  ).min(1).required()
});

// Apply authentication to all routes
router.use(authenticate);
router.use(requireAdmin); // Factory provisioning is admin-only

/**
 * Complete factory provisioning wizard
 * Creates client, devices, station, and LED panels in one transaction
 */
router.post('/provision', async (req: Request, res: Response): Promise<void> => {
  try {
    const { error, value } = provisioningOrderSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      });
      return;
    }

    const order: ProvisioningOrder = value;
    
    logger.info(`Factory provisioning started for: ${order.clientInfo.companyName} by user: ${req.user?.username}`);
    
    const result = await getProvisioningService().provisionCompleteSetup(order);
    
    logger.info(`Factory provisioning completed for: ${order.clientInfo.companyName}`);
    
    res.status(201).json({
      message: 'Factory provisioning completed successfully',
      data: result
    });
  } catch (error) {
    logger.error('Factory provisioning failed:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('already exists')) {
        res.status(400).json({ error: 'Device serial number already exists' });
      } else {
        res.status(500).json({ error: 'Factory provisioning failed', details: error.message });
      }
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

/**
 * Test device configuration before provisioning
 */
router.post('/test-devices', async (req: Request, res: Response): Promise<void> => {
  try {
    const { error, value } = deviceTestSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      });
      return;
    }

    const { mikrotikSerial, huiduSerial } = value;
    
    logger.info(`Testing devices: MikroTik ${mikrotikSerial}, Huidu ${huiduSerial}`);
    
    const testResults = await getProvisioningService().testDeviceConfiguration(mikrotikSerial, huiduSerial);
    
    const allTestsPassed = testResults.mikrotik.connected && 
                          testResults.mikrotik.configured && 
                          testResults.huidu.connected && 
                          testResults.huidu.configured;
    
    res.status(200).json({
      message: allTestsPassed ? 'All device tests passed' : 'Some device tests failed',
      data: {
        ...testResults,
        readyForProvisioning: allTestsPassed
      }
    });
  } catch (error) {
    logger.error('Device testing failed:', error);
    res.status(500).json({ error: 'Device testing failed' });
  }
});

/**
 * Test multiple device pairs for multi-location provisioning
 */
router.post('/test-multiple-devices', async (req: Request, res: Response): Promise<void> => {
  try {
    const { error, value } = multiDeviceTestSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      });
      return;
    }

    const { devicePairs } = value;
    
    logger.info(`Testing ${devicePairs.length} device pairs for multi-location setup`);
    
    const testResults = await getProvisioningService().testMultipleDevicePairs(devicePairs);
    
    res.status(200).json({
      message: testResults.overallSuccess ? 
        'All device pairs tested successfully' : 
        'Some device pairs failed testing',
      data: {
        ...testResults,
        readyForProvisioning: testResults.overallSuccess,
        summary: {
          totalLocations: devicePairs.length,
          passedLocations: testResults.results.filter(r => 
            r.mikrotik.connected && r.mikrotik.configured && 
            r.huidu.connected && r.huidu.configured
          ).length
        }
      }
    });
  } catch (error) {
    logger.error('Multi-device testing failed:', error);
    res.status(500).json({ error: 'Multi-device testing failed' });
  }
});

/**
 * Get provisioning status for a client
 */
router.get('/status/:clientId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { clientId } = req.params;
    
    const status = await getProvisioningService().getProvisioningStatus(clientId);
    
    res.status(200).json({
      message: 'Provisioning status retrieved successfully',
      data: status
    });
  } catch (error) {
    logger.error('Error getting provisioning status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Generate configuration files for download
 */
router.get('/config/:clientId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { clientId } = req.params;
    
    const status = await getProvisioningService().getProvisioningStatus(clientId);
    
    if (!status.client) {
      res.status(404).json({ error: 'Client not found' });
      return;
    }

    // Generate configuration package
    const configPackage = {
      client: {
        companyName: status.client.companyName,
        username: status.client.username,
        setupInstructions: `
1. Connect MikroTik device to power and ethernet
2. Access device via Winbox or web interface
3. Import the provided configuration script
4. Connect Huidu device to MikroTik network
5. Configure Huidu device with provided IP settings
6. Test LED panel connectivity
7. Provide client with login credentials
        `.trim()
      },
      mikrotikConfig: status.devices.mikrotik.length > 0 ? 
        await getProvisioningService().generateMikroTikConfig(status.devices.mikrotik[0].id) : null,
      huiduConfig: status.devices.huidu.length > 0 ? {
        ipAddress: status.devices.huidu[0].ipAddress,
        adminPassword: status.devices.huidu[0].adminPassword,
        setupSteps: [
          'Connect HD-W60 to MikroTik network',
          'Access web interface at provided IP',
          'Login with admin credentials',
          'Configure LED panel settings',
          'Test price display functionality'
        ]
      } : null,
      qrCode: status.client.qrCode || 'Not generated'
    };
    
    res.status(200).json({
      message: 'Configuration package generated successfully',
      data: configPackage
    });
  } catch (error) {
    logger.error('Error generating configuration package:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Factory provisioning wizard steps
 */
router.get('/wizard/steps', async (req: Request, res: Response): Promise<void> => {
  try {
    const wizardSteps = [
      {
        step: 1,
        title: 'Client Information',
        description: 'Enter client company details and contact information',
        fields: ['companyName', 'contactName', 'email', 'phone', 'address', 'itemsPurchased']
      },
      {
        step: 2,
        title: 'Location Planning',
        description: 'Define how many locations this client will have',
        fields: ['numberOfLocations'],
        note: 'Each location requires one MikroTik router and one Huidu LED controller'
      },
      {
        step: 3,
        title: 'Location Setup',
        description: 'Configure each station location (repeat for each location)',
        fields: ['stationName', 'location', 'ledPanelNames'],
        repeatable: true
      },
      {
        step: 4,
        title: 'Device Registration',
        description: 'Register MikroTik and Huidu devices for each location',
        fields: ['mikrotikSerial', 'mikrotikMac', 'huiduSerial', 'huiduMac'],
        repeatable: true,
        note: 'Each location needs its own pair of devices'
      },
      {
        step: 5,
        title: 'Device Testing',
        description: 'Test device connectivity and configuration for all locations',
        action: 'POST /api/factory/test-devices',
        note: 'Test each device pair before proceeding'
      },
      {
        step: 6,
        title: 'Complete Provisioning',
        description: 'Execute factory provisioning for all locations',
        action: 'POST /api/factory/provision',
        note: 'This creates the client account and configures all devices'
      },
      {
        step: 7,
        title: 'Configuration Download',
        description: 'Download device configurations and client credentials',
        action: 'GET /api/factory/config/:clientId',
        note: 'Provides setup instructions and configuration files for each location'
      }
    ];
    
    res.status(200).json({
      message: 'Factory provisioning wizard steps for multi-location setup',
      data: wizardSteps,
      notes: [
        'Each location requires one MikroTik router and one Huidu LED controller',
        'Multiple LED panels can be connected to each Huidu controller',
        'Each location gets its own VPN IP address and configuration',
        'Client receives one login account that works for all their locations'
      ]
    });
  } catch (error) {
    logger.error('Error getting wizard steps:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as factoryProvisioningRoutes };