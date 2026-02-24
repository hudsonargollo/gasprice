import { apiClient } from './apiClient';
import { Station, FuelPrices, PriceUpdateResponse, ValidationResponse } from '../types';

class StationService {
  /**
   * Get all stations for the authenticated user
   */
  async getStations(): Promise<Station[]> {
    try {
      const response = await apiClient.get<Station[]>('/stations');
      return response;
    } catch (error) {
      console.error('Error fetching stations:', error);
      throw error;
    }
  }

  /**
   * Get detailed information for a specific station
   */
  async getStationDetails(stationId: string): Promise<Station> {
    try {
      const response = await apiClient.get<Station>(`/stations/${stationId}`);
      return response;
    } catch (error) {
      console.error('Error fetching station details:', error);
      throw error;
    }
  }

  /**
   * Update prices for a station
   */
  async updatePrices(stationId: string, prices: FuelPrices): Promise<PriceUpdateResponse> {
    try {
      const response = await apiClient.post<PriceUpdateResponse>('/prices/update', {
        stationId,
        prices,
      });
      return response;
    } catch (error) {
      console.error('Error updating prices:', error);
      throw error;
    }
  }

  /**
   * Validate price data without updating
   */
  async validatePrices(prices: FuelPrices): Promise<ValidationResponse> {
    try {
      const response = await apiClient.post<ValidationResponse>('/prices/validate', {
        prices,
      });
      return response;
    } catch (error) {
      console.error('Error validating prices:', error);
      throw error;
    }
  }

  /**
   * Create a new station (admin only)
   */
  async createStation(stationData: {
    ownerId: string;
    name: string;
    vpnIpAddress: string;
    location?: {
      latitude: number;
      longitude: number;
      address: string;
    };
  }): Promise<Station> {
    try {
      const response = await apiClient.post<Station>('/stations', stationData);
      return response;
    } catch (error) {
      console.error('Error creating station:', error);
      throw error;
    }
  }

  /**
   * Update station information
   */
  async updateStation(
    stationId: string,
    updates: {
      name?: string;
      vpnIpAddress?: string;
      location?: {
        latitude: number;
        longitude: number;
        address: string;
      };
    }
  ): Promise<Station> {
    try {
      const response = await apiClient.put<Station>(`/stations/${stationId}`, updates);
      return response;
    } catch (error) {
      console.error('Error updating station:', error);
      throw error;
    }
  }

  /**
   * Delete a station (admin only)
   */
  async deleteStation(stationId: string): Promise<void> {
    try {
      await apiClient.delete(`/stations/${stationId}`);
    } catch (error) {
      console.error('Error deleting station:', error);
      throw error;
    }
  }

  /**
   * Test connection to a station
   */
  async testStationConnection(stationId: string): Promise<{
    success: boolean;
    responseTime?: number;
    error?: string;
  }> {
    try {
      const response = await apiClient.post<{
        success: boolean;
        responseTime?: number;
        error?: string;
      }>(`/stations/${stationId}/test-connection`);
      return response;
    } catch (error) {
      console.error('Error testing station connection:', error);
      throw error;
    }
  }

  /**
   * Get station status history
   */
  async getStationStatusHistory(
    stationId: string,
    hours: number = 24
  ): Promise<Array<{
    timestamp: string;
    isOnline: boolean;
    responseTime?: number;
  }>> {
    try {
      const response = await apiClient.get<Array<{
        timestamp: string;
        isOnline: boolean;
        responseTime?: number;
      }>>(`/stations/${stationId}/status-history?hours=${hours}`);
      return response;
    } catch (error) {
      console.error('Error fetching station status history:', error);
      throw error;
    }
  }
}

// Create and export singleton instance
export const stationService = new StationService();