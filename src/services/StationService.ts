import { StationModel } from '../models/Station';
import { LEDPanelModel } from '../models/LEDPanel';
import { Station, LEDPanel, FuelPrices, UserSession } from '../types';
import { logger } from '../utils/logger';

export class StationService {
  private stationModel: StationModel;
  private panelModel: LEDPanelModel;

  constructor() {
    this.stationModel = new StationModel();
    this.panelModel = new LEDPanelModel();
  }

  /**
   * Get stations filtered by user role and ownership
   * Admin users see all stations, Owner users see only their stations
   */
  async getStationsByUser(userSession: UserSession): Promise<Station[]> {
    try {
      if (userSession.role === 'admin') {
        logger.debug(`Admin ${userSession.username} requesting all stations`);
        return await this.stationModel.getAllStations();
      } else {
        logger.debug(`Owner ${userSession.username} requesting owned stations`);
        return await this.stationModel.findByOwnerId(userSession.userId);
      }
    } catch (error) {
      logger.error('Error getting stations by user:', error);
      throw error;
    }
  }

  /**
   * Get station by ID without authorization check (internal use only)
   * This method should only be used by internal services that have already
   * validated user permissions at a higher level
   */
  async getStationByIdInternal(stationId: string): Promise<Station | null> {
    try {
      return await this.stationModel.findById(stationId);
    } catch (error) {
      logger.error('Error getting station by ID (internal):', error);
      throw error;
    }
  }

  /**
   * Get station details with authorization check
   * Admin users can access any station, Owner users can only access their stations
   */
  async getStationById(stationId: string, userSession: UserSession): Promise<Station | null> {
    try {
      const station = await this.stationModel.findById(stationId);
      
      if (!station) {
        return null;
      }

      // Admin can access any station
      if (userSession.role === 'admin') {
        logger.debug(`Admin ${userSession.username} accessing station ${stationId}`);
        return station;
      }

      // Owner can only access their own stations
      if (station.ownerId === userSession.userId) {
        logger.debug(`Owner ${userSession.username} accessing owned station ${stationId}`);
        return station;
      }

      // Access denied - return null to indicate not found/unauthorized
      logger.warn(`Access denied: User ${userSession.username} attempted to access station ${stationId} owned by ${station.ownerId}`);
      return null;
    } catch (error) {
      logger.error('Error getting station by ID:', error);
      throw error;
    }
  }

  /**
   * Create a new station (admin only)
   */
  async createStation(
    ownerId: string,
    name: string,
    vpnIpAddress: string,
    location?: { latitude: number; longitude: number; address: string },
    userSession?: UserSession
  ): Promise<Station> {
    try {
      if (userSession && userSession.role !== 'admin') {
        throw new Error('Only administrators can create stations');
      }

      const station = await this.stationModel.createStation(ownerId, name, vpnIpAddress, location);
      logger.info(`Station created: ${name} by ${userSession?.username || 'system'}`);
      return station;
    } catch (error) {
      logger.error('Error creating station:', error);
      throw error;
    }
  }

  /**
   * Update station with authorization check
   */
  async updateStation(
    stationId: string,
    updates: Partial<Pick<Station, 'name' | 'vpnIpAddress' | 'location'>>,
    userSession: UserSession
  ): Promise<Station | null> {
    try {
      // First check if user can access this station
      const existingStation = await this.getStationById(stationId, userSession);
      if (!existingStation) {
        return null;
      }

      const updatedStation = await this.stationModel.updateStation(stationId, updates);
      logger.info(`Station updated: ${stationId} by ${userSession.username}`);
      return updatedStation;
    } catch (error) {
      logger.error('Error updating station:', error);
      throw error;
    }
  }

  /**
   * Delete station (admin only)
   */
  async deleteStation(stationId: string, userSession: UserSession): Promise<boolean> {
    try {
      if (userSession.role !== 'admin') {
        throw new Error('Only administrators can delete stations');
      }

      const success = await this.stationModel.deleteStation(stationId);
      if (success) {
        logger.info(`Station deleted: ${stationId} by ${userSession.username}`);
      }
      return success;
    } catch (error) {
      logger.error('Error deleting station:', error);
      throw error;
    }
  }

  /**
   * Update station online status (internal use)
   */
  async updateStationStatus(stationId: string, isOnline: boolean, lastSync?: Date): Promise<void> {
    try {
      await this.stationModel.updateStationStatus(stationId, isOnline, lastSync);
      logger.debug(`Station status updated: ${stationId} - Online: ${isOnline}`);
    } catch (error) {
      logger.error('Error updating station status:', error);
      throw error;
    }
  }

  /**
   * Get LED panels for a station with authorization check
   */
  async getStationPanels(stationId: string, userSession: UserSession): Promise<LEDPanel[]> {
    try {
      // First check if user can access this station
      const station = await this.getStationById(stationId, userSession);
      if (!station) {
        throw new Error('Station not found or access denied');
      }

      return await this.panelModel.findByStationId(stationId);
    } catch (error) {
      logger.error('Error getting station panels:', error);
      throw error;
    }
  }

  /**
   * Create LED panel for a station with authorization check
   */
  async createPanel(
    stationId: string,
    name: string,
    initialPrices: FuelPrices | undefined,
    userSession: UserSession
  ): Promise<LEDPanel> {
    try {
      // Check if user can access this station
      const station = await this.getStationById(stationId, userSession);
      if (!station) {
        throw new Error('Station not found or access denied');
      }

      const panel = await this.panelModel.createPanel(stationId, name, initialPrices);
      logger.info(`LED Panel created: ${name} for station ${stationId} by ${userSession.username}`);
      return panel;
    } catch (error) {
      logger.error('Error creating LED panel:', error);
      throw error;
    }
  }

  /**
   * Update panel prices with authorization check
   */
  async updatePanelPrices(
    panelId: string,
    newPrices: FuelPrices,
    userSession: UserSession
  ): Promise<LEDPanel | null> {
    try {
      // Get panel to check station ownership
      const panel = await this.panelModel.findById(panelId);
      if (!panel) {
        return null;
      }

      // Check if user can access the station this panel belongs to
      const station = await this.getStationById(panel.stationId, userSession);
      if (!station) {
        throw new Error('Access denied: Cannot update panel for this station');
      }

      const updatedPanel = await this.panelModel.updatePrices(panelId, newPrices);
      logger.info(`Panel prices updated: ${panelId} by ${userSession.username}`);
      return updatedPanel;
    } catch (error) {
      logger.error('Error updating panel prices:', error);
      throw error;
    }
  }

  /**
   * Update all panels for a station with authorization check
   */
  async updateAllStationPanelPrices(
    stationId: string,
    newPrices: FuelPrices,
    userSession: UserSession
  ): Promise<LEDPanel[]> {
    try {
      // Check if user can access this station
      const station = await this.getStationById(stationId, userSession);
      if (!station) {
        throw new Error('Station not found or access denied');
      }

      const updatedPanels = await this.panelModel.updatePanelsByStationId(stationId, newPrices);
      logger.info(`All panels updated for station ${stationId} by ${userSession.username}`);
      return updatedPanels;
    } catch (error) {
      logger.error('Error updating all station panel prices:', error);
      throw error;
    }
  }

  /**
   * Validate if user has access to a station
   */
  async validateStationAccess(stationId: string, userSession: UserSession): Promise<boolean> {
    try {
      const station = await this.getStationById(stationId, userSession);
      return station !== null;
    } catch (error) {
      logger.error('Error validating station access:', error);
      return false;
    }
  }
}