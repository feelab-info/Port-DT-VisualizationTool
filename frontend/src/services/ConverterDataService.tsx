import { io, Socket } from 'socket.io-client';
import { EventEmitter } from 'events';

export interface ConverterAggregation {
  period_start: string;
  period_end: string;
  sample_count: number;
  duration_seconds: number;
}

export interface ConverterStatus {
  SystemState: number;
  SystemSubState: number;
  SystemDcdcState: number;
  SystemMode: number;
  SystemConfiguration: number;
  itfc_critical_fault_word: number;
}

export interface ConverterFlags {
  CurrentRegulationFlag: number;
  VoltageRegulationFlag: number;
  ActivePowerRegulationFlag: number;
  ReactivePowerRegulationFlag: number;
  MaxBatteryChargingCurrentFlag: number;
  MaxBatteryDishargingCurrentFlag: number;
  SafeCFlag: number;
  PfcOnFlag: number;
  DcdcOnFlag: number;
  InputCurrentLimitationFlag: number;
  LoadImpedanceLimitationFlag: number;
  ThermalLimitationFlag: number;
  GridDetectionFlag: number;
  AggregatedPlusFalg: number;
}

export interface ConverterLimits {
  itfc_v_batt_max: number;
  itfc_i_batt_max: number;
  itfc_i_grid_max: number;
  itfc_P_max: number;
}

export interface ConverterAvailablePower {
  itfc_pos_active_available_power: number;
  itfc_neg_active_available_power: number;
  itfc_pos_ractive_available_power: number;
  itfc_neg_ractive_available_power: number;
}

export interface ConverterPhaseData {
  V: number;
  I: number;
  P: number;
  Q: number;
}

export interface ConverterGridData {
  V: number;
  I: number;
  P: number;
  Q: number;
}

export interface ConverterBatteryData {
  V: number;
  I: number;
  P: number;
  available_I: number;
}

export interface ConverterData {
  _id: string;
  timestamp: string;
  node: string;
  converterName?: string;
  aggregation: ConverterAggregation;
  status: ConverterStatus;
  flags: ConverterFlags;
  limits: ConverterLimits;
  available_power: ConverterAvailablePower;
  L1: ConverterPhaseData;
  L2: ConverterPhaseData;
  L3: ConverterPhaseData;
  grid: ConverterGridData;
  battery: ConverterBatteryData;
  producer: string;
  device: string;
}

class ConverterDataService extends EventEmitter {
  private socket: Socket | null = null;
  private data: ConverterData[] = [];
  private latestByNode: Map<string, ConverterData> = new Map();
  private connected: boolean = false;
  private isInitialDataLoaded: boolean = false;
  private lastUpdateTime: number = 0;
  private dataCheckInterval: NodeJS.Timeout | null = null;
  private readonly DATA_TIMEOUT_MS = 60000; // 60 seconds - if no data for this long, fetch latest

  constructor() {
    super();
    this.connect();
    this.startDataMonitoring();
    
    // Fetch data immediately on initialization (don't wait for timeout)
    setTimeout(() => {
      if (this.connected && !this.isInitialDataLoaded) {
        console.log('📡 Fetching initial data on startup...');
        this.fetchInitialData();
      }
    }, 1000); // Give socket 1 second to connect
  }

  private connect() {
    this.socket = io(process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001');
    
    this.socket.on('connect', () => {
      this.connected = true;
      this.emit('connected');
      
      // Always fetch initial data on connect to get latest values
      this.fetchInitialData();
    });
    
    this.socket.on('connect_error', (err) => {
      this.connected = false;
      const errorMessage = err && err.message ? err.message : 'Connection error';
      this.emit('error', errorMessage);
    });
    
    // Listen for initial converter data
    this.socket.on('initial_converter_data', (initialData: ConverterData[]) => {
      if (initialData && initialData.length > 0) {
        this.data = [...initialData].sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        
        // Update latest by node map
        initialData.forEach(item => {
          this.latestByNode.set(item.node, item);
        });
        
        this.isInitialDataLoaded = true;
        this.lastUpdateTime = Date.now();
        this.emit('data-update', this.data);
        this.emit('latest-update', Array.from(this.latestByNode.values()));
        
        console.log(`✅ Received initial converter data: ${initialData.length} converters`);
      } else {
        console.warn('⚠️ No initial converter data received');
      }
    });
    
    // Listen for real-time converter updates
    this.socket.on('converter_update', (newData: ConverterData[]) => {
      if (newData && newData.length > 0) {
        // Filter out duplicates
        const existingIds = new Set(this.data.map(item => item._id));
        const uniqueNewData = newData.filter(item => !existingIds.has(item._id));
        
        if (uniqueNewData.length > 0) {
          // Add to data array and sort
          this.data = [...this.data, ...uniqueNewData]
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, 5000); // Keep last 5000 records
          
          // Update latest by node map
          uniqueNewData.forEach(item => {
            const existing = this.latestByNode.get(item.node);
            if (!existing || new Date(item.timestamp) > new Date(existing.timestamp)) {
              this.latestByNode.set(item.node, item);
            }
          });
          
          this.lastUpdateTime = Date.now();
          this.emit('data-update', this.data);
          this.emit('latest-update', Array.from(this.latestByNode.values()));
          
          console.log(`📊 Received converter update: ${uniqueNewData.length} new readings`);
        }
      }
    });
    
    // Listen for historical converter data response
    this.socket.on('historical_converter_data_response', (data: ConverterData[]) => {
      this.emit('historical-data', data);
    });
  }

