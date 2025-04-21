/* eslint-disable @typescript-eslint/no-explicit-any */
import { EventEmitter } from 'events';

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

class SimulationService extends EventEmitter {
  private baseUrl: string;
  private vesselUrl: string;
  
  constructor() {
    super();
    this.baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
    this.vesselUrl = process.env.NEXT_PUBLIC_VESSEL_URL || 'http://localhost:5003';
  }
  
  public async runSimulation(params: SimulationParams): Promise<SimulationResult> {
    try {
      const response = await fetch(`${this.baseUrl}/api/simulation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
      const response = await fetch(`${this.baseUrl}/api/simulation/${scenarioId}`);
      
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
      const response = await fetch(`${this.vesselUrl}/api/registered-vessel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
}

// Singleton instance
export const simulationService = new SimulationService();