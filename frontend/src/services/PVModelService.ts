import axios from 'axios';
import { authService } from './AuthService';

export interface PVSystemConfig {
  latitude: number;
  longitude: number;
  timezone: string;
  surface_tilt: number;
  surface_azimuth: number;
  module_power_kw: number;
}

export interface PVSystemStatus {
  latitude: number;
  longitude: number;
  timezone: string;
  surface_tilt: number;
  surface_azimuth: number;
  module_power_kw: number;
}

export interface PowerSeriesRequest {
  date: string; // ISO datetime string
  interval_hours?: number; // Default: 24
  sampling_minutes?: number; // Default: 15 (allowed: 1, 5, 15, 30, 60)
  start_at_midnight?: boolean; // Default: true
}

export interface PowerSeriesResponse {
  times: string[]; // Array of ISO datetime strings
  power_kw: number[]; // Array of power values in kW
}

export interface ConfigureResponse {
  status: string;
  timezone: string;
}

export interface HealthStatus {
  status: string;
}

class PVModelService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
  }

  /**
   * Get authorization headers with token
   */
  private getHeaders() {
    const token = authService.getToken();
    return token ? { Authorization: `Bearer ${token}` } : undefined;
  }

  /**
   * Configure the PV system
   */
  public async configurePVSystem(config: PVSystemConfig): Promise<ConfigureResponse> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/pv-model/configure`,
        config,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error('Error configuring PV system:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.error || error.message);
      }
      throw error;
    }
  }

  /**
   * Get current PV system status/configuration
   */
  public async getPVSystemStatus(): Promise<PVSystemStatus> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/api/pv-model/status`,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching PV system status:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.error || error.message);
      }
      throw error;
    }
  }

  /**
   * Calculate power series for a given date and parameters
   */
  public async calculatePowerSeries(request: PowerSeriesRequest): Promise<PowerSeriesResponse> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/pv-model/power-series`,
        request,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error('Error calculating power series:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.error || error.message);
      }
      throw error;
    }
  }

  /**
   * Check PV Model service health
   */
  public async checkHealth(): Promise<HealthStatus> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/api/pv-model/health`,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error('Error checking PV Model health:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.error || error.message);
      }
      throw error;
    }
  }

  /**
   * Get default PV system configuration (Funchal, Madeira)
   */
  public getDefaultConfig(): PVSystemConfig {
    return {
      latitude: 32.641893,
      longitude: -16.908949,
      timezone: 'UTC',
      surface_tilt: 30.0,
      surface_azimuth: 180.0, // South-facing
      module_power_kw: 22.0,
    };
  }
}

// Create a singleton instance
const pvModelService = new PVModelService();
export default pvModelService;

