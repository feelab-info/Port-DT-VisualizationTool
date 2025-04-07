import { io, Socket } from 'socket.io-client';
import { EventEmitter } from 'events';

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
  
  constructor() {
    super();
    this.connect();
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
    
    // Modify the db_update handler
    this.socket.on('db_update', (newData: EnergyData[]) => {
      // Filter out invalid data points first
      const validData = newData.filter(item => this.isValidEnergyData(item));
      
      if (validData.length < newData.length) {
        console.log(`Filtered out ${newData.length - validData.length} invalid data points from update`);
      }
      
      // Filter out duplicates before adding to our data array
      const existingIds = new Set(this.data.map(item => item._id));
      const uniqueNewData = validData.filter(item => !existingIds.has(item._id));
      
      if (uniqueNewData.length > 0) {
        this.data = [...this.data, ...uniqueNewData].slice(-100); // Keep last 100 records
        this.emit('data-update', this.data);
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
        this.data = validData;
        this.isInitialDataLoaded = true;
        this.emit('data-update', this.data);
      }
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
