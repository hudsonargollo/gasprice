import { LEDPanelModel } from './LEDPanel';
import { StationModel } from './Station';
import { UserModel } from './User';
import { connectDatabase, closeDatabase } from '../config/database';
import { FuelPrices } from '../types';

describe('LEDPanelModel', () => {
  let panelModel: LEDPanelModel;
  let stationModel: StationModel;
  let userModel: UserModel;
  let testStationId: string;
  let testUserId: string;

  beforeAll(async () => {
    await connectDatabase();
    panelModel = new LEDPanelModel();
    stationModel = new StationModel();
    userModel = new UserModel();
    
    // Create test user and station
    const testUser = await userModel.createUser('panelowner', 'password123', 'owner');
    testUserId = testUser.id;
    
    const testStation = await stationModel.createStation(
      testUserId,
      'Panel Test Station',
      '192.168.1.200'
    );
    testStationId = testStation.id;
  });

  afterAll(async () => {
    // Clean up test data
    await panelModel.deletePanelsByStationId(testStationId);
    await stationModel.deleteStation(testStationId);
    await userModel.deleteUser(testUserId);
    await closeDatabase();
  });

  describe('createPanel', () => {
    it('should create a panel with basic information', async () => {
      const panel = await panelModel.createPanel(testStationId, 'Test Panel');

      expect(panel.id).toBeDefined();
      expect(panel.stationId).toBe(testStationId);
      expect(panel.name).toBe('Test Panel');
      expect(panel.currentPrices).toEqual({
        regular: 0,
        premium: 0,
        diesel: 0
      });
      expect(panel.lastUpdate).toBeNull();
      expect(panel.createdAt).toBeDefined();
    });

    it('should create a panel with initial prices', async () => {
      const initialPrices: FuelPrices = {
        regular: 3.45,
        premium: 3.75,
        diesel: 3.25
      };

      const panel = await panelModel.createPanel(
        testStationId,
        'Panel with Prices',
        initialPrices
      );

      expect(panel.currentPrices).toEqual(initialPrices);
    });
  });

  describe('findById', () => {
    it('should find a panel by ID', async () => {
      const createdPanel = await panelModel.createPanel(testStationId, 'Findable Panel');

      const foundPanel = await panelModel.findById(createdPanel.id);

      expect(foundPanel).not.toBeNull();
      expect(foundPanel!.id).toBe(createdPanel.id);
      expect(foundPanel!.name).toBe('Findable Panel');
    });

    it('should return null for non-existent panel', async () => {
      const foundPanel = await panelModel.findById('00000000-0000-0000-0000-000000000000');
      expect(foundPanel).toBeNull();
    });
  });

  describe('findByStationId', () => {
    it('should find all panels for a station', async () => {
      await panelModel.createPanel(testStationId, 'Station Panel 1');
      await panelModel.createPanel(testStationId, 'Station Panel 2');

      const panels = await panelModel.findByStationId(testStationId);

      expect(panels.length).toBeGreaterThanOrEqual(2);
      expect(panels.every(p => p.stationId === testStationId)).toBe(true);
    });
  });

  describe('updatePrices', () => {
    it('should update panel prices', async () => {
      const panel = await panelModel.createPanel(testStationId, 'Price Update Panel');
      
      const newPrices: FuelPrices = {
        regular: 3.55,
        premium: 3.85,
        diesel: 3.35
      };

      const updatedPanel = await panelModel.updatePrices(panel.id, newPrices);

      expect(updatedPanel).not.toBeNull();
      expect(updatedPanel!.currentPrices).toEqual(newPrices);
      expect(updatedPanel!.lastUpdate).toBeDefined();
    });
  });

  describe('updatePanelsByStationId', () => {
    it('should update all panels for a station', async () => {
      const panel1 = await panelModel.createPanel(testStationId, 'Bulk Update Panel 1');
      const panel2 = await panelModel.createPanel(testStationId, 'Bulk Update Panel 2');
      
      const newPrices: FuelPrices = {
        regular: 3.99,
        premium: 4.29,
        diesel: 3.79
      };

      const updatedPanels = await panelModel.updatePanelsByStationId(testStationId, newPrices);

      expect(updatedPanels.length).toBeGreaterThanOrEqual(2);
      expect(updatedPanels.every(p => 
        p.currentPrices.regular === newPrices.regular &&
        p.currentPrices.premium === newPrices.premium &&
        p.currentPrices.diesel === newPrices.diesel
      )).toBe(true);
    });
  });

  describe('price validation', () => {
    it('should handle decimal precision correctly', async () => {
      const panel = await panelModel.createPanel(testStationId, 'Precision Panel');
      
      const precisePrices: FuelPrices = {
        regular: 3.456, // Should be stored as 3.46
        premium: 3.999, // Should be stored as 4.00
        diesel: 3.001   // Should be stored as 3.00
      };

      const updatedPanel = await panelModel.updatePrices(panel.id, precisePrices);

      // Database should handle decimal precision (2 decimal places)
      expect(updatedPanel!.currentPrices.regular).toBeCloseTo(3.46, 2);
      expect(updatedPanel!.currentPrices.premium).toBeCloseTo(4.00, 2);
      expect(updatedPanel!.currentPrices.diesel).toBeCloseTo(3.00, 2);
    });
  });
});