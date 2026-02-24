// Mock database for testing when PostgreSQL is not available
import { Pool } from 'pg';

interface MockQueryResult {
  rows: any[];
  rowCount: number;
}

interface MockClient {
  query: (text: string, params?: any[]) => Promise<MockQueryResult>;
  release: () => void;
}

class MockPool {
  private data: Map<string, any[]> = new Map();
  private sequences: Map<string, number> = new Map();

  constructor() {
    this.resetData();
  }

  resetData(): void {
    // Initialize empty tables
    this.data.set('users', []);
    this.data.set('stations', []);
    this.data.set('led_panels', []);
    this.data.set('price_update_logs', []);
  }

  async connect(): Promise<MockClient> {
    return {
      query: async (text: string, params: any[] = []): Promise<MockQueryResult> => {
        return this.executeQuery(text, params);
      },
      release: () => {
        // Mock release - no-op
      }
    };
  }

  async end(): Promise<void> {
    // Mock end - no-op
  }

  private executeQuery(text: string, params: any[] = []): MockQueryResult {
    const normalizedQuery = text.trim().toLowerCase();

    // Handle SELECT NOW() for connection testing
    if (normalizedQuery.includes('select now()')) {
      return { rows: [{ now: new Date() }], rowCount: 1 };
    }

    // Handle CREATE TABLE statements
    if (normalizedQuery.startsWith('create table') || normalizedQuery.startsWith('create index') || 
        normalizedQuery.startsWith('create or replace function') || normalizedQuery.startsWith('create trigger') ||
        normalizedQuery.startsWith('drop trigger')) {
      return { rows: [], rowCount: 0 };
    }

    // Handle INSERT statements
    if (normalizedQuery.startsWith('insert into')) {
      return this.handleInsert(text, params);
    }

    // Handle SELECT statements
    if (normalizedQuery.startsWith('select')) {
      return this.handleSelect(text, params);
    }

    // Handle UPDATE statements
    if (normalizedQuery.startsWith('update')) {
      return this.handleUpdate(text, params);
    }

    // Handle DELETE statements
    if (normalizedQuery.startsWith('delete')) {
      return this.handleDelete(text, params);
    }

    // Default empty result
    return { rows: [], rowCount: 0 };
  }

  private handleInsert(text: string, params: any[]): MockQueryResult {
    const id = this.generateId();
    const now = new Date();

    if (text.includes('users')) {
      const user = {
        id,
        username: params[0],
        password_hash: params[1],
        role: params[2],
        created_at: now,
        last_login: null,
        updated_at: now
      };
      this.data.get('users')!.push(user);
      return { rows: [user], rowCount: 1 };
    }

    if (text.includes('stations')) {
      const station = {
        id,
        owner_id: params[0],
        name: params[1],
        vpn_ip_address: params[2],
        is_online: false,
        last_sync: null,
        latitude: params[3],
        longitude: params[4],
        address: params[5],
        created_at: now,
        updated_at: now
      };
      this.data.get('stations')!.push(station);
      return { rows: [station], rowCount: 1 };
    }

    if (text.includes('led_panels')) {
      const panel = {
        id,
        station_id: params[0],
        name: params[1],
        regular_price: params[2],
        premium_price: params[3],
        diesel_price: params[4],
        last_update: null,
        created_at: now,
        updated_at: now
      };
      this.data.get('led_panels')!.push(panel);
      return { rows: [panel], rowCount: 1 };
    }

    return { rows: [], rowCount: 0 };
  }

  private handleSelect(text: string, params: any[]): MockQueryResult {
    if (text.includes('users')) {
      const users = this.data.get('users')!;
      
      if (text.includes('where username = $1')) {
        const user = users.find(u => u.username === params[0]);
        return { rows: user ? [user] : [], rowCount: user ? 1 : 0 };
      }
      
      if (text.includes('where id = $1')) {
        const user = users.find(u => u.id === params[0]);
        return { rows: user ? [user] : [], rowCount: user ? 1 : 0 };
      }

      return { rows: users, rowCount: users.length };
    }

    if (text.includes('stations')) {
      const stations = this.data.get('stations')!;
      
      if (text.includes('where id = $1')) {
        const station = stations.find(s => s.id === params[0]);
        return { rows: station ? [station] : [], rowCount: station ? 1 : 0 };
      }
      
      if (text.includes('where owner_id = $1')) {
        const ownerStations = stations.filter(s => s.owner_id === params[0]);
        return { rows: ownerStations, rowCount: ownerStations.length };
      }

      return { rows: stations, rowCount: stations.length };
    }

    if (text.includes('led_panels')) {
      const panels = this.data.get('led_panels')!;
      
      if (text.includes('where id = $1')) {
        const panel = panels.find(p => p.id === params[0]);
        return { rows: panel ? [panel] : [], rowCount: panel ? 1 : 0 };
      }
      
      if (text.includes('where station_id = $1')) {
        const stationPanels = panels.filter(p => p.station_id === params[0]);
        return { rows: stationPanels, rowCount: stationPanels.length };
      }

      return { rows: panels, rowCount: panels.length };
    }

    return { rows: [], rowCount: 0 };
  }

