import { io, Socket } from 'socket.io-client';
import { EventEmitter } from 'events';
import deviceDataHealthMonitor from './DeviceDataHealthMonitor';
import { Device } from '@/types/Device';

export interface LineData {
  V: number;
  I: number;
  S: number;
  P: number;
  PF: number;
  Q: number;
}

export interface EnergyData {
  _id: string;
  timestamp: string;
  L1: LineData;
  L2: LineData;
  L3: LineData;
  measure_cons: number;
  L1_frequency: number;
  producer: string;
  device: string;
  deviceName?: string;  // Add these optional fields
  ownerName?: string;   // to match the enriched data
}

class EnergyDataService extends EventEmitter {
  private socket: Socket | null = null;
  private data: EnergyData[] = [];
  private connected: boolean = false;
  private isInitialDataLoaded: boolean = false;
  private backgroundData: EnergyData[] = [];
  private isHistoricalMode = false;

  
  constructor() {
    super();
    this.connect();
  }

  public enterHistoricalMode(): void {
    this.isHistoricalMode = true;
  }

  /**
 * Switch back to live data mode
 * This allows live updates to be received again
 */
  public exitHistoricalMode(): void {
    this.isHistoricalMode = false;
    
    if (this.socket && this.socket.connected) {
      this.socket.emit('switch_to_live_data');
      
      // Merge any background updates that came in while in historical mode
      if (this.backgroundData.length > 0) {
        this.data = [...this.data, ...this.backgroundData]
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 1000);
        this.backgroundData = [];
        
        // Notify listeners of the merged data
        this.emit('data-update', this.data);
      }
    }
  }

  /**
 * Get background data that arrived while in historical mode
 */
  public getBackgroundData(): EnergyData[] {
    return this.backgroundData;
  }
  

  // Add this validation function after the interface definitions
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private isValidEnergyData(data: any): boolean {
    // Check if all required properties exist and have the expected structure
    return (
      data &&
      data._id &&
      data.timestamp &&
      data.L1 && typeof data.L1 === 'object' && 
      data.L1.P !== undefined && data.L1.V !== undefined && 
      data.L1.I !== undefined && data.L1.PF !== undefined &&
      data.L2 && typeof data.L2 === 'object' && 
      data.L2.P !== undefined && data.L2.V !== undefined && 
      data.L2.I !== undefined && data.L2.PF !== undefined &&
      data.L3 && typeof data.L3 === 'object' && 
      data.L3.P !== undefined && data.L3.V !== undefined && 
      data.L3.I !== undefined && data.L3.PF !== undefined &&
      data.L1_frequency !== undefined &&
      data.measure_cons !== undefined
    );
  }
  
  private connect() {
    this.socket = io(process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001');
    
    this.socket.on('connect', () => {
      this.connected = true;
      this.emit('connected');
      
      // Request initial data when connected
      if (!this.isInitialDataLoaded) {
        this.fetchInitialData();
      }
    });
    
    this.socket.on('connect_error', (err) => {
      this.connected = false;
      // Fix: Check if err and err.message exist before using them
      const errorMessage = err && err.message ? err.message : 'Connection error';
      this.emit('error', errorMessage);
    });
    
    // Add a listener for background updates
    this.socket.on('background_update', (newData: EnergyData[]) => {
      // Filter out invalid data points first
      const validData = newData.filter(item => this.isValidEnergyData(item));
      
      if (validData.length < newData.length) {
        console.log(`Filtered out ${newData.length - validData.length} invalid data points from background update`);
      }
      
      // Filter out duplicates before adding to our background data array
      const existingIds = new Set([
        ...this.data.map(item => item._id),
        ...this.backgroundData.map(item => item._id)
      ]);
      const uniqueNewData = validData.filter(item => !existingIds.has(item._id));
      
      if (uniqueNewData.length > 0) {
        this.backgroundData = [...this.backgroundData, ...uniqueNewData];
        this.emit('background-update', this.backgroundData);
        
        // Update device data health monitor
        const deviceCount = new Set(uniqueNewData.map(item => item.device)).size;
        deviceDataHealthMonitor.updateDataTimestamp(deviceCount, new Date().toISOString());
      }
    });
    
    // Update the db_update handler to handle historical mode
    this.socket.on('db_update', (newData: EnergyData[]) => {
      // Filter out invalid data points first
      const validData = newData.filter(item => this.isValidEnergyData(item));
      
      if (validData.length < newData.length) {
        console.log(`Filtered out ${newData.length - validData.length} invalid data points from update`);
      }
      
      if (this.isHistoricalMode) {
        // In historical mode, add to background data instead
        const existingIds = new Set([
          ...this.data.map(item => item._id),
          ...this.backgroundData.map(item => item._id)
        ]);
        const uniqueNewData = validData.filter(item => !existingIds.has(item._id));
        
        if (uniqueNewData.length > 0) {
          this.backgroundData = [...this.backgroundData, ...uniqueNewData];
          this.emit('background-update', this.backgroundData);
          
          // Update device data health monitor
          const deviceCount = new Set(uniqueNewData.map(item => item.device)).size;
          deviceDataHealthMonitor.updateDataTimestamp(deviceCount, new Date().toISOString());
        }
      } else {
        // Normal mode - update main data
        // Filter out duplicates before adding to our data array
        const existingIds = new Set(this.data.map(item => item._id));
        const uniqueNewData = validData.filter(item => !existingIds.has(item._id));
        
        if (uniqueNewData.length > 0) {
          // Merge, sort newest-first, and keep only latest 1000 (enough for 15+ minutes with 33 devices)
          this.data = [...this.data, ...uniqueNewData]
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, 1000);
          this.emit('data-update', this.data);
          
          // Update device data health monitor
          const deviceCount = new Set(uniqueNewData.map(item => item.device)).size;
          deviceDataHealthMonitor.updateDataTimestamp(deviceCount, new Date().toISOString());
        }
      }
    });
    
    // Modify the initial_data handler
    this.socket.on('initial_data', (initialData: EnergyData[]) => {
      // Filter out invalid data points
      const validData = initialData.filter(item => this.isValidEnergyData(item));
      
      if (validData.length < initialData.length) {
        console.log(`Filtered out ${initialData.length - validData.length} invalid data points from initial data`);
      }
      
      if (validData && validData.length > 0) {
        // Ensure newest-first and cap at 1000 (enough for 15+ minutes with 33 devices)
        this.data = [...validData]
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 1000);
        this.isInitialDataLoaded = true;
        this.emit('data-update', this.data);
        
        // Update device data health monitor
        const deviceCount = new Set(validData.map(item => item.device)).size;
        deviceDataHealthMonitor.updateDataTimestamp(deviceCount, new Date().toISOString());
      }
    });
  }

  /**
   * Fetch historical data for a specific device and date
   * @param deviceId The device ID to fetch data for
   * @param date The date in ISO format (YYYY-MM-DD)
   * @returns Promise with the historical data
   */
  /**
   * Fetch all available devices from the backend
   */
  public async fetchAllDevices(): Promise<Device[]> {
    try {
      // Use the correct token key that AuthService uses
      const token = typeof window !== 'undefined' ? localStorage.getItem('port_auth_token') : '';
      console.log('🔑 Fetching devices with token:', token ? 'Token present' : 'NO TOKEN');
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001'}/api/simulation/devices`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch devices: ${response.statusText}`);
      }
      
      const data = await response.json();
      if (data.status === 'success' && data.devices) {
        const devices = data.devices.map((device: any) => ({
          id: device.id, // Database device ID (hash) - THIS is what we query with
          name: device.name || device.friendlyName, // Display name from producer collection
          friendlyName: device.name || device.friendlyName,
          databaseId: device.id // Same as id - the database hash
        }));
        console.log('Fetched devices from backend:', devices.slice(0, 3));
        return devices;
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Error fetching all devices:', error);
      // Return fallback devices if API call fails - use IDs without "Device " prefix
      const fallbackDevices: Device[] = [];
      for (let i = 1; i <= 31; i++) {
        fallbackDevices.push({
          id: `D${i}`,
          name: `D${i}`, // Use actual ID as name
          friendlyName: `D${i}`,
          databaseId: `D${i}`
        });
      }
      fallbackDevices.push({ 
        id: 'F9', 
        name: 'F9',
        friendlyName: 'F9',
        databaseId: 'F9'
      });
      fallbackDevices.push({ 
        id: 'Entrada de energia', 
        name: 'Entrada de energia', 
        friendlyName: 'Entrada de energia',
        databaseId: 'Entrada de energia'
      });
      return fallbackDevices;
    }
  }

  public async fetchHistoricalData(deviceId: string, date: string, endDate?: string): Promise<EnergyData[]> {
    console.log('EnergyDataService: Starting fetchHistoricalData request', { deviceId, date, endDate });
    console.log('EnergyDataService: Device ID type:', typeof deviceId, 'length:', deviceId.length);
    
    if (!this.socket || !this.socket.connected) {
      console.error('EnergyDataService: Socket not connected');
      throw new Error('Socket not connected');
    }
    
    console.log('EnergyDataService: Socket is connected, proceeding with request');
    
    // Enter historical mode
    this.enterHistoricalMode();
    
    // Clear any existing background data
    this.backgroundData = [];
    
    return new Promise((resolve, reject) => {
      // Create a one-time listener for the response
      const responseHandler = (data: EnergyData[]) => {
        console.log('EnergyDataService: Received historical_data_response', data?.length || 0, 'records');
        this.socket?.off('historical_data_response', responseHandler);
        resolve(data);
      };
      
      // Listen for the response
      this.socket?.on('historical_data_response', responseHandler);
      
      // Set a timeout in case the server doesn't respond
      const timeout = setTimeout(() => {
        console.error('EnergyDataService: Timeout waiting for historical data response');
        this.socket?.off('historical_data_response', responseHandler);
        reject(new Error('Timeout waiting for historical data'));
      }, 100000); // 100 second timeout
      
      // Request the historical data
      console.log('EnergyDataService: Emitting fetch_historical_data event');
      this.socket?.emit('fetch_historical_data', { deviceId, date, endDate }, (acknowledgement: { success: boolean, error?: string }) => {
        console.log('EnergyDataService: Received acknowledgement', acknowledgement);
        clearTimeout(timeout);
        
        if (!acknowledgement.success) {
          console.error('EnergyDataService: Server reported error', acknowledgement.error);
          this.socket?.off('historical_data_response', responseHandler);
          reject(new Error(acknowledgement.error || 'Failed to fetch historical data'));
        }
      });
    });
  }
  
  private fetchInitialData() {
    if (this.socket && this.connected) {
      // Request data from today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      this.socket.emit('fetch_initial_data', { 
        startDate: today.toISOString() 
      });
    }
  }
  
  public isConnected() {
    return this.connected;
  }
  
  public getData() {
    return this.data;
  }
  
  public disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
  
  // Method to manually request initial data
  public requestInitialData() {
    this.fetchInitialData();
  }
}


// Singleton instance
export const energyDataService = new EnergyDataService();
