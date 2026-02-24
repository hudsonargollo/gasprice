import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { StationState, Station, FuelPrices, PriceUpdateResponse } from '../types';
import { stationService } from '../../services/stationService';

// Initial state
const initialState: StationState = {
  stations: [],
  selectedStation: null,
  loading: false,
  error: null,
  lastUpdated: null,
};

// Async thunks
export const fetchStations = createAsyncThunk(
  'stations/fetchStations',
  async (_, { rejectWithValue }) => {
    try {
      const stations = await stationService.getStations();
      return stations;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch stations');
    }
  }
);

export const fetchStationDetails = createAsyncThunk(
  'stations/fetchStationDetails',
  async (stationId: string, { rejectWithValue }) => {
    try {
      const station = await stationService.getStationDetails(stationId);
      return station;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch station details');
    }
  }
);

export const updateStationPrices = createAsyncThunk(
  'stations/updatePrices',
  async (
    { stationId, prices }: { stationId: string; prices: FuelPrices },
    { rejectWithValue }
  ) => {
    try {
      const response = await stationService.updatePrices(stationId, prices);
      return { stationId, prices, response };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update prices');
    }
  }
);

// Station slice
const stationSlice = createSlice({
  name: 'stations',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setSelectedStation: (state, action: PayloadAction<Station | null>) => {
      state.selectedStation = action.payload;
    },
    updateStationStatus: (
      state,
      action: PayloadAction<{ stationId: string; isOnline: boolean; lastSync?: string }>
    ) => {
      const { stationId, isOnline, lastSync } = action.payload;
      const station = state.stations.find(s => s.id === stationId);
      if (station) {
        station.isOnline = isOnline;
        if (lastSync) {
          station.lastSync = lastSync;
        }
      }
      if (state.selectedStation?.id === stationId) {
        state.selectedStation.isOnline = isOnline;
        if (lastSync) {
          state.selectedStation.lastSync = lastSync;
        }
      }
    },
    updateStationPricesLocal: (
      state,
      action: PayloadAction<{ stationId: string; prices: FuelPrices }>
    ) => {
      const { stationId, prices } = action.payload;
      const station = state.stations.find(s => s.id === stationId);
      if (station) {
        station.panels.forEach(panel => {
          panel.currentPrices = { ...prices };
          panel.lastUpdate = new Date().toISOString();
        });
      }
      if (state.selectedStation?.id === stationId) {
        state.selectedStation.panels.forEach(panel => {
          panel.currentPrices = { ...prices };
          panel.lastUpdate = new Date().toISOString();
        });
      }
    },
  },
  extraReducers: (builder) => {
    // Fetch stations
    builder
      .addCase(fetchStations.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchStations.fulfilled, (state, action: PayloadAction<Station[]>) => {
        state.loading = false;
        state.stations = action.payload;
        state.lastUpdated = new Date().toISOString();
        state.error = null;
      })
      .addCase(fetchStations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch station details
    builder
      .addCase(fetchStationDetails.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchStationDetails.fulfilled, (state, action: PayloadAction<Station>) => {
        state.loading = false;
        state.selectedStation = action.payload;
        
        // Update the station in the stations array as well
        const index = state.stations.findIndex(s => s.id === action.payload.id);
        if (index !== -1) {
          state.stations[index] = action.payload;
        }
        
        state.error = null;
      })
      .addCase(fetchStationDetails.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Update station prices
    builder
      .addCase(updateStationPrices.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        updateStationPrices.fulfilled,
        (state, action: PayloadAction<{ stationId: string; prices: FuelPrices; response: PriceUpdateResponse }>) => {
          state.loading = false;
          
          if (action.payload.response.success) {
            // Update prices locally
            const { stationId, prices } = action.payload;
            const station = state.stations.find(s => s.id === stationId);
            if (station) {
              station.panels.forEach(panel => {
                panel.currentPrices = { ...prices };
                panel.lastUpdate = new Date().toISOString();
              });
            }
            if (state.selectedStation?.id === stationId) {
              state.selectedStation.panels.forEach(panel => {
                panel.currentPrices = { ...prices };
                panel.lastUpdate = new Date().toISOString();
              });
            }
          }
          
          state.error = null;
        }
      )
      .addCase(updateStationPrices.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  clearError,
  setSelectedStation,
  updateStationStatus,
  updateStationPricesLocal,
} = stationSlice.actions;

export default stationSlice.reducer;