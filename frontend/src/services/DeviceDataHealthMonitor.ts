import { EventEmitter } from 'events';

export interface DeviceDataHealthStatus {
  isHealthy: boolean;
  lastDataTimestamp: number | null;
  timeSinceLastData: number | null;
  expectedDataInterval: number;
  consecutiveFailures: number;
  errorMessage: string | null;
  deviceCount: number;
  lastDeviceUpdate: string | null;
}

export interface DeviceHealthCheckConfig {
  expectedDataInterval: number; // milliseconds (30 seconds for device data)
  maxConsecutiveFailures: number;
  healthCheckInterval: number; // milliseconds
}

class DeviceDataHealthMonitor extends EventEmitter {
  private config: DeviceHealthCheckConfig;
  private lastDataTimestamp: number | null = null;
  private consecutiveFailures: number = 0;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private isMonitoring: boolean = false;
  private lastDeviceCount: number = 0;
  private lastDeviceUpdate: string | null = null;

  constructor(config: DeviceHealthCheckConfig = {
    expectedDataInterval: 90000, // 45 seconds (slightly more than the 30s polling interval)
    maxConsecutiveFailures: 2,
    healthCheckInterval: 30000 // 15 seconds
  }) {
    super();
    this.config = config;
  }

  /**
   * Start monitoring device data health
   */
  public startMonitoring(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckInterval);
    
    console.log('Device data health monitoring started');
  }

  /**
   * Stop monitoring device data health
   */
  public stopMonitoring(): void {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    
    console.log('Device data health monitoring stopped');
  }

  /**
   * Update the last data timestamp when new device data is received
   */
  public updateDataTimestamp(deviceCount?: number, deviceUpdate?: string): void {
    this.lastDataTimestamp = Date.now();
    this.consecutiveFailures = 0;
    
    if (deviceCount !== undefined) {
      this.lastDeviceCount = deviceCount;
    }
    
    if (deviceUpdate) {
      this.lastDeviceUpdate = deviceUpdate;
    }
    
    this.emit('device-data-received', {
      timestamp: this.lastDataTimestamp,
      deviceCount: this.lastDeviceCount,
      deviceUpdate: this.lastDeviceUpdate
    });
  }

  /**
   * Perform a health check by analyzing data flow patterns
   */
  private async performHealthCheck(): Promise<void> {
    try {
      // Check if we haven't received data for too long
      if (this.lastDataTimestamp) {
        const timeSinceLastData = Date.now() - this.lastDataTimestamp;
        
        if (timeSinceLastData > this.config.expectedDataInterval) {
          this.consecutiveFailures++;
          const errorMessage = `No device data received for ${Math.round(timeSinceLastData / 1000)} seconds. Expected data every ${this.config.expectedDataInterval / 1000} seconds.`;
          
          this.emit('device-health-degraded', {
            isHealthy: false,
            lastDataTimestamp: this.lastDataTimestamp,
            timeSinceLastData,
            expectedDataInterval: this.config.expectedDataInterval,
            consecutiveFailures: this.consecutiveFailures,
            errorMessage,
            deviceCount: this.lastDeviceCount,
            lastDeviceUpdate: this.lastDeviceUpdate
          });
        } else {
          // Data is flowing normally
          if (this.consecutiveFailures > 0) {
            this.consecutiveFailures = 0;
            this.emit('device-health-improved', {
              isHealthy: true,
              lastDataTimestamp: this.lastDataTimestamp,
              timeSinceLastData,
              expectedDataInterval: this.config.expectedDataInterval,
              consecutiveFailures: this.consecutiveFailures,
              errorMessage: null,
              deviceCount: this.lastDeviceCount,
              lastDeviceUpdate: this.lastDeviceUpdate
            });
          }
        }
      } else {
        // No data has been received yet
        this.consecutiveFailures++;
        const errorMessage = 'No device data has been received yet. Check if the backend is running and devices are active.';
        
        this.emit('device-health-degraded', {
          isHealthy: false,
          lastDataTimestamp: null,
          timeSinceLastData: null,
          expectedDataInterval: this.config.expectedDataInterval,
          consecutiveFailures: this.consecutiveFailures,
          errorMessage,
          deviceCount: 0,
          lastDeviceUpdate: null
        });
      }
    } catch (error) {
      console.error('Device health check error:', error);
      this.consecutiveFailures++;
      this.emit('device-health-degraded', {
        isHealthy: false,
        lastDataTimestamp: this.lastDataTimestamp,
        timeSinceLastData: this.lastDataTimestamp ? Date.now() - this.lastDataTimestamp : null,
        expectedDataInterval: this.config.expectedDataInterval,
        consecutiveFailures: this.consecutiveFailures,
        errorMessage: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        deviceCount: this.lastDeviceCount,
        lastDeviceUpdate: this.lastDeviceUpdate
      });
    }
  }

  /**
   * Get current device data health status
   */
  public getHealthStatus(): DeviceDataHealthStatus {
    const timeSinceLastData = this.lastDataTimestamp ? Date.now() - this.lastDataTimestamp : null;
    const isHealthy = this.consecutiveFailures < this.config.maxConsecutiveFailures;

    return {
      isHealthy,
      lastDataTimestamp: this.lastDataTimestamp,
      timeSinceLastData,
      expectedDataInterval: this.config.expectedDataInterval,
      consecutiveFailures: this.consecutiveFailures,
      errorMessage: isHealthy ? null : `Device data flow issues detected (${this.consecutiveFailures} consecutive failures)`,
      deviceCount: this.lastDeviceCount,
      lastDeviceUpdate: this.lastDeviceUpdate
    };
  }

  /**
   * Reset the health monitor state
   */
  public reset(): void {
    this.lastDataTimestamp = null;
    this.consecutiveFailures = 0;
    this.lastDeviceCount = 0;
    this.lastDeviceUpdate = null;
    this.emit('device-health-reset');
  }
}

// Create a singleton instance
const deviceDataHealthMonitor = new DeviceDataHealthMonitor();
export default deviceDataHealthMonitor; 