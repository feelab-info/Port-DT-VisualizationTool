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
}

class EnergyDataService extends EventEmitter {
  private socket: Socket | null = null;
  private data: EnergyData[] = [];
  private connected: boolean = false;
  
  constructor() {
    super();
    this.connect();
  }
  
  private connect() {
    this.socket = io(process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001');
    
    this.socket.on('connect', () => {
      this.connected = true;
      this.emit('connected');
    });
    
    this.socket.on('connect_error', (err) => {
      this.connected = false;
      this.emit('error', err.message);
    });
    
    this.socket.on('db_update', (newData: EnergyData[]) => {
      this.data = [...this.data, ...newData].slice(-33); // Keep last 33 records
      this.emit('data-update', this.data);
    });
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
}

// Singleton instance
export const energyDataService = new EnergyDataService();
