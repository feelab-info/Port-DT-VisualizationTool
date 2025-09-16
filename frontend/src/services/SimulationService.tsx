/* eslint-disable @typescript-eslint/no-explicit-any */
import { EventEmitter } from 'events';
import { authService } from './AuthService';

interface SimulationParams {
  // Define your simulation parameters here
  [key: string]: any;
}

interface SimulationResult {
  // Define your simulation result structure here
  [key: string]: any;
}

interface VesselData {
  vessel_name?: string;
  name?: string;
  gross_tonnage?: number;
  length?: number;
  hotel_energy?: number;
  arrival_time: string;
  departure_time: string;
}

interface TimestepData {
  timestamp: string;
  bus_id?: number;
  voltage?: number;
  power?: number;
  load?: number;
  [key: string]: string | number | boolean | object | undefined;
}

class SimulationService extends EventEmitter {
  private baseUrl: string;
  private vesselUrl: string;
  private dcPowerFlowUrl: string;
  
  constructor() {
    super();
    this.baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
    this.vesselUrl = process.env.NEXT_PUBLIC_VESSEL_URL || 'http://localhost:5003';
    this.dcPowerFlowUrl = process.env.NEXT_PUBLIC_DC_POWER_FLOW_URL || 'http://localhost:5002';
  }
  
  public async runSimulation(params: SimulationParams): Promise<SimulationResult> {
    try {
      const token = authService.getToken();
      const response = await fetch(`${this.baseUrl}/api/simulation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(params),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to run simulation');
      }
      
      const result = await response.json();
      this.emit('simulation-complete', result);
      return result;
    } catch (error) {
      this.emit('error', error instanceof Error ? error.message : 'An unknown error occurred');
      throw error;
    }
  }
  
  public async getSimulationResults(scenarioId: string): Promise<SimulationResult> {
    try {
      const token = authService.getToken();
      const response = await fetch(`${this.baseUrl}/api/simulation/${scenarioId}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch simulation results');
      }
      
      const result = await response.json();
      return result;
    } catch (error) {
      this.emit('error', error instanceof Error ? error.message : 'An unknown error occurred');
      throw error;
    }
  }

  public async getAvailableVessels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.vesselUrl}/api/available-vessels`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch available vessels');
      }
      
      const result = await response.json();
      return result.vessels;
    } catch (error) {
      this.emit('error', error instanceof Error ? error.message : 'An unknown error occurred');
      throw error;
    }
  }

  public async submitRegisteredVessel(data: VesselData): Promise<any> {
    try {
      const token = authService.getToken();
      const response = await fetch(`${this.baseUrl}/api/vessel/registered`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          vessel_name: data.vessel_name,
          arrival_time: data.arrival_time,
          departure_time: data.departure_time
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit registered vessel');
      }
      
      return await response.json();
    } catch (error) {
      this.emit('error', error instanceof Error ? error.message : 'An unknown error occurred');
      throw error;
    }
  }

  public async submitCustomVessel(data: VesselData): Promise<any> {
    try {
      const response = await fetch(`${this.vesselUrl}/api/custom-vessel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit custom vessel');
      }
      
      return await response.json();
    } catch (error) {
      this.emit('error', error instanceof Error ? error.message : 'An unknown error occurred');
      throw error;
    }
  }

  public async getTimestepsResults(): Promise<TimestepData[]> {
    try {
      const token = authService.getToken();
      
      // Check if user is authenticated before making the request
      if (!token) {
        throw new Error('Authentication required. Please login to access simulation results.');
      }
      
      // Try fetching from the backend first (this is the preferred way)
      try {
        console.log('Attempting to fetch timesteps results from backend...');
        const response = await fetch(`${this.baseUrl}/api/simulation/timesteps-results`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('Successfully fetched timesteps results from backend');
          return data;
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          console.error('Backend endpoint failed with status:', response.status, errorData);
          throw new Error(`Backend failed: ${response.status} - ${errorData.error || 'Unknown error'}`);
        }
      } catch (backendError) {
        console.warn('Backend endpoint failed, trying direct API access:', backendError);
        
        // If backend fails, try direct access to the DC power flow API as fallback
        try {
          console.log('Attempting direct access to DC power flow API...');
          const directResponse = await fetch(`${this.dcPowerFlowUrl}/get-timesteps-results`);
          if (directResponse.ok) {
            const directData = await directResponse.json();
            console.log('Successfully fetched timesteps results directly from DC power flow API');
            return directData;
          } else {
            throw new Error(`Direct API failed: ${directResponse.status}`);
          }
        } catch (directError) {
          console.error('Direct API access also failed:', directError);
          throw new Error(`Both backend and direct API access failed. Backend: ${backendError instanceof Error ? backendError.message : 'Unknown error'}, Direct: ${directError instanceof Error ? directError.message : 'Unknown error'}`);
        }
      }
    } catch (error) {
      this.emit('error', error instanceof Error ? error.message : 'An unknown error occurred');
      throw error;
    }
  }

  public async getKpiResults(): Promise<any> {
    try {
      const token = authService.getToken();
      const response = await fetch(`${this.baseUrl}/api/simulation/kpi-results`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (response.ok) {
        return await response.json();
      }
      throw new Error('KPI endpoint not implemented yet');
    } catch (error) {
      this.emit('error', error instanceof Error ? error.message : 'An unknown error occurred');
      throw error;
    }
  }

  public async startSimulationService(): Promise<any> {
    try {
      const token = authService.getToken();
      const response = await fetch(`${this.baseUrl}/api/simulation/start-service`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start simulation service');
      }
      
      return await response.json();
    } catch (error) {
      this.emit('error', error instanceof Error ? error.message : 'An unknown error occurred');
      throw error;
    }
  }

  public async toggleSimulationUpdates(paused: boolean): Promise<void> {
    try {
      const token = authService.getToken();
      const response = await fetch(`${this.baseUrl}/api/simulation/toggle-updates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ paused })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to toggle simulation updates');
      }
    } catch (error) {
      this.emit('error', error instanceof Error ? error.message : 'An unknown error occurred');
      throw error;
    }
  }
}

// Singleton instance
export const simulationService = new SimulationService();