  /**
   * Start monitoring data freshness and auto-fetch if stale
   */
  private startDataMonitoring() {
    // Check every 30 seconds if data is fresh
    this.dataCheckInterval = setInterval(() => {
      const timeSinceLastUpdate = Date.now() - this.lastUpdateTime;
      
      // If no data for more than DATA_TIMEOUT_MS, fetch latest from DB
      if (this.connected && timeSinceLastUpdate > this.DATA_TIMEOUT_MS) {
        console.warn(`⚠️ No converter data received for ${Math.floor(timeSinceLastUpdate / 1000)}s, fetching latest from database...`);
        this.fetchInitialData();
      }
      
      // If no data at all and connected, try fetching
      if (this.connected && !this.isInitialDataLoaded) {
        console.log('🔄 No data loaded yet, attempting to fetch...');
        this.fetchInitialData();
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Fetch initial converter data (gets latest values from database)
   */
  private fetchInitialData() {
    if (this.socket && this.connected) {
      console.log('📡 Requesting latest converter data from database...');
      this.socket.emit('fetch_initial_converter_data', (acknowledgement: { success: boolean, error?: string }) => {
        if (!acknowledgement.success) {
          console.error('❌ Failed to fetch initial converter data:', acknowledgement.error);
        }
      });
    }
  }

  /**
   * Fetch historical converter data
   */
  public async fetchHistoricalData(
    node?: string,
    startDate?: string,
    endDate?: string
  ): Promise<ConverterData[]> {
    if (!this.socket || !this.socket.connected) {
      throw new Error('Socket not connected');
    }
    
    return new Promise((resolve, reject) => {
      const responseHandler = (data: ConverterData[]) => {
        this.socket?.off('historical_converter_data_response', responseHandler);
        resolve(data);
      };
      
      this.socket?.on('historical_converter_data_response', responseHandler);
      
      const timeout = setTimeout(() => {
        this.socket?.off('historical_converter_data_response', responseHandler);
        reject(new Error('Timeout waiting for historical converter data'));
      }, 60000); // 60 second timeout
      
      this.socket?.emit('fetch_historical_converter_data', { node, startDate, endDate }, (acknowledgement: { success: boolean, error?: string }) => {
        clearTimeout(timeout);
        
        if (!acknowledgement.success) {
          this.socket?.off('historical_converter_data_response', responseHandler);
          reject(new Error(acknowledgement.error || 'Failed to fetch historical converter data'));
        }
      });
    });
  }

  /**
   * Get list of converter nodes with friendly names
   */
  public async getConverterNodes(): Promise<Array<{ node: string; name: string }>> {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('port_auth_token') : '';
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001'}/api/converters/nodes`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch converter nodes: ${response.statusText}`);
      }
      
      const data = await response.json();
      if (data.status === 'success' && data.nodes) {
        return data.nodes;
      }
      
      // Fallback
      return [
        { node: 'N01', name: 'ConverterBAT' },
        { node: 'N02', name: 'ConverterPV' },
        { node: 'N03', name: 'ConverterEV1' },
        { node: 'N04', name: 'ConverterEV2' },
        { node: 'N05', name: 'ConverterACDC' }
      ];
    } catch (error) {
      console.error('Error fetching converter nodes:', error);
      // Fallback
      return [
        { node: 'N01', name: 'ConverterBAT' },
        { node: 'N02', name: 'ConverterPV' },
        { node: 'N03', name: 'ConverterEV1' },
        { node: 'N04', name: 'ConverterEV2' },
        { node: 'N05', name: 'ConverterACDC' }
      ];
    }
  }

  /**
   * Check if service is connected
   */
  public isConnected(): boolean {
    return this.connected;
  }

  /**
   * Get all converter data
   */
  public getData(): ConverterData[] {
    return this.data;
  }

  /**
   * Get latest data for each node
   */
  public getLatestByNode(): ConverterData[] {
    return Array.from(this.latestByNode.values());
  }

  /**
   * Get time since last data update (in milliseconds)
   */
  public getTimeSinceLastUpdate(): number {
    return Date.now() - this.lastUpdateTime;
  }

  /**
   * Check if data is stale (no updates for more than timeout period)
   */
  public isDataStale(): boolean {
    return this.getTimeSinceLastUpdate() > this.DATA_TIMEOUT_MS;
  }

  /**
   * Disconnect from socket
   */
  public disconnect(): void {
    if (this.dataCheckInterval) {
      clearInterval(this.dataCheckInterval);
      this.dataCheckInterval = null;
    }
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  /**
   * Manually request initial data
   */
  public requestInitialData(): void {
    this.fetchInitialData();
  }
}

// Singleton instance
export const converterDataService = new ConverterDataService();
