import { StationModel } from './Station';
import { LEDPanelModel } from './LEDPanel';
import { UserModel } from './User';
import { connectDatabase, closeDatabase } from '../config/database';

describe('StationModel', () => {
  let stationModel: StationModel;
  let userModel: UserModel;
  let panelModel: LEDPanelModel;
  let testUserId: string;

  beforeAll(async () => {
    await connectDatabase();
    stationModel = new StationModel();
    userModel = new UserModel();
    panelModel = new LEDPanelModel();
    
    // Create a test user for station ownership
    const testUser = await userModel.createUser('testowner', 'password123', 'owner');
    testUserId = testUser.id;
  });

  afterAll(async () => {
    // Clean up test data
    const stations = await stationModel.findByOwnerId(testUserId);
    for (const station of stations) {
      await stationModel.deleteStation(station.id);
    }
    await userModel.deleteUser(testUserId);
    await closeDatabase();
  });

  describe('createStation', () => {
    it('should create a station with basic information', async () => {
      const station = await stationModel.createStation(
        testUserId,
        'Test Station',
        '192.168.1.100'
      );

      expect(station.id).toBeDefined();
      expect(station.ownerId).toBe(testUserId);
      expect(station.name).toBe('Test Station');
      expect(station.vpnIpAddress).toBe('192.168.1.100');
      expect(station.isOnline).toBe(false);
      expect(station.panels).toEqual([]);
      expect(station.createdAt).toBeDefined();
      expect(station.updatedAt).toBeDefined();
    });

    it('should create a station with location information', async () => {
      const location = {
        latitude: 40.7128,
        longitude: -74.0060,
        address: '123 Main St, New York, NY'
      };

      const station = await stationModel.createStation(
        testUserId,
        'Test Station with Location',
        '192.168.1.101',
        location
      );

      expect(station.location).toEqual(location);
    });
  });

  describe('findById', () => {
    it('should find a station by ID', async () => {
      const createdStation = await stationModel.createStation(
        testUserId,
        'Findable Station',
        '192.168.1.102'
      );

      const foundStation = await stationModel.findById(createdStation.id);

      expect(foundStation).not.toBeNull();
      expect(foundStation!.id).toBe(createdStation.id);
      expect(foundStation!.name).toBe('Findable Station');
    });

    it('should return null for non-existent station', async () => {
      const foundStation = await stationModel.findById('00000000-0000-0000-0000-000000000000');
      expect(foundStation).toBeNull();
    });
  });

  describe('findByOwnerId', () => {
    it('should find all stations for an owner', async () => {
      await stationModel.createStation(testUserId, 'Owner Station 1', '192.168.1.103');
      await stationModel.createStation(testUserId, 'Owner Station 2', '192.168.1.104');

      const stations = await stationModel.findByOwnerId(testUserId);

      expect(stations.length).toBeGreaterThanOrEqual(2);
      expect(stations.every(s => s.ownerId === testUserId)).toBe(true);
    });
  });

  describe('updateStationStatus', () => {
    it('should update station online status', async () => {
      const station = await stationModel.createStation(
        testUserId,
        'Status Test Station',
        '192.168.1.105'
      );

      await stationModel.updateStationStatus(station.id, true);

      const updatedStation = await stationModel.findById(station.id);
      expect(updatedStation!.isOnline).toBe(true);
      expect(updatedStation!.lastSync).toBeDefined();
    });
  });

  describe('integration with LED panels', () => {
    it('should include panels when fetching station', async () => {
      const station = await stationModel.createStation(
        testUserId,
        'Station with Panels',
        '192.168.1.106'
      );

      // Add some panels
      await panelModel.createPanel(station.id, 'Main Totem');
      await panelModel.createPanel(station.id, 'Pump 1');

      const stationWithPanels = await stationModel.findById(station.id);

      expect(stationWithPanels!.panels).toHaveLength(2);
      expect(stationWithPanels!.panels.map(p => p.name)).toContain('Main Totem');
      expect(stationWithPanels!.panels.map(p => p.name)).toContain('Pump 1');
    });
  });
});