  private handleUpdate(text: string, params: any[]): MockQueryResult {
    const normalizedText = text.toLowerCase().replace(/\s+/g, ' ').trim();
    
    if (normalizedText.includes('users')) {
      const users = this.data.get('users')!;
      const userId = params[params.length - 1];
      const userIndex = users.findIndex(u => u.id === userId);
      
      if (userIndex >= 0) {
        if (normalizedText.includes('last_login')) {
          users[userIndex].last_login = new Date();
        }
        return { rows: [users[userIndex]], rowCount: 1 };
      }
    }

    if (normalizedText.includes('stations')) {
      const stations = this.data.get('stations')!;
      
      if (normalizedText.includes('where id = $3')) {
        const stationId = params[2];
        const stationIndex = stations.findIndex(s => s.id === stationId);
        
        if (stationIndex >= 0) {
          stations[stationIndex].is_online = params[0];
          stations[stationIndex].last_sync = params[1];
          stations[stationIndex].updated_at = new Date();
          return { rows: [stations[stationIndex]], rowCount: 1 };
        }
      }
    }

    if (normalizedText.includes('led_panels')) {
      const panels = this.data.get('led_panels')!;
      
      // Handle single panel update: WHERE id = $4
      if (normalizedText.includes('where id = $4')) {
        const panelId = params[3]; // 4th parameter (0-indexed = 3)
        const panelIndex = panels.findIndex(p => p.id === panelId);
        
        if (panelIndex >= 0) {
          panels[panelIndex].regular_price = params[0];
          panels[panelIndex].premium_price = params[1];
          panels[panelIndex].diesel_price = params[2];
          panels[panelIndex].last_update = new Date();
          panels[panelIndex].updated_at = new Date();
          return { rows: [panels[panelIndex]], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
      }
      
      // Handle station-wide update: WHERE station_id = $4
      if (normalizedText.includes('where station_id = $4')) {
        const stationId = params[3]; // 4th parameter (0-indexed = 3)
        const stationPanels = panels.filter(p => p.station_id === stationId);
        
        stationPanels.forEach(panel => {
          const panelIndex = panels.findIndex(p => p.id === panel.id);
          if (panelIndex >= 0) {
            panels[panelIndex].regular_price = params[0];
            panels[panelIndex].premium_price = params[1];
            panels[panelIndex].diesel_price = params[2];
            panels[panelIndex].last_update = new Date();
            panels[panelIndex].updated_at = new Date();
          }
        });
        
        // Return the updated panels with fresh data
        const updatedPanels = panels.filter(p => p.station_id === stationId);
        return { rows: updatedPanels, rowCount: updatedPanels.length };
      }
    }

    return { rows: [], rowCount: 0 };
  }

  private handleDelete(text: string, params: any[]): MockQueryResult {
    if (text.includes('users')) {
      const users = this.data.get('users')!;
      const userId = params[0];
      const initialLength = users.length;
      const filteredUsers = users.filter(u => u.id !== userId);
      this.data.set('users', filteredUsers);
      return { rows: [], rowCount: initialLength - filteredUsers.length };
    }

    if (text.includes('stations')) {
      const stations = this.data.get('stations')!;
      const stationId = params[0];
      const initialLength = stations.length;
      const filteredStations = stations.filter(s => s.id !== stationId);
      this.data.set('stations', filteredStations);
      return { rows: [], rowCount: initialLength - filteredStations.length };
    }

    if (text.includes('led_panels')) {
      const panels = this.data.get('led_panels')!;
      
      if (text.includes('where id = $1')) {
        const panelId = params[0];
        const initialLength = panels.length;
        const filteredPanels = panels.filter(p => p.id !== panelId);
        this.data.set('led_panels', filteredPanels);
        return { rows: [], rowCount: initialLength - filteredPanels.length };
      }
      
      if (text.includes('where station_id = $1')) {
        const stationId = params[0];
        const initialLength = panels.length;
        const deletedPanels = panels.filter(p => p.station_id === stationId);
        const filteredPanels = panels.filter(p => p.station_id !== stationId);
        this.data.set('led_panels', filteredPanels);
        return { rows: [], rowCount: deletedPanels.length };
      }
    }

    return { rows: [], rowCount: 0 };
  }

  private generateId(): string {
    return `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

let mockPool: MockPool | null = null;

export function createMockPool(): Pool {
  mockPool = new MockPool();
  return mockPool as any;
}

export function getMockPool(): MockPool | null {
  return mockPool;
}

export function resetMockDatabase(): void {
  if (mockPool) {
    mockPool.resetData();
  }
}