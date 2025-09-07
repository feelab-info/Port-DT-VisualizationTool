import { io, Socket } from 'socket.io-client';
import { EventEmitter } from 'events';

export interface SimulationResult {
  timestamp: string;
  bus_id?: number;
  voltage?: number;
  power?: number;
  load?: number;
  converter_1_power?: number;
  converter_1_loading?: number;
  converter_2_power?: number;
  converter_2_loading?: number;
  converter_3_power?: number;
  converter_3_loading?: number;
  [key: string]: string | number | boolean | undefined;
}

export interface SimulationData {
  results: SimulationResult[];
  lastUpdated: string;
  simulationStatus: 'running' | 'completed' | 'error';
}

class SimulationWebSocketService extends EventEmitter {
  private socket: Socket | null = null;
  private connected: boolean = false;
  private simulationData: SimulationResult[] = [];
  private lastUpdate: string = '';
  private simulationStatus: 'running' | 'completed' | 'error' = 'completed';

  constructor() {
    super();
    this.connect();
  }

  private connect(): void {
    this.socket = io(process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001');

    this.socket.on('connect', () => {
      this.connected = true;
      console.log('Simulation WebSocket connected');
      this.emit('connected');
    });

    this.socket.on('connect_error', (err) => {
      this.connected = false;
      console.error('Simulation WebSocket connection error:', err.message);
      this.emit('error', err.message);
    });

    this.socket.on('disconnect', () => {
      this.connected = false;
      console.log('Simulation WebSocket disconnected');
      this.emit('disconnected');
    });

    // Listen for simulation updates
    this.socket.on('simulation_update', (data: SimulationData) => {
      console.log('Received simulation update:', data.results.length, 'results');

      this.simulationData = data.results;
      this.lastUpdate = data.lastUpdated;
      this.simulationStatus = data.simulationStatus;

      // Emit update event
      this.emit('simulation-update', {
        data: this.simulationData,
        lastUpdate: this.lastUpdate,
        status: this.simulationStatus
      });
    });
  }

  /**
   * Get the latest simulation data
   */
  public getSimulationData(): SimulationResult[] {
    return this.simulationData;
  }

  /**
   * Get the last update timestamp
   */
  public getLastUpdate(): string {
    return this.lastUpdate;
  }

  /**
   * Get the simulation status
   */
  public getSimulationStatus(): 'running' | 'completed' | 'error' {
    return this.simulationStatus;
  }

  /**
   * Check if websocket is connected
   */
  public isConnected(): boolean {
    return this.connected;
  }

  /**
   * Toggle simulation updates for this client
   */
  public toggleSimulationUpdates(paused: boolean): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('toggle_simulation_updates', paused);
      console.log(`Simulation updates ${paused ? 'paused' : 'resumed'}`);
    }
  }

  /**
   * Disconnect the websocket
   */
  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  /**
   * Reconnect the websocket
   */
  public reconnect(): void {
    if (this.socket) {
      this.socket.connect();
    }
  }
}

// Singleton instance
export const simulationWebSocketService = new SimulationWebSocketService();
