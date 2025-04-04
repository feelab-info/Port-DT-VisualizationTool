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

class SimulationService extends EventEmitter {
  private baseUrl: string;
  
  constructor() {
    super();
    this.baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
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
}

// Singleton instance
export const simulationService = new SimulationService();