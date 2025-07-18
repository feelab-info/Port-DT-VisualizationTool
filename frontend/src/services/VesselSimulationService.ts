import { EventEmitter } from 'events';
import axios from 'axios';

export interface VesselData {
  vesselId?: string;
  name: string;
  type: string;
  length: number;
  width: number;
  draft: number;
  arrivalTime: string;
  departureTime: string;
  cargoType?: string;
  cargoAmount?: number;
}

export interface VesselSimulationResult {
  vesselId: string;
  vesselName: string;
  arrivalTime: string;
  departureTime: string;
  energyConsumption: number;
  status: string;
  timestamp: number;
}

export interface EnergyProfileDataPoint {
  'Chillers Power': number;
  'Hotel Power': number;
  Timestamp: string;
}

export interface VesselDetailedData {
  arrival_time: string;
  departure_time: string;
  energy_profile_data: EnergyProfileDataPoint[];
  gross_tonnage: number;
  hotel_energy: number;
  length: number;
  vessel: string;
}

export interface SimulationDetail {
  closest_ship: string;
  data: VesselDetailedData;
  filename: string;
  message: string;
  scaling_factor: number;
  success: boolean;
}

export interface DetailedSimulationsResponse {
  success: boolean;
  simulations: SimulationDetail[];
  date?: string;
}

class VesselSimulationService extends EventEmitter {
  private baseUrl: string;

  constructor() {
    super();
    this.baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';
  }

  /**
   * Get a list of available vessel types/templates
   */
  public async getAvailableVessels(): Promise<VesselData[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/vessel/available`);
      return response.data;
    } catch (error) {
      console.error('Error fetching available vessels:', error);
      // Return empty array instead of throwing error to prevent UI disruption
      return [];
    }
  }

  /**
   * Submit vessel data for energy prediction
   */
  public async predictVesselEnergy(vesselData: VesselData): Promise<VesselSimulationResult> {
    try {
      const response = await axios.post(`${this.baseUrl}/api/vessel/registered`, vesselData);
      return response.data;
    } catch (error) {
      console.error('Error predicting vessel energy:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.error || error.message);
      }
      throw error;
    }
  }

  /**
   * Get all recent vessel simulations
   */
  public async getVesselSimulations(): Promise<VesselSimulationResult[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/vessel/simulations`);
      const data = response.data;
      
      // Check if the response has a simulations array property
      if (data && data.simulations && Array.isArray(data.simulations)) {
        return data.simulations;
      }
      
      // If the response is already an array, return it directly
      if (Array.isArray(data)) {
        return data;
      }
      
      // If we got here, the response format is unexpected
      console.warn('Unexpected response format from vessel simulations API:', data);
      return [];
    } catch (error) {
      console.error('Error fetching vessel simulations:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.error || error.message);
      }
      throw error;
    }
  }

  /**
   * Get detailed energy profiles for vessels
   * @param date Optional date in YYYY-MM-DD format
   * @returns Detailed simulations with energy profiles
   */
  public async getDetailedSimulations(date?: string): Promise<DetailedSimulationsResponse> {
    try {
      // Try date-specific endpoint if a date is provided
      if (date) {
        try {
          const response = await axios.get(`${this.baseUrl}/api/vessel/simulations/${date}`);
          return response.data;
        } catch (error) {
          console.warn('Error with date-specific endpoint:', error);
        }
      }
      
      // Try the general endpoint
      try {
        const response = await axios.get(`${this.baseUrl}/api/vessel/simulations`);
        return response.data;
      } catch (error) {
        console.warn('Error with general endpoint:', error);
      }
      
      // Try current-simulations as last resort
      const response = await axios.get(`${this.baseUrl}/api/vessel/current-simulations`);
      return response.data;
    } catch (error) {
      console.error('Error fetching detailed simulations:', error);
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.error || error.message;
        throw new Error(`All simulation endpoints failed. Last error: ${errorMessage}`);
      }
      throw error;
    }
  }
}

// Create a singleton instance
const vesselSimulationService = new VesselSimulationService();
export default vesselSimulationService;